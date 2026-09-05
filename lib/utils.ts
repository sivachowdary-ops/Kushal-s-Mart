import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes with conflict resolution.
 * Use this everywhere instead of raw string concatenation.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a price in paise to a human-readable INR string.
 * @param paise - Price in paise (e.g. 429900 = ₹4,299.00)
 * @param showDecimals - Whether to show .00 decimals (default: false for whole rupee amounts)
 */
export function formatPrice(paise: number, showDecimals = false): string {
  const rupees = paise / 100;
  if (showDecimals || rupees % 1 !== 0) {
    return `₹${rupees.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `₹${rupees.toLocaleString("en-IN")}`;
}

/**
 * Calculate discount percentage between MRP and selling price.
 * Returns a whole number (e.g. 25 for 25% off).
 */
export function calcDiscount(mrp: number, sellingPrice: number): number {
  if (mrp <= 0 || sellingPrice >= mrp) return 0;
  return Math.round(((mrp - sellingPrice) / mrp) * 100);
}

/**
 * Generate a URL-safe slug from a string.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Generate the next order number in format KM-YYYYMMDD-XXXX.
 * @param sequenceNumber - The sequential counter for the day
 */
export function generateOrderNumber(sequenceNumber: number): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const seq = String(sequenceNumber).padStart(4, "0");
  return `KM-${dateStr}-${seq}`;
}

/**
 * Normalize an Indian phone number for consistent comparison.
 * Strips spaces, dashes, and common prefixes (+91, 0).
 * Returns the 10-digit number.
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/[\s\-()]/g, "");
  // Remove +91 or 91 prefix if present (and result is 10 digits)
  if (digits.startsWith("+91") && digits.length === 13) {
    return digits.slice(3);
  }
  if (digits.startsWith("91") && digits.length === 12) {
    return digits.slice(2);
  }
  if (digits.startsWith("0") && digits.length === 11) {
    return digits.slice(1);
  }
  return digits;
}

/**
 * Truncate text to a max length with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Format a date for display (e.g. "26 Aug 2026, 3:42 PM").
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format a date for display without time (e.g. "26 Aug 2026").
 */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
