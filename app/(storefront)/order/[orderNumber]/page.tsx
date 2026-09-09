"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { CheckCircle2, Package, ArrowRight, Truck, MapPin, ShoppingBag, RotateCcw, Clock, AlertTriangle } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface OrderStatus {
  status: string;
  paymentStatus: string;
  orderNumber: string;
  shiprocketAwb: string | null;
  courierName: string | null;
}

interface OrderItem {
  id: string;
  product_name: string;
  variant_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  image?: string;
}

interface FullOrder {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_mode: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  shipping_address: {
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  } | null;
  subtotal: number;
  discount: number;
  total: number;
  shiprocket_awb: string | null;
  courier_name: string | null;
  order_items: OrderItem[];
  created_at: string;
}

/**
 * Order Confirmation Page — Client Component with Polling
 *
 * After Razorpay payment, this page polls /api/orders/[orderNumber]/status
 * every 3 seconds until the webhook confirms payment (max ~60 seconds).
 *
 * States:
 * - PENDING_PAYMENT → "Confirming your payment..." with spinner
 * - PAID / PACKED / SHIPPED → "Order Confirmed!" with details
 * - FAILED → "Payment failed" with retry link
 */
export default function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = use(params);

  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null);
  const [fullOrder, setFullOrder] = useState<FullOrder | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [pollCount, setPollCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const MAX_POLLS = 20; // 20 polls × 3s = 60 seconds

  // Poll for order status
  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderNumber}/status`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("Order not found");
          setIsPolling(false);
          return;
        }
        return; // retry on other errors
      }

      const data: OrderStatus = await res.json();
      setOrderStatus(data);

      // If payment is confirmed or failed, stop polling
      if (data.paymentStatus === "PAID" || data.paymentStatus === "FAILED" || data.status === "PAYMENT_FAILED") {
        setIsPolling(false);
      }
    } catch {
      // Network error — keep polling
    }
  }, [orderNumber]);

  // Fetch full order details once payment is confirmed
  const fetchFullOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderNumber}/status`);
      if (!res.ok) return;

      // We need the full order for display — but the status endpoint is lightweight.
      // For the full order with items, let's use the track-orders endpoint which is public.
      const trackRes = await fetch(`/api/track-orders?phone=&orderNumber=${orderNumber}`);
      if (trackRes.ok) {
        const trackData = await trackRes.json();
        const found = trackData.orders?.find(
          (o: FullOrder) => o.order_number === orderNumber
        );
        if (found) {
          setFullOrder(found);
        }
      }
    } catch {
      // Not critical — we still show the confirmed status
    }
  }, [orderNumber]);

  // Start polling on mount
  useEffect(() => {
    pollStatus(); // initial immediate check
  }, [pollStatus]);

  // Continue polling every 3 seconds
  useEffect(() => {
    if (!isPolling) return;
    if (pollCount >= MAX_POLLS) {
      setIsPolling(false);
      return;
    }

    const timer = setTimeout(() => {
      setPollCount((c) => c + 1);
      pollStatus();
    }, 3000);

    return () => clearTimeout(timer);
  }, [isPolling, pollCount, pollStatus]);

  // Fetch full order when payment is confirmed
  useEffect(() => {
    if (orderStatus?.paymentStatus === "PAID") {
      fetchFullOrder();
    }
  }, [orderStatus?.paymentStatus, fetchFullOrder]);

  // ── Error state ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="bg-[#F4F5F7] min-h-screen py-16">
        <div className="mx-auto max-w-xl px-4 text-center bg-white rounded-3xl p-12 border border-gray-200/80 shadow-sm space-y-4">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
          <h1 className="font-extrabold text-xl text-gray-900">{error}</h1>
          <Link href="/shop" className="inline-block rounded-full bg-black px-8 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-red-600 transition-colors">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  // ── Waiting for payment confirmation (polling) ──────────────────────────
  if (
    isPolling ||
    !orderStatus ||
    orderStatus.paymentStatus === "PENDING"
  ) {
    return (
      <div className="bg-[#F4F5F7] min-h-screen py-16">
        <div className="mx-auto max-w-xl px-4">
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-gray-200/80 shadow-sm text-center space-y-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-blue-600 mx-auto">
              <Clock className="h-10 w-10 animate-pulse" />
            </div>
            <div>
              <h1 className="font-extrabold text-2xl text-gray-900">
                Confirming Your Payment...
              </h1>
              <p className="text-sm text-gray-500 mt-2">
                Please wait while we verify your payment with our payment gateway.
                This usually takes a few seconds.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="h-2 w-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: "200ms" }} />
              <div className="h-2 w-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: "400ms" }} />
            </div>
            <p className="text-xs text-gray-400 font-semibold">
              Order: <span className="font-mono font-bold text-gray-600">{orderNumber}</span>
            </p>

            {pollCount >= MAX_POLLS && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mt-4">
                <p className="text-xs font-bold text-amber-700">
                  Taking longer than expected. Your payment may still be processing.
                  You can safely close this page — we&apos;ll send you a confirmation once done.
                </p>
                <Link href={`/track-order`} className="text-xs font-bold text-amber-800 underline mt-2 inline-block">
                  Track your order →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Payment failed ──────────────────────────────────────────────────────
  if (orderStatus.paymentStatus === "FAILED" || orderStatus.status === "PAYMENT_FAILED") {
    return (
      <div className="bg-[#F4F5F7] min-h-screen py-16">
        <div className="mx-auto max-w-xl px-4">
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-gray-200/80 shadow-sm text-center space-y-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-600 mx-auto">
              <AlertTriangle className="h-10 w-10" />
            </div>
            <div>
              <h1 className="font-extrabold text-2xl text-gray-900">
                Payment Failed
              </h1>
              <p className="text-sm text-gray-500 mt-2">
                Unfortunately, your payment could not be completed.
                Don&apos;t worry — no money has been charged.
              </p>
            </div>
            <p className="text-xs text-gray-400 font-semibold">
              Order: <span className="font-mono font-bold text-gray-600">{orderNumber}</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/checkout"
                className="flex items-center justify-center gap-2 rounded-2xl bg-red-600 hover:bg-red-700 py-4 text-xs font-black uppercase tracking-wider text-white shadow-md transition-all active:scale-95"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Try Again</span>
              </Link>
              <Link
                href="/"
                className="flex items-center justify-center gap-2 rounded-2xl border border-gray-300 bg-white hover:bg-gray-50 py-4 text-xs font-black uppercase tracking-wider text-gray-800 transition-all active:scale-95"
              >
                <span>Back to Home</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Payment confirmed — show order details ──────────────────────────────
  const order = fullOrder;
  const items = order?.order_items || [];
  const address = order?.shipping_address || null;

  return (
    <div className="bg-[#F4F5F7] min-h-screen py-10 sm:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-200/80 shadow-sm space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mx-auto shadow-xs border border-emerald-100">
              <CheckCircle2 className="h-8 w-8 sm:h-10 sm:w-10" />
            </div>
            <div>
              <span className="inline-block rounded-full bg-emerald-50 border border-emerald-200/60 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-emerald-700 mb-2">
                ✓ Order Confirmed
              </span>
              <h1 className="font-extrabold text-2xl sm:text-3xl text-gray-900 tracking-tight">
                Thank You for Your Order!
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-gray-500 mt-1">
                Order Number: <strong className="text-gray-900 font-mono text-sm sm:text-base font-bold">{orderNumber}</strong>
              </p>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 max-w-lg mx-auto leading-relaxed">
              Your payment has been received successfully. Our fulfillment team is preparing your package for express dispatch.
            </p>
          </div>

          {/* Delivery Banner */}
          <div className="bg-gradient-to-r from-gray-900 to-[#1A1D29] text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white shrink-0">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-300 uppercase tracking-wider">Estimated Dispatch</p>
                <p className="text-sm font-extrabold text-white">Within 24 Hours • Express Delivery</p>
              </div>
            </div>
            <Link
              href={order?.customer_phone ? `/track-order?phone=${order.customer_phone}` : "/track-order"}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-sm shrink-0"
            >
              <span>Track Order</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Order Items */}
          {items.length > 0 && (
            <div className="bg-gray-50 rounded-2xl p-4 sm:p-6 border border-gray-200/60 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <h2 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-gray-500" />
                  <span>Order Items ({items.length})</span>
                </h2>
                <span className="text-xs font-bold text-gray-500">
                  Status: <span className="text-emerald-600 uppercase">{orderStatus?.status || "PAID"}</span>
                </span>
              </div>
              <div className="divide-y divide-gray-200/60 space-y-3 pt-1">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3.5 pt-3 first:pt-0">
                    {item.image ? (
                      <img src={item.image} alt={item.product_name} className="h-14 w-14 object-contain rounded-xl bg-white p-1 border border-gray-200/80 shrink-0" />
                    ) : (
                      <div className="h-14 w-14 rounded-xl bg-white border border-gray-200/80 flex items-center justify-center shrink-0">
                        <Package className="h-6 w-6 text-gray-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-xs sm:text-sm text-gray-900 truncate">{item.product_name}</h3>
                      <p className="text-[11px] font-semibold text-gray-500 mt-0.5">
                        Qty: {item.quantity} {item.variant_name && item.variant_name !== "Default" && item.variant_name !== "Standard" ? `• ${item.variant_name}` : ""}
                      </p>
                    </div>
                    <span className="font-extrabold text-xs sm:text-sm text-gray-900 shrink-0">
                      {formatPrice(item.line_total)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              {order && (
                <div className="border-t border-gray-200 pt-3 space-y-1.5 text-xs font-semibold">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>{formatPrice(order.subtotal)}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Discount</span>
                      <span>-{formatPrice(order.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span className="text-emerald-600 font-bold">FREE</span>
                  </div>
                  <div className="border-t border-gray-200/80 pt-2 flex justify-between text-sm sm:text-base font-extrabold text-gray-900">
                    <span>Total Paid</span>
                    <span className="text-red-600">{formatPrice(order.total)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Delivery Address */}
          {address && (
            <div className="bg-gray-50 rounded-2xl p-4 sm:p-5 border border-gray-200/60 flex items-start gap-3">
              <MapPin className="h-5 w-5 text-gray-500 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed text-gray-700">
                <p className="font-bold text-gray-900">Delivery Address:</p>
                <p className="font-medium mt-0.5">
                  {order?.customer_name && <span className="font-bold text-gray-900">{order.customer_name} • </span>}
                  {order?.customer_phone && <span className="text-gray-600 font-mono">{order.customer_phone}</span>}
                </p>
                <p className="text-gray-600 mt-0.5">
                  {[address.address, address.city, address.state, address.pincode].filter(Boolean).join(", ")}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <Link
              href="/shop"
              className="flex items-center justify-center gap-2 rounded-2xl bg-gray-900 hover:bg-black py-4 text-xs font-black uppercase tracking-wider text-white shadow-md transition-all active:scale-95"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Shop More Products</span>
            </Link>
            <Link
              href="/"
              className="flex items-center justify-center gap-2 rounded-2xl border border-gray-300 bg-white hover:bg-gray-50 py-4 text-xs font-black uppercase tracking-wider text-gray-800 transition-all active:scale-95"
            >
              <RotateCcw className="h-4 w-4 text-gray-500" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
