import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
export async function GET() {
  try {
    const { error } = await supabaseAdmin.from("Category").select("id").limit(1);
    if (error) {
      console.error("[health] DB error:", error.message);
      return NextResponse.json({ status: "error", message: "Database connectivity issue" }, { status: 500 });
    }
    return NextResponse.json({ status: "ok", connected: true });
  } catch (err: unknown) {
    console.error("[health] Check failed:", err);
    return NextResponse.json({ status: "error", message: "Health check failed" }, { status: 500 });
  }
}
