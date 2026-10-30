import type { AdminOrder, AdminProduct, AdminVariant } from "@/lib/admin-store";

// Display helpers shared by the admin pages: labels, colours and stock state.
// Read-only — nothing here changes data.

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
  CONFIRMED: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
  PENDING_PAYMENT: "bg-amber-50 text-amber-800 ring-amber-600/20",
  PAYMENT_FAILED: "bg-red-100 text-red-800 ring-red-600/30",
  FAILED: "bg-red-100 text-red-800 ring-red-600/30",
  PAID: "bg-sky-50 text-sky-700 ring-sky-600/20",
  PROCESSING: "bg-blue-50 text-blue-700 ring-blue-600/20",
  PACKED: "bg-purple-50 text-purple-700 ring-purple-600/20",
  SHIPPED: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  DELIVERED: "bg-green-50 text-green-700 ring-green-600/20",
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  CANCELLED: "bg-red-50 text-red-700 ring-red-600/20",
};

export function orderStatusClass(status: string): string {
  return STATUS_STYLES[status] ?? "bg-slate-50 text-slate-700 ring-slate-600/20";
}

/** "PAYMENT_FAILED" -> "Payment failed" */
export function orderStatusLabel(status: string): string {
  const words = status.toLowerCase().replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** The same two words everywhere in the admin: Online and Counter. */
export function channelLabel(channel: AdminOrder["channel"]): string {
  return channel === "OFFLINE" ? "Counter" : "Online";
}

/** Paid online order without a courier AWB yet. Counter sales are handed over in store. */
export function needsDispatch(o: AdminOrder): boolean {
  return (
    o.channel !== "OFFLINE" &&
    (o.payment_status === "PAID" || o.status === "PAID") &&
    !o.shiprocket_awb &&
    o.status !== "CANCELLED"
  );
}

/** A placed order still waiting for its money (COD or unpaid), not yet sent out. */
export function isPaymentPending(o: AdminOrder): boolean {
  return ["PENDING", "CONFIRMED", "PROCESSING"].includes(o.status) && o.payment_status !== "PAID";
}

export function productVariants(p: AdminProduct): AdminVariant[] {
  return p.variants ?? p.product_variants ?? [];
}

/** Same rule as the dashboard's low-stock count: at or below the variant's threshold (default 3). */
export function isLowStock(v: AdminVariant): boolean {
  return v.stock <= (v.low_stock_threshold || 3);
}

export function productStock(p: AdminProduct): { total: number; low: boolean; out: boolean; lowVariants: number } {
  const variants = productVariants(p);
  const total = variants.reduce((sum, v) => sum + Math.max(v.stock, 0), 0);
  const lowVariants = variants.filter(isLowStock).length;
  return { total, low: lowVariants > 0, out: variants.length > 0 && total === 0, lowVariants };
}
