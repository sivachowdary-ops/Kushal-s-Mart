import { revalidatePath, revalidateTag } from "next/cache";

/** Tag on the shared catalog cache (products, variants, categories) in lib/storefront-data.ts */
export const CATALOG_TAG = "catalog";

/**
 * Call after anything customers see changes: a product, its price, stock or images, or a category.
 * Storefront pages are cached (ISR) until this runs, instead of rebuilding every 30 seconds.
 * Nothing rebuilds right away — each page and the catalog refresh on their next visit.
 * Must run in a Route Handler or Server Action, never inside a cached function.
 */
export function revalidateStorefront(reason: string): void {
  try {
    revalidateTag(CATALOG_TAG, { expire: 0 });
    revalidatePath("/", "layout");
  } catch (err) {
    // A failed refresh must never break the save/order it follows; pages still refresh on their timer
    console.error(`[revalidate] storefront refresh failed after ${reason}:`, err);
  }
}
