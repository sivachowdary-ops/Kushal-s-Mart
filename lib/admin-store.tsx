"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { supabase } from "@/lib/supabase-client";

// ── Types ──────────────────────────────────────────────────

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  category_id: string | null;
  brand: string | null;
  mrp: number; // paise
  selling_price: number; // paise
  cost_price: number; // paise
  weight_grams: number | null;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  images: string[];
  specifications: Record<string, string> | { key: string; value: string }[];
  whats_in_the_box: string[];
  badge_type: string | null;
  discount_percent: number | null;
  is_active: boolean;
  variants?: AdminVariant[];
  categories?: { id: string; name: string } | null;
  product_variants?: AdminVariant[];
  created_at: string;
  updated_at: string;
}

export interface AdminVariant {
  id: string;
  product_id: string;
  name: string;
  sku: string;
  stock: number;
  low_stock_threshold: number;
  /** If set, overrides parent product's selling_price for this variant (e.g. Sedan Orange at ₹1,800) */
  selling_price_override: number | null;
  /** If set, overrides parent product's mrp for this variant (e.g. Toyota MN82 Green has different MRP) */
  mrp_override: number | null;
  images?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface AdminOrder {
  id: string;
  order_number: string;
  channel: "ONLINE" | "OFFLINE";
  status: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  shipping_address?: Record<string, string> | null;
  subtotal: number; // paise
  discount: number; // paise
  total: number; // paise
  payment_status: string;
  payment_mode?: string | null;
  shiprocket_awb?: string | null;
  courier_name?: string | null;
  timeline: { status: string; timestamp: string; note?: string }[];
  order_items?: AdminOrderItem[];
  created_at: string;
  updated_at: string;
}

export interface AdminOrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  variant_name: string;
  unit_price: number; // paise
  cost_price: number; // paise
  quantity: number;
  line_total: number; // paise
  image?: string | null;
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  sort_order: number;
}

export interface ProductFinancialStats {
  productId: string;
  productName: string;
  brand: string;
  category: string;
  mrp: number;
  sellingPrice: number;
  costPrice: number;
  unitsSold: number;
  onlineUnitsSold: number;
  counterUnitsSold: number;
  // Alias fields for convenience
  onlineUnits: number;
  counterUnits: number;
  revenue: number;
  onlineRevenue: number;
  counterRevenue: number;
  totalCost: number;
  cost: number; // alias for totalCost
  netProfit: number;
  profit: number; // alias for netProfit
  profitMarginPercent: number;
}

// ── Context ────────────────────────────────────────────────

interface AdminStoreContextType {
  // Loading state
  isLoading: boolean;
  error: string | null;

  // Products
  products: AdminProduct[];
  addProduct: (
    product: Partial<AdminProduct>,
    variants?: Partial<AdminVariant>[]
  ) => Promise<AdminProduct | null>;
  updateProduct: (
    id: string,
    updates: Partial<AdminProduct>,
    variants?: Partial<AdminVariant>[]
  ) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  refreshProducts: () => Promise<void>;

  // Categories
  categories: AdminCategory[];
  addCategory: (
    cat: Omit<AdminCategory, "id">
  ) => Promise<AdminCategory | null>;
  updateCategory: (
    id: string,
    updates: Partial<AdminCategory>
  ) => Promise<boolean>;
  deleteCategory: (id: string) => Promise<boolean>;
  refreshCategories: () => Promise<void>;

  // Orders
  orders: AdminOrder[];
  orderItems: AdminOrderItem[];
  addOrder: (
    order: Partial<AdminOrder>,
    items?: Partial<AdminOrderItem>[]
  ) => Promise<AdminOrder | null>;
  updateOrderStatus: (
    id: string,
    status: string,
    note?: string
  ) => Promise<boolean>;
  updateOrderShipping: (
    id: string,
    courier: string,
    awb: string
  ) => Promise<boolean>;
  refreshOrders: () => Promise<void>;

