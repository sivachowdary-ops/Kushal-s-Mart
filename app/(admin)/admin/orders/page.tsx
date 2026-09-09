"use client";

import { useEffect, useState } from "react";
import { useAdminStore } from "@/lib/admin-store";
import Link from "next/link";
import { Search, ShoppingBag, Eye, Store, Globe, AlertCircle, Printer } from "lucide-react";

export default function OrdersPage() {
  const { orders, isLoading, error, refreshOrders } = useAdminStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [channelFilter, setChannelFilter] = useState("ALL");

  useEffect(() => {
    refreshOrders();
  }, [refreshOrders]);

  const filteredOrders = orders.filter((o) => {
    const matchesSearch = 
      (o.order_number && o.order_number.toLowerCase().includes(search.toLowerCase())) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(search.toLowerCase()));
    
    let matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
    if (statusFilter === "NEEDS_SHIPMENT") {
      matchesStatus = (o.payment_status === "PAID" || o.status === "PAID") && !o.shiprocket_awb;
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-50 text-yellow-700 ring-yellow-600/20';
      case 'PENDING_PAYMENT': return 'bg-amber-50 text-amber-800 ring-amber-600/20';
      case 'PAYMENT_FAILED':
      case 'FAILED': return 'bg-red-100 text-red-800 ring-red-600/30';
      case 'PACKED': return 'bg-purple-50 text-purple-700 ring-purple-600/20';
      case 'PROCESSING': return 'bg-blue-50 text-blue-700 ring-blue-600/20';
      case 'SHIPPED': return 'bg-indigo-50 text-indigo-700 ring-indigo-600/20';
      case 'DELIVERED': return 'bg-green-50 text-green-700 ring-green-600/20';
      case 'CANCELLED': return 'bg-red-50 text-red-700 ring-red-600/20';
      case 'COMPLETED': return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
      default: return 'bg-slate-50 text-slate-700 ring-slate-600/20';
    }
  };

  return (
    <div className="space-y-6 bg-[#F4F5F7] min-h-screen p-8">
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
        <div className="flex flex-col gap-4 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 pl-10 pr-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-4">
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Channels</option>
              <option value="ONLINE">Online Store</option>
              <option value="OFFLINE">POS (Offline)</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="NEEDS_SHIPMENT">📦 Needs Shipment (Paid, No AWB)</option>
              <option value="PACKED">Packed (AWB Generated)</option>
              <option value="PENDING">Pending</option>
              <option value="PENDING_PAYMENT">Pending Payment</option>
              <option value="PAYMENT_FAILED">Payment Failed</option>
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
          <div className="overflow-x-auto">
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
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {order.order_number}
                    </td>
                    <td className="px-6 py-4">
                      {new Date(order.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
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
                          POS
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-start gap-1">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusColor(order.status)}`}>
                          {order.status === "PAYMENT_FAILED" ? "PAYMENT FAILED" : order.status === "PENDING_PAYMENT" ? "PENDING PAYMENT" : order.status}
                        </span>
                        {(order.payment_status === "PAID" || order.status === "PAID") && !order.shiprocket_awb && order.channel !== "OFFLINE" && (
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
                      <div className="flex items-center justify-end gap-1">
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
        )}
      </div>
    </div>
  );
}
