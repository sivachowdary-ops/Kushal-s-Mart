// Logos shipped with the site, used until an image is uploaded in Admin → Categories
const BUILT_IN_LOGOS: Record<string, string> = {
  bikes: "/categories/bikes.webp",
};

export function getCategoryImage(cat: { slug: string; imageUrl?: string | null }): string | null {
  return cat.imageUrl || BUILT_IN_LOGOS[cat.slug] || null;
}
