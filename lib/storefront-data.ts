import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { CATALOG_TAG } from "@/lib/revalidate-storefront";
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
  totalStock: number;
  variants: StorefrontVariant[];
}

// Last catalog loaded successfully on this server — only used if the database can't be reached
let lastGoodCategories: StorefrontCategory[] = (fallbackData.categories || []) as StorefrontCategory[];
let lastGoodRawProducts: any[] = fallbackData.products || [];

// The home, shop-by-category and product pages all read this cached catalogue, so it must hold
// every active product. It used to stop at the 60 newest, which hid older products — e.g. only 9 of
// 24 RC cars showed once newer diecast models were added. 1000 is Supabase's default row cap.
const CATALOG_LIMIT = 1000;

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
  const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
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

  // If subCategoryId is present but subCategorySlug is missing, resolve it from known IDs
  if (subCategoryId && !subCategorySlug) {
    const idToSlugMap: Record<string, string> = {
      "sub-diecast-1-34-36": "1-34-1-36-scale",
      "sub-diecast-1-18": "1-18-scale",
      "sub-diecast-1-24": "1-24-scale",
      "sub-diecast-1-32": "1-32-scale",
      "sub-diecast-1-43": "1-43-scale",
      "sub-diecast-1-64": "1-64-scale",
      "sub-diecast-hotwheels": "hotwheels",
      "sub-rc-off-road": "off-road",
      "sub-rc-on-road": "on-road",
    };
    if (idToSlugMap[subCategoryId]) {
      subCategorySlug = idToSlugMap[subCategoryId];
    }
  }

  // A subcategory from a different category (e.g. a diecast "1/64 Scale" on an RC car) can't be
  // shown under this product's category filters — drop it so the name/slug heuristic below
  // places the product instead of it vanishing from every filter.
  const resolvedCategoryId = p.categoryId || (categorySlug === "rc-cars" ? "cat-rc-cars" : categorySlug === "diecast-metal-cars" ? "cat-diecast" : null);
  const knownSub = DEFAULT_SUBCATEGORIES.find((s) => s.slug === subCategorySlug || s.id === subCategoryId);
  if (knownSub && resolvedCategoryId && knownSub.categoryId !== resolvedCategoryId) {
    subCategoryId = null;
    subCategorySlug = null;
    subCategoryName = null;
  }

  // Resolve name from slug when SubCategory relation isn't joined
  if (subCategorySlug && !subCategoryName) {
    const slugNameMap: Record<string, string> = {
      "1-34-1-36-scale": "1/34 & 1/36 Scale",
      "1-18-scale": "1/18 Scale", "1-24-scale": "1/24 Scale",
      "1-32-scale": "1/32 Scale", "1-43-scale": "1/43 Scale",
      "1-64-scale": "1/64 Scale", "hotwheels": "Hotwheels",
      "off-road": "Off Road", "on-road": "On Road",
    };
    subCategoryName = slugNameMap[subCategorySlug] || subCategorySlug;
  }

  if (!subCategorySlug) {
    const text = `${p.name} ${p.slug}`.toLowerCase();
    if (categorySlug === "diecast-metal-cars") {
      if (/1[/:]3[46]\b|1-3[46]-scale/.test(text)) {
        subCategorySlug = "1-34-1-36-scale";
        subCategoryId = "sub-diecast-1-34-36";
        subCategoryName = "1/34 & 1/36 Scale";
      } else if (text.includes("1/18") || text.includes("1:18")) {
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
    totalStock,
    variants,
  };
}

export const DEFAULT_SUBCATEGORIES: StorefrontSubCategory[] = [
  { id: "sub-diecast-1-34-36", name: "1/34 & 1/36 Scale", slug: "1-34-1-36-scale", categoryId: "cat-diecast", category_id: "cat-diecast", sortOrder: 0, sort_order: 0 },
  { id: "sub-diecast-1-18", name: "1/18 Scale", slug: "1-18-scale", categoryId: "cat-diecast", category_id: "cat-diecast", sortOrder: 1, sort_order: 1 },
  { id: "sub-diecast-1-24", name: "1/24 Scale", slug: "1-24-scale", categoryId: "cat-diecast", category_id: "cat-diecast", sortOrder: 2, sort_order: 2 },
  { id: "sub-diecast-1-32", name: "1/32 Scale", slug: "1-32-scale", categoryId: "cat-diecast", category_id: "cat-diecast", sortOrder: 3, sort_order: 3 },
  { id: "sub-diecast-1-43", name: "1/43 Scale", slug: "1-43-scale", categoryId: "cat-diecast", category_id: "cat-diecast", sortOrder: 4, sort_order: 4 },
  { id: "sub-diecast-1-64", name: "1/64 Scale", slug: "1-64-scale", categoryId: "cat-diecast", category_id: "cat-diecast", sortOrder: 5, sort_order: 5 },
  { id: "sub-diecast-hotwheels", name: "Hotwheels", slug: "hotwheels", categoryId: "cat-diecast", category_id: "cat-diecast", sortOrder: 6, sort_order: 6 },
  { id: "sub-rc-off-road", name: "Off Road", slug: "off-road", categoryId: "cat-rc-cars", category_id: "cat-rc-cars", sortOrder: 1, sort_order: 1 },
  { id: "sub-rc-on-road", name: "On Road", slug: "on-road", categoryId: "cat-rc-cars", category_id: "cat-rc-cars", sortOrder: 2, sort_order: 2 },
];

const CATEGORY_SELECT = "id, name, slug, description, imageUrl, sortOrder";
const PRODUCT_SELECT = `
  id, name, slug, brand, mrp, sellingPrice, images, categoryId, subCategoryId, subCategorySlug, isActive, description, createdAt,
  Category ( id, name, slug ),
  ProductVariant ( id, name, sku, stock, lowStockThreshold, sellingPriceOverride, mrpOverride, images )
`;

export interface CatalogRows {
  categories: StorefrontCategory[];
  rawProducts: any[];
}

/**
 * Reads the whole catalog once, retrying a transient failure. Throws rather than returning an
 * empty result, so a database hiccup never gets cached.
 */
async function loadCatalogRows(): Promise<CatalogRows> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const [catRes, prodRes] = await Promise.all([
      supabaseAdmin.from("Category").select(CATEGORY_SELECT).order("sortOrder", { ascending: true }),
      supabaseAdmin
        .from("Product")
        .select(PRODUCT_SELECT)
        .eq("isActive", true)
        .order("createdAt", { ascending: false })
        .limit(CATALOG_LIMIT),
    ]);
    if (!catRes.error && !prodRes.error && catRes.data?.length && prodRes.data?.length) {
      return { categories: catRes.data as StorefrontCategory[], rawProducts: prodRes.data };
    }
    if (attempt === 0) await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("Catalog query failed or returned no products");
}

