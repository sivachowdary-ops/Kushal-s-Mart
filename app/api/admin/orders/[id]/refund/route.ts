import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyAdmin } from "@/lib/admin-auth";
import { createRazorpayRefund } from "@/lib/razorpay";

/**
 * POST /api/admin/orders/[id]/refund
 *
 * Admin-only endpoint for processing Razorpay refunds.
 * Supports both full and partial refunds.
 * Does NOT auto-cancel the order or auto-restore stock — admin decides.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { amount, note } = body as { amount: number; note: string };

    // Validate amount (in paise)
    if (!Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Refund amount must be greater than 0" },
        { status: 400 }
      );
    }

    // Look up the paid payment for this order (partial refunds can be topped up;
    // Razorpay itself rejects refunds beyond the captured amount)
    const { data: paymentRow } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("order_id", id)
      .in("status", ["paid", "partially_refunded"])
      .maybeSingle();

    let razorpayPaymentId = paymentRow?.razorpay_payment_id;
    let maxRefundAmount = paymentRow?.amount;

    if (!razorpayPaymentId) {
      // Fallback: look up in Order table directly
      const { data: orderRow } = await supabaseAdmin
        .from("Order")
        .select("razorpayPaymentId, total, paymentStatus")
        .eq("id", id)
        .single();

      if (
        orderRow?.razorpayPaymentId &&
        (orderRow.paymentStatus === "PAID" || orderRow.paymentStatus === "PARTIALLY_REFUNDED")
      ) {
        razorpayPaymentId = orderRow.razorpayPaymentId;
        maxRefundAmount = orderRow.total;
      }
    }

    if (!razorpayPaymentId || !maxRefundAmount) {
      return NextResponse.json(
        { error: "No paid payment or Razorpay payment ID found for this order" },
        { status: 400 }
      );
    }

    // Validate refund doesn't exceed paid amount
    if (amount > maxRefundAmount) {
      return NextResponse.json(
        {
          error: `Refund amount (₹${(amount / 100).toFixed(2)}) exceeds paid amount (₹${(maxRefundAmount / 100).toFixed(2)})`,
        },
        { status: 400 }
      );
    }

    // Call Razorpay refund API — amount in paise (no conversion needed!)
    const refundResult = await createRazorpayRefund({
      paymentId: razorpayPaymentId,
      amountPaise: amount,
      notes: {
        reason: note || "Admin-initiated refund",
        order_id: id,
      },
    });

    // Update payment status — paymentRow may be null when we fell back to the Order table
    const newStatus = amount === maxRefundAmount ? "refunded" : "partially_refunded";
    const now = new Date().toISOString();

    if (paymentRow) {
      await supabaseAdmin
        .from("payments")
        .update({ status: newStatus, updated_at: now })
        .eq("id", paymentRow.id);
    }

    // Record on the Order too, so the fallback lookup above can't allow a second refund
    await supabaseAdmin
      .from("Order")
      .update({ paymentStatus: newStatus.toUpperCase(), updatedAt: now })
      .eq("id", id);

    console.log(
      `[Razorpay Refund] ${newStatus} for order ${id}: ₹${(amount / 100).toFixed(2)}`
    );

    return NextResponse.json({
      success: true,
      status: newStatus,
      refundResult,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Refund processing failed";
    console.error("[Razorpay Refund] Error:", msg);

    // Check for auth errors
    if (msg.includes("Unauthorized") || msg.includes("not authorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
