import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getDelhiveryTrackingStatus } from "@/lib/delhivery";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params;
    const { data: order, error } = await supabaseAdmin
      .from("Order")
      .select("id, orderNumber, shiprocketAwb, courierName, status, timeline")
      .eq("orderNumber", orderNumber)
      .single();

    if (error || !order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (!order.shiprocketAwb) return NextResponse.json({ hasTracking: false, message: "No shipment yet" });

    const tracking = await getDelhiveryTrackingStatus(order.shiprocketAwb);

    const newStatus = mapStageToStatus(tracking.currentStage);
    if (tracking.success && newStatus && newStatus !== order.status && !["DELIVERED","CANCELLED","COMPLETED"].includes(order.status)) {
      const now = new Date().toISOString();
      const existingTimeline = (order.timeline as Array<{ status: string; timestamp: string; note?: string }>) || [];
      const lastEntry = existingTimeline[existingTimeline.length - 1];
      const newTimeline = lastEntry?.status === newStatus ? existingTimeline : [...existingTimeline, { status: newStatus, timestamp: now, note: getTimelineNote(tracking.currentStage, tracking.currentStatus) }];
      await supabaseAdmin.from("Order").update({ status: newStatus, timeline: newTimeline, updatedAt: now }).eq("id", order.id);
      console.log(`[Tracking] ${orderNumber}: auto-updated ${order.status} -> ${newStatus}`);
    }

    return NextResponse.json({
      hasTracking: true,
      awb: order.shiprocketAwb,
      courierName: order.courierName || "Delhivery Express",
      currentStatus: tracking.currentStatus,
      currentStage: tracking.currentStage,
      statusDetails: tracking.statusDetails,
      expectedDelivery: tracking.expectedDelivery,
      scans: tracking.scans || [],
      trackingUrl: `https://www.delhivery.com/track/package/${order.shiprocketAwb}`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch tracking";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function mapStageToStatus(stage: string): "PACKED" | "SHIPPED" | "DELIVERED" | null {
  if (stage === "PACKED") return "PACKED";
  if (stage === "SHIPPED" || stage === "OUT_FOR_DELIVERY") return "SHIPPED";
  if (stage === "DELIVERED") return "DELIVERED";
  return null;
}

function getTimelineNote(stage: string, rawStatus: string): string {
  if (stage === "PACKED") return "Package picked up by Delhivery Express";
  if (stage === "SHIPPED") return `In transit with Delhivery Express (${rawStatus})`;
  if (stage === "OUT_FOR_DELIVERY") return "Out for delivery - arriving today!";
  if (stage === "DELIVERED") return "Package delivered successfully";
  return rawStatus;
}