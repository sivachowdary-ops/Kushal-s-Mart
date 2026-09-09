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

    // Prevent duplicate dispatch attempts if AWB already generated
    if (order.shiprocket_awb) {
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

    const shippingAddress = order.shipping_address as {
      address?: string;
      city?: string;
      state?: string;
      pincode?: string;
    } | null;

    if (!shippingAddress?.address || !shippingAddress?.pincode) {
      return NextResponse.json(
        { error: "Order has incomplete shipping address for Delhivery dispatch" },
        { status: 400 }
      );
    }

    // Call Delhivery Dispatch API
    const result = await createDelhiveryShipment({
      orderId: id,
      orderNumber: order.order_number,
      customerName: order.customer_name || "Valued Customer",
      customerPhone: order.customer_phone || "9999999999",
      customerEmail: order.customer_email || undefined,
      shippingAddress: {
        address: shippingAddress.address,
        city: shippingAddress.city || "Kochi",
        state: shippingAddress.state || "Kerala",
        pincode: shippingAddress.pincode,
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
