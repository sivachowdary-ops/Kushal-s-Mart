import Link from "next/link";
import { ChevronRight, Tag } from "lucide-react";
import { getStorefrontData } from "@/lib/storefront-data";

// Server Component — fetches real categories from Supabase at request time
export default async function CategoriesPage() {
  const { categories: cats, allProducts } = await getStorefrontData();

  const countMap: Record<string, number> = {};
  allProducts.forEach((p) => {
    countMap[p.categoryId] = (countMap[p.categoryId] || 0) + 1;
    if (p.category_slug) {
      countMap[p.category_slug] = (countMap[p.category_slug] || 0) + 1;
    }
  });

  const categories = cats.map((c) => ({
    ...c,
    product_count: countMap[c.id] || countMap[c.slug] || 0,
  }));

  return (
    <div className="bg-[#F4F5F7] min-h-screen pb-16">
      {/* Header Bar */}
      <div className="bg-white border-b border-gray-200/80 py-8 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            <Link href="/" className="hover:text-red-600">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gray-900">Categories</span>
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400 block mb-1">
            KUSHAL&apos;S MART CATEGORIES
          </span>
          <h1 className="font-extrabold text-3xl sm:text-4xl text-gray-900 tracking-tight">
            Shop by Category
          </h1>
          <p className="mt-1 text-sm text-gray-500 font-medium max-w-2xl">
            Explore authentic RC crawlers, drift cars, scale diecast collectibles, and premium hobby vehicles.
          </p>
        </div>
      </div>

      {/* Category Grid */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {categories.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 font-medium">Categories are being set up. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                prefetch={true}
                className="group flex flex-col items-center gap-2 sm:gap-4 rounded-2xl sm:rounded-3xl bg-white border border-gray-200/80 p-4 sm:p-8 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-red-200"
              >
                {/* Category Icon / Image */}
                <div className="flex h-16 w-16 sm:h-24 sm:w-24 items-center justify-center rounded-2xl sm:rounded-full bg-gray-50 border border-gray-100 p-2 sm:p-4 transition-all duration-300 group-hover:scale-105 group-hover:bg-red-50 group-hover:border-red-100">
                  {cat.imageUrl ? (
                    <img
                      src={cat.imageUrl}
                      alt={cat.name}
                      className="h-12 w-12 sm:h-16 sm:w-16 object-contain transition-transform duration-300 group-hover:scale-110"
                      loading="lazy"
                    />
                  ) : (
                    <Tag className="h-8 w-8 sm:h-10 sm:w-10 text-gray-300 group-hover:text-red-400 transition-colors" />
                  )}
                </div>

                {/* Name */}
                <div className="text-center">
                  <span className="text-xs sm:text-base font-extrabold text-gray-900 transition-colors group-hover:text-red-600 block line-clamp-1">
                    {cat.name}
                  </span>
                  {cat.description && (
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-1 line-clamp-2 hidden sm:block">{cat.description}</p>
                  )}
                  <span className="text-[10px] sm:text-[11px] font-semibold text-gray-400 uppercase tracking-wider mt-1 sm:mt-2 block">
                    {cat.product_count > 0 ? `${cat.product_count} Products` : "Coming Soon"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
