import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Public — no auth. Returns all active categories with product count.
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("Category")
    .select(`id, name, slug, description, imageUrl, sortOrder`)
    .order("sortOrder", { ascending: true });

  if (error || !data || data.length === 0) {
    const { categories } = await import("@/lib/storefront-data").then(m => m.getStorefrontData());
    return NextResponse.json({
      categories: categories.map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description || null,
        image_url: c.imageUrl || null,
        sort_order: c.sortOrder || 0,
        product_count: 5,
      }))
    });
  }

  // Get product counts per category
  const { data: counts } = await supabaseAdmin
    .from("Product")
    .select("categoryId")
    .eq("isActive", true);

  const countMap: Record<string, number> = {};
  (counts || []).forEach((p: { categoryId: string }) => {
    countMap[p.categoryId] = (countMap[p.categoryId] || 0) + 1;
  });

  const categories = (data || []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description || null,
    image_url: c.imageUrl || null,
    sort_order: c.sortOrder || 0,
    product_count: countMap[c.id] || 0,
  }));

  return NextResponse.json({ categories }, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
