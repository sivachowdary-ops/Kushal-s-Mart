import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * GET /api/track-orders?phone=XXXXXXXXXX
 * Public order tracking — returns limited info. No costPrice, no full address.
 */
export async function GET(request: Request) {
  // Rate limit to prevent phone number enumeration
  const ip = getClientIp(request);
  const rl = checkRateLimit(`track:${ip}`, RATE_LIMITS.trackOrders);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${rl.retryAfterSeconds} seconds.` },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone")?.replace(/\D/g, "");

  if (!phone || phone.length < 10) {
    return NextResponse.json(
      { error: "Please enter a valid 10-digit mobile number." },
      { status: 400 }
    );
  }

  const phoneSuffix = phone.slice(-10);

  const { data: orders, error } = await supabaseAdmin
    .from("Order")
    .select(`
      id, orderNumber, status, channel,
      customerName,
      subtotal, discount, total,
      paymentStatus, paymentMode,
      shiprocketAwb, courierName,
      createdAt, updatedAt,
      OrderItem (
        id, productName, variantName,
        unitPrice, quantity, lineTotal, image
      )
    `)
    .or(`customerPhone.eq.${phoneSuffix},customerPhone.eq.+91${phoneSuffix},customerPhone.eq.91${phoneSuffix}`)
    .neq("status", "CANCELLED")
    .order("createdAt", { ascending: false });

  if (error) {
    console.error("[track-orders] Query error:", error.message);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }

  // Return sanitized orders — no customerPhone, customerEmail, shippingAddress, costPrice, or internal IDs
  const sanitized = (orders || []).map((o: Record<string, unknown>) => ({
    order_number: o.orderNumber,
    status: o.status,
    customer_name: o.customerName,
    total: o.total,
    payment_status: o.paymentStatus,
    courier_name: o.courierName,
    tracking_awb: o.shiprocketAwb,
    created_at: o.createdAt,
    items: ((o.OrderItem as Record<string, unknown>[]) || []).map((item) => ({
      product_name: item.productName,
      variant_name: item.variantName,
      quantity: item.quantity,
      line_total: item.lineTotal,
      image: item.image,
    })),
  }));

  return NextResponse.json({ orders: sanitized });
}
