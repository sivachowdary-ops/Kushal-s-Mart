import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createRazorpayOrder } from "@/lib/razorpay";

/**
 * POST /api/payments/create-order
 *
 * Creates a Razorpay order for an existing PENDING_PAYMENT Order.
 * Request body: { orderId: string } — nothing else, no amount field.
 * Amount is ALWAYS read from the Order row (server-side, never client input).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    // 1. Look up the Order — it must exist and be PENDING_PAYMENT
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("Order")
      .select("id, orderNumber, total, customerName, customerPhone, customerEmail, status, razorpayOrderId")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "PENDING_PAYMENT") {
      return NextResponse.json(
        { error: `Order is not awaiting payment (current status: ${order.status})` },
        { status: 400 }
      );
    }

    // 2. Idempotency: check if a valid Razorpay order already exists for this Order
    if (order.razorpayOrderId) {
      return NextResponse.json({
        razorpay_order_id: order.razorpayOrderId,
        amount: order.total,
        currency: "INR",
        key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      });
    }

    try {
      const { data: existingPayment } = await supabaseAdmin
        .from("payments")
        .select("razorpay_order_id, status")
        .eq("order_id", orderId)
        .in("status", ["created", "active"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingPayment?.razorpay_order_id) {
        return NextResponse.json({
          razorpay_order_id: existingPayment.razorpay_order_id,
          amount: order.total,
          currency: "INR",
          key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        });
      }
    } catch (checkErr) {
      console.warn("[Razorpay] payments idempotency check warning:", checkErr);
    }

    // 3. Amount in paise — Razorpay uses paise, which matches our DB directly!
    if (order.total <= 0) {
      return NextResponse.json({ error: "Invalid order amount" }, { status: 400 });
    }

    // 4. Create order on Razorpay
    const rzpOrder = await createRazorpayOrder({
      amountPaise: order.total,
      receipt: order.orderNumber,
      notes: {
        order_id: orderId,
        order_number: order.orderNumber,
        customer_name: order.customerName,
      },
    });

    // 5. Always record razorpayOrderId on the Order row
    await supabaseAdmin
      .from("Order")
      .update({ razorpayOrderId: rzpOrder.id })
      .eq("id", orderId);

    // 6. Record payment in the payments audit table (non-blocking if permissions pending)
    try {
      const { error: insertErr } = await supabaseAdmin
        .from("payments")
        .insert([{
          order_id: orderId,
          razorpay_order_id: rzpOrder.id,
          razorpay_payment_id: null,
          amount: order.total, // paise (matches Order.total)
          currency: "INR",
          status: "created",
        }]);

      if (insertErr) {
        console.warn("[Razorpay] payments table record warning:", insertErr.message);
      }
    } catch (auditErr) {
      console.warn("[Razorpay] payments audit table error:", auditErr);
    }

    // 7. Return order details to client — key_id is the PUBLIC key, safe to expose
    return NextResponse.json({
      razorpay_order_id: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create payment order";
    console.error("[Razorpay] create-order error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
