"use client";

import { useEffect, useState } from "react";
import { useAdminStore, AdminProduct, AdminVariant, AdminOrder } from "@/lib/admin-store";
import { supabase } from "@/lib/supabase-client";
import { checkAuthLockout, recordFailedAuthAttempt, resetAuthAttempts } from "@/lib/auth-rate-limit";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Check,
  CreditCard,
  Banknote,
  User,
  Printer,
  ShieldCheck,
  Mail,
  KeyRound,
  AlertCircle,
  ShieldAlert,
  Receipt,
  X,
  Clock,
  Eye,
  RefreshCw,
  Calendar,
  Phone,
  Hash,
} from "lucide-react";
import { STORE_BRANCHES, getStoreBranch } from "@/lib/stores";
import { KotReceipt, printKot } from "@/components/admin/kot-receipt";

interface CartItem {
  product: AdminProduct;
  variant: AdminVariant;
  quantity: number;
}

export default function StandalonePOSPage() {
  const { products, categories, orders, isLoading, refreshProducts, refreshOrders, addOrder } = useAdminStore();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMode, setPaymentMode] = useState<string>("CASH");
  const [isProcessing, setIsProcessing] = useState(false);
  const [mobileTab, setMobileTab] = useState<"products" | "cart" | "orders">("products");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Multi-Store Branch & Staff 2FA State
  const [selectedBranchId, setSelectedBranchId] = useState<string>("kochi-flagship");
  const [isRegisterUnlocked, setIsRegisterUnlocked] = useState<boolean>(false);
  const [cashierName, setCashierName] = useState<string>("Store Cashier");

  // Orders Modal & Receipt Preview State
  const [showOrdersModal, setShowOrdersModal] = useState<boolean>(false);
  const [ordersSearch, setOrdersSearch] = useState<string>("");
  const [orderChannelFilter, setOrderChannelFilter] = useState<"ALL" | "OFFLINE" | "ONLINE">("ALL");
  const [receiptOrder, setReceiptOrder] = useState<AdminOrder | null>(null);
  
  // Step 1: Store Staff Email & Password Auth State
  const [posEmail, setPosEmail] = useState<string>("");
  const [posPassword, setPosPassword] = useState<string>("");
  const [posAuthError, setPosAuthError] = useState<string>("");
  const [isSubmittingStep1, setIsSubmittingStep1] = useState<boolean>(false);

  // Rate Limiting
  const [isPosLockedOut, setIsPosLockedOut] = useState<boolean>(false);
  const [posLockoutSeconds, setPosLockoutSeconds] = useState<number>(0);

  // Lockout countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPosLockedOut && posLockoutSeconds > 0) {
      timer = setInterval(() => {
        setPosLockoutSeconds((prev) => {
          if (prev <= 1) {
            setIsPosLockedOut(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPosLockedOut, posLockoutSeconds]);

  useEffect(() => {
    async function checkPosSession() {
      try {
        const savedBranch = localStorage.getItem("km_active_store_branch");
        if (savedBranch) setSelectedBranchId(savedBranch);

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const role = session.user.user_metadata?.role;
          const isAdmin = session.user.email === "jogabetha@gmail.com" || session.user.email === "sivaprasadpenneti8@gmail.com" || role === "admin";
          const isPosStaff = role === "pos_staff";
          if (isAdmin || isPosStaff) {
            setIsRegisterUnlocked(true);
            const staffDisplayName = (session.user.user_metadata?.name as string) || session.user.email || "Cashier";
            setCashierName(staffDisplayName);
            refreshOrders();
            refreshProducts();
            return;
          }
        }
        setIsRegisterUnlocked(false);
        sessionStorage.removeItem("km_pos_register_unlocked");
      } catch {}
    }
    checkPosSession();
  }, [refreshOrders, refreshProducts]);

  // Check rate limit on email change
  useEffect(() => {
    if (posEmail) {
      const lockout = checkAuthLockout(posEmail.trim());
      setIsPosLockedOut(lockout.isLocked);
      setPosLockoutSeconds(lockout.remainingSeconds);
    }
  }, [posEmail]);

  // When Step 1 passes, verify POS staff privileges & unlock the register
  const handlePosStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPosAuthError("");

    const lockout = checkAuthLockout(posEmail.trim());
    if (lockout.isLocked) {
      setIsPosLockedOut(true);
      setPosLockoutSeconds(lockout.remainingSeconds);
      setPosAuthError(`Account locked after 5 failed attempts. Wait ${Math.ceil(lockout.remainingSeconds / 60)} minutes.`);
      return;
    }

    setIsSubmittingStep1(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: posEmail.trim(),
        password: posPassword,
      });

      if (error) {
        const record = recordFailedAuthAttempt(posEmail.trim());
        if (record.isLocked) {
          setIsPosLockedOut(true);
          setPosLockoutSeconds(record.remainingSeconds);
          setPosAuthError("Account locked for 15 minutes due to 5 failed attempts.");
        } else {
          setPosAuthError(`Invalid credentials. Attempt ${record.failedAttempts} of 5 before lockout.`);
        }
      } else if (data.session && data.user) {
        // Enforce role authorization: Must be registered pos_staff or store admin
        const role = data.user.user_metadata?.role;
        const isAdmin = data.user.email === "sivaprasadpenneti8@gmail.com" || data.user.email === "jogabetha@gmail.com" || role === "admin";
        const isPosStaff = role === "pos_staff";

        if (!isAdmin && !isPosStaff) {
          await supabase.auth.signOut();
          setPosAuthError("Access Denied: This account is not authorized for the store POS terminal. Contact your store administrator.");
          return;
        }

        resetAuthAttempts(posEmail.trim());
        const staffDisplayName = (data.user.user_metadata?.name as string) || data.user.email || "Cashier";
        setCashierName(staffDisplayName);
        setIsRegisterUnlocked(true);
        refreshOrders();
        refreshProducts();

        try {
          sessionStorage.setItem("km_pos_register_unlocked", "true");
          sessionStorage.setItem("km_pos_cashier_name", staffDisplayName);
          localStorage.setItem("km_active_store_branch", selectedBranchId);
        } catch {}
      }
    } catch {
      setPosAuthError("Authentication failed. Please check your network.");
    } finally {
      setIsSubmittingStep1(false);
    }
  };

  const handleLockRegister = async () => {
    setIsRegisterUnlocked(false);
    try {
      await supabase.auth.signOut();
      sessionStorage.removeItem("km_pos_register_unlocked");
      sessionStorage.removeItem("km_pos_cashier_name");
    } catch {}
  };

  const activeBranch = getStoreBranch(selectedBranchId);

  const [completedOrder, setCompletedOrder] = useState<{
    id: string;
    orderNumber: string;
    total: number;
    paymentMode: string;
    itemsCount: number;
    storeBranch?: string;
    items?: Array<{
      productName: string;
      variantName: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }>;
  } | null>(null);

  useEffect(() => {
    refreshProducts();
  }, [refreshProducts]);

  const activeProducts = products.filter(p => p.is_active);
  const filteredProducts = activeProducts.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "ALL" || p.category_id === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: AdminProduct) => {
    const realVariant = product.variants?.[0] || product.product_variants?.[0];
    const variant: AdminVariant = realVariant || {
      id: "",
      product_id: product.id,
      name: "Default",
      sku: `sku-${product.id}`,
      stock: 99,
      selling_price_override: null,
      mrp_override: null,
      low_stock_threshold: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, variant, quantity: 1 }];
    });

    setToastMessage(`Added "${product.name}" to counter order`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQuantity = Math.max(0, item.quantity + delta);
          return { ...item, quantity: newQuantity };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.product.selling_price * item.quantity), 0);
  const discount = 0;
  const total = subtotal - discount;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!customerPhone) {
      alert("Customer phone is required for digital invoice");
      return;
    }

    setIsProcessing(true);
    try {
      const orderData = {
        channel: "OFFLINE" as const,
        status: "COMPLETED" as const,
        customer_name: customerName || "Walk-in Customer",
        customer_phone: customerPhone,
        customer_email: posEmail ? posEmail.trim() : null,
        shipping_address: null,
        subtotal,
        discount,
        total,
        payment_status: "PAID",
        payment_mode: paymentMode,
      };

      const orderItemsData = cart.map(item => ({
        product_id: item.product.id,
        variant_id: item.variant.id || null,
        product_name: item.product.name,
        variant_name: item.variant.name || "Default",
        unit_price: item.product.selling_price,
        quantity: item.quantity,
        line_total: item.product.selling_price * item.quantity,
      }));

      const newOrder = await addOrder(orderData, orderItemsData);
      
      if (newOrder) {
        await refreshOrders();
        setCompletedOrder({
          id: newOrder.id,
          orderNumber: newOrder.order_number,
          total,
          paymentMode,
          itemsCount: cart.reduce((acc, curr) => acc + curr.quantity, 0),
          storeBranch: selectedBranchId,
          items: orderItemsData.map((oi) => ({
            productName: oi.product_name,
            variantName: oi.variant_name,
            quantity: oi.quantity,
            unitPrice: oi.unit_price,
            lineTotal: oi.line_total,
          })),
        });
        setCart([]);
        setCustomerName("");
        setCustomerPhone("");
      } else {
        alert("Failed to create order. Please check your staff login session.");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Failed to process order");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading && products.length === 0) {
    return <div className="flex h-screen items-center justify-center bg-[#F4F5F7]"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-900 border-t-transparent"></div></div>;
  }

  // ── POS Login Screen ──
  if (!isRegisterUnlocked) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-140px)] p-4">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-gray-200/80 p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-900 text-white font-black text-xl mx-auto shadow-md">
              POS
            </div>
            <span className="inline-block bg-red-50 text-red-700 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-red-200">
              Staff Sign In
            </span>
            <h1 className="font-extrabold text-2xl text-gray-900 tracking-tight">Open POS Terminal</h1>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Enter your staff credentials to open the register.
            </p>
          </div>

          {/* Security Lockout Banner */}
          {isPosLockedOut && (
            <div className="rounded-2xl bg-red-100 border-2 border-red-500 p-4 text-xs font-bold text-red-700 flex items-center gap-3 animate-pulse">
              <ShieldAlert className="h-6 w-6 shrink-0 text-red-600" />
              <div>
                <div className="font-black text-sm">SECURITY LOCKOUT ACTIVE</div>
                <div>
                  Locked after 5 failed attempts. Please wait{" "}
                  <span className="font-mono text-sm underline font-black">
                    {Math.floor(posLockoutSeconds / 60)}m {posLockoutSeconds % 60}s
                  </span>{" "}
                  before retrying.
                </div>
              </div>
            </div>
          )}

          {posAuthError && !isPosLockedOut && (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-3.5 text-xs font-bold text-red-600 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{posAuthError}</span>
            </div>
          )}

          <form onSubmit={handlePosStep1Submit} className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  <Mail className="inline h-3.5 w-3.5 mr-1 text-gray-400" />
                  Staff Email
                </label>
                <input
                  type="email"
                  required
                  disabled={isPosLockedOut}
                  value={posEmail}
                  onChange={(e) => setPosEmail(e.target.value)}
                  placeholder="admin@kushalsmart.com"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3.5 text-xs font-semibold text-gray-900 focus:border-red-500 focus:bg-white focus:outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  <KeyRound className="inline h-3.5 w-3.5 mr-1 text-gray-400" />
                  Password
                </label>
                <input
                  type="password"
                  required
                  disabled={isPosLockedOut}
                  value={posPassword}
                  onChange={(e) => setPosPassword(e.target.value)}
                  placeholder="Enter staff password"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3.5 text-xs font-semibold text-gray-900 focus:border-red-500 focus:bg-white focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmittingStep1 || isPosLockedOut}
              className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isPosLockedOut ? "LOCKED (5 FAILED ATTEMPTS)" : isSubmittingStep1 ? "SIGNING IN..." : "OPEN POS REGISTER →"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col xl:flex-row h-[calc(100vh-100px)] bg-[#F4F5F7] overflow-hidden rounded-3xl border border-gray-200 shadow-sm relative">
      {/* Mobile Tab Switcher */}
      <div className="xl:hidden flex items-center bg-white p-2 border-b border-gray-200 shrink-0 gap-2">
        <button
          type="button"
          onClick={() => setMobileTab("products")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            mobileTab === "products"
              ? "bg-gray-900 text-white shadow-xs"
              : "bg-gray-50 text-gray-600 hover:bg-gray-100"
          }`}
        >
          📦 Products ({filteredProducts.length})
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("cart")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all relative flex items-center justify-center gap-1.5 ${
            mobileTab === "cart"
              ? "bg-gray-900 text-white shadow-xs"
              : "bg-gray-50 text-gray-600 hover:bg-gray-100"
          }`}
        >
          <span>🛒 Cart</span>
          {cart.length > 0 && (
            <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} · ₹{(total / 100).toLocaleString("en-IN")}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            refreshOrders();
            setShowOrdersModal(true);
          }}
          className="py-2 px-3 rounded-xl text-xs font-bold transition-all bg-gray-50 text-gray-700 hover:bg-gray-100 flex items-center justify-center gap-1"
        >
          <Receipt className="h-3.5 w-3.5 text-red-600" />
          <span>Orders ({orders.length})</span>
        </button>
      </div>

      {/* Left Area - Products */}
      <div className={`flex-1 flex-col min-w-0 h-full p-3.5 sm:p-5 overflow-hidden ${mobileTab === "products" ? "flex" : "hidden xl:flex"}`}>
        {/* Active Store Branch Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 bg-white p-2.5 sm:p-3 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-100 text-red-700 text-xs font-black">
              🏪
            </span>
            <div>
              <div className="font-extrabold text-xs text-gray-900 flex items-center gap-1.5">
                <span>{activeBranch.name}</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Active Branch
                </span>
              </div>
              <p className="text-[10px] text-gray-500 font-medium truncate max-w-xs">{activeBranch.address}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-xl text-[11px] font-bold text-slate-700">
              <User className="h-3 w-3 text-slate-500" />
              <span>Cashier: <b className="text-slate-900">{cashierName}</b></span>
            </div>
            <button
              type="button"
              onClick={() => {
                refreshOrders();
                setShowOrdersModal(true);
              }}
              className="text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              title="View Terminal Orders History"
            >
              <Receipt className="h-3.5 w-3.5 text-red-600" />
              <span className="hidden sm:inline">Recent Orders</span>
              <span className="inline-block bg-red-50 text-red-700 text-[10px] font-black px-1.5 py-0.5 rounded-full border border-red-100">
                {orders.length}
              </span>
            </button>
            <select
              value={selectedBranchId}
              onChange={(e) => {
                setSelectedBranchId(e.target.value);
                try { localStorage.setItem("km_active_store_branch", e.target.value); } catch {}
              }}
              className="text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-900 cursor-pointer"
            >
              {STORE_BRANCHES.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.city})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleLockRegister}
              title="Lock Register & Sign Out"
              className="text-xs font-bold text-gray-600 hover:text-red-600 bg-gray-50 hover:bg-red-50 px-2.5 py-1.5 rounded-xl border border-gray-200 transition-colors cursor-pointer flex items-center gap-1"
            >
              <KeyRound className="h-3.5 w-3.5 text-gray-400" />
              <span>Lock</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search products by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white shadow-xs pl-10 pr-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 font-medium"
            />
          </div>
        </div>

        {/* Categories Pills */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-1 scrollbar-hide shrink-0">
          <button
            onClick={() => setActiveCategory("ALL")}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-xs shrink-0 ${
              activeCategory === "ALL" ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/80"
            }`}
          >
            All Items
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-xs shrink-0 ${
                activeCategory === cat.id ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/80"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto min-h-0 pr-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4 pb-6">
            {filteredProducts.map((product) => {
              const mainVariant = product.variants?.[0] || product.product_variants?.[0];
              const stock = mainVariant?.stock ?? 0;
              const isOutOfStock = stock <= 0;

              return (
                <div
                  key={product.id}
                  onClick={() => !isOutOfStock && addToCart(product)}
                  className={`flex flex-col justify-between rounded-2xl border bg-white p-3 shadow-xs transition-all ${
                    isOutOfStock
                      ? "opacity-60 border-gray-200 cursor-not-allowed"
                      : "border-gray-200/80 hover:shadow-md hover:border-gray-900 cursor-pointer active:scale-95"
                  }`}
                >
                  <div>
                    <div className="aspect-square w-full rounded-xl bg-gray-100 mb-2.5 overflow-hidden flex items-center justify-center relative">
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-300 font-bold text-xs">No Image</span>
                      )}
                      <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs ${
                        isOutOfStock ? "bg-red-500 text-white" : "bg-white/90 text-gray-800 backdrop-blur-xs"
                      }`}>
                        {isOutOfStock ? "Out of Stock" : `${stock} in stock`}
                      </span>
                    </div>
                    <div className="font-bold text-xs sm:text-sm text-gray-900 line-clamp-2 leading-snug">
                      {product.name}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                    <span className="font-black text-xs sm:text-sm text-gray-900">
                      ₹{(product.selling_price / 100).toLocaleString("en-IN")}
                    </span>
                    <button
                      type="button"
                      disabled={isOutOfStock}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-900 hover:bg-black text-white disabled:bg-gray-300 transition-colors shadow-xs"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Area - Cart & Checkout */}
      <div className={`w-full xl:w-[400px] flex-col bg-white border-l border-gray-200 h-full ${mobileTab === "cart" ? "flex" : "hidden xl:flex"}`}>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-gray-900">Counter Order Cart</span>
            <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full font-bold">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          </div>
          {cart.length > 0 && (
            <button
              onClick={() => setCart([])}
              className="text-xs font-bold text-red-600 hover:text-red-700 transition-colors"
            >
              Clear Cart
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 py-12">
              <span className="text-4xl mb-2">🛒</span>
              <p className="text-xs font-bold text-gray-600">Counter cart is empty</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Select items from the product catalog</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-200/60 gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs text-gray-900 truncate">{item.product.name}</div>
                  <div className="text-[11px] font-semibold text-gray-500">
                    ₹{(item.product.selling_price / 100).toLocaleString("en-IN")} each
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-white rounded-xl border border-gray-200 shadow-2xs">
                    <button
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="p-1 text-gray-600 hover:text-red-600 transition-colors"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold text-gray-900">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="p-1 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="font-black text-xs text-gray-900 w-16 text-right">
                    ₹{((item.product.selling_price * item.quantity) / 100).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Checkout Form & Pay */}
        <div className="p-4 border-t border-gray-200 bg-white space-y-4 shrink-0 shadow-lg">
          <div className="space-y-2.5">
            <input
              type="text"
              placeholder="Customer Name (Optional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-xs font-semibold text-gray-900 focus:border-gray-900 focus:bg-white focus:outline-none"
            />
            <input
              type="tel"
              placeholder="Customer Mobile (Required for KOT/Receipt)"
              required
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-xs font-semibold text-gray-900 focus:border-gray-900 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Payment Mode Selector */}
          <div className="grid grid-cols-3 gap-2">
            {["CASH", "UPI", "CARD"].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPaymentMode(mode)}
                className={`py-2 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                  paymentMode === mode
                    ? "bg-gray-900 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {mode === "CASH" && "💵 "}
                {mode === "UPI" && "📱 "}
                {mode === "CARD" && "💳 "}
                {mode}
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Amount:</span>
            <span className="text-xl font-black text-gray-900">₹{(total / 100).toLocaleString("en-IN")}</span>
          </div>

          <button
            type="button"
            onClick={handleCheckout}
            disabled={cart.length === 0 || !customerPhone || isProcessing}
            className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isProcessing ? "Processing Sale..." : `Complete Sale (₹${(total / 100).toLocaleString("en-IN")})`}
          </button>
        </div>
      </div>

      {/* Sale Complete Pop-up Modal with KOT Receipt */}
      {completedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 text-center max-w-md w-full border border-gray-100 animate-in fade-in zoom-in duration-200 space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-black text-gray-900">Sale Complete!</h2>
            <p className="text-xs text-gray-500 font-semibold">
              Order <span className="font-mono font-bold text-gray-900">{completedOrder.orderNumber}</span> saved to database.
            </p>

            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-left space-y-2 text-xs font-semibold text-gray-600">
              <div className="flex justify-between">
                <span>Branch:</span>
                <span className="font-bold text-gray-900">{getStoreBranch(completedOrder.storeBranch).name}</span>
              </div>
              <div className="flex justify-between">
                <span>Items:</span>
                <span className="font-bold text-gray-900">{completedOrder.itemsCount} pcs</span>
              </div>
              <div className="flex justify-between">
                <span>Payment:</span>
                <span className="font-bold text-gray-900 uppercase">{completedOrder.paymentMode}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 text-sm">
                <span className="font-extrabold text-gray-900">Total Paid:</span>
                <span className="font-extrabold text-emerald-600">₹{(completedOrder.total / 100).toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={printKot}
                className="flex-1 rounded-xl bg-gray-900 hover:bg-black text-white py-3 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md"
              >
                <Printer className="h-4 w-4" />
                <span>Print KOT Slip</span>
              </button>
              <button
                type="button"
                onClick={() => setCompletedOrder(null)}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Next Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Recent Orders Modal / Slide-over ── */}
      {showOrdersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center sm:justify-end p-0 sm:p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full sm:max-w-2xl h-full sm:h-[94vh] sm:rounded-3xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-2xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center font-bold">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    Terminal Order History
                    <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                      {orders.filter((o) => {
                        const matchesChannel =
                          orderChannelFilter === "ALL" || o.channel === orderChannelFilter;
                        const q = ordersSearch.toLowerCase().trim();
                        if (!q) return matchesChannel;
                        return (
                          matchesChannel &&
                          (o.order_number?.toLowerCase().includes(q) ||
                            o.customer_name?.toLowerCase().includes(q) ||
                            o.customer_phone?.toLowerCase().includes(q))
                        );
                      }).length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Counter &amp; online sales synced with main database
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => refreshOrders()}
                  title="Refresh Orders"
                  className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowOrdersModal(false)}
                  className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="p-3.5 border-b border-slate-100 bg-white space-y-2.5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Order #, Customer Name, Phone..."
                  value={ordersSearch}
                  onChange={(e) => setOrdersSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium"
                />
              </div>

              <div className="flex gap-2">
                {[
                  { id: "ALL", label: `All (${orders.length})` },
                  {
                    id: "OFFLINE",
                    label: `Counter / POS (${orders.filter((o) => o.channel === "OFFLINE").length})`,
                  },
                  {
                    id: "ONLINE",
                    label: `Online (${orders.filter((o) => o.channel === "ONLINE").length})`,
                  },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setOrderChannelFilter(tab.id as "ALL" | "OFFLINE" | "ONLINE")}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                      orderChannelFilter === tab.id
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Orders List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {orders
                .filter((o) => {
                  const matchesChannel =
                    orderChannelFilter === "ALL" || o.channel === orderChannelFilter;
                  const q = ordersSearch.toLowerCase().trim();
                  if (!q) return matchesChannel;
                  return (
                    matchesChannel &&
                    (o.order_number?.toLowerCase().includes(q) ||
                      o.customer_name?.toLowerCase().includes(q) ||
                      o.customer_phone?.toLowerCase().includes(q) ||
                      o.status?.toLowerCase().includes(q) ||
                      o.payment_mode?.toLowerCase().includes(q))
                  );
                })
                .length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center text-slate-400 space-y-2">
                  <Receipt className="h-10 w-10 text-slate-300" />
                  <p className="text-sm font-bold text-slate-600">No orders found</p>
                  <p className="text-xs text-slate-400">Completed counter and online sales will appear here.</p>
                </div>
              ) : (
                orders
                  .filter((o) => {
                    const matchesChannel =
                      orderChannelFilter === "ALL" || o.channel === orderChannelFilter;
                    const q = ordersSearch.toLowerCase().trim();
                    if (!q) return matchesChannel;
                    return (
                      matchesChannel &&
                      (o.order_number?.toLowerCase().includes(q) ||
                        o.customer_name?.toLowerCase().includes(q) ||
                        o.customer_phone?.toLowerCase().includes(q) ||
                        o.status?.toLowerCase().includes(q) ||
                        o.payment_mode?.toLowerCase().includes(q))
                    );
                  })
                  .map((order) => {
                    const itemsCount = (order.order_items || []).reduce(
                      (sum, item) => sum + (item.quantity || 1),
                      0
                    );
                    const isOffline = order.channel === "OFFLINE";
                    return (
                      <div
                        key={order.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-slate-300 transition space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-black text-slate-900">
                                {order.order_number}
                              </span>
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                  isOffline
                                    ? "bg-purple-50 text-purple-700 border-purple-200"
                                    : "bg-blue-50 text-blue-700 border-blue-200"
                                }`}
                              >
                                {isOffline ? "Counter (POS)" : "Online"}
                              </span>
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                  order.status === "COMPLETED" || order.payment_status === "PAID"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                }`}
                              >
                                {order.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium mt-1">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3 text-slate-400" />
                                <b className="text-slate-700">{order.customer_name || "Walk-in"}</b>
                              </span>
                              {order.customer_phone && (
                                <span className="flex items-center gap-1 font-mono">
                                  <Phone className="h-3 w-3 text-slate-400" />
                                  {order.customer_phone}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-slate-400" />
                                {new Date(order.created_at).toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-black text-sm text-slate-900">
                              ₹{(order.total / 100).toLocaleString("en-IN")}
                            </div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase">
                              {order.payment_mode || "PAID"}
                            </div>
                          </div>
                        </div>

                        {/* Items preview */}
                        {order.order_items && order.order_items.length > 0 && (
                          <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-[11px] text-slate-600 space-y-1">
                            {order.order_items.map((it, idx) => (
                              <div key={idx} className="flex justify-between font-medium">
                                <span>
                                  {it.quantity}x {it.product_name}{" "}
                                  {it.variant_name && it.variant_name !== "Default"
                                    ? `(${it.variant_name})`
                                    : ""}
                                </span>
                                <span className="font-mono text-slate-700">
                                  ₹{((it.line_total || it.unit_price * it.quantity) / 100).toLocaleString("en-IN")}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[11px] text-slate-400 font-medium">
                            {itemsCount} {itemsCount === 1 ? "item" : "items"} ·{" "}
                            {new Date(order.created_at).toLocaleDateString("en-IN")}
                          </span>
                          <button
                            type="button"
                            onClick={() => setReceiptOrder(order)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
                          >
                            <Printer className="h-3.5 w-3.5 text-slate-600" />
                            <span>Reprint Receipt / KOT</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Reprint KOT Receipt Modal ── */}
      {receiptOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-red-600" />
                <h3 className="font-black text-base text-gray-900">Digital KOT Slip</h3>
              </div>
              <button
                type="button"
                onClick={() => setReceiptOrder(null)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 max-h-[60vh] overflow-y-auto">
              <KotReceipt
                order={{
                  orderNumber: receiptOrder.order_number,
                  channel: receiptOrder.channel,
                  customerName: receiptOrder.customer_name || "Walk-in Customer",
                  customerPhone: receiptOrder.customer_phone || "Counter Sale",
                  customerEmail: receiptOrder.customer_email || undefined,
                  items: (receiptOrder.order_items || []).map((oi) => ({
                    productName: oi.product_name,
                    variantName: oi.variant_name || "Default",
                    quantity: oi.quantity,
                    unitPrice: oi.unit_price,
                    lineTotal: oi.line_total || oi.unit_price * oi.quantity,
                  })),
                  subtotal: receiptOrder.subtotal,
                  discount: receiptOrder.discount || 0,
                  total: receiptOrder.total,
                  paymentStatus: receiptOrder.payment_status || "PAID",
                  paymentMode: receiptOrder.payment_mode || "CASH",
                  createdAt: receiptOrder.created_at,
                }}
                storeBranchId={selectedBranchId}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={printKot}
                className="flex-1 rounded-xl bg-gray-900 hover:bg-black text-white py-3 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Print Thermal Slip</span>
              </button>
              <button
                type="button"
                onClick={() => setReceiptOrder(null)}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-40 flex items-center gap-2 bg-gray-900 text-white px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold animate-in fade-in slide-in-from-bottom-2">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
