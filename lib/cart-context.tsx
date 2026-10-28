"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
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
  /** Stock available when the item was added/last synced; caps the quantity steppers */
  maxStock?: number;
}

interface CartContextType {
  cartItems: CartItem[];
  cartCount: number;
  subtotal: number;
  isCartOpen: boolean;
  isLoaded: boolean;
  /** Message shown after syncing the cart changed prices or removed items */
  cartNotice: string | null;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (item: Omit<CartItem, "id">) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  syncCartWithCatalog: () => Promise<void>;
  dismissCartNotice: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = "kushals_mart_cart_v1";

/** Must match MAX_QTY_PER_LINE in /api/orders/create */
export const MAX_QTY_PER_ITEM = 20;

/** Highest quantity allowed for a cart line, given the stock we know about. */
export function getMaxQuantity(item: Pick<CartItem, "maxStock">): number {
  return typeof item.maxStock === "number" ? Math.min(item.maxStock, MAX_QTY_PER_ITEM) : MAX_QTY_PER_ITEM;
}

interface CatalogVariant {
  id: string;
  name: string;
  stock: number;
  selling_price_override: number | null;
}

interface CatalogProduct {
  id: string;
  name: string;
  selling_price: number;
  variants: CatalogVariant[];
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [cartNotice, setCartNotice] = useState<string | null>(null);

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

  // Latest cart for async work (catalog sync) that must not read a stale closure
  const cartItemsRef = useRef<CartItem[]>([]);
  useEffect(() => {
    cartItemsRef.current = cartItems;
  }, [cartItems]);

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
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  const addToCart = (newItem: Omit<CartItem, "id">) => {
    const id = `${newItem.productId}-${newItem.variantId}`;
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === id);
      if (existing) {
        // Immutable update — mutating the previous state object double-counts under React StrictMode
        const merged = { ...existing, ...newItem, id };
        merged.quantity = Math.min(existing.quantity + newItem.quantity, getMaxQuantity(merged));
        return prev.map((item) => (item.id === id ? merged : item));
      }
      const added = { ...newItem, id };
      added.quantity = Math.max(1, Math.min(newItem.quantity, getMaxQuantity(added)));
      return [...prev, added];
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
      prev.map((item) =>
        item.id === id ? { ...item, quantity: Math.min(quantity, getMaxQuantity(item)) } : item
      )
    );
  };

  const clearCart = () => setCartItems([]);

  /**
   * Re-checks every cart line against the live catalog: updates prices and stock,
   * caps quantities, and removes items that are no longer sold. Carts live in
   * localStorage for days, so prices and stock can be stale by checkout time.
   */
  const syncCartWithCatalog = useCallback(async () => {
    let catalog: CatalogProduct[];
    try {
      const res = await fetch("/api/storefront/products", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      catalog = data.products || [];
    } catch {
      return; // Offline — keep the cart as is; the server re-validates at checkout
    }
    if (catalog.length === 0) return;

    const byId = new Map(catalog.map((p) => [p.id, p]));
    const changes: string[] = [];
    const next: CartItem[] = [];

    for (const item of cartItemsRef.current) {
      const product = byId.get(item.productId);
      const variants = product?.variants || [];
      const variant =
        variants.find((v) => v.id === item.variantId) ||
        (item.variantId === "default" ? variants[0] : undefined);

      if (!product || !variant) {
        changes.push(`"${item.name}" is no longer available and was removed`);
        continue;
      }
      if (variant.stock <= 0) {
        changes.push(`"${item.name}" (${variant.name}) is out of stock and was removed`);
        continue;
      }

      const price = variant.selling_price_override ?? product.selling_price;
      const id = `${item.productId}-${variant.id}`;
      const alreadyInCart = next.find((n) => n.id === id)?.quantity ?? 0;
      const wanted = item.quantity + alreadyInCart;
      const quantity = Math.min(wanted, variant.stock, MAX_QTY_PER_ITEM);
      if (price !== item.price) changes.push(`The price of "${item.name}" has changed`);
      if (quantity < wanted) {
        changes.push(
          variant.stock < MAX_QTY_PER_ITEM && quantity === variant.stock
            ? `Only ${variant.stock} of "${item.name}" left — quantity updated`
            : `You can order up to ${MAX_QTY_PER_ITEM} of "${item.name}" at a time — quantity updated`
        );
      }

      const synced: CartItem = {
        ...item,
        id,
        variantId: variant.id,
        variantName: variant.name || item.variantName,
        price,
        quantity,
        maxStock: variant.stock,
      };
      const existingIdx = next.findIndex((n) => n.id === id);
      if (existingIdx >= 0) next[existingIdx] = synced;
      else next.push(synced);
    }

    setCartItems(next);
    if (changes.length > 0) setCartNotice([...new Set(changes)].join(". ") + ".");
  }, []);

  const dismissCartNotice = () => setCartNotice(null);

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
        cartNotice,
        openCart,
        closeCart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        syncCartWithCatalog,
        dismissCartNotice,
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
