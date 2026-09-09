import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * POST /api/payments/fail
 *
 * Records a client-side payment failure or cancellation.
 * Updates Order status to 'PAYMENT_FAILED' and paymentStatus to 'FAILED',
 * and updates the payments audit log so the admin dashboard reflects it instantly.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, reason } = body as { orderId?: string; reason?: string };

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const failureReason = reason || "Payment failed or was cancelled by user";
    const now = new Date().toISOString();

    // 1. Update Order table
    const { data: order, error: orderError } = await supabaseAdmin
      .from("Order")
      .update({
        status: "PAYMENT_FAILED",
        paymentStatus: "FAILED",
        updatedAt: now,
      })
      .eq("id", orderId)
      .select("id, orderNumber")
      .maybeSingle();

    if (orderError) {
      console.error("[payments/fail] DB error updating order:", orderError);
    }

    // 2. Update payments table if a record exists
    try {
      await supabaseAdmin
        .from("payments")
        .update({
          status: "failed",
          failure_reason: failureReason,
          updated_at: now,
        })
        .eq("order_id", orderId);
    } catch {
      // Non-blocking
    }

    console.log(`[payments/fail] Order ${order?.orderNumber || orderId} marked as PAYMENT_FAILED: ${failureReason}`);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to record payment failure";
    console.error("[payments/fail] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
