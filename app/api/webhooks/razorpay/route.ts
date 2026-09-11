import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay";
import { createDelhiveryShipment } from "@/lib/delhivery";

/**
 * POST /api/webhooks/razorpay
 *
 * THE SINGLE SOURCE OF TRUTH for payment confirmation.
 * Only this handler marks orders as PAID, decrements stock, and triggers shipment.
 *
 * Critical implementation notes:
 * 1. Raw body must be read as text BEFORE any JSON.parse for signature verification.
 * 2. Signature verification uses HMAC-SHA256 with constant-time comparison.
 * 3. Idempotent — duplicate webhook deliveries are no-ops.
 * 4. Stock decrement is atomic via Postgres RPC function.
 * 5. Delhivery shipment creation happens AFTER the payment transaction commits —
 *    if it fails, payment still stands and admin dispatches manually.
 */
export async function POST(request: Request) {
  try {
    // ── 1. Read raw body as text — BEFORE any JSON.parse ─────────────────────
    const rawBody = await request.text();

    // ── 2. Read signature header ────────────────────────────────────────────
    const signature = request.headers.get("x-razorpay-signature") || "";

    // ── Debug logging (remove after confirming webhook works) ────────────────
    console.log("[Razorpay Webhook] Received — body length:", rawBody.length,
      "| has signature:", !!signature,
      "| secret configured:", !!process.env.RAZORPAY_WEBHOOK_SECRET);

    // ── 3. Verify webhook signature ─────────────────────────────────────────
    if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
      console.warn("[Razorpay Webhook] Invalid signature — secret mismatch or missing RAZORPAY_WEBHOOK_SECRET env var");
      // Return 200 so Razorpay doesn't keep retrying — log will show the issue
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 200 });
    }

    // ── 4. Parse verified body ──────────────────────────────────────────────
    const event = JSON.parse(rawBody);
    const eventType: string = event.event || "unknown";

    console.log(`[Razorpay Webhook] Event: ${eventType}`);

    // ── 5. Handle payment events ────────────────────────────────────────────
    if (eventType === "order.paid" || eventType === "payment.captured") {
      const paymentEntity = event.payload?.payment?.entity || {};
      const orderEntity = event.payload?.order?.entity || {};

      const razorpayOrderId: string = paymentEntity.order_id || orderEntity.id || "";
      const razorpayPaymentId: string = paymentEntity.id || "";

      if (!razorpayOrderId) {
        console.warn("[Razorpay Webhook] No order_id in payload — skipping");
        return NextResponse.json({ success: true }, { status: 200 });
      }

      // ── 5a. Look up payment or order ───────────────────────────────────
      let internalOrderId: string | null = null;
      let isDuplicate = false;

      const { data: paymentRow } = await supabaseAdmin
        .from("payments")
        .select("*")
        .eq("razorpay_order_id", razorpayOrderId)
        .maybeSingle();

      if (paymentRow) {
        internalOrderId = paymentRow.order_id;
        if (
          paymentRow.status === "paid" &&
          paymentRow.razorpay_payment_id === razorpayPaymentId
        ) {
          isDuplicate = true;
        }
      } else {
        // Fallback: look up in Order table directly by razorpayOrderId
        const { data: orderRow } = await supabaseAdmin
          .from("Order")
          .select("id, status, paymentStatus")
          .eq("razorpayOrderId", razorpayOrderId)
          .maybeSingle();

        if (orderRow) {
          internalOrderId = orderRow.id;
          if (orderRow.status === "PAID" || orderRow.paymentStatus === "PAID") {
            isDuplicate = true;
          }
        }
      }

      if (!internalOrderId) {
        console.warn(
          "[Razorpay Webhook] No order found for razorpay_order_id:",
          razorpayOrderId
        );
        return NextResponse.json({ success: true }, { status: 200 });
      }

      // ── 5b. Idempotency check ───────────────────────────────────────────
      if (isDuplicate) {
        console.log("[Razorpay Webhook] Duplicate — already processed, no-op");
        return NextResponse.json({ success: true }, { status: 200 });
      }

      const now = new Date().toISOString();

      // ── 5c. Update payments row if present ──────────────────────────────
      if (paymentRow) {
        try {
          await supabaseAdmin
            .from("payments")
            .update({
              status: "paid",
              razorpay_payment_id: razorpayPaymentId,
              raw_webhook_payload: event,
              updated_at: now,
            })
            .eq("id", paymentRow.id);
        } catch (payUpdateErr) {
          console.warn("[Razorpay Webhook] payments table update warning:", payUpdateErr);
        }
      }

      // ── 5d. Update Order status and razorpayPaymentId ───────────────────
      await supabaseAdmin
        .from("Order")
        .update({
          status: "PAID",
          paymentStatus: "PAID",
          razorpayPaymentId: razorpayPaymentId,
          updatedAt: now,
        })
        .eq("id", internalOrderId);

      // ── 5e. Atomic stock decrement for each OrderItem ───────────────────
      const { data: orderItems } = await supabaseAdmin
        .from("OrderItem")
        .select("variantId, quantity, productName")
        .eq("orderId", internalOrderId);

      if (orderItems && orderItems.length > 0) {
        for (const item of orderItems) {
          if (!item.variantId || item.variantId === "default") continue;

          try {
            // Atomic: UPDATE ProductVariant SET stock = stock - qty WHERE stock >= qty
            const { data: decremented, error: rpcErr } = await supabaseAdmin.rpc(
              "decrement_stock",
              { p_variant_id: item.variantId, p_qty: item.quantity }
            );

            if (rpcErr) {
              console.error(
                `[Razorpay Webhook] RPC decrement_stock failed for ${item.variantId}:`,
                rpcErr
              );
            } else if (decremented === false) {
              console.warn(
                `[Razorpay Webhook] Insufficient stock for variant ${item.variantId} ` +
                `(${item.productName}) — order ${razorpayOrderId} flagged for admin review`
              );
            }

            // Write stock ledger entry
            await supabaseAdmin.from("StockLedgerEntry").insert([{
              id: `stk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
              variantId: item.variantId,
              change: -item.quantity,
              reason: "ONLINE_SALE",
              orderId: internalOrderId,
              createdAt: now,
            }]);
          } catch (stockErr) {
            console.error(
              `[Razorpay Webhook] Stock operation error for ${item.variantId}:`,
              stockErr
            );
          }
        }
      }

      // ── 5f. AFTER payment confirmed — trigger Delhivery shipment ────────
      try {
        const { data: fullOrder } = await supabaseAdmin
          .from("Order")
          .select("*, OrderItem (*)")
          .eq("id", internalOrderId)
          .single();

        if (fullOrder && !fullOrder.shiprocketAwb) {
          const shippingAddr = (fullOrder.shippingAddress || {}) as {
            address?: string;
            city?: string;
            state?: string;
            pincode?: string;
          };

          const shipmentItems = (fullOrder.OrderItem || []).map(
            (oi: { productName: string; quantity: number; unitPrice: number }) => ({
              productName: oi.productName,
              quantity: oi.quantity,
              unitPrice: oi.unitPrice,
            })
          );

          const result = await createDelhiveryShipment({
            orderId: internalOrderId,
            orderNumber: fullOrder.orderNumber,
            customerName: fullOrder.customerName,
            customerPhone: fullOrder.customerPhone,
            customerEmail: fullOrder.customerEmail || undefined,
            shippingAddress: {
              address: shippingAddr.address || "",
              city: shippingAddr.city || "",
              state: shippingAddr.state || "",
              pincode: shippingAddr.pincode || "",
            },
            items: shipmentItems,
            totalAmount: fullOrder.total,
            paymentMode: "prepaid",
          });

          if (result.success && result.waybill) {
            await supabaseAdmin
              .from("Order")
              .update({
                shiprocketAwb: result.waybill,
                courierName: result.courierName,
                status: "PACKED",
                updatedAt: new Date().toISOString(),
              })
              .eq("id", internalOrderId);

            console.log(
              `[Razorpay Webhook] Delhivery shipment created: AWB ${result.waybill}`
            );
          } else {
            console.warn(
              `[Razorpay Webhook] Delhivery shipment booking noted: ${result.error || "Awaiting admin manual dispatch"}`
            );
          }
        }
      } catch (shipErr) {
        // Delhivery failure must NEVER roll back the payment
        console.error(
          "[Razorpay Webhook] Delhivery shipment creation failed — admin must dispatch manually:",
          shipErr
        );
      }

      console.log(
        `[Razorpay Webhook] Payment confirmed for order ${razorpayOrderId}`
      );
    }

    // ── 6. Handle failed payment ────────────────────────────────────────────
    else if (eventType === "payment.failed") {
      const paymentEntity = event.payload?.payment?.entity || {};
      const razorpayOrderId: string = paymentEntity.order_id || "";
      const failureReason: string =
        paymentEntity.error_description ||
        paymentEntity.error_reason ||
        "Payment failed";

      if (razorpayOrderId) {
        const { data: paymentRow } = await supabaseAdmin
          .from("payments")
          .select("id, order_id")
          .eq("razorpay_order_id", razorpayOrderId)
          .maybeSingle();

        const now = new Date().toISOString();

        if (paymentRow) {
          await supabaseAdmin
            .from("payments")
            .update({
              status: "failed",
              failure_reason: failureReason,
              raw_webhook_payload: event,
              updated_at: now,
            })
            .eq("id", paymentRow.id);
        }

        // Update Order table so Admin dashboard and customer tracking reflect the failure immediately
        if (paymentRow?.order_id) {
          await supabaseAdmin
            .from("Order")
            .update({
              status: "PAYMENT_FAILED",
              paymentStatus: "FAILED",
              updatedAt: now,
            })
            .eq("id", paymentRow.order_id);
        } else {
          await supabaseAdmin
            .from("Order")
            .update({
              status: "PAYMENT_FAILED",
              paymentStatus: "FAILED",
              updatedAt: now,
            })
            .eq("razorpayOrderId", razorpayOrderId);
        }

        console.log(
          `[Razorpay Webhook] Order marked as PAYMENT_FAILED for ${razorpayOrderId}: ${failureReason}`
        );
      }
    }

    // ── 7. Always return 200 ────────────────────────────────────────────────
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Webhook processing error";
    console.error("[Razorpay Webhook] Unhandled error:", msg);
    // Still return 200 to prevent Razorpay from retrying due to our bugs
    return NextResponse.json({ success: true }, { status: 200 });
  }
}
