import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { revalidateStorefront } from "@/lib/revalidate-storefront";

/**
 * POST /api/admin/revalidate — admin only.
 *
 * "Refresh website now" in Admin → Settings. Admin edits refresh the cached storefront on their
 * own; this is for changes made directly in Supabase (Table Editor, SQL), which the site can't
 * see, so they'd otherwise wait for the daily refresh. Each page rebuilds on its next visit.
 */
export async function POST(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidateStorefront("manual refresh from Admin → Settings");
  return NextResponse.json({ success: true, refreshedAt: new Date().toISOString() });
}
