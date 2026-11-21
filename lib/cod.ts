// Cash on Delivery with an advance, home delivery only (APSRTC pickup is always prepaid).
// Products ₹1,000 or more: pay 25% of the products online now; at the door pay the other 75% plus ₹100.
// Or pay 100% online and skip the ₹100. All amounts are in paise, like the rest of the store.
//
// A COD order is saved with paymentMode "cod", subtotal = products and total = products + the COD charge.
// The advance is worked out from the subtotal, and the charge from total - subtotal, so orders placed
// before a change to COD_FEE (₹50 until 21 Nov 2026) keep the charge they were placed with.

export const COD_MIN_ORDER = 100000; // ₹1,000 of products
export const COD_FEE = 10000; // ₹100, collected at the door
export const COD_ADVANCE_PERCENT = 25;

export type PaymentOption = "full" | "cod";

export function isPaymentOption(value: unknown): value is PaymentOption {
  return value === "full" || value === "cod";
}

export function isCodEligible(subtotal: number, delivery: string | null | undefined): boolean {
  return delivery === "home" && subtotal >= COD_MIN_ORDER;
}

export interface CodBreakdown {
  advance: number; // paid online now
  fee: number; // the COD charge
  balance: number; // collected at the door: the rest of the products + the fee
  total: number; // products + fee
}

/** Rounded up to the whole rupee, so the door amount is never in paise */
export function codBreakdown(subtotal: number, fee: number = COD_FEE): CodBreakdown {
  const advance = Math.ceil((subtotal * COD_ADVANCE_PERCENT) / 100 / 100) * 100;
  return { advance, fee, balance: subtotal - advance + fee, total: subtotal + fee };
}

/** The COD amounts for a saved order, or null for a prepaid one. Accepts admin (snake_case) or DB (camelCase) rows. */
export function orderCodOf(order: { payment_mode?: string | null; paymentMode?: string | null; subtotal: number; total?: number | null }): CodBreakdown | null {
  const mode = (order.payment_mode ?? order.paymentMode ?? "").toLowerCase();
  if (mode !== "cod") return null;
  // The charge saved with the order (total - subtotal), so old ₹50 orders still add up
  const savedFee = typeof order.total === "number" && order.total > order.subtotal ? order.total - order.subtotal : null;
  return codBreakdown(order.subtotal, savedFee ?? COD_FEE);
}

/** What the customer pays online for this order: the advance for COD, otherwise the full total */
export function onlineAmountOf(order: { payment_mode?: string | null; paymentMode?: string | null; subtotal: number; total: number }): number {
  return orderCodOf(order)?.advance ?? order.total;
}
