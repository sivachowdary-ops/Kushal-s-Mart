import type { User } from "@supabase/supabase-js";

/**
 * Admin accounts recognised by email. SERVER-ONLY: don't import this from a "use client" file —
 * that would ship the admin emails to every visitor. Pages ask /api/admin/auth/me instead.
 */
const ADMIN_EMAILS = new Set(["jogabetha@gmail.com", "sivaprasadpenneti8@gmail.com"]);

export type StaffRole = "admin" | "pos_staff";

/**
 * Resolves a user's role from server-controlled data only.
 *
 * SECURITY: `user_metadata` is writable by the user themselves
 * (supabase.auth.updateUser({ data })), so it must NEVER grant privileges.
 * `app_metadata` can only be set with the service-role key.
 */
export function resolveUserRole(user: Pick<User, "email" | "app_metadata">): StaffRole | null {
  const email = user.email?.trim().toLowerCase();
  if (email && ADMIN_EMAILS.has(email)) return "admin";
  const role = user.app_metadata?.role;
  if (role === "admin") return "admin";
  if (role === "pos_staff") return "pos_staff";
  return null;
}
