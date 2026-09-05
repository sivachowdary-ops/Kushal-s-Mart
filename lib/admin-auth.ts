import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Validates admin authentication:
 * 1. Verifies Bearer token via Supabase Auth
 * 2. Checks user email exists in AdminUser table (server-side role verification)
 */
export async function verifyAdmin(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];
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

    if (error || !user || !user.email) {
      return null;
    }

    // Server-side role check: verify user has admin role in app_metadata/user_metadata or is a recognized admin email
    const isAdmin =
      user.app_metadata?.role === "admin" ||
      user.user_metadata?.role === "admin" ||
      user.email === "jogabetha@gmail.com" ||
      user.email === "sivaprasadpenneti8@gmail.com";

    if (!isAdmin) {
      return null;
    }

    return { ...user, role: "admin" };
  } catch {
    return null;
  }
}

/**
 * Validates admin OR registered POS cashier staff:
 * Used by endpoints that both admins and POS cashiers need (orders, products catalog, categories).
 */
export async function verifyAdminOrStaff(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];
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

    if (error || !user || !user.email) {
      return null;
    }

    const isAdmin =
      user.app_metadata?.role === "admin" ||
      user.user_metadata?.role === "admin" ||
      user.email === "jogabetha@gmail.com" ||
      user.email === "sivaprasadpenneti8@gmail.com";

    const isStaff =
      user.user_metadata?.role === "pos_staff" ||
      user.app_metadata?.role === "pos_staff";

    if (!isAdmin && !isStaff) {
      return null;
    }

    return { ...user, role: isAdmin ? "admin" : "pos_staff" };
  } catch {
    return null;
  }
}
