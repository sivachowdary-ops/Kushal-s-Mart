import Link from "next/link";
import { ArrowRight, Phone, Mail, MapPin, Truck, ShieldCheck, Headset, Store, Package, Search, Clock, CheckCircle2, Car, Trophy, Sparkles } from "lucide-react";
import { HeroSlider } from "@/components/storefront/hero-slider";
import { ProductCard } from "@/components/storefront/product-card";
import { getStorefrontData } from "@/lib/storefront-data";

// Revalidate homepage every 30 seconds so admin price changes appear promptly
export const revalidate = 30;

// Dedicated Track Order Section for the homepage
function TrackOrderSection() {
  return (
    <section className="py-12 bg-white border-t border-gray-200/70 shadow-xs">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#111625] via-[#1a2238] to-[#111625] p-8 sm:p-12 text-white shadow-xl">
          {/* Background subtle glow */}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-red-600/20 blur-3xl" />
          <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Info */}
            <div className="lg:col-span-6 space-y-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600/20 border border-red-500/30 px-3 py-1 text-xs font-black uppercase tracking-widest text-red-400">
                <Truck className="h-3.5 w-3.5" /> LIVE TRACKING
              </span>
              <h2 className="font-extrabold text-2xl sm:text-4xl tracking-tight leading-tight">
                Track Your Shipment &amp; Orders
              </h2>
              <p className="text-sm text-gray-300 max-w-lg leading-relaxed font-medium">
                Enter your mobile number to view live status, courier tracking, and delivery timelines for all your orders.
              </p>

              <div className="flex flex-wrap gap-4 pt-2 text-xs font-semibold text-gray-300">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> No Order ID needed</span>
                <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-yellow-400" /> Real-time status</span>
              </div>
            </div>

            {/* Right: Quick Search Form */}
            <div className="lg:col-span-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 p-6 sm:p-8">
              <form action="/track-order" method="GET" className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-200">
                  Enter Mobile Number
                </label>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="tel"
                      name="phone"
                      maxLength={10}
                      required
                      placeholder="10-digit mobile number"
                      className="w-full rounded-2xl border border-white/20 bg-white/10 py-3.5 pl-11 pr-4 text-sm font-semibold text-white placeholder:text-gray-400 focus:border-red-500 focus:bg-white/20 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-7 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-lg hover:bg-red-700 hover:scale-105 active:scale-95 transition-all shrink-0"
                  >
                    <Search className="h-4 w-4" />
                    <span>Track Order</span>
                  </button>
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1">
                  <span>Shiprocket live tracking powered</span>
                  <Link href="/track-order" className="text-red-400 hover:text-white font-bold inline-flex items-center gap-1">
                    Order details <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Home Page — fetches real categories and products from Supabase.
 * Server Component — no mock data.
 */
/**
 * Home Page — optimized with concurrent data fetching and refined section ordering:
 * Hero → Categories Tiles → Best Sellers (real photos only) → Deals & Collections → Track Order → Trust
 */
export default async function HomePage() {
  const { categories, allProducts } = await getStorefrontData();

  // §1 Critical Constraint: Every product in Best Sellers MUST have its verified real photo
  const bestSellers = allProducts
    .filter((p) => p.images && p.images.length > 0 && p.imageUrl)
    .slice(0, 8);

  // Hot deals with active discounts
  const dealProducts = allProducts
    .filter((p) => p.discountPercent > 0)
    .slice(0, 4);

  // Latest RC Cars & Diecast — robust categorization
  const latestRcCars = allProducts
    .filter((p) => p.category_slug === "rc-cars" || p.categoryId === "cat-rc-cars")
    .slice(0, 4);

  const diecastModels = allProducts
    .filter((p) => p.category_slug === "diecast-metal-cars" || p.categoryId === "cat-diecast")
    .slice(0, 4);

  return (
    <div className="pb-16 bg-[#F4F5F7]">

      {/* ── 1. Hero Banner Slider ── */}
      <HeroSlider />

      {/* ── 2. Categories Section (Directly Below Hero per §1) ── */}
      <section className="py-12 border-b border-gray-200/60 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-red-600 block mb-1">
                EXPLORE BY CATEGORY
              </span>
              <h2 className="font-extrabold text-2xl sm:text-4xl text-gray-900 tracking-tight">
                Featured Categories
              </h2>
            </div>
            <Link
              href="/categories"
              className="text-xs sm:text-sm font-bold text-gray-900 hover:text-red-600 transition-colors flex items-center gap-1"
            >
              <span>View All Categories</span>
              <span>→</span>
            </Link>
          </div>

          {/* 3 Clickable Category Cards — 2 on mobile (with 3rd spanning nicely), 3 on tablet/desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6">
            {categories.map((cat, idx) => (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                className={`group relative overflow-hidden flex flex-col items-center rounded-2xl sm:rounded-3xl bg-[#F4F5F7] border border-gray-200/80 p-4 sm:p-7 shadow-xs transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:border-red-300 hover:bg-white active:scale-98 cursor-pointer ${
                  idx === 2 && categories.length === 3 ? "col-span-2 sm:col-span-1" : ""
                }`}
              >
                <div className="flex h-24 w-24 sm:h-32 sm:w-32 items-center justify-center rounded-2xl bg-white border border-gray-100 p-3 shadow-xs transition-all duration-300 group-hover:scale-110 group-hover:bg-red-50/80 group-hover:border-red-200 group-hover:shadow-md">
                  {cat.imageUrl ? (
                    <img
                      src={cat.imageUrl}
                      alt={cat.name}
                      className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center">
                      {cat.slug === "rc-cars" ? (
                        <Car className="h-10 w-10 text-red-600 transition-transform group-hover:scale-110" />
                      ) : cat.slug === "diecast-metal-cars" ? (
                        <Trophy className="h-10 w-10 text-yellow-600 transition-transform group-hover:scale-110" />
                      ) : (
                        <Sparkles className="h-10 w-10 text-indigo-600 transition-transform group-hover:scale-110" />
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-3 sm:mt-4 text-center">
                  <span className="text-xs sm:text-base font-extrabold text-gray-900 transition-colors duration-200 group-hover:text-red-600 block line-clamp-1">
                    {cat.name}
                  </span>
                  <span className="mt-0.5 sm:mt-1 inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold text-gray-500 group-hover:text-red-600 transition-colors">
                    Explore Models <ArrowRight className="h-2.5 w-2.5 sm:h-3 sm:w-3 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. Best Sellers Section (Directly Below Categories per §1) ── */}
      {bestSellers.length > 0 && (
        <section className="py-12 bg-[#F4F5F7]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-red-600 block mb-1">
                  CUSTOMER FAVORITES
                </span>
                <h2 className="font-extrabold text-3xl sm:text-4xl text-gray-900 tracking-tight">
                  Best Sellers
                </h2>
                <p className="mt-1 text-sm text-gray-500 font-medium">
                  Our most-loved radio-controlled &amp; collectible car models.
                </p>
              </div>
              <Link
                href="/shop?sort=bestseller"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-red-600 px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-md transition-transform hover:scale-105 hover:bg-red-700 shrink-0"
              >
                <span>View All Best Sellers</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Best Sellers Grid — Strictly 2 per row on mobile */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {bestSellers.map((product) => (
                <ProductCard key={product.id} {...product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 4. Deals & Special Offers ── */}
      {dealProducts.length > 0 && (
        <section className="py-12 border-t border-gray-200/60 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-red-600 block mb-1">
                  LIMITED TIME SAVINGS
                </span>
                <h2 className="font-extrabold text-3xl sm:text-4xl text-gray-900 tracking-tight">
                  Daily Deals &amp; Price Drops
                </h2>
                <p className="mt-1 text-sm text-gray-500 font-medium">
                  Big discounts on authentic imported RC drift cars, crawlers, and scale diecasts.
                </p>
              </div>
              <Link
                href="/shop?sort=discount"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#111625] px-6 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-md transition-transform hover:scale-105 hover:bg-black shrink-0"
              >
                <span>All Deals</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {dealProducts.map((product) => (
                <ProductCard key={product.id} {...product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 5. Latest RC Cars & Crawlers ── */}
      <section className="py-12 border-t border-gray-200/60 bg-[#F4F5F7]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400 block mb-1">
                HIGH SPEED &amp; 4WD CRAWLERS
              </span>
              <h2 className="font-extrabold text-3xl sm:text-4xl text-gray-900 tracking-tight">
                RC Cars &amp; Trucks
              </h2>
              <p className="mt-1 text-sm text-gray-500 font-medium">
                Proportional steering, 2.4GHz remotes, and rechargeable battery packs.
              </p>
            </div>
            <Link
              href="/category/rc-cars"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#111625] px-6 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-md transition-transform hover:scale-105 hover:bg-black shrink-0"
            >
              <span>View RC Collection</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {latestRcCars.length > 0 ? (
              latestRcCars.map((product) => (
                <ProductCard key={product.id} {...product} />
              ))
            ) : (
              <div className="col-span-2 lg:col-span-4 bg-white rounded-3xl p-10 text-center border border-gray-200/80">
                <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="font-bold text-gray-900 mb-1">RC Models Coming Soon</p>
                <p className="text-xs text-gray-500">Products are being added to the catalog.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 6. Diecast Metal Models ── */}
      <section className="py-12 border-t border-gray-200/60 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400 block mb-1">
                SCALE REPLICAS &amp; COLLECTIBLES
              </span>
              <h2 className="font-extrabold text-3xl sm:text-4xl text-gray-900 tracking-tight">
                Diecast Metal Collectibles
              </h2>
              <p className="mt-1 text-sm text-gray-500 font-medium">
                Premium 1/64 scale diecast metal collectible cars, Hot Wheels &amp; Mini GT.
              </p>
            </div>
            <Link
              href="/category/diecast-metal-cars"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#111625] px-6 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-md transition-transform hover:scale-105 hover:bg-black shrink-0"
            >
              <span>View Diecast</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {diecastModels.length > 0 ? (
              diecastModels.map((product) => (
                <ProductCard key={product.id} {...product} />
              ))
            ) : (
              <div className="col-span-2 lg:col-span-4 bg-white rounded-3xl p-10 text-center border border-gray-200/80">
                <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="font-bold text-gray-900 mb-1">Diecast Models Coming Soon</p>
                <p className="text-xs text-gray-500">Products are being added to the catalog.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Section 7: Dedicated Live Track Order Section ── */}
      <TrackOrderSection />

      {/* ── Contact Section ── */}
      <section className="bg-white py-12 my-8 border-y border-gray-200/80 shadow-sm">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-red-600 block mb-2">
            HAVE QUESTIONS? GET IN TOUCH
          </span>
          <h2 className="font-extrabold text-2xl sm:text-3xl text-gray-900 tracking-tight">
            Need Expert Help Choosing Your RC Car?
          </h2>
          <p className="mt-2 text-sm text-gray-600 max-w-2xl mx-auto">
            Our hobby experts are ready to assist you with specifications, spare parts compatibility, and recommendations.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-sm font-semibold text-gray-800">
            <a href="tel:+917288907757" className="flex items-center gap-2 rounded-full bg-gray-50 border border-gray-200 px-6 py-3 transition-colors hover:border-red-500 hover:text-red-600 shadow-sm">
              <Phone className="h-4 w-4 text-red-600" />
              <span>+91 72889 07757</span>
            </a>
            <a href="mailto:jogabetha@gmail.com" className="flex items-center gap-2 rounded-full bg-gray-50 border border-gray-200 px-6 py-3 transition-colors hover:border-red-500 hover:text-red-600 shadow-sm">
              <Mail className="h-4 w-4 text-red-600" />
              <span>jogabetha@gmail.com</span>
            </a>
            <a
              href="https://www.google.com/maps?q=17.234193801879883,82.19078063964844&z=17&hl=en"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full bg-gray-50 border border-gray-200 px-6 py-3 transition-colors hover:border-red-500 hover:text-red-600 shadow-sm"
            >
              <MapPin className="h-4 w-4 text-red-600" />
              <span>Prathipadu, AP, India</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── Trust Strip ── */}
      <section className="bg-[#F4F5F7] py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { icon: Truck, label: "Fast Shipping", desc: "All-India express delivery" },
              { icon: ShieldCheck, label: "100% Genuine", desc: "Authentic hobby-grade products" },
              { icon: Headset, label: "WhatsApp Support", desc: "Direct expert assistance" },
              { icon: Store, label: "Physical Store", desc: "Visit our offline hobby store" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center text-center gap-2 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 mb-1">
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-sm text-gray-900">{item.label}</h3>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
