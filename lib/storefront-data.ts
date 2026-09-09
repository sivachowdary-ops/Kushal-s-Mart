import { supabaseAdmin } from "@/lib/supabase-admin";
import fallbackData from "./fallback-catalog.json";

export interface StorefrontCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
}

export interface StorefrontVariant {
  id: string;
  name: string;
  sku?: string;
  stock: number;
  sellingPriceOverride?: number | null;
  images?: string[];
}

export interface StorefrontProduct {
  id: string;
  name: string;
  slug: string;
  description?: string;
  brand?: string | null;
  mrp: number;
  sellingPrice: number;
  selling_price?: number;
  images: string[];
  imageUrl?: string;
  categoryId: string;
  category_slug: string;
  category_name: string;
  discountPercent: number;
  badgeType: "DEALS" | "SAVE" | "NEW" | "BESTSELLER";
  inStock: boolean;
  variants: StorefrontVariant[];
}

// In-memory persistent cache with 30s TTL
let cachedCategories: StorefrontCategory[] = (fallbackData.categories || []) as StorefrontCategory[];
let cachedRawProducts: any[] = fallbackData.products || [];
let lastFetchTime = 0;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

/**
 * Normalizes a raw Product row from Supabase (or fallback JSON)
 * into a fully-typed StorefrontProduct with guaranteed category information.
 */
export function normalizeStoreProduct(p: any, categorySlugMap?: Map<string, string>): StorefrontProduct {
  const variants = ((p.ProductVariant || []) as any[]).map((v) => ({
    id: v.id,
    name: v.name || "Default",
    sku: v.sku || "",
    stock: typeof v.stock === "number" ? v.stock : 0,
    sellingPriceOverride: v.sellingPriceOverride ?? null,
    selling_price_override: v.sellingPriceOverride ?? null,
    mrpOverride: v.mrpOverride ?? null,
    mrp_override: v.mrpOverride ?? null,
    images: Array.isArray(v.images) ? v.images : [],
  }));

  const inStock = variants.length === 0 || variants.some((v) => v.stock > 0);
  const disc = p.mrp > p.sellingPrice
    ? Math.round(((p.mrp - p.sellingPrice) / p.mrp) * 100)
    : 0;

  // Resolve category slug robustly:
  // 1. Nested Category object
  // 2. Map lookup
  // 3. Known ID lookup
  // 4. Heuristic from product name/slug
  const catObj = Array.isArray(p.Category) ? p.Category[0] : p.Category;
  let categorySlug: string = catObj?.slug || "";
  let categoryName: string = catObj?.name || "";

  if (!categorySlug && p.categoryId) {
    if (categorySlugMap?.has(p.categoryId)) {
      categorySlug = categorySlugMap.get(p.categoryId)!;
    } else if (p.categoryId === "cat-rc-cars") {
      categorySlug = "rc-cars";
      categoryName = "RC Cars";
    } else if (p.categoryId === "cat-diecast") {
      categorySlug = "diecast-metal-cars";
      categoryName = "Diecast Metal Cars";
    } else if (p.categoryId === "cat-premium") {
      categorySlug = "premium";
      categoryName = "Premium";
    }
  }

  // Final heuristic fallback based on product name / slug keywords
  if (!categorySlug) {
    const text = `${p.name} ${p.slug}`.toLowerCase();
    if (text.includes("1/64") || text.includes("diecast")) {
      categorySlug = "diecast-metal-cars";
    } else if (text.includes("lorry") || text.includes("truck with trailer") || text.includes("land rover") || text.includes("landcruiser")) {
      categorySlug = "premium";
    } else {
      categorySlug = "rc-cars";
    }
  }

  const imagesList = Array.isArray(p.images) ? p.images : [];

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description || "",
    brand: p.brand || null,
    mrp: p.mrp,
    sellingPrice: p.sellingPrice,
    selling_price: p.sellingPrice,
    images: imagesList,
    imageUrl: imagesList[0] || undefined,
    categoryId: p.categoryId || "cat-rc-cars",
    category_slug: categorySlug,
    category_name: categoryName || "Models",
    discountPercent: disc,
    badgeType: (disc >= 25 ? "DEALS" : "SAVE"),
    inStock,
    variants,
  };
}

/**
 * Fetches homepage products and categories with built-in retry and in-memory fallback.
 * Prevents the homepage from EVER displaying "Coming Soon" due to cold starts or network glitches.
 */
