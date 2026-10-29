import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveUserRole } from "@/lib/roles";
import { checkRateLimit, peekRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * POST /api/admin/auth/login
 * Confirms the Bearer token belongs to an admin. Deliberately does NOT require
 * MFA, so the login screen can tell an admin to complete the TOTP step.
 *
 * Rate limiting counts only FAILED checks (5 per 15 min per IP): the admin panel calls this on
 * every load, so counting successes would lock out an admin who simply refreshes the page.
 */
export async function POST(request: Request) {
  const limitKey = `admin-login-failed:${getClientIp(request)}`;
  const rl = await peekRateLimit(limitKey, RATE_LIMITS.adminLogin);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many failed login attempts. Try again in ${rl.retryAfterSeconds} seconds.` },
      { status: 429 }
    );
  }

  const fail = async (error: string, status: number) => {
    await checkRateLimit(limitKey, RATE_LIMITS.adminLogin);
    return NextResponse.json({ error }, { status });
  };

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return fail("Unauthorized", 401);
    }
    const token = authHeader.slice("Bearer ".length).trim();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user || !user.email) {
      return fail("Invalid credentials", 401);
    }

    if (resolveUserRole(user) !== "admin") {
      return fail("Access denied. Not an admin user.", 403);
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
