import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveUserRole } from "@/lib/roles";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * POST /api/admin/auth/login
 * Confirms the Bearer token belongs to an admin. Deliberately does NOT require
 * MFA, so the login screen can tell an admin to complete the TOTP step.
 */
export async function POST(request: Request) {
  // Rate-limit admin login: 5 attempts per 15 min per IP (playbook §7.3, §10)
  const ip = getClientIp(request);
  const rl = checkRateLimit(`admin-login:${ip}`, RATE_LIMITS.adminLogin);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many login attempts. Try again in ${rl.retryAfterSeconds} seconds.` },
      { status: 429 }
    );
  }
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice("Bearer ".length).trim();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user || !user.email) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (resolveUserRole(user) !== "admin") {
      return NextResponse.json({ error: "Access denied. Not an admin user." }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, role: "admin" },
      mfaRequired: process.env.ADMIN_REQUIRE_MFA === "true",
    });
  } catch {
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
