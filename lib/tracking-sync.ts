import { supabaseAdmin } from "@/lib/supabase-admin";
import { getDelhiveryTrackingStatus, type DelhiveryTrackingResult } from "@/lib/delhivery";
import { isRtcCourier } from "@/lib/shipping";

type TimelineEntry = { status: string; timestamp: string; note?: string };

/**
 * Order statuses that live courier tracking may change. Unpaid, failed, cancelled and finished
 * orders are never touched, whatever Delhivery reports for their AWB.
 */
export const TRACKABLE_STATUSES = ["PAID", "PROCESSING", "PACKED", "PICKED_UP", "IN_TRANSIT", "SHIPPED", "OUT_FOR_DELIVERY"];

/**
 * How far along the delivery each status is. Tracking only ever moves an order forward, so a late
 * or out-of-order Delhivery report can't turn "In transit" back into "Picked up".
 * SHIPPED is the old catch-all for picked up/in transit, kept for older orders and manual use.
 */
const PROGRESS: Record<string, number> = {
  PAID: 0,
  PROCESSING: 0,
  PACKED: 1,
  PICKED_UP: 2,
  SHIPPED: 2,
  IN_TRANSIT: 3,
  OUT_FOR_DELIVERY: 4,
  DELIVERED: 5,
};

const STAGE_TO_STATUS: Record<string, string> = {
  PACKED: "PACKED",
  PICKED_UP: "PICKED_UP",
  IN_TRANSIT: "IN_TRANSIT",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
};

function getTimelineNote(stage: string, rawStatus: string): string {
  if (stage === "PACKED") return "Packed and waiting for Delhivery pickup";
  if (stage === "PICKED_UP") return "Picked up by Delhivery";
  if (stage === "IN_TRANSIT") return `In transit with Delhivery (${rawStatus})`;
  if (stage === "OUT_FOR_DELIVERY") return "Out for delivery - arriving today!";
  if (stage === "DELIVERED") return "Package delivered successfully";
  return rawStatus;
}

/** The status tracking should move the order to, or null to leave it as it is. */
export function nextTrackedStatus(currentStatus: string, stage: string): string | null {
  const next = STAGE_TO_STATUS[stage];
  if (!next || next === currentStatus || !TRACKABLE_STATUSES.includes(currentStatus)) return null;
  const from = PROGRESS[currentStatus] ?? 0;
  const to = PROGRESS[next];
  // Forward only; an old SHIPPED order may also become the exact Picked up / In transit status
  return to > from || (currentStatus === "SHIPPED" && to >= from) ? next : null;
}

/**
 * Saves the Delhivery status onto the order when it moves forward. Used by the customer tracking
 * page, the admin pages and the daily cron. Returns the new status, or null when nothing changed.
 */
export async function applyTrackingToOrder(
  order: { id: string; status: string; timeline?: unknown },
  tracking: DelhiveryTrackingResult
): Promise<string | null> {
  if (!tracking.success) return null;

  const newStatus = nextTrackedStatus(order.status, tracking.currentStage);
  if (!newStatus) return null;

  const now = new Date().toISOString();
  const existingTimeline = (order.timeline as TimelineEntry[] | null) || [];
  const lastEntry = existingTimeline[existingTimeline.length - 1];
  const newTimeline =
    lastEntry?.status === newStatus
      ? existingTimeline
      : [...existingTimeline, { status: newStatus, timestamp: now, note: getTimelineNote(tracking.currentStage, tracking.currentStatus) }];

  // Conditional on the status we read, so a concurrent update (admin, webhook) isn't overwritten
  const { error } = await supabaseAdmin
    .from("Order")
    .update({ status: newStatus, timeline: newTimeline, updatedAt: now })
    .eq("id", order.id)
    .eq("status", order.status);
  if (error) throw new Error(error.message);
  return newStatus;
}

/**
 * Fetches live Delhivery tracking for active orders with an AWB and saves any progress.
 * Least recently updated first, so every shipment gets its turn when there are more than `limit`.
 */
export async function syncActiveShipments(limit = 50): Promise<{ synced: number; updated: number; failed: number }> {
  const query = (skipRtcInDb: boolean) => {
    let q = supabaseAdmin
      .from("Order")
      .select("id, orderNumber, shiprocketAwb, courierName, status, timeline")
      .not("shiprocketAwb", "is", null)
      .in("status", TRACKABLE_STATUSES);
    // APSRTC parcels hold an LR number, not a Delhivery AWB; their status is set by hand
    if (skipRtcInDb) q = q.or("courierName.is.null,courierName.not.ilike.APSRTC*");
    return q.order("updatedAt", { ascending: true }).limit(limit);
  };
  let { data: activeOrders, error } = await query(true);
  if (error) {
    // Never let the filter stop Delhivery tracking — APSRTC orders are also skipped below
    console.warn("[Tracking sync] APSRTC filter failed, retrying without it:", error.message);
    ({ data: activeOrders, error } = await query(false));
  }
  if (error) throw new Error(error.message);

  let updated = 0;
  let failed = 0;
  for (const order of (activeOrders || []).filter((o) => !isRtcCourier(o.courierName))) {
    try {
      const tracking = await getDelhiveryTrackingStatus(order.shiprocketAwb);
      if (!tracking.success) {
        failed++;
        continue;
      }
      const newStatus = await applyTrackingToOrder(order, tracking);
      if (newStatus) {
        console.log(`[Tracking sync] ${order.orderNumber}: ${order.status} -> ${newStatus}`);
        updated++;
      }
    } catch (err) {
      console.error(`[Tracking sync] ${order.orderNumber}: error`, err);
      failed++;
    }
    await new Promise((r) => setTimeout(r, 150)); // be gentle with the Delhivery API
  }
  return { synced: activeOrders?.length || 0, updated, failed };
}
