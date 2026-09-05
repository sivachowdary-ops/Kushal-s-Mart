"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, Trash2, ShoppingBag, Plus, Minus, ArrowRight, ShieldCheck } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/utils";

export function CartDrawer() {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const { cartItems, cartCount, subtotal, isCartOpen, closeCart, updateQuantity, removeFromCart } = useCart();

  const handleProceedToCheckout = () => {
    setIsNavigating(true);
    router.push("/checkout");
    setTimeout(() => {
      closeCart();
      setIsNavigating(false);
    }, 400);
  };

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={closeCart}
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col animate-slide-in-right">
          
          {/* Drawer Header */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-red-600" />
              <h2 className="font-extrabold text-lg text-gray-900">
                Your Cart ({cartCount})
              </h2>
            </div>
            <button
              onClick={closeCart}
              className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              aria-label="Close cart"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Drawer Content Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {cartItems.length > 0 ? (
              cartItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 pb-6 border-b border-gray-100 last:border-0 last:pb-0"
                >
                  {/* Thumbnail */}
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-gray-50 p-2 border border-gray-100 flex items-center justify-center">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="h-full w-full object-contain" />
                    ) : (
                      <ShoppingBag className="h-6 w-6 text-gray-300" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/product/${item.slug}`}
                      onClick={closeCart}
                      className="font-bold text-xs text-gray-900 hover:text-red-600 line-clamp-2"
                    >
                      {item.name}
                    </Link>
                    <p className="text-[11px] font-semibold text-gray-400 mt-0.5">
                      {item.variantName}
                    </p>
                    <span className="font-extrabold text-sm text-gray-900 mt-1 block">
                      {formatPrice(item.price)}
                    </span>

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 p-1">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-gray-700 shadow-xs hover:bg-gray-100"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-7 text-center text-xs font-bold text-gray-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-gray-700 shadow-xs hover:bg-gray-100"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-gray-400 hover:text-red-600 p-1 transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-16 text-center space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400 mx-auto">
                  <ShoppingBag className="h-8 w-8" />
                </div>
                <p className="text-sm font-bold text-gray-900">Your cart is currently empty</p>
                <p className="text-xs text-gray-500 max-w-xs mx-auto">
                  Explore our collection of authentic RC cars and diecast models to add items to your cart.
                </p>
              </div>
            )}
          </div>

          {/* Drawer Footer */}
          {cartItems.length > 0 && (
            <div className="p-6 border-t border-gray-100 bg-gray-50 space-y-4">
              <div className="space-y-1.5 text-xs font-semibold text-gray-600">
                <div className="flex justify-between text-emerald-700">
                  <span>Shipping</span>
                  <span className="font-bold uppercase">FREE</span>
                </div>
                <div className="flex justify-between items-baseline pt-1">
                  <span className="font-extrabold text-sm text-gray-900">Subtotal</span>
                  <span className="font-extrabold text-xl text-red-600">{formatPrice(subtotal)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleProceedToCheckout}
                  disabled={isNavigating}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-xl transition-all duration-300 hover:bg-red-700 hover:scale-[1.02] active:scale-95 disabled:opacity-80 cursor-pointer"
                >
                  {isNavigating ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>PROCEEDING TO CHECKOUT...</span>
                    </>
                  ) : (
                    <>
                      <span>PROCEED TO CHECKOUT</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <Link
                  href="/cart"
                  onClick={closeCart}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-3 text-xs font-bold uppercase tracking-wider text-gray-800 hover:bg-gray-100 transition-colors"
                >
                  <span>VIEW FULL CART</span>
                </Link>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>100% Safe & Verified Checkout</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
