/**
 * A smaller copy of a Cloudinary product image, at most `width` px wide. Cloudinary makes it once
 * and then serves it from its CDN, so cards and thumbnails stop downloading full-size originals
 * (median ~70 KB, up to ~390 KB) — the bulk of the Cloudinary bandwidth. Any other URL, or one
 * that already has transformations, is returned unchanged.
 */
export function cloudinarySized(url: string, width: number): string;
export function cloudinarySized(url: string | undefined, width: number): string | undefined;
export function cloudinarySized(url: string | undefined, width: number): string | undefined {
  if (!url || !url.includes("res.cloudinary.com/")) return url;
  // Only plain delivery URLs: /image/upload/v123/... (a version or folder right after "upload/")
  return url.replace(/\/image\/upload\/(?=v\d+\/|kushals-mart\/)/, `/image/upload/c_limit,w_${width},q_auto/`);
}
