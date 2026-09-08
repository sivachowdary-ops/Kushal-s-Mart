import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createCashfreeOrder } from "@/lib/cashfree";

/**
 * POST /api/payments/create-order
 *
 * Creates a Cashfree order for an existing PENDING_PAYMENT Order.
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
      .select("id, orderNumber, total, customerName, customerPhone, customerEmail, status")
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

    // 2. Idempotency: check if a valid Cashfree order already exists for this Order
    const { data: existingPayment } = await supabaseAdmin
      .from("payments")
      .select("payment_session_id, status")
      .eq("order_id", orderId)
      .in("status", ["created", "active"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingPayment?.payment_session_id) {
      // Reuse existing payment session instead of creating a duplicate
      return NextResponse.json({
        payment_session_id: existingPayment.payment_session_id,
      });
    }

    // 3. Calculate amount in rupees (Cashfree uses decimal rupees, NOT paise)
    const amountRupees = parseFloat((order.total / 100).toFixed(2));

    if (amountRupees <= 0) {
      return NextResponse.json({ error: "Invalid order amount" }, { status: 400 });
    }

    // 4. Build return URL — {order_id} is a Cashfree template variable they replace
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const returnUrl = `${siteUrl}/order/${order.orderNumber}?cf_order_id={order_id}`;

    // 5. Create order on Cashfree
    const cfResponse = await createCashfreeOrder({
      orderId: order.orderNumber,
      amount: amountRupees,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail || undefined,
      returnUrl,
    });

    // 6. Store payment record in our DB
    const { error: insertErr } = await supabaseAdmin
      .from("payments")
      .insert([{
        order_id: orderId,
        cashfree_order_id: cfResponse.order_id,
        cf_payment_id: null,
        payment_session_id: cfResponse.payment_session_id,
        amount: order.total, // store in paise (matches Order.total)
        currency: "INR",
        status: "created",
      }]);

    if (insertErr) {
      console.error("[Cashfree] Failed to insert payment row:", insertErr);
      return NextResponse.json(
        { error: "Failed to record payment. Please try again." },
        { status: 500 }
      );
    }

    // 7. Return session ID to client — NEVER return CASHFREE_CLIENT_SECRET
    return NextResponse.json({
      payment_session_id: cfResponse.payment_session_id,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create payment order";
    console.error("[Cashfree] create-order error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
