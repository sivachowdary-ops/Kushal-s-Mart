"use client";

import { useAdminStore, type AdminOrder } from "@/lib/admin-store";
import { formatDate } from "@/lib/utils";
import {
  channelLabel,
  isLowStock,
  isPaymentPending,
  needsDispatch,
  orderStatusClass,
  orderStatusLabel,
  productVariants,
} from "@/lib/admin-ui";
import {
  Store,
  PlusCircle,
  TrendingUp,
  FolderTree,
  Loader2,
  PackageCheck,
  Truck,
  Wallet,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const formatPrice = (paise: number) => {
  return (paise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Revenue of paid orders created in [from, to) */
function revenueBetween(orders: AdminOrder[], from: Date, to: Date) {
  return orders.reduce((sum, o) => {
    const t = new Date(o.created_at).getTime();
    return t >= from.getTime() && t < to.getTime() ? sum + o.total : sum;
  }, 0);
}

export default function AdminDashboardPage() {
  const { 
    isLoading, 
    totalRevenue, 
    totalNetProfit, 
    ordersToday, 
    products, 
    lowStockCount,
    orders,
    placedOrders,
    revenueOrders,
    onlineSalesTotal,
    counterSalesTotal,
    getProductFinancialStats
  } = useAdminStore();

  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (orders.length === 0 && products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-6">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Store className="w-12 h-12 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Welcome to Kushal's Mart Admin</h2>
        <p className="text-gray-500 text-center max-w-md">
          Your dashboard is empty. Get started by adding your first product or category.
        </p>
        <div className="flex gap-4">
          <Link href="/admin/products/new" className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2">
            <PlusCircle className="w-5 h-5" />
            Add Product
          </Link>
          <Link href="/admin/categories" className="bg-white text-gray-900 border border-gray-200 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2">
            <FolderTree className="w-5 h-5" />
            Add Category
          </Link>
        </div>
      </div>
    );
  }

  // Calculate Net Profit Margin
  const profitMargin = totalRevenue > 0 ? ((totalNetProfit / totalRevenue) * 100).toFixed(1) : "0.0";
  const activeProducts = products.filter(p => p.is_active).length;

  // Revenue by period (paid orders only), with the last 7 days compared to the 7 before
  const today = startOfDay(new Date());
  const tomorrow = new Date(today.getTime() + DAY_MS);
  const weekStart = new Date(today.getTime() - 6 * DAY_MS);
  const prevWeekStart = new Date(today.getTime() - 13 * DAY_MS);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const revenueToday = revenueBetween(revenueOrders, today, tomorrow);
  const revenueWeek = revenueBetween(revenueOrders, weekStart, tomorrow);
  const revenuePrevWeek = revenueBetween(revenueOrders, prevWeekStart, weekStart);
  const revenueMonth = revenueBetween(revenueOrders, monthStart, tomorrow);
  const weekChange = revenuePrevWeek > 0 ? ((revenueWeek - revenuePrevWeek) / revenuePrevWeek) * 100 : null;

  // What needs doing today — each tile opens the matching filtered list
  const toDispatch = placedOrders.filter(needsDispatch).length;
  const packedWaiting = placedOrders.filter(o => o.status === "PACKED").length;
  const paymentPending = placedOrders.filter(isPaymentPending).length;
  const actions = [
    { label: "To dispatch", hint: "Paid online orders without a courier yet", count: toDispatch, href: "/admin/orders?status=NEEDS_SHIPMENT", icon: PackageCheck, tone: "text-amber-700 bg-amber-50" },
    { label: "Packed, not shipped", hint: "Waiting for courier pickup", count: packedWaiting, href: "/admin/orders?status=PACKED", icon: Truck, tone: "text-purple-700 bg-purple-50" },
    { label: "Payment pending", hint: "COD or unpaid placed orders", count: paymentPending, href: "/admin/orders?status=PAYMENT_PENDING", icon: Wallet, tone: "text-sky-700 bg-sky-50" },
    { label: "Low stock", hint: "Variants at or below their limit", count: lowStockCount, href: "/admin/products?stock=low", icon: AlertTriangle, tone: "text-red-700 bg-red-50" },
  ];
  const nothingToDo = actions.every(a => a.count === 0);

  // Low stock list: emptiest first
  const lowStockItems = products
    .flatMap(p => productVariants(p).filter(isLowStock).map(v => ({ product: p, variant: v })))
    .sort((a, b) => a.variant.stock - b.variant.stock);

  // Chart data: Last 7 days revenue
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0,0,0,0);
    return d;
  }).reverse();

  const chartData = last7Days.map(date => {
    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);

    // Revenue chart counts paid orders only — not abandoned, failed, cancelled or refunded ones
    const dayOrders = revenueOrders.filter(o => {
      const d = new Date(o.created_at);
      return d >= date && d < nextDay;
    });

    const revenue = dayOrders.reduce((sum, o) => sum + o.total, 0);
    return {
      label: date.toLocaleDateString('en-IN', { weekday: 'short' }),
      revenue,
    };
  });

  const maxRevenue = Math.max(...chartData.map(d => d.revenue), 1); // prevent division by zero
  const weekRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0);

  // Top Products — sorted by sales (was the first 5 products in catalogue order)
  const topProducts = getProductFinancialStats('all')
    .filter((p) => p.unitsSold > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const recentOrders = [...placedOrders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  const totalSalesChannel = onlineSalesTotal + counterSalesTotal;
  const onlinePct = totalSalesChannel > 0 ? (onlineSalesTotal / totalSalesChannel) * 100 : 0;
  const counterPct = totalSalesChannel > 0 ? (counterSalesTotal / totalSalesChannel) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/admin/products/new" className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors text-sm font-semibold shadow-sm">
            <PlusCircle className="w-4 h-4" /> Add Product
          </Link>
          <Link href="/admin/pos" className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl hover:bg-black transition-colors text-sm font-semibold shadow-sm">
            <Store className="w-4 h-4" /> POS Order
          </Link>
          <Link href="/admin/analytics" className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors text-sm font-semibold shadow-sm">
            <TrendingUp className="w-4 h-4" /> View Analytics
          </Link>
        </div>
      </div>

      {/* Needs action: the day's to-do list */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900">Needs action</h2>
        {nothingToDo ? (
          <p className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="w-4 h-4" /> Nothing needs your attention right now.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
            {actions.map(a => (
              <Link
                key={a.label}
                href={a.href}
                className={`rounded-2xl border p-4 transition-colors ${a.count > 0 ? "border-gray-200 hover:border-gray-400 hover:bg-gray-50" : "border-gray-100 opacity-60"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${a.tone}`}>
                    <a.icon className="w-5 h-5" />
                  </span>
                  <span className="text-2xl font-black text-gray-900">{a.count}</span>
                </div>
                <p className="mt-3 text-sm font-bold text-gray-900">{a.label}</p>
                <p className="mt-0.5 text-xs text-gray-500">{a.hint}</p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* KPI Cards Row: revenue by period, then all-time and profit */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-500">Revenue today</p>
          <h3 className="mt-2 text-xl font-black text-gray-900">{formatPrice(revenueToday)}</h3>
          <p className="mt-1 text-xs text-gray-500">{ordersToday} {ordersToday === 1 ? "order" : "orders"} today</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-500">Last 7 days</p>
          <h3 className="mt-2 text-xl font-black text-gray-900">{formatPrice(revenueWeek)}</h3>
          <p className={`mt-1 text-xs font-semibold ${weekChange === null ? "text-gray-500" : weekChange >= 0 ? "text-emerald-700" : "text-red-600"}`}>
            {weekChange === null
              ? "No sales in the 7 days before"
              : `${weekChange >= 0 ? "Up" : "Down"} ${Math.abs(weekChange).toFixed(0)}% on the 7 days before`}
          </p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-500">This month</p>
          <h3 className="mt-2 text-xl font-black text-gray-900">{formatPrice(revenueMonth)}</h3>
          <p className="mt-1 text-xs text-gray-500">{today.toLocaleDateString('en-IN', { month: 'long' })} so far</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-500">All-time revenue</p>
          <h3 className="mt-2 text-xl font-black text-emerald-600">{formatPrice(totalRevenue)}</h3>
          <p className="mt-1 text-xs text-gray-500">{activeProducts} of {products.length} products active</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-500">Net profit</p>
          <h3 className="mt-2 text-xl font-black text-blue-600">{formatPrice(totalNetProfit)}</h3>
          <p className="mt-1 text-xs font-semibold text-blue-700">{profitMargin}% margin</p>
        </div>
      </div>

      {/* Middle Section: Chart and Channels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-bold text-gray-900">Revenue Trend (Last 7 Days)</h3>
            <p className="text-sm font-bold text-gray-900">{formatPrice(weekRevenue)}</p>
          </div>
          {weekRevenue === 0 && (
            <p className="mt-1 text-xs text-gray-500">No paid orders in the last 7 days.</p>
          )}
          {/* Each column stretches to the full chart height, so the bar's % height has something to measure against */}
          <div className="flex items-stretch gap-2 h-48 mt-6">
            {chartData.map((d, i) => (
              <div key={i} className="flex-1 min-w-0 flex flex-col items-center gap-2 group">
                <div className="relative flex-1 w-full flex items-end">
                  <div
                    className={`w-full rounded-t-md transition-colors ${d.revenue > 0 ? "bg-emerald-500 group-hover:bg-emerald-600" : "bg-gray-100"}`}
                    style={{ height: d.revenue > 0 ? `${Math.max((d.revenue / maxRevenue) * 100, 4)}%` : "2px" }}
                  />
                  {d.revenue > 0 && (
                    <div className="absolute left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none"
                      style={{ bottom: `calc(${Math.max((d.revenue / maxRevenue) * 100, 4)}% + 4px)` }}
                    >
                      {formatPrice(d.revenue)}
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-500 font-medium">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-gray-900 mb-6">Channel Split</h3>
          <div className="space-y-6 flex-1 flex flex-col justify-center">
            <div>
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Online</p>
                  <p className="text-lg font-bold text-blue-600">{formatPrice(onlineSalesTotal)}</p>
                </div>
                <span className="text-sm font-medium text-gray-500">{onlinePct.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: `${onlinePct}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Counter</p>
                  <p className="text-lg font-bold text-amber-600">{formatPrice(counterSalesTotal)}</p>
                </div>
                <span className="text-sm font-medium text-gray-500">{counterPct.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: `${counterPct}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Orders, with Low Stock and Top Products beside */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-gray-900">Recent Orders</h3>
            <Link href="/admin/orders" className="text-xs font-bold text-blue-600 hover:underline">All orders</Link>
          </div>

          {/* Phones: one card per order */}
          <ul className="divide-y divide-gray-100 md:hidden">
            {recentOrders.map(order => (
              <li key={order.id}>
                <Link href={`/admin/orders/${order.id}`} className="flex items-start justify-between gap-3 px-5 py-4 active:bg-gray-50">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{order.customer_name || "Guest"}</p>
                    <p className="text-xs text-gray-500">{order.order_number} · {channelLabel(order.channel)}</p>
                    <p className="text-xs text-gray-400">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-gray-900">{formatPrice(order.total)}</p>
                    <span className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${orderStatusClass(order.status)}`}>
                      {orderStatusLabel(order.status)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 bg-gray-50/50">
                <tr>
                  <th className="px-6 py-3 font-medium">Order</th>
                  <th className="px-6 py-3 font-medium">Customer</th>
                  <th className="px-6 py-3 font-medium">Channel</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Total</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentOrders.map(order => (
                  <tr
                    key={order.id}
                    onClick={() => router.push(`/admin/orders/${order.id}`)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-3 font-medium text-gray-900">
                      <Link href={`/admin/orders/${order.id}`} onClick={(e) => e.stopPropagation()} className="hover:underline">
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="px-6 py-3">
                      <div className="font-medium text-gray-900">{order.customer_name || "Guest"}</div>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        order.channel === 'ONLINE' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {channelLabel(order.channel)}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${orderStatusClass(order.status)}`}>
                        {orderStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-medium text-gray-900">{formatPrice(order.total)}</td>
                    <td className="px-6 py-3 text-gray-500 text-xs">
                      {formatDate(order.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {recentOrders.length === 0 && (
            <p className="px-6 py-8 text-center text-sm text-gray-500">No recent orders.</p>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h3 className="text-sm font-bold text-gray-900">Low stock</h3>
              {lowStockItems.length > 0 && (
                <Link href="/admin/products?stock=low" className="text-xs font-bold text-blue-600 hover:underline">
                  See all {lowStockItems.length}
                </Link>
              )}
            </div>
            {lowStockItems.length > 0 ? (
              <ul className="space-y-3">
                {lowStockItems.slice(0, 6).map(({ product, variant }) => (
                  <li key={variant.id}>
                    <Link href={`/admin/products/${product.id}`} className="flex items-center justify-between gap-3 group">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600">{product.name}</p>
                        {variant.name && variant.name !== "Default" && (
                          <p className="text-xs text-gray-500 truncate">{variant.name}</p>
                        )}
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${variant.stock <= 0 ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                        {variant.stock <= 0 ? "Out of stock" : `${variant.stock} left`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Every product is above its stock limit.</p>
            )}
          </div>

          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Top Selling Products</h3>
            <div className="space-y-4">
              {topProducts.length > 0 ? topProducts.map((p, i) => (
                <div key={p.productId} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                      #{i + 1}
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-semibold text-gray-900 truncate">{p.productName}</p>
                      <p className="text-xs text-gray-500">{p.unitsSold} units sold</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-sm font-bold text-gray-900">{formatPrice(p.revenue)}</p>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-gray-500">No sales data available yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
