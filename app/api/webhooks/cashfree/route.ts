import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyCashfreeWebhookSignature } from "@/lib/cashfree";
import { createDelhiveryShipment } from "@/lib/delhivery";

/**
 * POST /api/webhooks/cashfree
 *
 * THE SINGLE SOURCE OF TRUTH for payment confirmation.
 * Only this handler marks orders as PAID, decrements stock, and triggers shipment.
 *
 * Critical implementation notes:
 * 1. Raw body must be read as text BEFORE any JSON.parse for signature verification.
 * 2. Signature verification uses constant-time comparison (in lib/cashfree.ts).
 * 3. Idempotent — duplicate webhook deliveries are no-ops.
 * 4. Stock decrement is atomic via Postgres RPC function.
 * 5. Delhivery shipment creation happens AFTER the payment transaction commits —
 *    if it fails, payment still stands and admin dispatches manually.
 */
export async function POST(request: Request) {
  try {
    // ── 1. Read raw body as text — BEFORE any JSON.parse ─────────────────────
    const rawBody = await request.text();

    // ── 2. Read signature headers ───────────────────────────────────────────
    const timestamp = request.headers.get("x-webhook-timestamp") || "";
    const signature = request.headers.get("x-webhook-signature") || "";

    // ── 3. Verify webhook signature ─────────────────────────────────────────
    if (!verifyCashfreeWebhookSignature(rawBody, timestamp, signature)) {
      console.warn("[Cashfree Webhook] Invalid signature — rejecting");
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    // ── 4. Parse verified body ──────────────────────────────────────────────
    const event = JSON.parse(rawBody);

    // Extract fields — Cashfree webhook structure can vary slightly by event type
    const paymentData = event.data?.payment || event.data || {};
    const orderData = event.data?.order || event.data || {};
    const cashfreeOrderId: string = orderData.order_id || paymentData.order_id || "";
    const cfPaymentId: string = paymentData.cf_payment_id || "";
    const paymentStatus: string = (
      paymentData.payment_status || orderData.order_status || ""
    ).toUpperCase();
    const eventType: string = event.type || event.event_type || "unknown";

    console.log(
      `[Cashfree Webhook] Event: ${eventType}, OrderID: ${cashfreeOrderId}, Status: ${paymentStatus}`
    );

    if (!cashfreeOrderId) {
      console.warn("[Cashfree Webhook] No order_id in payload — skipping");
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // ── 5. Look up our payments row ─────────────────────────────────────────
    const { data: paymentRow, error: payLookupErr } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("cashfree_order_id", cashfreeOrderId)
      .maybeSingle();

    if (payLookupErr || !paymentRow) {
      console.warn(
        "[Cashfree Webhook] No payments row found for cashfree_order_id:",
        cashfreeOrderId
      );
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // ── 6. Idempotency check ────────────────────────────────────────────────
    if (paymentRow.status === "paid" && paymentRow.cf_payment_id === cfPaymentId) {
      console.log("[Cashfree Webhook] Duplicate — already processed, no-op");
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const internalOrderId: string = paymentRow.order_id;
    const now = new Date().toISOString();

    // ── 7. Handle successful payment ────────────────────────────────────────
    if (paymentStatus === "SUCCESS" || paymentStatus === "PAID") {
      // 7a. Update payments row
      await supabaseAdmin
        .from("payments")
        .update({
          status: "paid",
          cf_payment_id: cfPaymentId,
          raw_webhook_payload: event,
          updated_at: now,
        })
        .eq("id", paymentRow.id);

      // 7b. Update Order status
      await supabaseAdmin
        .from("Order")
        .update({
          status: "PAID",
          paymentStatus: "PAID",
          updatedAt: now,
        })
        .eq("id", internalOrderId);

      // 7c. Atomic stock decrement for each OrderItem
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
                `[Cashfree Webhook] RPC decrement_stock failed for ${item.variantId}:`,
                rpcErr
              );
            } else if (decremented === false) {
              console.warn(
                `[Cashfree Webhook] Insufficient stock for variant ${item.variantId} ` +
                `(${item.productName}) — order ${cashfreeOrderId} flagged for admin review`
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
              `[Cashfree Webhook] Stock operation error for ${item.variantId}:`,
              stockErr
            );
          }
        }
      }

      // 7d. AFTER payment confirmed — trigger Delhivery shipment (separate from DB ops)
      try {
        const { data: fullOrder } = await supabaseAdmin
          .from("Order")
          .select("*, OrderItem (*)")
          .eq("id", internalOrderId)
          .single();

        if (fullOrder) {
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
              `[Cashfree Webhook] Delhivery shipment created: AWB ${result.waybill}`
            );
          }
        }
      } catch (shipErr) {
        // Delhivery failure must NEVER roll back the payment
        console.error(
          "[Cashfree Webhook] Delhivery shipment creation failed — admin must dispatch manually:",
          shipErr
        );
      }

      console.log(
        `[Cashfree Webhook] Payment confirmed for order ${cashfreeOrderId}`
      );
    }

    // ── 8. Handle failed payment ────────────────────────────────────────────
    else if (
      paymentStatus === "FAILED" ||
      paymentStatus === "USER_DROPPED" ||
      paymentStatus === "CANCELLED" ||
      paymentStatus === "VOID"
    ) {
      await supabaseAdmin
        .from("payments")
        .update({
          status: "failed",
          failure_reason: paymentData.payment_message || paymentStatus,
          raw_webhook_payload: event,
          updated_at: now,
        })
        .eq("id", paymentRow.id);

      // Leave Order as PENDING_PAYMENT — customer can retry
      console.log(
        `[Cashfree Webhook] Payment failed for order ${cashfreeOrderId}: ${paymentStatus}`
      );
    }

    // ── 9. Always return 200 ────────────────────────────────────────────────
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Webhook processing error";
    console.error("[Cashfree Webhook] Unhandled error:", msg);
    // Still return 200 to prevent Cashfree from retrying due to our bugs
    return NextResponse.json({ success: true }, { status: 200 });
  }
}
