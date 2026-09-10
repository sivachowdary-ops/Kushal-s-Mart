import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Package } from "lucide-react";
import { ProductCard } from "@/components/storefront/product-card";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getStorefrontData } from "@/lib/storefront-data";

// Revalidate category pages every 30 seconds so admin changes reflect promptly
export const revalidate = 30;

// Server Component — fetches real category + products from Supabase
export default async function CategoryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ sub?: string }>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const currentSub = resolvedSearchParams.sub || "all";

  // Fetch category, subcategories, and catalog with memory cache acceleration (< 1ms)
  const { categories, subcategories, allProducts } = await getStorefrontData();
  let category = categories.find((c) => c.slug === slug) || null;

  if (!category) {
    const { data: catData } = await supabaseAdmin
      .from("Category")
      .select("id, name, slug, description")
      .eq("slug", slug)
      .maybeSingle();

    if (catData) {
      category = catData;
    }
  }

  if (!category) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Category Not Found</h1>
        <p className="text-sm text-gray-500 mb-4">The requested category could not be found.</p>
        <Link href="/categories" className="rounded-full bg-black px-6 py-2.5 text-xs font-bold text-white uppercase tracking-wider">
          Browse All Categories
        </Link>
      </div>
    );
  }

  // Filter subcategories belonging to this category
  const catSubcategories = (subcategories || []).filter(
    (s) => s.categoryId === category!.id || s.category_id === category!.id
  );

  // Filter matching products from memory-cached catalog
  let allCategoryProducts: any[] = allProducts.filter(
    (p) => p.category_slug === slug || p.categoryId === category!.id
  );

  // Fallback to direct DB query only if memory cache had no products for this category
  if (allCategoryProducts.length === 0) {
    const { data: rawProducts } = await supabaseAdmin
      .from("Product")
      .select(`
        id, name, slug, mrp, sellingPrice, images, subCategoryId,
        ProductVariant ( id, name, stock, sellingPriceOverride, mrpOverride )
      `)
      .eq("categoryId", category.id)
      .eq("isActive", true)
      .order("createdAt", { ascending: false });

    if (rawProducts && rawProducts.length > 0) {
      allCategoryProducts = rawProducts;
    }
  }

  // Filter by selected subcategory if not 'all'
  let filteredProductsList = allCategoryProducts;
  if (currentSub !== "all") {
    filteredProductsList = allCategoryProducts.filter(
      (p) => p.sub_category_slug === currentSub || p.subCategoryId === currentSub
    );
  }

  const products = filteredProductsList.map((p) => {
    if (p.imageUrl !== undefined && p.discountPercent !== undefined) {
      return p;
    }
    const variants = (p.ProductVariant || []) as Record<string, unknown>[];
    const inStock = variants.length === 0 || variants.some((v) => (v.stock as number) > 0);
    const discountPercent = p.mrp > p.sellingPrice
      ? Math.round(((p.mrp - p.sellingPrice) / p.mrp) * 100)
      : 0;
    return {
      id: p.id as string,
      slug: p.slug as string,
      name: p.name as string,
      sellingPrice: p.sellingPrice as number,
      mrp: p.mrp as number,
      images: (p.images as string[]) || [],
      imageUrl: ((p.images as string[]) || [])[0] || null,
      discountPercent,
      badgeType: (discountPercent >= 25 ? "DEALS" : "SAVE") as "DEALS" | "SAVE",
      inStock,
    };
  });

  return (
    <div className="bg-[#F4F5F7] min-h-screen pb-16">
      {/* Header */}
      <div className="bg-white border-b border-gray-200/80 py-8 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            <Link href="/" className="hover:text-red-600">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/categories" className="hover:text-red-600">Categories</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gray-900">{category.name}</span>
          </div>
          <h1 className="font-extrabold text-3xl sm:text-4xl text-gray-900 tracking-tight">
            {category.name}
          </h1>
          {category.description && (
            <p className="mt-1 text-sm text-gray-500 font-medium max-w-2xl">{category.description}</p>
          )}

          {/* Subcategories Filter Pills */}
          {catSubcategories.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-2 pt-4 border-t border-gray-100">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">
                Filter by:
              </span>
              <Link
                href={`/category/${slug}`}
                prefetch={true}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  currentSub === "all"
                    ? "bg-red-600 text-white shadow-md shadow-red-600/25 scale-105"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                All ({allCategoryProducts.length})
              </Link>
              {catSubcategories.map((sub) => {
                const count = allCategoryProducts.filter(
                  (p) => p.sub_category_slug === sub.slug || p.subCategoryId === sub.id
                ).length;
                const isActive = currentSub === sub.slug;
                return (
                  <Link
                    key={sub.id}
                    href={`/category/${slug}?sub=${sub.slug}`}
                    prefetch={true}
                    className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? "bg-red-600 text-white shadow-md shadow-red-600/25 scale-105"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    }`}
                  >
                    {sub.name} {count > 0 && <span className="opacity-75 font-normal ml-0.5">({count})</span>}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Products */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {products.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                slug={product.slug}
                name={product.name}
                sellingPrice={product.sellingPrice}
                mrp={product.mrp}
                imageUrl={product.image_url || undefined}
                images={product.images}
                discountPercent={product.discount_percent}
                badgeType={product.discount_percent >= 30 ? "DEALS" : "SAVE"}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-200/80">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 mx-auto mb-4">
              <Package className="h-7 w-7 text-gray-400" />
            </div>
            <p className="text-base font-bold text-gray-900 mb-1">
              {currentSub !== "all"
                ? `No models found in this subcategory yet`
                : `More products coming soon to ${category.name}!`}
            </p>
            <p className="text-xs text-gray-500 mb-6">
              {currentSub !== "all"
                ? "Try selecting another scale or view all items in this category."
                : "Explore our latest arrivals or check out other collections."}
            </p>
            {currentSub !== "all" ? (
              <Link
                href={`/category/${slug}`}
                prefetch={true}
                className="rounded-full bg-red-600 px-6 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-red-700 transition-colors shadow-md"
              >
                View All {category.name} ({allCategoryProducts.length})
              </Link>
            ) : (
              <Link
                href="/shop"
                className="rounded-full bg-black px-6 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-red-600 transition-colors"
              >
                Shop All Products
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
