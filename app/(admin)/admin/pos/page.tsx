"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAdminStore, AdminProduct, AdminVariant, AdminOrder } from "@/lib/admin-store";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Tag,
  Check,
  CreditCard,
  Banknote,
  User,
  Printer,
  Receipt,
  X,
  Clock,
  RefreshCw,
  Phone,
} from "lucide-react";
import { KotReceipt, printKot } from "@/components/admin/kot-receipt";

interface CartItem {
  product: AdminProduct;
  variant: AdminVariant;
  quantity: number;
}

export default function POSPage() {
  const { products, categories, orders, isLoading, refreshProducts, refreshOrders, addOrder } = useAdminStore();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMode, setPaymentMode] = useState<string>("CASH");
  const [isProcessing, setIsProcessing] = useState(false);
  const [mobileTab, setMobileTab] = useState<"products" | "cart">("products");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Orders Modal & Receipt Preview State
  const [showOrdersModal, setShowOrdersModal] = useState<boolean>(false);
  const [ordersSearch, setOrdersSearch] = useState<string>("");
  const [orderChannelFilter, setOrderChannelFilter] = useState<"ALL" | "OFFLINE" | "ONLINE">("ALL");
  const [receiptOrder, setReceiptOrder] = useState<AdminOrder | null>(null);

  const [completedOrder, setCompletedOrder] = useState<{
    id: string;
    orderNumber: string;
    total: number;
    paymentMode: string;
    itemsCount: number;
    storeBranch?: string;
  } | null>(null);

  useEffect(() => {
    refreshProducts();
    refreshOrders();
  }, [refreshProducts, refreshOrders]);

  const activeProducts = products.filter(p => p.is_active);
  const filteredProducts = activeProducts.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "ALL" || p.category_id === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: AdminProduct) => {
    // Use the product's real first variant from admin-store (has valid DB id/FK)
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
  const discount = 0; // Implementing discount later
  const total = subtotal - discount;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!customerPhone) {
      alert("Customer phone is required");
      return;
    }

    setIsProcessing(true);
    try {
      const orderData = {
        channel: "OFFLINE" as const,
        status: "COMPLETED" as const,
        customer_name: customerName || "Walk-in Customer",
        customer_phone: customerPhone,
        customer_email: null,
        shipping_address: null,
        subtotal,
        discount,
        total,
        payment_status: "PAID",
        payment_mode: paymentMode,
      };

      const orderItemsData = cart.map(item => ({
        product_id: item.product.id,
        variant_id: item.variant.id || null, // Send the real variant id (API will resolve if null)
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
          storeBranch: "Main Store",
        });
        setCart([]);
        setCustomerName("");
        setCustomerPhone("");
      } else {
        alert("Failed to process order. Please verify your admin session.");
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

  return (
    <div className="flex flex-col xl:flex-row h-[calc(100vh-105px)] bg-[#F4F5F7] overflow-hidden rounded-3xl border border-gray-200 shadow-sm relative">
      {/* Mobile / Tablet Tab Switcher (Visible on screens < xl) */}
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
        {/* Terminal Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 bg-white p-2.5 sm:p-3 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-white text-xs font-black shadow-xs">
              POS
            </span>
            <div>
              <div className="font-extrabold text-xs text-gray-900 flex items-center gap-1.5">
                <span>Store Counter POS Register</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Ready
                </span>
              </div>
              <p className="text-[10px] text-gray-500 font-medium">Direct billing &amp; counter checkout</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
            <Link
              href="/pos"
              target="_blank"
              className="text-xs font-bold text-white bg-gray-900 hover:bg-black px-3 py-1.5 rounded-xl transition-all shadow-xs flex items-center gap-1"
            >
              <span>🖥️ Open Fullscreen Terminal (/pos)</span>
              <span>↗</span>
            </Link>
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

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto min-h-0 pb-20 xl:pb-6">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 py-12">
              <Tag className="h-12 w-12 text-slate-300 mb-3" />
              <p className="text-base font-bold text-slate-900">No products found</p>
              <p className="text-xs text-slate-400">Try a different search term or category</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="cursor-pointer rounded-2xl border border-gray-200/80 bg-white p-2.5 sm:p-3 shadow-xs hover:border-gray-900 hover:shadow-md transition-all group flex flex-col justify-between"
                >
                  <div className="aspect-square w-full rounded-xl bg-gray-50 border border-gray-100 overflow-hidden mb-2 relative flex items-center justify-center p-2">
                    {product.images && product.images[0] ? (
                      <img src={product.images[0]} alt={product.name} className="h-full w-full object-contain group-hover:scale-105 transition-transform" />
                    ) : (
                      <Tag className="h-6 w-6 text-gray-300" />
                    )}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                      <Plus className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 line-clamp-2 text-xs leading-tight mb-1">{product.name}</div>
                    <div className="text-red-600 font-extrabold text-xs sm:text-sm">₹{(product.selling_price / 100).toLocaleString("en-IN")}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Floating Quick Checkout Bar on Mobile/Tablet */}
        {cart.length > 0 && (
          <div className="xl:hidden fixed bottom-4 left-4 right-4 z-30">
            <button
              onClick={() => setMobileTab("cart")}
              className="w-full bg-gray-900 hover:bg-black text-white px-5 py-3.5 rounded-2xl flex items-center justify-between shadow-2xl transition-all active:scale-95"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-[11px] font-bold text-white">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
                <span className="text-xs font-bold">Total: ₹{(total / 100).toLocaleString("en-IN")}</span>
              </div>
              <span className="text-xs font-extrabold flex items-center gap-1">
                View Cart & Checkout →
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Right Area - Cart */}
      <div className={`w-full xl:w-[380px] h-full bg-white shadow-xl flex-col border-l border-gray-200 z-10 shrink-0 ${mobileTab === "cart" ? "flex" : "hidden xl:flex"}`}>
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-gray-900" />
            <h2 className="text-base font-extrabold text-gray-900">Current Order</h2>
            <span className="bg-gray-100 text-gray-700 text-xs font-bold px-2.5 py-1 rounded-full">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} pcs
            </span>
          </div>
          <button
            onClick={() => setMobileTab("products")}
            className="xl:hidden text-xs font-bold text-blue-600 hover:underline"
          >
            ← Add items
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-5">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
              <ShoppingCart className="h-16 w-16 opacity-20" />
              <p>Cart is empty</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.product.id} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 truncate text-sm">{item.product.name}</div>
                    <div className="text-blue-600 font-medium text-sm">₹{((item.product.selling_price * item.quantity) / 100).toLocaleString("en-IN")}</div>
                  </div>
                  <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 p-1">
                    <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1 hover:bg-slate-100 rounded">
                      <Minus className="h-4 w-4 text-slate-600" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 hover:bg-slate-100 rounded">
                      <Plus className="h-4 w-4 text-slate-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Checkout Section */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 space-y-4">
          <div className="space-y-3">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Customer Name"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="relative">
              <input
                type="tel"
                placeholder="Phone Number (Required)"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                className={`w-full rounded-lg border pl-3 pr-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${!customerPhone && cart.length > 0 ? 'border-red-300 bg-red-50' : 'border-slate-300'}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => setPaymentMode("CASH")} className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-colors ${paymentMode === "CASH" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600"}`}>
              <Banknote className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">CASH</span>
            </button>
            <button onClick={() => setPaymentMode("UPI")} className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-colors ${paymentMode === "UPI" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600"}`}>
              <svg className="h-5 w-5 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              <span className="text-xs font-medium">UPI</span>
            </button>
            <button onClick={() => setPaymentMode("CARD")} className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-colors ${paymentMode === "CARD" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600"}`}>
              <CreditCard className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">CARD</span>
            </button>
          </div>

          <div className="border-t border-slate-200 pt-3 space-y-1 mb-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span>₹{(subtotal / 100).toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-slate-900 mt-2">
              <span>Total</span>
              <span>₹{(total / 100).toLocaleString("en-IN")}</span>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || !customerPhone || isProcessing}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-4 text-white font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-[0.98]"
          >
            {isProcessing ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              <>Complete Sale - ₹{(total / 100).toLocaleString("en-IN")}</>
            )}
          </button>
        </div>
      </div>

      {/* Sale Complete Pop-up Modal */}
      {completedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl p-8 text-center max-w-md w-full border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4">
              <Check className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-1">Sale Complete!</h2>
            <p className="text-sm font-semibold text-gray-500 mb-6">
              Order <span className="font-mono font-bold text-gray-900">{completedOrder.orderNumber}</span> created successfully.
            </p>

            {/* Receipt Summary Box */}
            <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100 text-left space-y-2 text-xs font-semibold text-gray-600">
              <div className="flex justify-between">
                <span>Channel:</span>
                <span className="font-bold text-gray-900">Counter POS Sale</span>
              </div>
              <div className="flex justify-between">
                <span>Items:</span>
                <span className="font-bold text-gray-900">{completedOrder.itemsCount} pcs</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Mode:</span>
                <span className="font-bold text-gray-900 uppercase">{completedOrder.paymentMode}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 text-sm">
                <span className="font-extrabold text-gray-900">Total Paid:</span>
                <span className="font-extrabold text-emerald-600">₹{(completedOrder.total / 100).toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Link
                href={`/admin/orders/${completedOrder.id}/kot`}
                target="_blank"
                className="flex-1 rounded-xl border border-gray-200 py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <Printer className="h-4 w-4 text-emerald-600" />
                <span>Print / Download KOT</span>
              </Link>
              <button
                type="button"
                onClick={() => setCompletedOrder(null)}
                className="flex-1 rounded-xl bg-gray-900 py-3 text-xs font-bold text-white hover:bg-black transition-colors"
              >
                Start New Sale
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
                storeBranchId="kochi-flagship"
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

      {/* Floating Added Item Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-40 flex items-center gap-2.5 bg-gray-900 text-white px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold animate-in fade-in slide-in-from-bottom-2">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
