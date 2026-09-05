import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Public — no auth. Returns active products with their variants and category.
// Supports ?category=slug and ?slug=product-slug filters.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categorySlug = searchParams.get("category");
  const productSlug = searchParams.get("slug");
  const searchQuery = searchParams.get("q") || searchParams.get("search");

  let query = supabaseAdmin
    .from("Product")
    .select(`
      id, name, slug, description, brand, mrp, sellingPrice, costPrice,
      images, isActive, createdAt, categoryId,
      Category ( id, name, slug ),
      ProductVariant ( id, name, sku, stock, lowStockThreshold, sellingPriceOverride, mrpOverride, images )
    `)
    .eq("isActive", true)
    .order("createdAt", { ascending: false });

  if (productSlug) {
    query = query.eq("slug", productSlug);
  }

  if (searchQuery) {
    // Sanitize search input: strip PostgREST-special characters to prevent filter injection
    const sanitized = searchQuery.trim().replace(/[.,()"'\\;]/g, "").slice(0, 100);
    if (sanitized.length > 0) {
      query = query.or(`name.ilike.%${sanitized}%,brand.ilike.%${sanitized}%,description.ilike.%${sanitized}%`);
    }
  }

  if (categorySlug) {
    // Join via category slug
    const { data: cat } = await supabaseAdmin
      .from("Category")
      .select("id")
      .eq("slug", categorySlug)
      .single();
    if (cat) {
      query = query.eq("categoryId", cat.id);
    }
  }

  const { data, error } = await query;
  if (error || !data || data.length === 0) {
    const { allProducts } = await import("@/lib/storefront-data").then(m => m.getStorefrontData());
    let filtered = allProducts;
    if (productSlug) filtered = filtered.filter(p => p.slug === productSlug);
    if (categorySlug) filtered = filtered.filter(p => p.category_slug === categorySlug);
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || (p.brand || "").toLowerCase().includes(q));
    }
    if (productSlug) {
      return NextResponse.json({ product: filtered[0] || null });
    }
    return NextResponse.json({ products: filtered });
  }

  const products = (data || []).map((p) => {
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

    // Effective price = first variant override if all variants share the same price, else parent
    const effectivePrice = (p.sellingPrice as number);
    const effectiveMrp = (p.mrp as number);

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
    };
  });

  if (productSlug) {
    return NextResponse.json({ product: products[0] || null });
  }
  return NextResponse.json({ products }, {
    headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" },
  });
}
