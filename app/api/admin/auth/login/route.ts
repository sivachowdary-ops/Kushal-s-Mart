import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user || !user.email) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Server-side role verification: check app_metadata or authorized admin list
    const isAdmin =
      user.app_metadata?.role === "admin" ||
      user.user_metadata?.role === "admin" ||
      user.email === "jogabetha@gmail.com" ||
      user.email === "sivaprasadpenneti8@gmail.com";

    if (!isAdmin) {
      return NextResponse.json({ error: "Access denied. Not an admin user." }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, role: "admin" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Authentication failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
