import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const DEFAULT_SUBCATEGORIES = [
  // Diecast Cars
  { id: "sub-diecast-1-18", name: "1/18 Scale", slug: "1-18-scale", categoryId: "cat-diecast", sortOrder: 1 },
  { id: "sub-diecast-1-24", name: "1/24 Scale", slug: "1-24-scale", categoryId: "cat-diecast", sortOrder: 2 },
  { id: "sub-diecast-1-32", name: "1/32 Scale", slug: "1-32-scale", categoryId: "cat-diecast", sortOrder: 3 },
  { id: "sub-diecast-1-43", name: "1/43 Scale", slug: "1-43-scale", categoryId: "cat-diecast", sortOrder: 4 },
  { id: "sub-diecast-1-64", name: "1/64 Scale", slug: "1-64-scale", categoryId: "cat-diecast", sortOrder: 5 },
  { id: "sub-diecast-hotwheels", name: "Hotwheels", slug: "hotwheels", categoryId: "cat-diecast", sortOrder: 6 },
  // RC Cars
  { id: "sub-rc-off-road", name: "Off Road", slug: "off-road", categoryId: "cat-rc-cars", sortOrder: 1 },
  { id: "sub-rc-on-road", name: "On Road", slug: "on-road", categoryId: "cat-rc-cars", sortOrder: 2 },
];

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("SubCategory")
      .select("id, name, slug, categoryId, sortOrder")
      .order("sortOrder", { ascending: true });

    if (error || !data || data.length === 0) {
      return NextResponse.json({ subcategories: DEFAULT_SUBCATEGORIES });
    }

    return NextResponse.json(
      { subcategories: data },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch {
    return NextResponse.json({ subcategories: DEFAULT_SUBCATEGORIES });
  }
}
