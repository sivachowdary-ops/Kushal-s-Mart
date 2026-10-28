/**
 * Order summary handed from checkout to the order confirmation page.
 *
 * Kept in sessionStorage (this browser tab only) because order details are
 * deliberately not available publicly by order number — anyone could guess one.
 */
export interface OrderSummary {
  orderNumber: string;
  total: number; // paise, as charged by the server
  customerName: string;
  customerPhone: string;
  shippingAddress: { address: string; city: string; state: string; pincode: string };
  items: { name: string; variantName: string; quantity: number; price: number; image?: string }[];
}

const keyFor = (orderNumber: string) => `km_order_summary_${orderNumber}`;

export function saveOrderSummary(summary: OrderSummary) {
  try {
    sessionStorage.setItem(keyFor(summary.orderNumber), JSON.stringify(summary));
  } catch {
    // Private mode / storage full — the confirmation page falls back to status only
  }
}

export function loadOrderSummary(orderNumber: string): OrderSummary | null {
  try {
    const raw = sessionStorage.getItem(keyFor(orderNumber));
    return raw ? (JSON.parse(raw) as OrderSummary) : null;
  } catch {
    return null;
  }
}
