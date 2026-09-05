import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyAdmin } from "@/lib/admin-auth";

/**
 * GET /api/admin/pos-users
 * Returns list of active POS cashier/staff accounts.
 * Security: Only accessible to authenticated admins.
 * Passwords and hashes are NEVER returned.
 */
export async function GET(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized. Admin privileges required." }, { status: 401 });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 100,
    });

    if (error) {
      console.error("[api/admin/pos-users] listUsers error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter only staff accounts created for POS
    const posStaffUsers = (data.users || [])
      .filter((u) => u.user_metadata?.role === "pos_staff")
      .map((u) => ({
        id: u.id,
        email: u.email || "",
        name: (u.user_metadata?.name as string) || "Store Cashier",
        role: "pos_staff",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at || null,
      }));

    return NextResponse.json({ users: posStaffUsers });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch POS staff accounts";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/admin/pos-users
 * Creates a new POS staff account with credentials in Supabase Auth.
 * Security: Only accessible to authenticated admins.
 * Passwords are encrypted directly using bcrypt inside Supabase Auth.
 * Passwords are NEVER stored in plaintext or returned in any response.
 */
export async function POST(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized. Admin privileges required." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { email, password, name } = body;

    // Validate inputs
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Please provide a valid staff email address." }, { status: 400 });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "Staff password must be at least 6 characters long." }, { status: 400 });
    }

    const staffName = (name && typeof name === "string" ? name.trim() : "") || "Store Cashier";
    const cleanEmail = email.trim().toLowerCase();

    // Create user securely via Supabase Admin Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password: password,
      email_confirm: true, // Cashiers can sign in immediately without email link verification
      user_metadata: {
        role: "pos_staff",
        name: staffName,
      },
    });

    if (error) {
      console.error("[api/admin/pos-users] createUser error:", error);
      if (error.message.toLowerCase().includes("already registered") || error.message.toLowerCase().includes("unique")) {
        return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "POS Staff account created successfully.",
      user: {
        id: data.user.id,
        email: data.user.email,
        name: staffName,
        role: "pos_staff",
        created_at: data.user.created_at,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create POS staff account";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/pos-users?id=userId
 * Deletes a POS staff account, immediately revoking their POS access.
 * Security: Only accessible to authenticated admins.
 */
export async function DELETE(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized. Admin privileges required." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("id");

  if (!userId) {
    return NextResponse.json({ error: "User ID is required." }, { status: 400 });
  }

  try {
    // 1. Verify user is a pos_staff user before deleting (prevent accidental admin deletion)
    const { data: userRecord, error: getErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (getErr || !userRecord.user) {
      return NextResponse.json({ error: "Staff user not found." }, { status: 404 });
    }

    if (userRecord.user.user_metadata?.role !== "pos_staff") {
      return NextResponse.json(
        { error: "Only POS staff accounts can be deleted through this endpoint." },
        { status: 403 }
      );
    }

    // 2. Delete user from Supabase Auth
    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (delErr) {
      console.error("[api/admin/pos-users] deleteUser error:", delErr);
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Staff account deleted successfully." });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete staff account";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
