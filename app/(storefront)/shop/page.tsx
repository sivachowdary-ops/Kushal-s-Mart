"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, ArrowUpDown, ChevronRight, Package } from "lucide-react";
import { ProductCard } from "@/components/storefront/product-card";

interface StoreProduct {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  selling_price: number;
  mrp: number;
  discount_percent: number;
  images: string[];
  image_url: string | null;
  category_id: string;
  category_slug: string | null;
  in_stock: boolean;
}

interface StoreCategory {
  id: string;
  name: string;
  slug: string;
  product_count: number;
}

export default function ShopPage() {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"featured" | "price-low" | "price-high" | "discount">("featured");
  const [maxPrice, setMaxPrice] = useState<number>(25000);

  useEffect(() => {
    Promise.all([
      fetch("/api/storefront/products").then((r) => r.json()),
      fetch("/api/storefront/categories").then((r) => r.json()),
    ]).then(([pd, cd]) => {
      setProducts(pd.products || []);
      setCategories(cd.categories || []);
      // Set max price to highest product price
      const prices = (pd.products || []).map((p: StoreProduct) => Math.ceil(p.selling_price / 100));
      if (prices.length) setMaxPrice(Math.max(...prices));
    }).finally(() => setIsLoading(false));
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      if (selectedCategory !== "all" && prod.category_slug !== selectedCategory) return false;
      if (searchQuery && !prod.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !(prod.brand || "").toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (prod.selling_price / 100 > maxPrice) return false;
      return true;
    }).sort((a, b) => {
      if (sortBy === "price-low") return a.selling_price - b.selling_price;
      if (sortBy === "price-high") return b.selling_price - a.selling_price;
      if (sortBy === "discount") return b.discount_percent - a.discount_percent;
      return 0;
    });
  }, [products, selectedCategory, searchQuery, sortBy, maxPrice]);

  return (
    <div className="bg-[#F4F5F7] min-h-screen pb-16">
      {/* Header Bar */}
      <div className="bg-white border-b border-gray-200/80 py-8 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            <Link href="/" className="hover:text-red-600">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gray-900">Shop All</span>
          </div>
          <h1 className="font-extrabold text-3xl sm:text-4xl text-gray-900 tracking-tight">
            Shop RC Cars, Diecast Models &amp; Collectibles
          </h1>
          <p className="mt-1 text-sm text-gray-500 font-medium max-w-2xl">
            Browse our full catalog of authentic RC crawlers, drift machines, scale diecast cars, and premium hobby vehicles.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* Filter Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-sm">
              <h2 className="font-extrabold text-lg text-gray-900 mb-4 flex items-center justify-between">
                <span>Filter Products</span>
                <SlidersHorizontal className="h-4 w-4 text-gray-400" />
              </h2>

              {/* Search */}
              <div className="mb-6">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="search"
                    placeholder="Search brand, model..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-xs font-medium text-gray-900 focus:border-black focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div className="mb-6">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-3">Categories</label>
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-between ${selectedCategory === "all" ? "bg-black text-white" : "text-gray-700 hover:bg-gray-100"}`}
                  >
                    <span>All Collections</span>
                    <span className="text-[10px] opacity-75">{products.length}</span>
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.slug}
                      onClick={() => setSelectedCategory(cat.slug)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between ${selectedCategory === cat.slug ? "bg-black text-white" : "text-gray-700 hover:bg-gray-100"}`}
                    >
                      <span>{cat.name}</span>
                      {cat.product_count > 0 && <span className="text-[10px] opacity-75">({cat.product_count})</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Filter */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  <span>Max Price</span>
                  <span className="text-gray-900">₹{maxPrice.toLocaleString("en-IN")}</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="25000"
                  step="500"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-red-600 cursor-pointer"
                />
              </div>

              {(selectedCategory !== "all" || searchQuery || maxPrice < 25000) && (
                <button
                  onClick={() => { setSelectedCategory("all"); setSearchQuery(""); setMaxPrice(25000); }}
                  className="mt-6 w-full text-center text-xs font-bold text-red-600 hover:underline"
                >
                  Reset All Filters
                </button>
              )}
            </div>
          </div>

          {/* Product Grid */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-sm mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs font-semibold text-gray-600">
                {isLoading ? "Loading..." : <>Showing <strong className="text-gray-900">{filteredProducts.length}</strong> products</>}
              </span>
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                <span>Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="rounded-xl border border-gray-200 bg-gray-50 py-1.5 px-3 font-semibold text-gray-900 focus:border-black focus:outline-none"
                >
                  <option value="featured">Featured Picks</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="discount">Biggest Discount</option>
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-56 sm:h-72 rounded-2xl sm:rounded-[28px] bg-white border border-gray-100 animate-pulse" />
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    slug={product.slug}
                    name={product.name}
                    sellingPrice={product.selling_price}
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
                <p className="text-base font-bold text-gray-900 mb-1">No products found</p>
                <p className="text-xs text-gray-500 mb-4">Try clearing your search or selecting a different category.</p>
                <button
                  onClick={() => { setSelectedCategory("all"); setSearchQuery(""); setMaxPrice(25000); }}
                  className="rounded-full bg-black px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-red-600 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
