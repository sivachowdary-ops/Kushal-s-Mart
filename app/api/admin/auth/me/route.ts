import { NextResponse } from "next/server";
import { verifyAdminOrStaff } from "@/lib/admin-auth";

/**
 * GET /api/admin/auth/me
 * Tells the POS whether the signed-in user is an admin or a cashier. The role check runs here on
 * the server so the list of admin emails never ships to the browser.
 */
export async function GET(request: Request) {
  const user = await verifyAdminOrStaff(request);
  if (!user) return NextResponse.json({ error: "Not authorized for the POS" }, { status: 403 });
  return NextResponse.json({ role: user.role, email: user.email });
}
