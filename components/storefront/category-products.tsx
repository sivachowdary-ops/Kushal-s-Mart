"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Package } from "lucide-react";
import { ProductCard } from "@/components/storefront/product-card";

export interface CategoryProduct {
  id: string;
  slug: string;
  name: string;
  sellingPrice: number;
  mrp: number;
  image_url: string | null;
  images: string[];
  discount_percent?: number;
  totalStock: number;
  variants: { id: string; name: string; stock: number; selling_price_override: number | null }[];
  /** Subcategory slug used by the filter pills */
  subSlug: string | null;
}

interface Props {
  slug: string;
  categoryName: string;
  subcategories: { id: string; name: string; slug: string }[];
  products: CategoryProduct[];
  /** Category title block, rendered on the server */
  header: ReactNode;
}

/**
 * Reads ?sub= in the browser. The page itself never reads the URL, so it can be cached
 * (reading searchParams on the server made every category view a fresh server render).
 */
export function CategoryProducts(props: Props) {
  const currentSub = useSearchParams().get("sub") || "all";
  return <CategoryProductsView {...props} currentSub={currentSub} />;
}

/** The pills and grid for one subcategory ("all" = every product). Also the cached first paint. */
export function CategoryProductsView({ slug, categoryName, subcategories, products, header, currentSub }: Props & { currentSub: string }) {
  const filtered = currentSub === "all" ? products : products.filter((p) => p.subSlug === currentSub);
  const pillClass = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
      active ? "bg-red-600 text-white shadow-md shadow-red-600/25 scale-105" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
    }`;

  return (
    <div className="bg-[#F4F5F7] min-h-screen pb-16">
      {/* Header */}
      <div className="bg-white border-b border-gray-200/80 py-8 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {header}

          {/* Subcategories Filter Pills — same page, so no prefetch and no scroll jump */}
          {subcategories.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-2 pt-4 border-t border-gray-100">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">
                Filter by:
              </span>
              <Link href={`/category/${slug}`} prefetch={false} scroll={false} className={pillClass(currentSub === "all")}>
                All ({products.length})
              </Link>
              {subcategories.map((sub) => {
                const count = products.filter((p) => p.subSlug === sub.slug).length;
                return (
                  <Link
                    key={sub.id}
                    href={`/category/${slug}?sub=${sub.slug}`}
                    prefetch={false}
                    scroll={false}
                    className={pillClass(currentSub === sub.slug)}
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
        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {filtered.map((product) => (
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
                badgeType={(product.discount_percent ?? 0) >= 30 ? "DEALS" : "SAVE"}
                totalStock={product.totalStock}
                variants={product.variants}
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
                : `More products coming soon to ${categoryName}!`}
            </p>
            <p className="text-xs text-gray-500 mb-6">
              {currentSub !== "all"
                ? "Try selecting another scale or view all items in this category."
                : "Explore our latest arrivals or check out other collections."}
            </p>
            {currentSub !== "all" ? (
              <Link
                href={`/category/${slug}`}
                prefetch={false}
                scroll={false}
                className="rounded-full bg-red-600 px-6 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-red-700 transition-colors shadow-md"
              >
                View All {categoryName} ({products.length})
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
