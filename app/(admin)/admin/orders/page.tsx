"use client";

import { Suspense, useEffect, useState } from "react";
import { useAdminStore } from "@/lib/admin-store";
import { formatDateShort, formatTime } from "@/lib/utils";
import { channelLabel, isPaymentPending, needsDispatch, orderStatusClass, orderStatusLabel } from "@/lib/admin-ui";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ShoppingBag, Eye, Store, Globe, AlertCircle, Printer } from "lucide-react";

// useSearchParams needs a Suspense boundary
export default function OrdersPage() {
  return (
    <Suspense fallback={null}>
      <OrdersList />
    </Suspense>
  );
}

function OrdersList() {
  const { orders, isLoading, error, refreshOrders } = useAdminStore();
  const router = useRouter();
  // The dashboard's "Needs action" tiles link here with ?status=...
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "ALL");
  const [channelFilter, setChannelFilter] = useState("ALL");

  useEffect(() => {
    refreshOrders();
  }, [refreshOrders]);

  const filteredOrders = orders.filter((o) => {
    const q = search.toLowerCase().trim();
    const qDigits = q.replace(/\D/g, "");
    const matchesSearch =
      !q ||
      (o.order_number && o.order_number.toLowerCase().includes(q)) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
      (qDigits.length >= 4 && (o.customer_phone || "").replace(/\D/g, "").includes(qDigits));

    let matchesStatus = false;
    if (statusFilter === "ALL") {
      matchesStatus = o.status !== "PENDING_PAYMENT" && o.status !== "PAYMENT_FAILED";
    } else if (statusFilter === "NEEDS_SHIPMENT") {
      // Counter (POS) sales are handed over in store — they never need a courier
      matchesStatus = needsDispatch(o);
    } else if (statusFilter === "PAYMENT_PENDING") {
      matchesStatus = isPaymentPending(o);
    } else {
      matchesStatus = o.status === statusFilter;
    }

    const matchesChannel = channelFilter === "ALL" || o.channel === channelFilter;
    return matchesSearch && matchesStatus && matchesChannel;
  });

  if (isLoading && orders.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center bg-[#F4F5F7]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-900 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-[#F4F5F7] min-h-screen p-4 sm:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Orders</h1>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search order #, name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 pl-10 pr-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center sm:gap-4">
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Channels</option>
              <option value="ONLINE">Online Store</option>
              <option value="OFFLINE">Counter (POS)</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="NEEDS_SHIPMENT">📦 Needs Shipment (Paid, No AWB)</option>
              <option value="PAYMENT_PENDING">Payment pending (COD or unpaid)</option>
              <option value="PAID">Paid</option>
              <option value="PACKED">Packed (AWB Generated)</option>
              <option value="PENDING">Pending</option>
              <option value="PENDING_PAYMENT">⏳ Unpaid checkouts (not orders yet)</option>
              <option value="PAYMENT_FAILED">✕ Failed payment attempts</option>
              <option value="PROCESSING">Processing</option>
              <option value="SHIPPED">Shipped</option>
              <option value="DELIVERED">Delivered</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
            <ShoppingBag className="mb-4 h-12 w-12 text-slate-300" />
            <p className="text-lg font-medium text-slate-900">No orders found</p>
            <p className="mt-1">No orders yet</p>
            {(search || statusFilter !== "ALL" || channelFilter !== "ALL") && (
              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("ALL");
                  setChannelFilter("ALL");
                }}
                className="mt-4 text-blue-600 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
          {/* Phones: one card per order, the whole card opens it */}
          <ul className="divide-y divide-slate-200 md:hidden">
            {filteredOrders.map((order) => (
              <li key={order.id}>
                <Link href={`/admin/orders/${order.id}`} className="block px-4 py-4 active:bg-slate-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{order.customer_name || "Guest"}</p>
                      <p className="text-xs text-slate-500">{order.order_number}</p>
                      <p className="text-xs text-slate-400">{formatDateShort(order.created_at)}, {formatTime(order.created_at)} · {channelLabel(order.channel)}</p>
                    </div>
                    <p className="shrink-0 font-bold text-slate-900">₹{(order.total / 100).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${orderStatusClass(order.status)}`}>
                      {orderStatusLabel(order.status)}
                    </span>
                    {needsDispatch(order) && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        Needs dispatch
                      </span>
                    )}
                    {order.payment_status !== "PAID" && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        Payment {orderStatusLabel(order.payment_status || "PENDING").toLowerCase()}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-medium">Order ID</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Customer</th>
                  <th className="px-6 py-4 font-medium">Channel</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Total</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => router.push(`/admin/orders/${order.id}`)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {order.order_number}
                    </td>
                    <td className="px-6 py-4">
                      <div>{formatDateShort(order.created_at)}</div>
                      <div className="text-xs text-slate-400">{formatTime(order.created_at)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{order.customer_name || "Guest"}</div>
                    </td>
                    <td className="px-6 py-4">
                      {order.channel === "ONLINE" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                          <Globe className="h-3 w-3" />
                          Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-600/20">
                          <Store className="h-3 w-3" />
                          Counter
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-start gap-1">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${orderStatusClass(order.status)}`}>
                          {orderStatusLabel(order.status)}
                        </span>
                        {needsDispatch(order) && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                            NEEDS DISPATCH
                          </span>
                        )}
                        {order.shiprocket_awb && (
                          <span className="text-[10px] font-mono text-slate-500">
                            AWB: {order.shiprocket_awb}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      ₹{(order.total / 100).toLocaleString("en-IN")}
                      <div className="mt-1">
                        {order.payment_status === "PAID" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            PAID
                          </span>
                        ) : order.payment_status === "FAILED" || order.status === "PAYMENT_FAILED" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-extrabold bg-red-100 text-red-700 border border-red-300">
                            FAILED
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            {order.payment_status || "PENDING"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {/* Icon links keep their own job instead of opening the row */}
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/admin/orders/${order.id}/kot`}
                          target="_blank"
                          title="Download / Print KOT Receipt"
                          className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
                        >
                          <Printer className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/admin/orders/${order.id}`}
                          title="View Order Details"
                          className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