  // Financial Stats
  totalRevenue: number;
  totalCostOfGoods: number;
  totalNetProfit: number;
  onlineSalesTotal: number;
  counterSalesTotal: number;
  ordersToday: number;
  lowStockCount: number;
  getProductFinancialStats: (
    timeframe?: "today" | "week" | "month" | "year" | "all"
  ) => ProductFinancialStats[];
}

const AdminStoreContext = createContext<AdminStoreContextType | undefined>(
  undefined
);

// ── Helper: get auth token ─────────────────────────────────

async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

// ── Normalize product from API ─────────────────────────────

function normalizeProduct(raw: Record<string, unknown>): AdminProduct {
  const p = (raw as unknown) as AdminProduct;
  // API returns product_variants, pages expect variants
  if (!p.variants && p.product_variants) {
    p.variants = p.product_variants;
  }
  if (!p.variants) p.variants = [];
  if (!p.images) p.images = [];
  return p;
}

// ── Provider ───────────────────────────────────────────────

export function AdminStoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch all data on mount ──

  const refreshProducts = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/admin/products", { headers });
      if (res.ok) {
        const data = await res.json();
        const arr = Array.isArray(data) ? data : data.products || [];
        setProducts(arr.map(normalizeProduct));
      }
    } catch (e) {
      console.error("Failed to fetch products:", e);
    }
  }, []);

  const refreshCategories = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/admin/categories", { headers });
      if (res.ok) {
        const data = await res.json();
        setCategories(
          Array.isArray(data) ? data : data.categories || []
        );
      }
    } catch (e) {
      console.error("Failed to fetch categories:", e);
    }
  }, []);

  const refreshOrders = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/admin/orders", { headers });
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : data.orders || []);
      }
    } catch (e) {
      console.error("Failed to fetch orders:", e);
    }
  }, []);

  useEffect(() => {
    async function loadAll() {
      setIsLoading(true);
      setError(null);
      try {
        await Promise.all([
          refreshProducts(),
          refreshCategories(),
          refreshOrders(),
        ]);
      } catch (e) {
        setError("Failed to load admin data. Please check your connection.");
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    loadAll();
  }, [refreshProducts, refreshCategories, refreshOrders]);

  // ── Derived: flat order items array ──

  const orderItems: AdminOrderItem[] = orders.flatMap(
    (o) => o.order_items || []
  );

  // ── Product CRUD ──

  const addProduct = useCallback(
    async (
      product: Partial<AdminProduct>,
      variants?: Partial<AdminVariant>[]
    ): Promise<AdminProduct | null> => {
      try {
        const headers = await getAuthHeaders();
        const body: Record<string, unknown> = { ...product };
        if (variants && variants.length > 0) {
          body.variants = variants;
        }
        // Remove nested join fields
        delete body.categories;
        delete body.product_variants;
        // Remove id if present (server generates it)
        delete body.id;

        const res = await fetch("/api/admin/products", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const data = await res.json();
          const newProduct = normalizeProduct(
            data.product || data
          );
          setProducts((prev) => [newProduct, ...prev]);
          return newProduct;
        } else {
          const err = await res.json().catch(() => ({}));
          const message = err.error || err.message || `Server error (${res.status})`;
          console.error("Failed to add product:", message);
          throw new Error(message);
        }
      } catch (e) {
        console.error("Failed to add product:", e);
        throw e;
      }
    },
    []
  );

  const updateProduct = useCallback(
    async (
      id: string,
      updates: Partial<AdminProduct>,
      variants?: Partial<AdminVariant>[]
    ): Promise<boolean> => {
      try {
        const headers = await getAuthHeaders();
        const body: Record<string, unknown> = { ...updates };
        delete body.categories;
        delete body.product_variants;
        if (variants !== undefined) {
          body.variants = variants;
        } else {
          delete body.variants;
        }

        const res = await fetch(`/api/admin/products/${id}`, {
          method: "PUT",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const data = await res.json();
          const updated = normalizeProduct(data.product || data);
          setProducts((prev) =>
            prev.map((p) => (p.id === id ? updated : p))
          );
          return true;
        }
      } catch (e) {
        console.error("Failed to update product:", e);
      }
      return false;
    },
    []
  );

  const deleteProduct = useCallback(async (id: string): Promise<boolean> => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        return true;
      }
    } catch (e) {
      console.error("Failed to delete product:", e);
    }
    return false;
  }, []);

  // ── Category CRUD ──

  const addCategory = useCallback(
    async (
      cat: Omit<AdminCategory, "id">
    ): Promise<AdminCategory | null> => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch("/api/admin/categories", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(cat),
        });
        if (res.ok) {
          const data = await res.json();
          const newCat = data.category || data;
          if (newCat) {
            setCategories((prev) => [...prev, newCat]);
            return newCat;
          }
        }
      } catch (e) {
        console.error("Failed to add category:", e);
      }
      return null;
    },
    []
  );

  const updateCategory = useCallback(
    async (
      id: string,
      updates: Partial<AdminCategory>
    ): Promise<boolean> => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/admin/categories/${id}`, {
          method: "PUT",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (res.ok) {
          const data = await res.json();
          const updated = data.category || data;
          if (updated) {
            setCategories((prev) =>
              prev.map((c) => (c.id === id ? updated : c))
            );
          }
          return true;
        }
      } catch (e) {
        console.error("Failed to update category:", e);
      }
      return false;
    },
    []
  );

  const deleteCategory = useCallback(async (id: string): Promise<boolean> => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== id));
        return true;
      }
    } catch (e) {
      console.error("Failed to delete category:", e);
    }
    return false;
  }, []);

  // ── Order CRUD ──

  const addOrder = useCallback(
    async (
      order: Partial<AdminOrder>,
      items?: Partial<AdminOrderItem>[]
    ): Promise<AdminOrder | null> => {
      try {
        const headers = await getAuthHeaders();
        const body: Record<string, unknown> = { ...order };
        if (items && items.length > 0) {
          body.items = items;
        }
        delete body.order_items;
        delete body.id;

        const res = await fetch("/api/admin/orders", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const data = await res.json();
          const newOrder = (data.order || data) as AdminOrder;
          if (newOrder) {
            setOrders((prev) => [newOrder, ...prev]);
            return newOrder;
          }
        }
      } catch (e) {
        console.error("Failed to create order:", e);
      }
      return null;
    },
    []
  );

  const updateOrderStatus = useCallback(
    async (
      id: string,
      status: string,
      note?: string
    ): Promise<boolean> => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/admin/orders/${id}`, {
          method: "PUT",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ status, note }),
        });
        if (res.ok) {
          const data = await res.json();
          const updated = (data.order || data) as AdminOrder;
          if (updated) {
            setOrders((prev) =>
              prev.map((o) => (o.id === id ? updated : o))
            );
          }
          return true;
        }
      } catch (e) {
        console.error("Failed to update order status:", e);
      }
      return false;
    },
    []
  );

  const updateOrderShipping = useCallback(
    async (
      id: string,
      courier: string,
      awb: string
    ): Promise<boolean> => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/admin/orders/${id}`, {
          method: "PUT",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            shiprocket_awb: awb,
            courier_name: courier,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const updated = (data.order || data) as AdminOrder;
          if (updated) {
            setOrders((prev) =>
              prev.map((o) => (o.id === id ? updated : o))
            );
          }
          return true;
        }
      } catch (e) {
        console.error("Failed to update shipping:", e);
      }
      return false;
    },
    []
  );

  // ── Financial Calculations (client-side from loaded data) ──

  const paidOrders = orders.filter(
    (o) =>
      o.payment_status === "PAID" ||
      o.status === "COMPLETED" ||
      o.status === "DELIVERED" ||
      o.status === "SHIPPED" ||
      o.status === "PACKED"
  );

  const totalRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);

  const onlineSalesTotal = paidOrders
    .filter((o) => o.channel === "ONLINE")
    .reduce((sum, o) => sum + o.total, 0);

  const counterSalesTotal = paidOrders
    .filter((o) => o.channel === "OFFLINE")
    .reduce((sum, o) => sum + o.total, 0);

  let totalCostOfGoods = 0;
  paidOrders.forEach((order) => {
    (order.order_items || []).forEach((item) => {
      const unitCost =
        item.cost_price || Math.round(item.unit_price * 0.65);
      totalCostOfGoods += unitCost * item.quantity;
    });
  });

  const totalNetProfit = totalRevenue - totalCostOfGoods;

  const todayStr = new Date().toISOString().slice(0, 10);
  const ordersToday = orders.filter(
    (o) => o.created_at.slice(0, 10) === todayStr
  ).length;

  const lowStockCount = products.reduce((count, p) => {
    const low = (p.variants || []).filter(
      (v) => v.stock <= (v.low_stock_threshold || 3)
    ).length;
    return count + low;
  }, 0);

  const getProductFinancialStats = useCallback(
    (
      timeframe: "today" | "week" | "month" | "year" | "all" = "all"
    ): ProductFinancialStats[] => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const currentDateStr = now.toISOString().slice(0, 10);

      // Calculate start of current week (Monday)
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - diffToMonday);
      weekStart.setHours(0, 0, 0, 0);

      const filteredOrders = paidOrders.filter((order) => {
        const orderDate = new Date(order.created_at);
        if (timeframe === "today") {
          return order.created_at.slice(0, 10) === currentDateStr;
        }
        if (timeframe === "week") {
          return orderDate >= weekStart;
        }
        if (timeframe === "month") {
          return (
            orderDate.getFullYear() === currentYear &&
            orderDate.getMonth() === currentMonth
          );
        }
        if (timeframe === "year") {
          return orderDate.getFullYear() === currentYear;
        }
        return true;
      });

      return products.map((product) => {
        let unitsSold = 0;
        let onlineUnitsSold = 0;
        let counterUnitsSold = 0;
        let revenue = 0;
        let onlineRevenue = 0;
        let counterRevenue = 0;

        filteredOrders.forEach((order) => {
          (order.order_items || []).forEach((item) => {
            if (item.product_id === product.id) {
              const qty = item.quantity;
              const rev = item.line_total;

              unitsSold += qty;
              revenue += rev;

              if (order.channel === "ONLINE") {
                onlineUnitsSold += qty;
                onlineRevenue += rev;
              } else {
                counterUnitsSold += qty;
                counterRevenue += rev;
              }
            }
          });
        });

        const costPrice =
          product.cost_price || Math.round(product.selling_price * 0.65);
        const totalCost = unitsSold * costPrice;
        const netProfit = revenue - totalCost;
        const profitMarginPercent =
          revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0;

        const cat = categories.find((c) => c.id === product.category_id);

        return {
          productId: product.id,
          productName: product.name,
          brand: product.brand || "",
          category: cat?.name || "",
          mrp: product.mrp,
          sellingPrice: product.selling_price,
          costPrice,
          unitsSold,
          onlineUnitsSold,
          counterUnitsSold,
          onlineUnits: onlineUnitsSold,
          counterUnits: counterUnitsSold,
          revenue,
          onlineRevenue,
          counterRevenue,
          totalCost,
          cost: totalCost,
          netProfit,
          profit: netProfit,
          profitMarginPercent,
        };
      });
    },
    [products, paidOrders, categories]
  );

  return (
    <AdminStoreContext.Provider
      value={{
        isLoading,
        error,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        refreshProducts,
        categories,
        addCategory,
        updateCategory,
        deleteCategory,
        refreshCategories,
        orders,
        orderItems,
        addOrder,
        updateOrderStatus,
        updateOrderShipping,
        refreshOrders,
        totalRevenue,
        totalCostOfGoods,
        totalNetProfit,
        onlineSalesTotal,
        counterSalesTotal,
        ordersToday,
        lowStockCount,
        getProductFinancialStats,
      }}
    >
      {children}
    </AdminStoreContext.Provider>
  );
}

export function useAdminStore() {
  const context = useContext(AdminStoreContext);
  if (!context) {
    throw new Error("useAdminStore must be used within an AdminStoreProvider");
  }
  return context;
}
