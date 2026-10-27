import { NextResponse } from "next/server";

/**
 * Retired: the old custom TOTP check was never enforced server-side.
 * Admin 2FA now uses Supabase Auth MFA (Admin → Settings → Two-Factor Authentication).
 * Safe to delete this file together with lib/totp.ts.
 */
export async function POST() {
  return NextResponse.json({ error: "This endpoint has been retired." }, { status: 410 });
}