export async function getStorefrontData(forceRefresh = false) {
  const now = Date.now();
  if (
    !forceRefresh &&
    cachedCategories.length > 0 &&
    cachedRawProducts.length > 0 &&
    now - lastFetchTime < CACHE_TTL_MS
  ) {
    const categorySlugMap = new Map<string, string>();
    cachedCategories.forEach((c) => categorySlugMap.set(c.id, c.slug));
    return {
      categories: cachedCategories,
      allProducts: cachedRawProducts.map((p) => normalizeStoreProduct(p, categorySlugMap)),
    };
  }

  try {
    const [catRes, prodRes] = await Promise.all([
      supabaseAdmin
        .from("Category")
        .select("id, name, slug, description, imageUrl, sortOrder")
        .order("sortOrder", { ascending: true }),
      supabaseAdmin
        .from("Product")
        .select(`
          id, name, slug, brand, mrp, sellingPrice, images, categoryId, isActive, description,
          Category ( id, name, slug ),
          ProductVariant ( id, name, sku, stock, sellingPriceOverride, mrpOverride, images )
        `)
        .eq("isActive", true)
        .order("createdAt", { ascending: false })
        .limit(60),
    ]);

    let categories = catRes.data;
    let rawProducts = prodRes.data;

    // If query failed or returned empty data (transient DB hiccup), retry once after 200ms
    if ((!categories || categories.length === 0) || (!rawProducts || rawProducts.length === 0)) {
      await new Promise((r) => setTimeout(r, 200));
      const [retryCat, retryProd] = await Promise.all([
        supabaseAdmin
          .from("Category")
          .select("id, name, slug, description, imageUrl, sortOrder")
          .order("sortOrder", { ascending: true }),
        supabaseAdmin
          .from("Product")
          .select(`
            id, name, slug, brand, mrp, sellingPrice, images, categoryId, isActive, description,
            Category ( id, name, slug ),
            ProductVariant ( id, name, sku, stock, sellingPriceOverride, mrpOverride, images )
          `)
          .eq("isActive", true)
          .order("createdAt", { ascending: false })
          .limit(60),
      ]);
      if (retryCat.data && retryCat.data.length > 0) categories = retryCat.data;
      if (retryProd.data && retryProd.data.length > 0) rawProducts = retryProd.data;
    }

    // If categories succeeded, update cache
    if (categories && categories.length > 0) {
      cachedCategories = categories as StorefrontCategory[];
      lastFetchTime = Date.now();
    }

    // If products succeeded, update cache
    if (rawProducts && rawProducts.length > 0) {
      cachedRawProducts = rawProducts;
      lastFetchTime = Date.now();
    }
  } catch (error) {
    console.warn("[storefront-data] Supabase query error, serving from memory cache:", error);
  }

  // Use current or cached categories and products
  const activeCategories = cachedCategories.length > 0 ? cachedCategories : (fallbackData.categories as StorefrontCategory[]);
  const activeRawProducts = cachedRawProducts.length > 0 ? cachedRawProducts : fallbackData.products;

  const categorySlugMap = new Map<string, string>();
  activeCategories.forEach((c) => categorySlugMap.set(c.id, c.slug));

  const allProducts = activeRawProducts.map((p) => normalizeStoreProduct(p, categorySlugMap));

  return {
    categories: activeCategories,
    allProducts,
  };
}

/**
 * Fast lookup for a single product by slug with memory-cache acceleration.
 * Resolves in < 1ms if catalog is cached.
 */
export async function getProductBySlug(slug: string): Promise<StorefrontProduct | null> {
  const { allProducts } = await getStorefrontData();
  const found = allProducts.find((p) => p.slug === slug);
  if (found) return found;

  // Direct Supabase query fallback for any product outside top list
  try {
    const { data } = await supabaseAdmin
      .from("Product")
      .select(`
        id, name, slug, brand, mrp, sellingPrice, images, categoryId, isActive, description,
        Category ( id, name, slug ),
        ProductVariant ( id, name, sku, stock, sellingPriceOverride, mrpOverride, images )
      `)
      .eq("slug", slug)
      .eq("isActive", true)
      .maybeSingle();

    if (data) {
      return normalizeStoreProduct(data);
    }
  } catch (err) {
    console.warn("[getProductBySlug] Direct query error:", err);
  }

  return null;
}
