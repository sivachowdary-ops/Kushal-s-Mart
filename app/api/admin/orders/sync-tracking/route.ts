import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { syncActiveShipments } from "@/lib/tracking-sync";

export const maxDuration = 60;

// One run every 2 minutes per server instance is plenty; the admin pages call this on open
const MIN_INTERVAL_MS = 2 * 60 * 1000;
let lastRunAt = 0;

/**
 * POST /api/admin/orders/sync-tracking
 *
 * Pulls the latest Delhivery status for active shipments, so the admin sees Picked up / In transit /
 * Delivered as it happens instead of waiting for the nightly cron.
 */
export async function POST(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (Date.now() - lastRunAt < MIN_INTERVAL_MS) {
    return NextResponse.json({ skipped: true, updated: 0 });
  }
  lastRunAt = Date.now();

  try {
    return NextResponse.json(await syncActiveShipments(50));
  } catch (err) {
    console.error("[admin/sync-tracking] failed:", err);
    return NextResponse.json({ error: "Tracking sync failed" }, { status: 500 });
  }
}
