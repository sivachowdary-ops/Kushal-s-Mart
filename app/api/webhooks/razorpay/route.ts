import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay";
import { createDelhiveryShipment } from "@/lib/delhivery";

/** Order statuses a captured payment may move to PAID. */
const PAYABLE_STATUSES = ["PENDING_PAYMENT", "PAYMENT_FAILED"];

/**
 * POST /api/webhooks/razorpay
 *
 * THE SINGLE SOURCE OF TRUTH for payment confirmation.
 * Only this handler marks orders as PAID, decrements stock, and triggers shipment.
 *
 * Critical implementation notes:
 * 1. Raw body must be read as text BEFORE any JSON.parse for signature verification.
 * 2. Signature verification uses HMAC-SHA256 with constant-time comparison.
 * 3. Idempotent — the Order is "claimed" with a single conditional UPDATE, so
 *    duplicate or concurrent deliveries (order.paid + payment.captured) are no-ops.
 * 4. Stock decrement is atomic via Postgres RPC function.
 * 5. Delhivery shipment creation happens AFTER the payment is recorded —
 *    if it fails, payment still stands and admin dispatches manually.
 * 6. Errors BEFORE the claim return 500 so Razorpay retries; after the claim,
 *    a retry is a harmless no-op.
 */
export async function POST(request: Request) {
  try {
    // ── 1. Read raw body as text — BEFORE any JSON.parse ─────────────────────
    const rawBody = await request.text();

    // ── 2. Read signature header ────────────────────────────────────────────
    const signature = request.headers.get("x-razorpay-signature") || "";

    // ── 3. Verify webhook signature ─────────────────────────────────────────
    if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
      console.warn("[Razorpay Webhook] Invalid signature — secret mismatch or missing RAZORPAY_WEBHOOK_SECRET env var");
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
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
      const internalOrderId = await findInternalOrderId(razorpayOrderId);
      if (!internalOrderId) {
        console.warn("[Razorpay Webhook] No order found for razorpay_order_id:", razorpayOrderId);
        return NextResponse.json({ success: true }, { status: 200 });
      }

      const now = new Date().toISOString();

      // ── 5b. Atomic claim — only one delivery can move the order to PAID ─
      const { data: claimed, error: claimErr } = await supabaseAdmin
        .from("Order")
        .update({
          status: "PAID",
          paymentStatus: "PAID",
          razorpayPaymentId: razorpayPaymentId,
          updatedAt: now,
        })
        .eq("id", internalOrderId)
        .in("status", PAYABLE_STATUSES)
        .select("id, orderNumber, total");

      if (claimErr) throw new Error(`Order claim failed: ${claimErr.message}`);

      if (!claimed || claimed.length === 0) {
        const { data: current } = await supabaseAdmin
          .from("Order")
          .select("status, razorpayPaymentId")
          .eq("id", internalOrderId)
          .maybeSingle();

        if (current?.status && !["PAID", "PACKED", "SHIPPED", "DELIVERED", "COMPLETED"].includes(current.status)) {
          console.error(
            `[Razorpay Webhook] ⚠️ Payment ${razorpayPaymentId} captured for order ${internalOrderId} ` +
            `in status ${current.status} — needs manual refund or fulfilment`
          );
        } else if (current?.razorpayPaymentId && current.razorpayPaymentId !== razorpayPaymentId) {
          console.error(
            `[Razorpay Webhook] ⚠️ Second payment ${razorpayPaymentId} captured for already-paid order ` +
            `${internalOrderId} (first: ${current.razorpayPaymentId}) — refund the duplicate`
          );
        } else {
          console.log("[Razorpay Webhook] Duplicate — already processed, no-op");
        }
        return NextResponse.json({ success: true }, { status: 200 });
      }

      const paidOrder = claimed[0];
      if (typeof paymentEntity.amount === "number" && paymentEntity.amount !== paidOrder.total) {
        console.error(
          `[Razorpay Webhook] ⚠️ Amount mismatch for ${paidOrder.orderNumber}: ` +
          `paid ${paymentEntity.amount}, order total ${paidOrder.total} — review before shipping`
        );
      }

      // ── 5c. Update payments audit row ───────────────────────────────────
      const { error: payUpdateErr } = await supabaseAdmin
        .from("payments")
        .update({
          status: "paid",
          razorpay_payment_id: razorpayPaymentId,
          raw_webhook_payload: event,
          updated_at: now,
        })
        .eq("razorpay_order_id", razorpayOrderId);
      if (payUpdateErr) {
        console.warn("[Razorpay Webhook] payments table update warning:", payUpdateErr.message);
      }

      // ── 5d. Atomic stock decrement for each OrderItem ───────────────────
      const { data: orderItems } = await supabaseAdmin
        .from("OrderItem")
        .select("variantId, quantity, productName")
        .eq("orderId", internalOrderId);

      for (const item of orderItems || []) {
        if (!item.variantId || item.variantId === "default" || !(item.quantity > 0)) continue;

        try {
          // Atomic: UPDATE ProductVariant SET stock = stock - qty WHERE stock >= qty
          const { data: decremented, error: rpcErr } = await supabaseAdmin.rpc(
            "decrement_stock",
            { p_variant_id: item.variantId, p_qty: item.quantity }
          );

          if (rpcErr) {
            console.error(`[Razorpay Webhook] RPC decrement_stock failed for ${item.variantId}:`, rpcErr.message);
          } else if (decremented === false) {
            console.error(
              `[Razorpay Webhook] ⚠️ OVERSOLD: insufficient stock for variant ${item.variantId} ` +
              `(${item.productName}) — order ${paidOrder.orderNumber} needs admin review`
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
          console.error(`[Razorpay Webhook] Stock operation error for ${item.variantId}:`, stockErr);
        }
      }

      // ── 5e. AFTER payment confirmed — trigger Delhivery shipment ────────
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
              weightGrams: 500, // Default 500g per item (approved by owner)
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
              `[Razorpay Webhook] ✅ Delhivery AWB created: ${result.waybill} for order ${fullOrder.orderNumber}`
            );
          } else {
            console.warn(
              `[Razorpay Webhook] ⚠️ Delhivery failed for ${fullOrder.orderNumber}: ${result.error || "No waybill returned"}`
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

      console.log(`[Razorpay Webhook] Payment confirmed for order ${paidOrder.orderNumber}`);
    }

    // ── 6. Handle failed payment ────────────────────────────────────────────
    // A failed attempt can arrive AFTER a successful retry, so only ever move
    // orders that are still awaiting payment.
    else if (eventType === "payment.failed") {
      const paymentEntity = event.payload?.payment?.entity || {};
      const razorpayOrderId: string = paymentEntity.order_id || "";
      const failureReason: string =
        paymentEntity.error_description ||
        paymentEntity.error_reason ||
        "Payment failed";

      if (razorpayOrderId) {
        const now = new Date().toISOString();

        const { error: payErr } = await supabaseAdmin
          .from("payments")
          .update({
            status: "failed",
            failure_reason: failureReason,
            raw_webhook_payload: event,
            updated_at: now,
          })
          .eq("razorpay_order_id", razorpayOrderId)
          .in("status", ["created", "active"]);
        if (payErr) throw new Error(`payments update failed: ${payErr.message}`);

        const internalOrderId = await findInternalOrderId(razorpayOrderId);
        if (internalOrderId) {
          const { error: orderErr } = await supabaseAdmin
            .from("Order")
            .update({
              status: "PAYMENT_FAILED",
              paymentStatus: "FAILED",
              updatedAt: now,
            })
            .eq("id", internalOrderId)
            .eq("status", "PENDING_PAYMENT");
          if (orderErr) throw new Error(`Order update failed: ${orderErr.message}`);
        }

        console.log(`[Razorpay Webhook] payment.failed for ${razorpayOrderId}: ${failureReason}`);
      }
    }

    // ── 7. Acknowledge ──────────────────────────────────────────────────────
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Webhook processing error";
    console.error("[Razorpay Webhook] Processing error — Razorpay will retry:", msg);
    // 500 makes Razorpay retry; processing is idempotent, so retries are safe
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

/** Maps a Razorpay order id to our Order.id via the payments table, then the Order table. */
async function findInternalOrderId(razorpayOrderId: string): Promise<string | null> {
  const { data: paymentRow, error: payErr } = await supabaseAdmin
    .from("payments")
    .select("order_id")
    .eq("razorpay_order_id", razorpayOrderId)
    .maybeSingle();
  if (payErr) throw new Error(`payments lookup failed: ${payErr.message}`);
  if (paymentRow?.order_id) return paymentRow.order_id;

  const { data: orderRow, error: orderErr } = await supabaseAdmin
    .from("Order")
    .select("id")
    .eq("razorpayOrderId", razorpayOrderId)
    .maybeSingle();
  if (orderErr) throw new Error(`Order lookup failed: ${orderErr.message}`);
  return orderRow?.id ?? null;
}
