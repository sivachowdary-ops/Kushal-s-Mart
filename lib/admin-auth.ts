import { createClient, type User } from "@supabase/supabase-js";
import { resolveUserRole } from "@/lib/roles";

/** Reads the `aal` claim from an access token that Supabase has already validated. */
function getAuthAssuranceLevel(token: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return typeof payload.aal === "string" ? payload.aal : null;
  } catch {
    return null;
  }
}

/**
 * When ADMIN_REQUIRE_MFA=true, admin API calls need an aal2 session
 * (password + Supabase TOTP). Leave unset until every admin has enrolled
 * an authenticator in Admin → Settings, otherwise admins are locked out.
 */
function adminMfaRequired(): boolean {
  return process.env.ADMIN_REQUIRE_MFA === "true";
}

async function getVerifiedUser(request: Request): Promise<{ user: User; token: string } | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return null;

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user || !user.email) return null;
    return { user, token };
  } catch {
    return null;
  }
}

/**
 * Validates admin authentication:
 * 1. Verifies Bearer token via Supabase Auth
 * 2. Resolves role from server-controlled data (email allowlist / app_metadata)
 * 3. Optionally requires an MFA (aal2) session
 */
export async function verifyAdmin(request: Request) {
  const verified = await getVerifiedUser(request);
  if (!verified) return null;

  if (resolveUserRole(verified.user) !== "admin") return null;
  if (adminMfaRequired() && getAuthAssuranceLevel(verified.token) !== "aal2") return null;

  return { ...verified.user, role: "admin" as const };
}

/**
 * Validates admin OR registered POS cashier staff:
 * Used by endpoints that both admins and POS cashiers need (orders, products catalog, categories).
 */
export async function verifyAdminOrStaff(request: Request) {
  const verified = await getVerifiedUser(request);
  if (!verified) return null;

  const role = resolveUserRole(verified.user);
  if (!role) return null;
  if (role === "admin" && adminMfaRequired() && getAuthAssuranceLevel(verified.token) !== "aal2") {
    return null;
  }

  return { ...verified.user, role };
}
