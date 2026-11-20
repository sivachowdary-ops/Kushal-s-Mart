// Cash on Delivery with an advance, home delivery only (APSRTC pickup is always prepaid).
// Products ₹1,000 or more: pay 25% of the products online now; at the door pay the other 75% plus ₹50.
// Or pay 100% online and skip the ₹50. All amounts are in paise, like the rest of the store.
//
// A COD order is saved with paymentMode "cod", subtotal = products and total = products + ₹50.
// The advance is worked out from the subtotal, so nothing else needs storing.

export const COD_MIN_ORDER = 100000; // ₹1,000 of products
export const COD_FEE = 5000; // ₹50, collected at the door
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
export function codBreakdown(subtotal: number): CodBreakdown {
  const advance = Math.ceil((subtotal * COD_ADVANCE_PERCENT) / 100 / 100) * 100;
  return { advance, fee: COD_FEE, balance: subtotal - advance + COD_FEE, total: subtotal + COD_FEE };
}

/** The COD amounts for a saved order, or null for a prepaid one. Accepts admin (snake_case) or DB (camelCase) rows. */
export function orderCodOf(order: { payment_mode?: string | null; paymentMode?: string | null; subtotal: number }): CodBreakdown | null {
  const mode = (order.payment_mode ?? order.paymentMode ?? "").toLowerCase();
  return mode === "cod" ? codBreakdown(order.subtotal) : null;
}

/** What the customer pays online for this order: the advance for COD, otherwise the full total */
export function onlineAmountOf(order: { payment_mode?: string | null; paymentMode?: string | null; subtotal: number; total: number }): number {
  return orderCodOf(order)?.advance ?? order.total;
}
