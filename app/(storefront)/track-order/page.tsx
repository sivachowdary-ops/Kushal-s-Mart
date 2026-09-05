"use client";

import { useState, useEffect } from "react";
import { Package, Search, CheckCircle2, Clock, Truck, ChevronDown, ChevronUp, Smartphone, AlertCircle } from "lucide-react";

interface OrderItem {
  id: string;
  product_name: string;
  variant_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  image?: string | null;
}

interface TrackedOrder {
  id: string;
  order_number: string;
  status: string;
  channel: string;
  customer_name: string;
  customer_phone: string;
  subtotal: number;
  discount: number;
  total: number;
  payment_status: string;
  payment_mode: string;
  shiprocket_awb?: string | null;
  courier_name?: string | null;
  shipping_address?: Record<string, string> | null;
  timeline: { status: string; timestamp: string; note?: string }[];
  created_at: string;
  order_items: OrderItem[];
}

const STATUS_STEPS = ["PENDING", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED"];

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Order Placed",
  PROCESSING: "Payment Verified & Processing",
  PACKED: "Packed & Ready to Ship",
  SHIPPED: "Out for Delivery",
  DELIVERED: "Delivered",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  PROCESSING: "bg-blue-100 text-blue-800 border-blue-200",
  PACKED: "bg-indigo-100 text-indigo-800 border-indigo-200",
  SHIPPED: "bg-purple-100 text-purple-800 border-purple-200",
  DELIVERED: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

function formatPrice(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function OrderCard({ order }: { order: TrackedOrder }) {
  const [expanded, setExpanded] = useState(false);
  const currentStepIndex = STATUS_STEPS.indexOf(order.status);

  return (
    <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
      {/* Card Header */}
      <div className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Order Number</p>
            <h2 className="font-extrabold text-lg text-gray-900 font-mono">{order.order_number}</h2>
            <p className="text-xs text-gray-400 font-medium mt-0.5">{formatDate(order.created_at)}</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider border ${
                STATUS_COLORS[order.status] || "bg-gray-100 text-gray-800 border-gray-200"
              }`}
            >
              {order.status}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between">
            {STATUS_STEPS.map((step, idx) => (
              <div key={step} className="flex flex-col items-center flex-1">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] transition-all ${
                    idx <= currentStepIndex ? "bg-emerald-600 shadow-md" : "bg-gray-200"
                  }`}
                >
                  {idx <= currentStepIndex ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span>{idx + 1}</span>}
                </div>
                {idx < STATUS_STEPS.length - 1 && (
                  <div
                    className={`hidden sm:block h-0.5 w-full mt-2.5 -translate-y-[14px] translate-x-1/2 ${
                      idx < currentStepIndex ? "bg-emerald-400" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="text-xs font-semibold text-gray-600 text-center">
            {STATUS_LABELS[order.status] || order.status}
          </p>
        </div>

        {/* AWB / Courier */}
        {order.shiprocket_awb && (
          <div className="mt-4 bg-gray-50 rounded-2xl p-3 border border-gray-200/60 flex items-center gap-3 text-xs">
            <Truck className="h-4 w-4 text-red-600 shrink-0" />
            <div>
              <span className="font-bold text-gray-400 uppercase text-[10px] block">Courier & AWB</span>
              <span className="font-bold text-gray-900">{order.courier_name || "Shiprocket Express"} — {order.shiprocket_awb}</span>
            </div>
          </div>
        )}

        {/* Order Items Preview */}
        <div className="mt-4 space-y-2">
          {order.order_items.slice(0, expanded ? undefined : 2).map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
              {item.image ? (
                <img src={item.image} alt={item.product_name} className="h-10 w-10 rounded-lg object-contain bg-gray-50 border border-gray-100 shrink-0" />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center">
                  <Package className="h-5 w-5 text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">{item.product_name}</p>
                <p className="text-[10px] text-gray-500 font-semibold">{item.variant_name} · Qty: {item.quantity}</p>
              </div>
              <span className="text-xs font-extrabold text-gray-900 shrink-0">{formatPrice(item.line_total)}</span>
            </div>
          ))}
        </div>

        {/* Total Row */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
          <span className="text-xs font-bold text-gray-500">Total Paid</span>
          <span className="font-extrabold text-base text-red-600">{formatPrice(order.total)}</span>
        </div>
      </div>

      {/* Expand/Collapse Timeline */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider py-3 border-t border-gray-100 hover:bg-gray-50 transition-colors"
      >
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {expanded ? "Hide Details" : "View Full Timeline"}
      </button>

      {/* Timeline Detail */}
      {expanded && order.timeline.length > 0 && (
        <div className="p-5 sm:p-6 pt-0 space-y-4 border-t border-gray-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Status Timeline</h3>
          <div className="relative pl-6 space-y-5 border-l-2 border-gray-200">
            {order.timeline.map((step, idx) => (
              <div key={idx} className="relative">
                <div className="absolute -left-[31px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{STATUS_LABELS[step.status] || step.status}</h4>
                  {step.note && <p className="text-xs text-gray-500">{step.note}</p>}
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">{formatDate(step.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Shipping Address */}
          {order.shipping_address && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Delivery Address</p>
              <p className="text-xs text-gray-700 font-semibold">
                {[
                  order.shipping_address.address,
                  order.shipping_address.city,
                  order.shipping_address.state,
                  order.shipping_address.pincode,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TrackOrderPage() {
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<TrackedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState("");

  // Auto-search if phone param is in URL (from the hero strip form)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlPhone = params.get("phone") || "";
    const digits = urlPhone.replace(/\D/g, "").slice(-10);
    if (digits.length === 10) {
      setPhone(digits);
      setIsLoading(true);
      fetch(`/api/track-orders?phone=${digits}`)
        .then((r) => r.json())
        .then((data) => { setOrders(data.orders || []); setHasSearched(true); })
        .catch(() => setError("Network error. Please try again."))
        .finally(() => setIsLoading(false));
    }
  }, []);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const digits = phone.replace(/\D/g, "").slice(-10);

    if (digits.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setIsLoading(true);
    setHasSearched(false);

    try {
      const res = await fetch(`/api/track-orders?phone=${digits}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
      } else {
        setOrders(data.orders || []);
        setHasSearched(true);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#F4F5F7] min-h-screen pb-16">
      {/* Header */}
      <div className="bg-white border-b border-gray-200/80 py-8 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <span className="text-xs font-bold uppercase tracking-widest text-red-600 block mb-1">
            LIVE ORDER TRACKING
          </span>
          <h1 className="font-extrabold text-3xl sm:text-4xl text-gray-900 tracking-tight">
            Track Your Orders
          </h1>
          <p className="mt-1 text-sm text-gray-500 font-medium max-w-2xl">
            Enter your registered mobile number to view all your current orders and their real-time delivery status.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Search Form */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-sm">
          <form onSubmit={handleTrack} className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700 block mb-1.5">
                Your Registered Mobile Number *
              </label>
              <div className="relative">
                <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="tel"
                  id="track-phone"
                  placeholder="Enter 10-digit mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9+\-\s]/g, ""))}
                  maxLength={13}
                  required
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-3.5 text-sm font-semibold text-gray-900 focus:border-black focus:bg-white focus:outline-none"
                />
              </div>
              {error && (
                <div className="mt-2 flex items-center gap-2 text-xs font-bold text-red-600">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              id="track-order-btn"
              className="w-full rounded-2xl bg-black py-3.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-red-600 transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span>{isLoading ? "Searching..." : "Track My Orders"}</span>
            </button>
          </form>
        </div>

        {/* Results */}
        {hasSearched && (
          <>
            {orders.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 border border-gray-200/80 shadow-sm text-center space-y-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 mx-auto">
                  <Package className="h-7 w-7 text-gray-400" />
                </div>
                <h3 className="font-extrabold text-lg text-gray-900">No Active Orders Found</h3>
                <p className="text-sm text-gray-500 font-medium">
                  We couldn&apos;t find any active orders linked to this mobile number.
                  <br />
                  Please make sure you used the same number during checkout.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-700">
                    Found <span className="text-red-600">{orders.length}</span> active order{orders.length > 1 ? "s" : ""}
                  </p>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-white px-3 py-1.5 rounded-full border border-gray-200">
                    Most Recent First
                  </span>
                </div>
                {orders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
