"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Search, Flame, ChevronDown, Phone, Mail, Menu, X, Truck } from "lucide-react";
import { useState, useEffect } from "react";
import { useCart } from "@/lib/cart-context";
import { SearchModal } from "@/components/storefront/search-modal";

interface NavCategory {
  id: string;
  name: string;
  slug: string;
}

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [navCategories, setNavCategories] = useState<NavCategory[]>([]);
  const { cartCount, openCart } = useCart();

  // Fetch real categories from Supabase on mount
  useEffect(() => {
    fetch("/api/storefront/categories")
      .then((r) => r.json())
      .then((d) => setNavCategories(d.categories || []))
      .catch(() => {/* fail silently — nav still works without categories */});
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
      {/* Top mini-bar */}
      <div className="bg-[#F8F9FA] border-b border-gray-100 py-1.5 text-xs text-gray-600">
        <div className="mx-auto max-w-7xl px-4 flex items-center justify-center gap-6 sm:gap-8 font-medium">
          <a href="tel:+917288907757" className="flex items-center gap-1.5 hover:text-red-600 transition-colors">
            <Phone className="h-3.5 w-3.5 text-red-600" />
            <span>+91 72889 07757</span>
          </a>
          <span className="text-gray-300">|</span>
          <a href="mailto:jogabetha@gmail.com" className="flex items-center gap-1.5 hover:text-red-600 transition-colors hidden sm:flex">
            <Mail className="h-3.5 w-3.5 text-red-600" />
            <span>jogabetha@gmail.com</span>
          </a>
          <span className="text-gray-300 hidden sm:inline">|</span>
          <span className="text-gray-500 font-semibold">Free Shipping Across India</span>
        </div>
      </div>

      {/* Main Header */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-2xl overflow-hidden shadow-md border border-gray-100 bg-white flex items-center justify-center transition-transform group-hover:scale-105">
              <Image
                src="/kushal_mart_logo.jpeg"
                alt="Kushal's Mart Logo"
                fill
                sizes="(max-width: 640px) 48px, 56px"
                className="object-contain"
                priority
              />
            </div>
            <div>
              <span className="font-extrabold text-2xl tracking-tight text-gray-900 block leading-tight">KUSHAL&apos;S</span>
              <span className="font-bold text-xs uppercase tracking-widest block text-red-600">MART</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-6 font-semibold text-sm text-gray-700">

            {/* Daily Deals pill */}
            <Link
              href="/shop?sort=discount"
              className="relative flex items-center gap-2 rounded-full border-2 border-red-500 bg-white px-4 py-1.5 text-red-600 transition-all hover:bg-red-50 hover:scale-105 shadow-sm"
            >
              <span className="absolute -top-2.5 left-4 rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-black uppercase text-white tracking-wider">
                DAILY
              </span>
              <Flame className="h-4 w-4 text-red-600 fill-red-500" />
              <span className="font-bold text-red-600">Deals</span>
            </Link>

            <Link href="/shop" className="hover:text-red-600 transition-colors">Shop</Link>

            {/* Dynamic categories */}
            {navCategories.length > 0 ? (
              navCategories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  prefetch={true}
                  className="hover:text-red-600 transition-colors"
                >
                  {cat.name}
                </Link>
              ))
            ) : (
              /* Skeleton placeholders while loading */
              [1, 2, 3].map((i) => (
                <span key={i} className="h-4 w-20 bg-gray-100 rounded animate-pulse inline-block" />
              ))
            )}

            {/* Track Order link in Desktop Nav */}
            <Link
              href="/track-order"
              className="flex items-center gap-1.5 rounded-full bg-gray-50 border border-gray-200 px-3.5 py-1.5 text-xs font-bold text-gray-800 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-all"
            >
              <Truck className="h-3.5 w-3.5 text-red-600" />
              <span>Track Order</span>
            </Link>
          </nav>

          {/* Right Icons */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>

            <button
              onClick={openCart}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 lg:hidden"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Search Modal Overlay */}
      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-gray-100 bg-white px-6 py-6 lg:hidden animate-fade-in">
          <div className="flex flex-col gap-4 font-semibold text-gray-800">
            <Link
              href="/shop?sort=discount"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 rounded-full border-2 border-red-500 py-2.5 text-red-600 font-bold bg-red-50"
            >
              <Flame className="h-4 w-4 fill-red-500 text-red-600" />
              <span>DAILY Deals</span>
            </Link>

            <Link
              href="/track-order"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 rounded-full bg-red-600 py-2.5 text-white font-bold shadow-md"
            >
              <Truck className="h-4 w-4" />
              <span>Track Your Order</span>
            </Link>

            <Link href="/shop" onClick={() => setMobileMenuOpen(false)} className="hover:text-red-600">
              Shop All
            </Link>
            {navCategories.map((cat) => (
              <Link
                key={cat.id}
                href={`/category/${cat.slug}`}
                prefetch={true}
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-red-600"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
