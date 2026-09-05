import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeCategory, toCategoryDB } from "@/lib/db-normalize";
import { verifyAdmin, verifyAdminOrStaff } from "@/lib/admin-auth";

// CHANGED: table "categories" → "Category", column "sort_order" → "sortOrder"
export async function GET(request: Request) {
  const user = await verifyAdminOrStaff(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("Category")
    .select("*")
    .order("sortOrder", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data || []).map(normalizeCategory));
}

// CHANGED: table "categories" → "Category", body fields mapped camelCase → snake_case
export async function POST(request: Request) {
  const user = await verifyAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    if (!body.name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const dbRow = toCategoryDB(body);
    if (!dbRow.slug) {
      dbRow.slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
    }

    const { data, error } = await supabaseAdmin
      .from("Category")
      .insert([dbRow])
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(normalizeCategory(data), { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create category";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
