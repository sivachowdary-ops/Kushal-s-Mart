// Logos shipped with the site. Small cached copies (600 px) replace the originals in Supabase
// Storage, which were ~200 KB each and served "no-cache", so every homepage view re-downloaded
// them and used up the Supabase egress quota. A new image uploaded in Admin → Categories
// (Cloudinary) still wins over these.
const BUILT_IN_LOGOS: Record<string, string> = {
  "rc-cars": "/categories/rc-cars.webp",
  "diecast-metal-cars": "/categories/diecast-metal-cars.webp",
  premium: "/categories/premium.webp",
  bikes: "/categories/bikes.webp",
};

function isSupabaseStorage(url: string): boolean {
  return /\.supabase\.(co|com)\/storage\//.test(url);
}

export function getCategoryImage(cat: { slug: string; imageUrl?: string | null }): string | null {
  const builtIn = BUILT_IN_LOGOS[cat.slug];
  if (cat.imageUrl && !(builtIn && isSupabaseStorage(cat.imageUrl))) return cat.imageUrl;
  return builtIn || cat.imageUrl || null;
}
