import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { cancelDelhiveryShipment } from "@/lib/delhivery";
import { verifyAdmin } from "@/lib/admin-auth";

/**
 * POST /api/admin/orders/[id]/delhivery/cancel
 *
 * Allows admin to cancel a Delhivery shipment when an order is cancelled or refunded.
 */
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

    const { data: order, error: orderError } = await supabaseAdmin
      .from("Order")
      .select("id, orderNumber, shiprocketAwb, courierName, timeline")
      .eq("id", id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!order.shiprocketAwb) {
      return NextResponse.json(
        { error: "No active Delhivery shipment found on this order" },
        { status: 400 }
      );
    }

    // Call Delhivery cancellation API
    const result = await cancelDelhiveryShipment(order.shiprocketAwb);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    const now = new Date().toISOString();
    const existingTimeline = (order.timeline as Array<{ status: string; timestamp: string; note?: string }>) || [];
    const newTimeline = [
      ...existingTimeline,
      {
        status: "SHIPMENT_CANCELLED",
        timestamp: now,
        note: `Delhivery shipment cancelled. AWB ${order.shiprocketAwb} voided.`,
      },
    ];

    // Remove AWB and update order status
    await supabaseAdmin
      .from("Order")
      .update({
        shiprocketAwb: null,
        courierName: null,
        timeline: newTimeline,
        updatedAt: now,
      })
      .eq("id", id);

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to cancel shipment";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
