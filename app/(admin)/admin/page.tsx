"use client";

import { useAdminStore } from "@/lib/admin-store";
import {
  Store,
  PlusCircle,
  TrendingUp,
  FolderTree,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const formatPrice = (paise: number) => {
  return (paise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function AdminDashboardPage() {
  const { 
    isLoading, 
    totalRevenue, 
    totalNetProfit, 
    ordersToday, 
    products, 
    lowStockCount, 
    orders,
    onlineSalesTotal,
    counterSalesTotal,
    getProductFinancialStats
  } = useAdminStore();

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
    
    const dayOrders = orders.filter(o => {
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

  // Top Products
  const topProducts = getProductFinancialStats('all').slice(0, 5);

  const recentOrders = [...orders]
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

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Revenue</p>
          <div className="mt-2 flex items-center gap-2">
            <h3 className="text-xl font-black text-emerald-600">{formatPrice(totalRevenue)}</h3>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Net Profit</p>
          <div className="mt-2 flex items-center gap-2">
            <h3 className="text-xl font-black text-blue-600">{formatPrice(totalNetProfit)}</h3>
            <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{profitMargin}% margin</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Orders Today</p>
          <div className="mt-2 flex items-center gap-2">
            <h3 className="text-xl font-black text-purple-600">{ordersToday}</h3>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Products</p>
          <div className="mt-2 flex items-center gap-2">
            <h3 className="text-xl font-black text-amber-600">{activeProducts}</h3>
            <span className="text-xs font-medium text-gray-400">/ {products.length} total</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Low Stock Alerts</p>
          <div className="mt-2 flex items-center gap-2">
            <h3 className="text-xl font-black text-red-600">{lowStockCount}</h3>
          </div>
        </div>
      </div>

      {/* Middle Section: Chart and Channels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-6">Revenue Trend (Last 7 Days)</h3>
          <div className="flex items-end gap-2 h-48 mt-4">
            {chartData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end items-center gap-2 group">
                <div 
                  className="w-full bg-emerald-100 group-hover:bg-emerald-200 rounded-t-md transition-all relative"
                  style={{ height: `${Math.max((d.revenue / maxRevenue) * 100, 2)}%` }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                    {formatPrice(d.revenue)}
                  </div>
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
                  <p className="text-sm font-semibold text-gray-700">Online Sales</p>
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
                  <p className="text-sm font-semibold text-gray-700">Counter Sales</p>
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

      {/* Bottom Section: Top Products & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50">
            <h3 className="text-sm font-bold text-gray-900">Recent Orders</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[550px] text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
                <tr>
                  <th className="px-6 py-3 font-medium">Order#</th>
                  <th className="px-6 py-3 font-medium">Customer</th>
                  <th className="px-6 py-3 font-medium">Channel</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Total</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentOrders.length > 0 ? recentOrders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-900">
                      <Link href={`/admin/orders/${order.id}`}>
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="px-6 py-3">
                      <div className="font-medium text-gray-900">{order.customer_name || "Guest"}</div>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        order.channel === 'ONLINE' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {order.channel}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-700 uppercase">
                        {order.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-medium text-gray-900">{formatPrice(order.total)}</td>
                    <td className="px-6 py-3 text-gray-500 text-xs">
                      {new Date(order.created_at).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No recent orders.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
