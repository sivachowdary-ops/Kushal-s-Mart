import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createDelhiveryShipment } from "@/lib/delhivery";
import { normalizeOrder } from "@/lib/db-normalize";
import { verifyAdmin } from "@/lib/admin-auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    // Fetch order with items
    const { data: rawOrder, error: orderError } = await supabaseAdmin
      .from("Order")
      .select(`*, OrderItem (*)`)
      .eq("id", id)
      .single();

    if (orderError || !rawOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = normalizeOrder(rawOrder);

    // Prevent duplicate dispatch attempts if a real AWB already exists. Older orders can hold the
    // order number ("KM-…") in this field instead of an AWB — those still need a real shipment.
    const existingAwb = (order.shiprocket_awb || "").trim();
    const hasRealAwb =
      existingAwb !== "" && !existingAwb.startsWith("KM-") && existingAwb !== order.order_number;
    if (hasRealAwb) {
      return NextResponse.json(
        {
          success: true,
          waybill: order.shiprocket_awb,
          courierName: order.courier_name || "Delhivery Express",
          message: "Shipment already exists for this order.",
        },
        { status: 200 }
      );
    }

    // Never create a courier shipment for an order that hasn't been paid
    if (!["PAID", "PARTIALLY_REFUNDED"].includes(order.payment_status)) {
      return NextResponse.json(
        { error: `Order is not paid (payment status: ${order.payment_status || "PENDING"}) — not dispatching.` },
        { status: 400 }
      );
    }

    const shippingAddress = order.shipping_address as {
      address?: string;
      city?: string;
      state?: string;
      pincode?: string;
    } | null;

    // Every field Delhivery needs must be real. This used to fill gaps with "Kochi", "Kerala" and
    // phone 9999999999, which booked parcels to the wrong city with an unreachable phone number.
    const phone = (order.customer_phone || "").replace(/\D/g, "").slice(-10);
    const missing = [
      !order.customer_name?.trim() && "customer name",
      !/^[6-9]\d{9}$/.test(phone) && "a valid 10-digit phone",
      !shippingAddress?.address?.trim() && "street address",
      !shippingAddress?.city?.trim() && "city",
      !shippingAddress?.state?.trim() && "state",
      !/^\d{6}$/.test(shippingAddress?.pincode || "") && "a 6-digit PIN code",
    ].filter(Boolean);
    if (missing.length > 0 || !shippingAddress) {
      return NextResponse.json(
        { error: `Can't dispatch — the order is missing ${missing.join(", ")}. Correct the order details first.` },
        { status: 400 }
      );
    }

    // Call Delhivery Dispatch API
    const result = await createDelhiveryShipment({
      orderId: id,
      orderNumber: order.order_number,
      customerName: order.customer_name.trim(),
      customerPhone: phone,
      customerEmail: order.customer_email || undefined,
      shippingAddress: {
        address: shippingAddress.address!.trim(),
        city: shippingAddress.city!.trim(),
        state: shippingAddress.state!.trim(),
        pincode: shippingAddress.pincode!,
      },
      items: (order.order_items || []).map((i) => ({
        productName: i.product_name,
        quantity: i.quantity,
        unitPrice: i.unit_price,
      })),
      totalAmount: order.total,
      paymentMode: "prepaid",
    });

    if (!result.success || !result.waybill) {
      return NextResponse.json(
        { error: result.error || "Failed to generate Delhivery AWB" },
        { status: 500 }
      );
    }

    const now = new Date().toISOString();
    const existingTimeline = (rawOrder.timeline as Array<{ status: string; timestamp: string; note?: string }>) || [];
    const newTimeline = [
      ...existingTimeline,
      {
        status: "PACKED",
        timestamp: now,
        note: `Dispatched with Delhivery Express. AWB: ${result.waybill}`,
      },
    ];

    // Update order in Supabase
    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from("Order")
      .update({
        shiprocketAwb: result.waybill, // Stores AWB code
        courierName: "Delhivery Express",
        status: "PACKED",
        timeline: newTimeline,
        updatedAt: now,
      })
      .eq("id", id)
      .select(`*, OrderItem (*)`)
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      waybill: result.waybill,
      courierName: "Delhivery Express",
      trackingUrl: result.trackingUrl,
      order: normalizeOrder(updatedOrder),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
