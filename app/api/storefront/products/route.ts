import { NextResponse } from "next/server";
import { getCatalogRows } from "@/lib/storefront-data";

// Public — no auth. Returns active products with their variants and category.
// Supports ?category=slug, ?slug=product-slug and ?q=search filters.
// Served from the shared catalog cache (refreshed by admin edits and sales) instead of querying
// Supabase on every CDN miss — the shop, cart, checkout and search all call this.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categorySlug = searchParams.get("category");
  const productSlug = searchParams.get("slug");
  const searchQuery = searchParams.get("q") || searchParams.get("search");

  const { categories, rawProducts } = await getCatalogRows();
  let rows = rawProducts;

  if (productSlug) {
    rows = rows.filter((p) => p.slug === productSlug);
  }

  if (searchQuery) {
    // Same cleanup as before: ignore punctuation and wildcard characters; nothing left = no matches
    const sanitized = searchQuery.trim().replace(/[.,()"'\\;%*_]/g, "").slice(0, 100).toLowerCase();
    if (sanitized.length === 0) {
      return NextResponse.json({ products: [] });
    }
    rows = rows.filter((p) =>
      [p.name, p.brand, p.description].some((field) => typeof field === "string" && field.toLowerCase().includes(sanitized))
    );
  }

  if (categorySlug) {
    const cat = categories.find((c) => c.slug === categorySlug);
    if (cat) rows = rows.filter((p) => p.categoryId === cat.id);
  }

  const products = rows.map((p) => {
    const variants = ((p.ProductVariant || []) as Record<string, unknown>[]).map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      stock: v.stock as number,
      low_stock_threshold: v.lowStockThreshold as number,
      selling_price_override: (v.sellingPriceOverride as number) ?? null,
      mrp_override: (v.mrpOverride as number) ?? null,
      images: (v.images as string[]) || [],
    }));

    // Supabase returns FK relations as arrays; take first element
    const catRaw = p.Category as unknown;
    const cat = Array.isArray(catRaw)
      ? (catRaw[0] as Record<string, unknown> | undefined) ?? null
      : (catRaw as Record<string, unknown> | null);

    const effectivePrice = p.sellingPrice as number;
    const effectiveMrp = p.mrp as number;

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      brand: p.brand || null,
      selling_price: effectivePrice,
      mrp: effectiveMrp,
      images: (p.images as string[]) || [],
      image_url: ((p.images as string[]) || [])[0] || null,
      category_id: p.categoryId,
      category_slug: cat ? (cat.slug as string) : null,
      category_name: cat ? (cat.name as string) : null,
      is_active: p.isActive,
      created_at: p.createdAt,
      variants,
      // Convenience for ProductCard
      discount_percent: effectiveMrp > effectivePrice
        ? Math.round(((effectiveMrp - effectivePrice) / effectiveMrp) * 100)
        : 0,
      in_stock: variants.some((v) => v.stock > 0),
      total_stock: variants.reduce((sum, v) => sum + (v.stock || 0), 0),
    };
  });

  // Short CDN cache on top of the shared catalog cache; misses are cheap now (no database query)
  const headers = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" };
  if (productSlug) {
    return NextResponse.json({ product: products[0] || null }, { headers });
  }
  return NextResponse.json({ products }, { headers });
}
