import Link from "next/link";
import { ChevronRight, Tag } from "lucide-react";
import { getStorefrontData } from "@/lib/storefront-data";

// Server Component — fetches real categories from Supabase at request time
export default async function CategoriesPage() {
  const { categories: cats, subcategories, allProducts } = await getStorefrontData();

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {categories.map((cat) => {
              const catSubcategories = (subcategories || []).filter(
                (s) => s.categoryId === cat.id || s.category_id === cat.id
              );

              return (
                <div key={cat.slug} className="group flex flex-col items-center">
                  {/* Category Image Card */}
                  <Link
                    href={`/category/${cat.slug}`}
                    prefetch={true}
                    className="w-full aspect-square max-w-[280px] rounded-3xl bg-white border border-gray-200/90 p-6 shadow-sm flex items-center justify-center transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-xl group-hover:border-red-300 group-hover:ring-4 group-hover:ring-red-500/5 cursor-pointer"
                  >
                    {cat.imageUrl ? (
                      <img
                        src={cat.imageUrl}
                        alt={cat.name}
                        className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                      />
                    ) : (
                      <Tag className="h-14 w-14 text-gray-300 group-hover:text-red-500 transition-colors" />
                    )}
                  </Link>

                  {/* Name and Info Cleanly Below Image */}
                  <div className="mt-4 text-center w-full px-2">
                    <Link
                      href={`/category/${cat.slug}`}
                      prefetch={true}
                      className="text-lg font-black text-gray-900 transition-colors group-hover:text-red-600 inline-block hover:underline"
                    >
                      {cat.name}
                    </Link>

                    {cat.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2 max-w-xs mx-auto">
                        {cat.description}
                      </p>
                    )}

                    {/* Subcategories list / pills */}
                    {catSubcategories.length > 0 && (
                      <div className="mt-3 flex flex-wrap justify-center gap-1.5 max-w-xs mx-auto">
                        {catSubcategories.map((sub) => (
                          <Link
                            key={sub.id}
                            href={`/category/${cat.slug}?sub=${sub.slug}`}
                            className="rounded-full bg-white border border-gray-200/80 px-2.5 py-1 text-[11px] font-bold text-gray-700 shadow-2xs hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-all"
                          >
                            {sub.name}
                          </Link>
                        ))}
                      </div>
                    )}

                    <div className="mt-2.5">
                      <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                        {cat.product_count > 0 ? `${cat.product_count} Products Available` : "Coming Soon"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
