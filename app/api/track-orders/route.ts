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

  // Return sanitized orders — safe for public tracking
  const sanitized = (orders || []).map((o: Record<string, unknown>) => {
    const rawItems = ((o.OrderItem as Record<string, unknown>[]) || []).map((item) => ({
      id: item.id as string || String(Math.random()),
      product_name: item.productName as string,
      variant_name: item.variantName as string,
      quantity: item.quantity as number,
      unit_price: (item.unitPrice as number) || 0,
      line_total: item.lineTotal as number,
      image: item.image as string | null,
    }));

    // Construct a sensible status timeline based on order status
    const currentStatus = (o.status as string) || "PENDING";
    const statusOrder = ["PENDING", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED"];
    const currentIdx = statusOrder.indexOf(currentStatus);
    const createdAt = (o.createdAt as string) || new Date().toISOString();
    const updatedAt = (o.updatedAt as string) || createdAt;

    const timeline: { status: string; timestamp: string; note?: string }[] = [
      { status: "PENDING", timestamp: createdAt, note: "Order placed successfully" },
    ];
    if (currentIdx >= 1) {
      timeline.push({ status: "PROCESSING", timestamp: updatedAt, note: "Payment verified, preparing order" });
    }
    if (currentIdx >= 2) {
      timeline.push({ status: "PACKED", timestamp: updatedAt, note: "Items packed securely with quality check" });
    }
    if (currentIdx >= 3) {
      timeline.push({ status: "SHIPPED", timestamp: updatedAt, note: `Dispatched with ${o.courierName || "Express Courier"} (AWB: ${o.shiprocketAwb || "Assigned"})` });
    }
    if (currentIdx >= 4) {
      timeline.push({ status: "DELIVERED", timestamp: updatedAt, note: "Package handed over to recipient" });
    }

    return {
      id: o.id as string || (o.orderNumber as string),
      order_number: o.orderNumber,
      status: currentStatus,
      customer_name: o.customerName,
      subtotal: o.subtotal,
      discount: o.discount,
      total: o.total,
      payment_status: o.paymentStatus,
      payment_mode: o.paymentMode,
      courier_name: o.courierName,
      shiprocket_awb: o.shiprocketAwb,
      tracking_awb: o.shiprocketAwb,
      tracking_url: o.shiprocketAwb ? `https://www.delhivery.com/track/package/${o.shiprocketAwb}` : null,
      created_at: createdAt,
      timeline,
      items: rawItems,
      order_items: rawItems,
    };
  });

  return NextResponse.json({ orders: sanitized });
}
