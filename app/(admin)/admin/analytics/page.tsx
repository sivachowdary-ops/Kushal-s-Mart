"use client";

import { useAdminStore } from "@/lib/admin-store";
import { Loader2, TrendingUp, IndianRupee, ShoppingBag, Package } from "lucide-react";
import { useState, useEffect } from "react";

const formatPrice = (paise: number) => {
  return (paise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

type Timeframe = 'today' | 'week' | 'month' | 'year' | 'all';

export default function AnalyticsPage() {
  const { isLoading, getProductFinancialStats, totalRevenue, totalCostOfGoods, totalNetProfit, onlineSalesTotal, counterSalesTotal } = useAdminStore();
  const [timeframe, setTimeframe] = useState<Timeframe>('all');
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

  const stats = getProductFinancialStats(timeframe);
  const totalSales = stats.reduce((sum, s) => sum + s.revenue, 0);
  const totalCogs = stats.reduce((sum, s) => sum + s.cost, 0);
  const totalProfit = stats.reduce((sum, s) => sum + s.profit, 0);
  const totalUnits = stats.reduce((sum, s) => sum + s.unitsSold, 0);
  
  const profitMargin = totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) : "0.0";

  // When 'all' is selected, we can use global online vs counter, otherwise we'd need to filter them. 
  // Let's approximate channel split for the time frame based on stats if possible, or just use the global if "all"
  const onlineUnits = stats.reduce((sum, s) => sum + s.onlineUnits, 0);
  const counterUnits = stats.reduce((sum, s) => sum + s.counterUnits, 0);
  
  const totalChannelUnits = onlineUnits + counterUnits;
  const onlinePct = totalChannelUnits > 0 ? (onlineUnits / totalChannelUnits) * 100 : 0;
  const counterPct = totalChannelUnits > 0 ? (counterUnits / totalChannelUnits) * 100 : 0;

  const topPerformers = [...stats].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  if (stats.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        </div>
        <div className="flex flex-col items-center justify-center h-[50vh] bg-white rounded-3xl border border-gray-200">
          <TrendingUp className="w-12 h-12 text-gray-300 mb-4" />
          <h2 className="text-lg font-bold text-gray-900">No Sales Data</h2>
          <p className="text-gray-500">There is no sales data available for this timeframe.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Analytics Overview</h1>
        <div className="flex bg-white rounded-xl p-1 border border-gray-200 shadow-sm overflow-x-auto max-w-full">
          {(['today', 'week', 'month', 'year', 'all'] as Timeframe[]).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-lg capitalize transition-colors whitespace-nowrap ${
                timeframe === t 
                  ? 'bg-gray-900 text-white' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t === 'all' ? 'All Time' : t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Sales</p>
          <div className="mt-2 flex items-center gap-2">
            <h3 className="text-xl font-black text-gray-900">{formatPrice(totalSales)}</h3>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">COGS</p>
          <div className="mt-2 flex items-center gap-2">
            <h3 className="text-xl font-black text-gray-900">{formatPrice(totalCogs)}</h3>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Net Profit</p>
          <div className="mt-2 flex items-center gap-2">
            <h3 className="text-xl font-black text-emerald-600">{formatPrice(totalProfit)}</h3>
            <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">{profitMargin}% margin</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Units Sold</p>
          <div className="mt-2 flex items-center gap-2">
            <h3 className="text-xl font-black text-purple-600">{totalUnits}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-gray-900 mb-6">Channel Breakdown (Units)</h3>
          <div className="space-y-6 flex-1 flex flex-col justify-center">
            <div>
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Online</p>
                  <p className="text-lg font-bold text-blue-600">{onlineUnits} units</p>
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
                  <p className="text-lg font-bold text-amber-600">{counterUnits} units</p>
                </div>
                <span className="text-sm font-medium text-gray-500">{counterPct.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: `${counterPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Top 5 Performers</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {topPerformers.map((p, i) => (
              <div key={p.productId} className="flex items-center gap-4 p-3 rounded-xl border border-gray-50 bg-gray-50/50">
                <div className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-sm font-bold text-gray-900 shrink-0 shadow-sm">
                  #{i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{p.productName}</p>
                  <p className="text-xs text-gray-500">{p.unitsSold} units | {formatPrice(p.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50">
          <h3 className="text-sm font-bold text-gray-900">Per-Product Financials</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm text-left">
            <thead className="text-[10px] font-bold text-gray-500 uppercase bg-gray-50/50">
              <tr>
                <th className="px-6 py-3">Product</th>
                <th className="px-6 py-3">Selling Price</th>
                <th className="px-6 py-3">Cost Price</th>
                <th className="px-6 py-3 text-center">Units (On/Co)</th>
                <th className="px-6 py-3 text-right">Revenue</th>
                <th className="px-6 py-3 text-right">Cost</th>
                <th className="px-6 py-3 text-right">Profit</th>
                <th className="px-6 py-3 text-right">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stats.sort((a,b) => b.revenue - a.revenue).map(s => {
                const margin = s.revenue > 0 ? (s.profit / s.revenue) * 100 : 0;
                let badgeClass = "bg-gray-100 text-gray-700";
                if (margin >= 20) badgeClass = "bg-emerald-100 text-emerald-700";
                else if (margin > 0) badgeClass = "bg-blue-100 text-blue-700";
                else if (margin <= 0) badgeClass = "bg-red-100 text-red-700";

                return (
                  <tr key={s.productId} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900 truncate max-w-[200px]" title={s.productName}>{s.productName}</p>
                      <p className="text-xs text-gray-500">{s.brand} • {s.category}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-900">{formatPrice(s.sellingPrice)}</td>
                    <td className="px-6 py-4 text-gray-900">{formatPrice(s.costPrice)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-medium">{s.unitsSold}</span>
                      <span className="text-xs text-gray-400 block">{s.onlineUnits} / {s.counterUnits}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">{formatPrice(s.revenue)}</td>
                    <td className="px-6 py-4 text-right text-gray-500">{formatPrice(s.cost)}</td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">{formatPrice(s.profit)}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${badgeClass}`}>
                        {margin.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
