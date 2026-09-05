import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeCategory, toCategoryDB } from "@/lib/db-normalize";
import { verifyAdmin } from "@/lib/admin-auth";

// CHANGED: table "categories" → "Category", snake_case → camelCase columns
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const body = await request.json();
    const dbRow = toCategoryDB(body);

    const { data, error } = await supabaseAdmin
      .from("Category")
      .update(dbRow)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(normalizeCategory(data));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update category";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// CHANGED: table "categories" → "Category"
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { error } = await supabaseAdmin.from("Category").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
