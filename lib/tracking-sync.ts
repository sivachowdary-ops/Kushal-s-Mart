import { supabaseAdmin } from "@/lib/supabase-admin";
import type { DelhiveryTrackingResult } from "@/lib/delhivery";

type TimelineEntry = { status: string; timestamp: string; note?: string };

/**
 * Order statuses that live courier tracking may change. Unpaid, failed, cancelled and finished
 * orders are never touched, whatever Delhivery reports for their AWB.
 */
const TRACKABLE_STATUSES = ["PAID", "PROCESSING", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY"];

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

/**
 * Saves the Delhivery status onto the order when it differs. Used by the customer tracking page
 * and the daily cron. Returns the new status, or null when nothing changed.
 */
export async function applyTrackingToOrder(
  order: { id: string; status: string; timeline?: unknown },
  tracking: DelhiveryTrackingResult
): Promise<string | null> {
  if (!tracking.success || !TRACKABLE_STATUSES.includes(order.status)) return null;

  const newStatus = mapStageToStatus(tracking.currentStage);
  if (!newStatus || newStatus === order.status) return null;

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
