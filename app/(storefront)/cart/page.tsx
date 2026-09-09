"use client";

import Link from "next/link";
import { Trash2, ArrowRight, ShoppingBag, ShieldCheck, Truck, Plus, Minus } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/utils";

export default function CartPage() {
  const { cartItems, cartCount, subtotal, updateQuantity, removeFromCart } = useCart();

  return (
    <div className="bg-[#F4F5F7] min-h-screen pb-16">
      {/* Header Bar */}
      <div className="bg-white border-b border-gray-200/80 py-8 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-extrabold text-3xl sm:text-4xl text-gray-900 tracking-tight">
            Shopping Cart ({cartCount} Items)
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {cartItems.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Cart Items List (8 cols) */}
            <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-gray-200/80 shadow-sm space-y-6">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-gray-100 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    {/* Item Image */}
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-gray-50 p-2 border border-gray-100 flex items-center justify-center">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <ShoppingBag className="h-8 w-8 text-gray-300" />
                      )}
                    </div>
                    {/* Details */}
                    <div>
                      <Link
                        href={`/product/${item.slug}`}
                        className="font-bold text-sm text-gray-900 hover:text-red-600 line-clamp-2"
                      >
                        {item.name}
                      </Link>
                      <p className="text-xs text-gray-500 font-medium mt-1">
                        Option: {item.variantName}
                      </p>
                      <p className="text-sm font-extrabold text-gray-900 mt-1">
                        {formatPrice(item.price)}
                      </p>
                    </div>
                  </div>

                  {/* Quantity Stepper & Line Total */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-gray-100">
                    <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 p-1">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-gray-700 shadow-xs hover:bg-gray-100"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-gray-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-gray-700 shadow-xs hover:bg-gray-100"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="text-right">
                      <span className="font-extrabold text-base text-gray-900 block">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-xs font-semibold text-red-600 hover:underline flex items-center gap-1 mt-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary (4 cols) */}
            <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-gray-200/80 shadow-sm space-y-4 sticky top-24">
              <h2 className="font-extrabold text-lg text-gray-900 border-b border-gray-100 pb-3">
                Order Summary
              </h2>

              <div className="space-y-2 text-xs font-semibold text-gray-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-bold text-gray-900">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Shipping</span>
                  <span className="font-bold uppercase">FREE</span>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3 flex justify-between items-baseline">
                <span className="font-extrabold text-base text-gray-900">Total Amount</span>
                <span className="font-extrabold text-2xl text-red-600">{formatPrice(subtotal)}</span>
              </div>

              {/* Proceed to Checkout Button */}
              <Link
                href="/checkout"
                prefetch={true}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-xl transition-all duration-300 hover:bg-red-700 hover:scale-[1.02] active:scale-95"
              >
                <span>PROCEED TO CHECKOUT</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              {/* Trust Badges */}
              <div className="pt-4 border-t border-gray-100 space-y-2 text-[11px] font-semibold text-gray-500">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>100% Safe & Verified Checkout</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Free Express Delivery Across India</span>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-white rounded-3xl p-16 text-center border border-gray-200/80 max-w-xl mx-auto space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400 mx-auto">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <h2 className="font-extrabold text-xl text-gray-900">Your Cart is Empty</h2>
            <p className="text-xs text-gray-500">
              Looks like you haven&apos;t added any RC cars or diecast models to your cart yet.
            </p>
            <Link
              href="/shop"
              className="inline-block rounded-full bg-black px-8 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-red-600 transition-colors"
            >
              Explore Products
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
