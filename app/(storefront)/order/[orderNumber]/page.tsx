import Link from "next/link";
import { CheckCircle2, Package, ArrowRight, Truck, MapPin, ShoppingBag, RotateCcw } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeOrder } from "@/lib/db-normalize";

// Server Component — fetches real order from Supabase by orderNumber
export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;

  // Fetch real order
  const { data: rawOrder } = await supabaseAdmin
    .from("Order")
    .select(`*, OrderItem (*)`)
    .eq("orderNumber", orderNumber)
    .single();

  const order = rawOrder ? normalizeOrder(rawOrder) : null;
  const items = order?.order_items || [];
  const address = order?.shipping_address as {
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  } | null;

  return (
    <div className="bg-[#F4F5F7] min-h-screen py-10 sm:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">

        {/* Thank You Main Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-200/80 shadow-sm space-y-6">
          
          {/* Header Icon & Title */}
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
              {order?.payment_mode === "COD"
                ? "Your Cash on Delivery order has been successfully confirmed. Our fulfillment team is preparing your package for express dispatch."
                : "Your payment has been received successfully. Our fulfillment team is preparing your package for express dispatch."}
            </p>
          </div>

          {/* Delivery & Timeline Notice Banner */}
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

          {/* Ordered Items List */}
          {items.length > 0 && (
            <div className="bg-gray-50 rounded-2xl p-4 sm:p-6 border border-gray-200/60 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <h2 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-gray-500" />
                  <span>Order Items ({items.length})</span>
                </h2>
                <span className="text-xs font-bold text-gray-500">
                  Status: <span className="text-emerald-600 uppercase">{order?.status || "CONFIRMED"}</span>
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
                    <span>Total {order.payment_mode === "COD" ? "Payable on Delivery" : "Paid"}</span>
                    <span className="text-red-600">{formatPrice(order.total)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Delivery Address Summary */}
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

          {/* Action Buttons: Reorder / Shop More & Track Order */}
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
