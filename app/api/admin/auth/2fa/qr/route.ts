import { NextResponse } from "next/server";

/**
 * Retired: this returned the admin's TOTP secret to any valid admin token.
 * Admin 2FA now uses Supabase Auth MFA (Admin → Settings → Two-Factor Authentication).
 * Safe to delete this file together with lib/totp.ts.
 */
export async function GET() {
  return NextResponse.json({ error: "This endpoint has been retired." }, { status: 410 });
}
