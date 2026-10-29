"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
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
  totalStock?: number;
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
  totalStock,
}: ProductCardProps) {
  const { addToCart } = useCart();
  const [isAdded, setIsAdded] = useState(false);
  const displayImage = imageUrl || (images && images[0]) || undefined;
  const isSoldOut = typeof totalStock === "number" && totalStock <= 0;

  // Quick-add uses the first variant that is actually in stock, and the card shows its price,
  // so the price on the card always matches what goes into the cart.
  const quickAddVariant =
    variants.find((v) => typeof v.stock !== "number" || v.stock > 0) || variants[0] || null;
  const displayPrice = quickAddVariant?.selling_price_override ?? sellingPrice;
  const calcDiscount = mrp && mrp > displayPrice
    ? Math.round(((mrp - displayPrice) / mrp) * 100)
    : discountPercent || 0;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSoldOut) return;
    addToCart({
      productId: id || slug,
      slug,
      name,
      variantId: quickAddVariant?.id || "default",
      variantName: quickAddVariant?.name || "Standard",
      price: displayPrice,
      image: displayImage || "",
      quantity: 1,
      maxStock: typeof quickAddVariant?.stock === "number" ? quickAddVariant.stock : undefined,
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
            {/* Any discount reads the same everywhere: "60% off" */}
            {(badgeType === "DEALS" || badgeType === "SAVE") && calcDiscount > 0 && (
              <span className="inline-block rounded-full bg-[#E60000] px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-extrabold text-white shadow-xs">
                {calcDiscount}% off
              </span>
            )}
            {badgeType === "BESTSELLER" && (
              <span className="inline-block rounded-full bg-amber-500 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-extrabold text-white shadow-xs">
                Bestseller
              </span>
            )}
            {badgeType === "NEW" && (
              <span className="inline-block rounded-full bg-blue-600 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-extrabold text-white shadow-xs">
                New
              </span>
            )}
          </div>
        </div>

        {/* Product Image Area */}
        <Link href={`/product/${slug}`} prefetch={true} className="block relative overflow-hidden py-2 sm:py-4 text-center rounded-xl bg-gray-50/50 group-hover:bg-red-50/20 transition-colors duration-300">
          {displayImage ? (
            <img
              src={displayImage}
              alt={name}
              className={`mx-auto h-28 sm:h-44 w-full object-contain transition-transform duration-500 ease-out group-hover:scale-110 ${isSoldOut ? "opacity-50 grayscale" : ""}`}
              loading="lazy"
            />
          ) : (
            <div className="mx-auto flex h-28 sm:h-44 w-full items-center justify-center rounded-xl sm:rounded-2xl bg-gray-50 text-gray-200">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10 sm:h-16 sm:w-16">
                <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )}
          {isSoldOut && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="rounded-full bg-black/70 px-4 py-1.5 text-[10px] sm:text-xs font-black uppercase tracking-wider text-white shadow-lg">
                Sold Out
              </span>
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
            {formatPrice(displayPrice)}
          </span>
          {mrp && mrp > displayPrice && (
            <span className="text-[10px] sm:text-xs font-medium text-gray-400 line-through">
              {formatPrice(mrp)}
            </span>
          )}
        </div>

        {/* One clear action; the photo and name open the product page */}
        <button
          onClick={handleQuickAdd}
          disabled={isSoldOut}
          className={`flex w-full min-h-[44px] items-center justify-center gap-1.5 rounded-xl sm:rounded-2xl py-2.5 sm:py-3 text-[13px] sm:text-sm font-bold text-white shadow-xs transition-all duration-200 cursor-pointer ${
            isSoldOut ? "bg-gray-300 cursor-not-allowed" : isAdded ? "bg-emerald-600 shadow-emerald-600/30 shadow-md" : "bg-[#111625] hover:bg-red-600 active:scale-95 hover:shadow-md"
          }`}
        >
          {isSoldOut ? (
            <span>Sold out</span>
          ) : isAdded ? (
            <>
              <Check className="h-4 w-4 stroke-[3]" />
              <span>Added</span>
            </>
          ) : (
            <span>Add to cart</span>
          )}
        </button>
      </div>
    </div>
  );
}
