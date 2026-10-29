import { randomInt } from "crypto";

// No 0/O or 1/I/L, so numbers read out over the phone aren't misheard
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/**
 * Order number like KM-20261029-7QK4MZ.
 *
 * Six random characters give ~887 million combinations per day: they can't be guessed to look up
 * other customers' orders, and two orders on the same day practically never clash (the old four
 * random digits clashed often enough to fail checkouts). Date is the IST calendar day.
 */
export function generateOrderNumber(now = new Date()): string {
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const dateStr = ist.toISOString().slice(0, 10).replace(/-/g, "");
  let suffix = "";
  for (let i = 0; i < 6; i++) suffix += ALPHABET[randomInt(ALPHABET.length)];
  return `KM-${dateStr}-${suffix}`;
}

/** True when a Supabase/Postgres error is a unique-constraint clash on the order number. */
export function isOrderNumberClash(error: { code?: string; message?: string } | null): boolean {
  return !!error && error.code === "23505" && /orderNumber/i.test(error.message || "");
}
