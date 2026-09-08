import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyAdmin } from "@/lib/admin-auth";
import { createCashfreeRefund } from "@/lib/cashfree";

/**
 * POST /api/admin/orders/[id]/refund
 *
 * Admin-only endpoint for processing Cashfree refunds.
 * Supports both full and partial refunds.
 * Does NOT auto-cancel the order or auto-restore stock — admin decides.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Admin auth check
    await verifyAdmin(request);

    const { id } = await params;
    const body = await request.json();
    const { amount, note } = body as { amount: number; note: string };

    // Validate amount (in paise)
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Refund amount must be greater than 0" },
        { status: 400 }
      );
    }

    // Look up the paid payment for this order
    const { data: paymentRow, error: payErr } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("order_id", id)
      .eq("status", "paid")
      .maybeSingle();

    if (payErr || !paymentRow) {
      return NextResponse.json(
        { error: "No paid payment found for this order" },
        { status: 400 }
      );
    }

    // Validate refund doesn't exceed paid amount
    if (amount > paymentRow.amount) {
      return NextResponse.json(
        {
          error: `Refund amount (₹${(amount / 100).toFixed(2)}) exceeds paid amount (₹${(paymentRow.amount / 100).toFixed(2)})`,
        },
        { status: 400 }
      );
    }

    // Get orderNumber (used as cashfreeOrderId)
    const { data: order } = await supabaseAdmin
      .from("Order")
      .select("orderNumber")
      .eq("id", id)
      .single();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Generate unique refund ID
    const refundId = `ref-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    // Convert paise to rupees for Cashfree API
    const amountRupees = parseFloat((amount / 100).toFixed(2));

    // Call Cashfree refund API
    const refundResult = await createCashfreeRefund({
      cashfreeOrderId: order.orderNumber,
      refundAmount: amountRupees,
      refundId,
      refundNote: note || "Admin-initiated refund",
    });

    // Update payment status
    const newStatus = amount === paymentRow.amount ? "refunded" : "partially_refunded";

    await supabaseAdmin
      .from("payments")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentRow.id);

    console.log(
      `[Cashfree Refund] ${newStatus} for order ${order.orderNumber}: ₹${amountRupees} (refundId: ${refundId})`
    );

    return NextResponse.json({
      success: true,
      refundId,
      status: newStatus,
      refundResult,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Refund processing failed";
    console.error("[Cashfree Refund] Error:", msg);

    // Check for auth errors
    if (msg.includes("Unauthorized") || msg.includes("not authorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
