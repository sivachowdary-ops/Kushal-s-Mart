"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Check, X } from "lucide-react";

export interface CartItem {
  id: string; // unique cart item id (e.g. productId + variantId)
  productId: string;
  slug: string;
  name: string;
  variantId: string;
  variantName: string;
  price: number; // in paise
  image: string;
  quantity: number;
}

interface CartContextType {
  cartItems: CartItem[];
  cartCount: number;
  subtotal: number;
  isCartOpen: boolean;
  isLoaded: boolean;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (item: Omit<CartItem, "id">) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = "kushals_mart_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        setCartItems(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load cart from localStorage", e);
    }
    setIsLoaded(true);
  }, []);

  // Save cart to localStorage on changes
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (e) {
      console.error("Failed to save cart to localStorage", e);
    }
  }, [cartItems, isLoaded]);

  const [toastItem, setToastItem] = useState<{ name: string; variantName: string; image?: string } | null>(null);

  useEffect(() => {
    if (!toastItem) return;
    const timer = setTimeout(() => setToastItem(null), 3500);
    return () => clearTimeout(timer);
  }, [toastItem]);

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  const addToCart = (newItem: Omit<CartItem, "id">) => {
    const id = `${newItem.productId}-${newItem.variantId}`;
    setCartItems((prev) => {
      const existingIdx = prev.findIndex((item) => item.id === id);
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += newItem.quantity;
        return updated;
      }
      return [...prev, { ...newItem, id }];
    });
    setToastItem({
      name: newItem.name,
      variantName: newItem.variantName,
      image: newItem.image,
    });
    setIsCartOpen(true); // Auto-open cart drawer when item is added!
  };

  const removeFromCart = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => setCartItems([]);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartCount,
        subtotal,
        isCartOpen,
        isLoaded,
        openCart,
        closeCart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
      }}
    >
      {children}

      {/* Global "Item Added to Cart" Toast */}
      {toastItem && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-4 sm:right-6 z-50 max-w-sm w-[calc(100vw-2rem)] sm:w-auto bg-white rounded-2xl shadow-2xl border-2 border-emerald-500 p-3.5 flex items-center gap-3 transition-all transform animate-slide-in-right"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
            <Check className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div className="flex-1 min-w-0 pr-1">
            <p className="text-xs font-black text-gray-900 tracking-tight">Item Added to Cart!</p>
            <p className="text-[11px] font-semibold text-gray-500 truncate mt-0.5">
              {toastItem.name} {toastItem.variantName && toastItem.variantName !== "Standard" ? `· ${toastItem.variantName}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                setToastItem(null);
                setIsCartOpen(true);
              }}
              className="rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-[10px] font-black uppercase tracking-wider px-3 py-2 transition-all shadow-sm cursor-pointer"
            >
              View Cart
            </button>
            <button
              onClick={() => setToastItem(null)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              aria-label="Close notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </aside>
      )}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
