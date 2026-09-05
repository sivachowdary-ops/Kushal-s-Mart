import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeOrder, normalizeOrderItem } from "@/lib/db-normalize";
import { verifyAdmin } from "@/lib/admin-auth";

// CHANGED: "orders"→"Order", "order_items"→"OrderItem", camelCase columns
// Filter logic updated to use "createdAt" instead of "created_at"
export async function GET(request: Request) {
  const user = await verifyAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const timeframe = searchParams.get("timeframe") || "all";

  try {
    let query = supabaseAdmin.from("Order").select(`*, OrderItem ( * )`);

    if (timeframe !== "all") {
      const date = new Date();
      if (timeframe === "today") {
        date.setHours(0, 0, 0, 0);
      } else if (timeframe === "week") {
        const day = date.getDay();
        date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
        date.setHours(0, 0, 0, 0);
      } else if (timeframe === "month") {
        date.setDate(1);
        date.setHours(0, 0, 0, 0);
      } else if (timeframe === "year") {
        date.setMonth(0, 1);
        date.setHours(0, 0, 0, 0);
      }
      query = query.gte("createdAt", date.toISOString());
    }

    const { data: orders, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let totalRevenue = 0;
    let totalCost = 0;
    let onlineOrders = 0;
    let offlineOrders = 0;

    (orders || []).forEach((order) => {
      totalRevenue += order.total || 0;

      if ((order.channel || "").toUpperCase() === "ONLINE") {
        onlineOrders++;
      } else {
        offlineOrders++;
      }

      (order.OrderItem || []).forEach((item: Record<string, unknown>) => {
        totalCost += ((item.costPrice as number) || 0) * ((item.quantity as number) || 1);
      });
    });

    const netProfit = totalRevenue - totalCost;

    return NextResponse.json({
      total_revenue: totalRevenue,
      total_cost: totalCost,
      net_profit: netProfit,
      orders_count: (orders || []).length,
      online_orders: onlineOrders,
      offline_orders: offlineOrders,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Analytics query failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