/**
 * The catalog, shared by every server and request (Next data cache). Refreshed when an admin
 * edit or a sale calls revalidateStorefront(); daily is only a backstop (e.g. for edits made
 * directly in Supabase). It also caps how long pages using it stay cached, so it matches the
 * product and category pages. This replaced a 30-second copy per server that re-read the whole
 * catalog from Supabase many times an hour.
 */
const getCachedCatalogRows = unstable_cache(loadCatalogRows, ["storefront-catalog-v2"], {
  tags: [CATALOG_TAG],
  revalidate: 86400,
});

/** Raw catalog rows (camelCase, as stored), for the public catalog APIs. */
export async function getCatalogRows(): Promise<CatalogRows> {
  try {
    const rows = await getCachedCatalogRows();
    lastGoodCategories = rows.categories;
    lastGoodRawProducts = rows.rawProducts;
    return rows;
  } catch (error) {
    console.warn("[storefront-data] Catalog load failed, serving the last good copy:", error);
    return { categories: lastGoodCategories, rawProducts: lastGoodRawProducts };
  }
}

/**
 * Categories and normalized products for the storefront pages.
 * Never shows "Coming Soon" because of a database hiccup: falls back to the last good copy.
 */
export async function getStorefrontData(): Promise<{
  categories: StorefrontCategory[];
  subcategories: StorefrontSubCategory[];
  allProducts: StorefrontProduct[];
}> {
  const { categories, rawProducts } = await getCatalogRows();
  const categorySlugMap = new Map<string, string>();
  categories.forEach((c) => categorySlugMap.set(c.id, c.slug));

  return {
    categories,
    subcategories: DEFAULT_SUBCATEGORIES,
    allProducts: rawProducts.map((p) => normalizeStoreProduct(p, categorySlugMap)),
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
        id, name, slug, brand, mrp, sellingPrice, images, categoryId, subCategoryId, subCategorySlug, isActive, description,
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
