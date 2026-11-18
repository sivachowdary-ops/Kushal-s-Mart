import { NextResponse } from "next/server";
import { getCatalogRows } from "@/lib/storefront-data";

// Public — no auth. Returns all categories with their active product counts.
// The header calls this on every page, so it reads the shared catalog cache (refreshed by admin
// edits and sales) instead of making two Supabase queries per CDN miss.
export async function GET() {
  const { categories, rawProducts } = await getCatalogRows();

  const countMap: Record<string, number> = {};
  rawProducts.forEach((p: { categoryId: string }) => {
    countMap[p.categoryId] = (countMap[p.categoryId] || 0) + 1;
  });

  return NextResponse.json(
    {
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description || null,
        image_url: c.imageUrl || null,
        sort_order: c.sortOrder || 0,
        product_count: countMap[c.id] || 0,
      })),
    },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
  );
}
