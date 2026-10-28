"use client";

import { AlertCircle, X } from "lucide-react";
import { useCart } from "@/lib/cart-context";

/** Tells the shopper when a catalog sync changed prices, stock or removed items from their cart. */
export function CartNotice() {
  const { cartNotice, dismissCartNotice } = useCart();
  if (!cartNotice) return null;

  return (
    <div role="status" className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
      <p className="flex-1 text-xs font-semibold leading-relaxed">{cartNotice}</p>
      <button
        type="button"
        onClick={dismissCartNotice}
        aria-label="Dismiss"
        className="p-0.5 text-amber-600 hover:text-amber-900 cursor-pointer"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
