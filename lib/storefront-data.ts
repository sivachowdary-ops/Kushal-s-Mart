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

export interface StorefrontSubCategory {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  category_id?: string;
  sortOrder: number;
  sort_order?: number;
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
  subCategoryId?: string | null;
  subCategorySlug?: string | null;
  subCategoryName?: string | null;
  sub_category_id?: string | null;
  sub_category_slug?: string | null;
  sub_category_name?: string | null;
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

  // Resolve subcategory robustly:
  let subCategoryId = p.subCategoryId || p.sub_category_id || null;
  let subCategorySlug = p.subCategorySlug || p.sub_category_slug || (p.SubCategory?.slug || null);
  let subCategoryName = p.SubCategory?.name || null;

  if (!subCategorySlug) {
    const text = `${p.name} ${p.slug}`.toLowerCase();
    if (categorySlug === "diecast-metal-cars") {
      if (text.includes("1/18") || text.includes("1:18")) {
        subCategorySlug = "1-18-scale";
        subCategoryId = "sub-diecast-1-18";
        subCategoryName = "1/18 Scale";
      } else if (text.includes("1/24") || text.includes("1:24") || text.includes("mini cooper") || text.includes("defender")) {
        subCategorySlug = "1-24-scale";
        subCategoryId = "sub-diecast-1-24";
        subCategoryName = "1/24 Scale";
      } else if (text.includes("1/32") || text.includes("1:32")) {
        subCategorySlug = "1-32-scale";
        subCategoryId = "sub-diecast-1-32";
        subCategoryName = "1/32 Scale";
      } else if (text.includes("1/43") || text.includes("1:43")) {
        subCategorySlug = "1-43-scale";
        subCategoryId = "sub-diecast-1-43";
        subCategoryName = "1/43 Scale";
      } else if (text.includes("hotwheels") || text.includes("hot wheels")) {
        subCategorySlug = "hotwheels";
        subCategoryId = "sub-diecast-hotwheels";
        subCategoryName = "Hotwheels";
      } else {
        subCategorySlug = "1-64-scale";
        subCategoryId = "sub-diecast-1-64";
        subCategoryName = "1/64 Scale";
      }
    } else if (categorySlug === "rc-cars") {
      if (
        text.includes("monster") ||
        text.includes("thar") ||
        text.includes("crawler") ||
        text.includes("police truck") ||
        text.includes("suchiyu") ||
        text.includes("off-road")
      ) {
        subCategorySlug = "off-road";
        subCategoryId = "sub-rc-off-road";
        subCategoryName = "Off Road";
      } else {
        subCategorySlug = "on-road";
        subCategoryId = "sub-rc-on-road";
        subCategoryName = "On Road";
      }
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
    subCategoryId,
    subCategorySlug,
    subCategoryName,
    sub_category_id: subCategoryId,
    sub_category_slug: subCategorySlug,
    sub_category_name: subCategoryName,
    discountPercent: disc,
    badgeType: (disc >= 25 ? "DEALS" : "SAVE"),
    inStock,
    variants,
  };
}

export const DEFAULT_SUBCATEGORIES: StorefrontSubCategory[] = [
  { id: "sub-diecast-1-18", name: "1/18 Scale", slug: "1-18-scale", categoryId: "cat-diecast", category_id: "cat-diecast", sortOrder: 1, sort_order: 1 },
  { id: "sub-diecast-1-24", name: "1/24 Scale", slug: "1-24-scale", categoryId: "cat-diecast", category_id: "cat-diecast", sortOrder: 2, sort_order: 2 },
  { id: "sub-diecast-1-32", name: "1/32 Scale", slug: "1-32-scale", categoryId: "cat-diecast", category_id: "cat-diecast", sortOrder: 3, sort_order: 3 },
  { id: "sub-diecast-1-43", name: "1/43 Scale", slug: "1-43-scale", categoryId: "cat-diecast", category_id: "cat-diecast", sortOrder: 4, sort_order: 4 },
  { id: "sub-diecast-1-64", name: "1/64 Scale", slug: "1-64-scale", categoryId: "cat-diecast", category_id: "cat-diecast", sortOrder: 5, sort_order: 5 },
  { id: "sub-diecast-hotwheels", name: "Hotwheels", slug: "hotwheels", categoryId: "cat-diecast", category_id: "cat-diecast", sortOrder: 6, sort_order: 6 },
  { id: "sub-rc-off-road", name: "Off Road", slug: "off-road", categoryId: "cat-rc-cars", category_id: "cat-rc-cars", sortOrder: 1, sort_order: 1 },
  { id: "sub-rc-on-road", name: "On Road", slug: "on-road", categoryId: "cat-rc-cars", category_id: "cat-rc-cars", sortOrder: 2, sort_order: 2 },
];

/**
 * Fetches homepage products and categories with built-in retry and in-memory fallback.
 * Prevents the homepage from EVER displaying "Coming Soon" due to cold starts or network glitches.
 */
export async function getStorefrontData(forceRefresh = false): Promise<{
  categories: StorefrontCategory[];
  subcategories: StorefrontSubCategory[];
  allProducts: StorefrontProduct[];
}> {
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
      subcategories: DEFAULT_SUBCATEGORIES,
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
    subcategories: DEFAULT_SUBCATEGORIES,
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
