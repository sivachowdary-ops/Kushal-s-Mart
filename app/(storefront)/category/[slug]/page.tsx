import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getStorefrontData } from "@/lib/storefront-data";
import { CategoryProducts, CategoryProductsView, type CategoryProduct } from "@/components/storefront/category-products";

// Cached per category (ISR); admin edits and sales refresh it at once (revalidateStorefront).
// Daily is only a backstop. The ?sub= filter is applied in the browser, so this page never reads
// the URL — reading searchParams here made every category view a fresh server render.
export const revalidate = 86400;

// No pages are built ahead of time; each category is rendered on its first visit, then cached
export function generateStaticParams() {
  return [];
}

// Server Component — category and products come from the shared catalog cache
export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

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

  // Filter matching products from the cached catalog
  let allCategoryProducts: any[] = allProducts.filter(
    (p) => p.category_slug === slug || p.categoryId === category!.id
  );

  // Fallback to direct DB query only if the catalog had no products for this category
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

  // One rule for both the filter pills' counts and the filtered list (they used to differ,
  // so a product could be counted under two pills or shown under none)
  const subSlugOf = (p: { sub_category_slug?: string | null; subCategoryId?: string | null }) =>
    p.sub_category_slug || catSubcategories.find((s) => s.id === p.subCategoryId)?.slug || null;

  const products: CategoryProduct[] = allCategoryProducts.map((p) => {
    const variants = (p.variants || p.ProductVariant || []) as Record<string, unknown>[];
    const totalStock = variants.reduce((sum, v) => sum + ((v.stock as number) || 0), 0);
    // Catalog products let the card work out the discount from the variant price (as before);
    // only rows from the direct-query fallback carry one
    const discountPercent = p.discountPercent !== undefined
      ? undefined
      : p.mrp > p.sellingPrice
        ? Math.round(((p.mrp - p.sellingPrice) / p.mrp) * 100)
        : 0;
    return {
      id: p.id as string,
      slug: p.slug as string,
      name: p.name as string,
      sellingPrice: p.sellingPrice as number,
      mrp: p.mrp as number,
      image_url: ((p.images as string[]) || [])[0] || null,
      images: (p.images as string[]) || [],
      discount_percent: discountPercent,
      totalStock,
      variants: variants.map((v) => ({
        id: v.id as string,
        name: v.name as string,
        stock: (v.stock as number) || 0,
        selling_price_override:
          ((v.selling_price_override ?? v.sellingPriceOverride) as number | null | undefined) ?? null,
      })),
      subSlug: subSlugOf(p),
    };
  });

  const header = (
    <>
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
    </>
  );

  const viewProps = {
    slug,
    categoryName: category.name,
    subcategories: catSubcategories.map((s) => ({ id: s.id, name: s.name, slug: s.slug })),
    products,
    header,
  };

  // The cached page shows "All"; the browser then applies ?sub= if present
  return (
    <Suspense fallback={<CategoryProductsView {...viewProps} currentSub="all" />}>
      <CategoryProducts {...viewProps} />
    </Suspense>
  );
}
