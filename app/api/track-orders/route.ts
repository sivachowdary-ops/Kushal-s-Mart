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

    const rawAwb = (o.shiprocketAwb as string) || "";
    const cleanAwb = rawAwb && !rawAwb.startsWith("KM-") && rawAwb !== o.orderNumber ? rawAwb : null;

    // Normalize status into chronological 5-stage pipeline:
    // 1: PENDING (Placed) -> 2: PROCESSING (Paid) -> 3: PACKED (AWB created) -> 4: SHIPPED / OUT_FOR_DELIVERY -> 5: DELIVERED
    const rawStatus = ((o.status as string) || "PENDING").toUpperCase();
    const paymentStatus = ((o.paymentStatus as string) || "").toUpperCase();

    let normalizedStatus = "PENDING";
    let stageLevel = 1;

    if (rawStatus === "DELIVERED" || rawStatus === "COMPLETED") {
      normalizedStatus = "DELIVERED";
      stageLevel = 5;
    } else if (rawStatus === "OUT_FOR_DELIVERY") {
      normalizedStatus = "OUT_FOR_DELIVERY";
      stageLevel = 4;
    } else if (rawStatus === "SHIPPED") {
      normalizedStatus = "SHIPPED";
      stageLevel = 4;
    } else if (rawStatus === "PACKED") {
      normalizedStatus = "PACKED";
      stageLevel = 3;
    } else if (rawStatus === "PAID" || rawStatus === "PROCESSING" || paymentStatus === "PAID") {
      normalizedStatus = cleanAwb ? "PACKED" : "PROCESSING";
      stageLevel = cleanAwb ? 3 : 2;
    } else {
      normalizedStatus = "PENDING";
      stageLevel = 1;
    }

    const timeline: { status: string; timestamp: string; note?: string }[] = [
      { status: "PENDING", timestamp: createdAt, note: "Order placed successfully" },
    ];
    if (stageLevel >= 2) {
      timeline.push({ status: "PROCESSING", timestamp: updatedAt, note: "Payment verified, order preparing for packing" });
    }
    if (stageLevel >= 3) {
      timeline.push({ status: "PACKED", timestamp: updatedAt, note: `Packed & ready for dispatch with ${o.courierName || "Delhivery Express"}${cleanAwb ? ` (AWB: ${cleanAwb})` : ""}` });
    }
    if (stageLevel >= 4) {
      timeline.push({ status: rawStatus === "OUT_FOR_DELIVERY" ? "OUT_FOR_DELIVERY" : "SHIPPED", timestamp: updatedAt, note: `Package dispatched and moving in transit` });
    }
    if (stageLevel >= 5) {
      timeline.push({ status: "DELIVERED", timestamp: updatedAt, note: "Package handed over to recipient" });
    }

    return {
      id: o.id as string || (o.orderNumber as string),
      order_number: o.orderNumber,
      status: normalizedStatus,
      customer_name: o.customerName,
      subtotal: o.subtotal,
      discount: o.discount,
      total: o.total,
      payment_status: o.paymentStatus,
      payment_mode: o.paymentMode,
      courier_name: o.courierName,
      shiprocket_awb: cleanAwb,
      tracking_awb: cleanAwb,
      tracking_url: cleanAwb ? `https://www.delhivery.com/track/package/${cleanAwb}` : null,
      created_at: createdAt,
      timeline,
      items: rawItems,
      order_items: rawItems,
    };
  });

  return NextResponse.json({ orders: sanitized });
}
