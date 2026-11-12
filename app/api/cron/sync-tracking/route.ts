import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { syncActiveShipments } from "@/lib/tracking-sync";

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
  try {
    return NextResponse.json(await syncActiveShipments(50));
  } catch (err) {
    console.error("[Cron] sync-tracking failed:", err);
    return NextResponse.json({ error: "Tracking sync failed" }, { status: 500 });
  }
}
