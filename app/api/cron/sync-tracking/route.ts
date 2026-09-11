import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getDelhiveryTrackingStatus } from "@/lib/delhivery";

/**
 * GET /api/cron/sync-tracking
 *
 * Vercel Cron Job - runs every hour automatically.
 * Fetches live Delhivery tracking for all active orders with AWB
 * and updates order status in DB without any admin involvement.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || "";

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[Cron] sync-tracking: Starting Delhivery status sync...");

  const { data: activeOrders, error } = await supabaseAdmin
    .from("Order")
    .select("id, orderNumber, shiprocketAwb, status")
    .not("shiprocketAwb", "is", null)
    .not("status", "in", '("DELIVERED","CANCELLED","COMPLETED")')
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!activeOrders || activeOrders.length === 0) {
    return NextResponse.json({ synced: 0, message: "No active orders with AWB" });
  }

  let updated = 0;
  let failed = 0;

  for (const order of activeOrders) {
    try {
      const tracking = await getDelhiveryTrackingStatus(order.shiprocketAwb);

      if (!tracking.success) {
        failed++;
        continue;
      }

      const newStatus = mapDelhiveryStageToStatus(tracking.currentStage);

      if (newStatus && newStatus !== order.status) {
        const now = new Date().toISOString();

        const { data: existing } = await supabaseAdmin
          .from("Order")
          .select("timeline")
          .eq("id", order.id)
          .single();

        const existingTimeline = (existing?.timeline as Array<{ status: string; timestamp: string; note?: string }>) || [];
        const lastEntry = existingTimeline[existingTimeline.length - 1];

        const newTimeline = lastEntry?.status === newStatus
          ? existingTimeline
          : [
              ...existingTimeline,
              {
                status: newStatus,
                timestamp: now,
                note: getTimelineNote(tracking.currentStage, tracking.currentStatus),
              },
            ];

        await supabaseAdmin
          .from("Order")
          .update({ status: newStatus, timeline: newTimeline, updatedAt: now })
          .eq("id", order.id);

        console.log(`[Cron] ${order.orderNumber}: ${order.status} -> ${newStatus}`);
        updated++;
      }
    } catch (err) {
      console.error(`[Cron] ${order.orderNumber}: error`, err);
      failed++;
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  return NextResponse.json({
    synced: activeOrders.length,
    updated,
    failed,
  });
}

function mapDelhiveryStageToStatus(stage: string): "PACKED" | "SHIPPED" | "DELIVERED" | null {
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
