import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * POST /api/payment/webhook
 *
 * Server-to-server fail-safe webhook from Razorpay.
 * Why this is needed:
 * 1. Customer pays via UPI/Card, but closes the browser before redirect completes.
 * 2. Mobile browser network drops right after bank debit.
 * 3. Frontend /api/payment/verify fails or times out.
 *
 * Razorpay will directly call this webhook in the background.
 * If the order is not yet created or still pending, this confirms the order and saves the payment.
 */
export async function POST(request: Request) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

  if (!webhookSecret) {
    console.error("[webhook] RAZORPAY_WEBHOOK_SECRET or RAZORPAY_KEY_SECRET not set in environment.");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  try {
    // 1. Read raw body as text for accurate cryptographic HMAC verification
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing x-razorpay-signature header" }, { status: 400 });
    }

    // 2. Verify HMAC SHA-256 signature
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    // Use timing-safe comparison to prevent timing attacks
    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expectedSignature, "hex");
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      console.warn("[webhook] Invalid signature received");
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    // 3. Parse validated JSON payload
    const event = JSON.parse(rawBody);
    const eventType = event.event;

    console.log(`[webhook] Received verified Razorpay event: ${eventType}`);

    // Handle payment.captured or order.paid
    if (eventType === "payment.captured" || eventType === "order.paid") {
      const paymentEntity = event.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id || event.payload?.order?.entity?.id;
      const razorpayPaymentId = paymentEntity?.id;
      const amountPaise = paymentEntity?.amount || event.payload?.order?.entity?.amount;

      if (!razorpayOrderId) {
        return NextResponse.json({ received: true, note: "No razorpay order id in event" });
      }

      // Check if an order already exists in Supabase
      const { data: existingOrder } = await supabaseAdmin
        .from("Order")
        .select("id, status, paymentStatus, orderNumber")
        .eq("razorpayOrderId", razorpayOrderId)
        .single();

      if (existingOrder) {
        // If order already exists but wasn't marked paid, update it
        if (existingOrder.paymentStatus !== "PAID") {
          await supabaseAdmin
            .from("Order")
            .update({
              status: "CONFIRMED",
              paymentStatus: "PAID",
              razorpayPaymentId: razorpayPaymentId,
              updatedAt: new Date().toISOString(),
            })
            .eq("id", existingOrder.id);

          console.log(`[webhook] Order ${existingOrder.orderNumber} marked as PAID via webhook`);
        } else {
          console.log(`[webhook] Order ${existingOrder.orderNumber} already marked PAID. Idempotent return.`);
        }
      } else {
        // If order doesn't exist yet (frontend dropped connection before /api/payment/verify):
        console.warn(`[webhook] Payment ${razorpayPaymentId} captured for Razorpay Order ${razorpayOrderId} (${amountPaise} paise) but Order was not yet in DB.`);

        // Store payment audit record in Payment table so money is never lost
        try {
          await supabaseAdmin.from("Payment").insert([{
            id: `pay-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
            razorpayOrderId: razorpayOrderId,
            razorpayPaymentId: razorpayPaymentId,
            amount: amountPaise,
            status: "captured",
            rawWebhookPayload: event,
            updatedAt: new Date().toISOString(),
          }]);
        } catch (payErr) {
          console.error("[webhook] Could not save raw payment audit:", payErr);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Webhook handling failed";
    console.error("[webhook] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
