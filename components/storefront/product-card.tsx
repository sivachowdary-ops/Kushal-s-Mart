"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { formatPrice } from "@/lib/utils";

import { useCart } from "@/lib/cart-context";
import { ColorSwatchSelector, SwatchVariant } from "@/components/storefront/color-swatch-selector";

export interface ProductCardProps {
  id: string;
  slug: string;
  name: string;
  sellingPrice: number; // in paise
  mrp?: number;        // in paise
  imageUrl?: string;
  images?: string[];
  badgeType?: "DEALS" | "SAVE" | "NEW" | "BESTSELLER";
  discountPercent?: number;
  variants?: SwatchVariant[];
}

export function ProductCard({
  id,
  slug,
  name,
  sellingPrice,
  mrp,
  imageUrl,
  images,
  badgeType = "DEALS",
  discountPercent,
  variants = [],
}: ProductCardProps) {
  const { addToCart } = useCart();
  const [isAdded, setIsAdded] = useState(false);
  const displayImage = imageUrl || (images && images[0]) || undefined;
  const calcDiscount = mrp && mrp > sellingPrice
    ? Math.round(((mrp - sellingPrice) / mrp) * 100)
    : discountPercent || 0;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const firstVariant = variants && variants.length > 0 ? variants[0] : null;
    addToCart({
      productId: id || slug,
      slug,
      name,
      variantId: firstVariant?.id || "default",
      variantName: firstVariant?.name || "Standard",
      price: firstVariant?.selling_price_override ?? sellingPrice,
      image: displayImage || "",
      quantity: 1,
    });
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl sm:rounded-[28px] border border-gray-200/80 bg-white p-3 sm:p-5 shadow-xs transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:border-red-300/80 hover:ring-1 hover:ring-red-100">
      <div>
        {/* Top Badges Row */}
        <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
          <div>
            {badgeType === "DEALS" && (
              <span className="inline-block rounded-full bg-[#E60000] px-2 sm:px-3 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
                DEALS
              </span>
            )}
            {badgeType === "BESTSELLER" && (
              <span className="inline-block rounded-full bg-amber-500 px-2 sm:px-3 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
                BESTSELLER
              </span>
            )}
            {badgeType === "SAVE" && calcDiscount > 0 && (
              <span className="inline-block rounded-md bg-black px-2 sm:px-2.5 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
                SAVE {calcDiscount}%
              </span>
            )}
            {badgeType === "NEW" && (
              <span className="inline-block rounded-full bg-blue-600 px-2 sm:px-3 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
                NEW
              </span>
            )}
          </div>
        </div>

        {/* Product Image Area */}
        <Link href={`/product/${slug}`} prefetch={true} className="block overflow-hidden py-2 sm:py-4 text-center rounded-xl bg-gray-50/50 group-hover:bg-red-50/20 transition-colors duration-300">
          {displayImage ? (
            <img
              src={displayImage}
              alt={name}
              className="mx-auto h-28 sm:h-44 w-full object-contain transition-transform duration-500 ease-out group-hover:scale-110"
              loading="lazy"
            />
          ) : (
            <div className="mx-auto flex h-28 sm:h-44 w-full items-center justify-center rounded-xl sm:rounded-2xl bg-gray-50 text-gray-200">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10 sm:h-16 sm:w-16">
                <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )}
        </Link>

        {/* Title */}
        <Link href={`/product/${slug}`} className="block mt-2 sm:mt-3">
          <h3 className="min-h-[2rem] sm:min-h-[2.5rem] text-xs sm:text-sm font-semibold leading-snug text-gray-900 transition-colors duration-200 group-hover:text-red-600 line-clamp-2">
            {name}
          </h3>
        </Link>

        {/* Color Swatches */}
        {variants && variants.length > 0 && (
          <div className="mt-1.5 sm:mt-2">
            <ColorSwatchSelector variants={variants} mode="compact" />
          </div>
        )}
      </div>

      {/* Price & Action Button Area */}
      <div className="mt-3 sm:mt-4">
        {/* Price Row */}
        <div className="flex flex-wrap items-baseline gap-1 sm:gap-2 mb-2 sm:mb-4">
          <span className="font-extrabold text-base sm:text-2xl text-gray-900 tracking-tight">
            {formatPrice(sellingPrice)}
          </span>
          {mrp && mrp > sellingPrice && (
            <span className="text-[10px] sm:text-xs font-medium text-gray-400 line-through">
              {formatPrice(mrp)}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
          <button
            onClick={handleQuickAdd}
            className={`flex items-center justify-center gap-1 rounded-xl sm:rounded-2xl py-2 sm:py-3 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white shadow-xs transition-all duration-200 cursor-pointer ${
              isAdded ? "bg-emerald-600 scale-95 shadow-emerald-600/30 shadow-md" : "bg-black hover:bg-red-600 hover:scale-102 active:scale-95 hover:shadow-md"
            }`}
          >
            {isAdded ? (
              <>
                <Check className="h-3.5 w-3.5 stroke-[3]" />
                <span>Added!</span>
              </>
            ) : (
              <span>+ Cart</span>
            )}
          </button>
          <Link
            href={`/product/${slug}`}
            prefetch={true}
            className="flex items-center justify-center gap-1 rounded-xl sm:rounded-2xl bg-[#111625] py-2 sm:py-3 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white shadow-xs transition-all duration-200 hover:bg-red-600 hover:scale-102 active:scale-95 hover:shadow-md"
          >
            <span>Details</span>
            <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
