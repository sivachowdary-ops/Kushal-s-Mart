import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * POST /api/payments/fail
 *
 * Records a client-side payment failure or cancellation.
 * Updates Order status to 'PAYMENT_FAILED' and paymentStatus to 'FAILED',
 * and updates the payments audit log so the admin dashboard reflects it instantly.
 *
 * SECURITY: unauthenticated, so it may only ever touch orders that are still
 * PENDING_PAYMENT. A paid order (e.g. the webhook landed before the customer
 * closed the Razorpay window) is never downgraded.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { orderId, reason } = body as { orderId?: unknown; reason?: unknown };

    if (typeof orderId !== "string" || !orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const failureReason =
      (typeof reason === "string" && reason.trim().slice(0, 300)) ||
      "Payment failed or was cancelled by user";
    const now = new Date().toISOString();

    // 1. Update Order table — only while still awaiting payment
    const { data: updated, error: orderError } = await supabaseAdmin
      .from("Order")
      .update({
        status: "PAYMENT_FAILED",
        paymentStatus: "FAILED",
        updatedAt: now,
      })
      .eq("id", orderId)
      .eq("status", "PENDING_PAYMENT")
      .select("id, orderNumber");

    if (orderError) {
      console.error("[payments/fail] DB error updating order:", orderError.message);
      return NextResponse.json({ error: "Could not record payment failure" }, { status: 500 });
    }

    if (!updated || updated.length === 0) {
      // Already paid, failed, cancelled or unknown — nothing to do
      return NextResponse.json({ success: true, updated: false });
    }

    // 2. Update payments table if an unpaid record exists
    await supabaseAdmin
      .from("payments")
      .update({
        status: "failed",
        failure_reason: failureReason,
        updated_at: now,
      })
      .eq("order_id", orderId)
      .in("status", ["created", "active"]);

    console.log(`[payments/fail] Order ${updated[0].orderNumber} marked as PAYMENT_FAILED: ${failureReason}`);

    return NextResponse.json({ success: true, updated: true });
  } catch (err: unknown) {
    console.error("[payments/fail] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to record payment failure" }, { status: 500 });
  }
}
