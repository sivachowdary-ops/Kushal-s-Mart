import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getDelhiveryTrackingStatus } from "@/lib/delhivery";
import { applyTrackingToOrder } from "@/lib/tracking-sync";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * GET /api/orders/[orderNumber]/tracking
 * Public live Delhivery tracking for the Track Order page. Rate-limited per IP because each call
 * can reach Delhivery and update the order.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  const rl = checkRateLimit(`tracking:${getClientIp(request)}`, RATE_LIMITS.tracking);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many tracking requests. Try again in ${rl.retryAfterSeconds} seconds.` },
      { status: 429 }
    );
  }

  try {
    const { orderNumber } = await params;
    if (!/^KM-[A-Z0-9-]{4,30}$/i.test(orderNumber)) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const { data: order, error } = await supabaseAdmin
      .from("Order")
      .select("id, orderNumber, shiprocketAwb, courierName, status, timeline")
      .eq("orderNumber", orderNumber)
      .maybeSingle();

    if (error || !order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (!order.shiprocketAwb || order.shiprocketAwb.startsWith("KM-") || order.shiprocketAwb === order.orderNumber) {
      return NextResponse.json({ hasTracking: false, message: "No active shipment AWB yet" });
    }

    const tracking = await getDelhiveryTrackingStatus(order.shiprocketAwb);
    const updatedTo = await applyTrackingToOrder(order, tracking);
    if (updatedTo) console.log(`[Tracking] ${orderNumber}: ${order.status} -> ${updatedTo}`);

    return NextResponse.json({
      success: tracking.success,
      hasTracking: tracking.success && (tracking.scans?.length > 0 || (tracking.currentStatus !== "UNKNOWN" && tracking.currentStatus !== "")),
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
    console.error("[Tracking] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to fetch tracking" }, { status: 500 });
  }
}
