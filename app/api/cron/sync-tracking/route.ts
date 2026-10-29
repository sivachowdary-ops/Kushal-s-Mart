import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getDelhiveryTrackingStatus } from "@/lib/delhivery";
import { applyTrackingToOrder } from "@/lib/tracking-sync";

export const maxDuration = 60;

/** Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set in the project. */
function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed — without a secret anyone could trigger this job
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(request.headers.get("authorization") || "");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/**
 * GET /api/cron/sync-tracking
 *
 * Vercel Cron Job (daily, see vercel.json). Fetches live Delhivery tracking for active orders
 * with an AWB and updates their status without any admin involvement.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    if (!process.env.CRON_SECRET) {
      console.error("[Cron] CRON_SECRET is not set — refusing to run. Add it in Vercel → Settings → Environment Variables.");
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[Cron] sync-tracking: Starting Delhivery status sync...");

  const { data: activeOrders, error } = await supabaseAdmin
    .from("Order")
    .select("id, orderNumber, shiprocketAwb, status, timeline")
    .not("shiprocketAwb", "is", null)
    .in("status", ["PAID", "PROCESSING", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY"])
    // Least recently updated first, so every shipment gets its turn when there are more than 50
    .order("updatedAt", { ascending: true })
    .limit(50);

  if (error) {
    console.error("[Cron] Order query failed:", error.message);
    return NextResponse.json({ error: "Order query failed" }, { status: 500 });
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
      const newStatus = await applyTrackingToOrder(order, tracking);
      if (newStatus) {
        console.log(`[Cron] ${order.orderNumber}: ${order.status} -> ${newStatus}`);
        updated++;
      }
    } catch (err) {
      console.error(`[Cron] ${order.orderNumber}: error`, err);
      failed++;
    }
    await new Promise((r) => setTimeout(r, 150)); // be gentle with the Delhivery API
  }

  return NextResponse.json({
    synced: activeOrders.length,
    updated,
    failed,
  });
}
