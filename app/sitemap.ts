import type { MetadataRoute } from "next";
import { getStorefrontData } from "@/lib/storefront-data";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.kushalsmart.in").replace(/\/+$/, "");

// Built from the shared catalog cache; rebuilt at most once a day
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { categories, allProducts } = await getStorefrontData();
  const pages = ["", "/shop", "/categories", "/about", "/contact", "/policies/shipping", "/policies/refund", "/policies/privacy", "/policies/terms"];

  return [
    ...pages.map((path) => ({ url: `${SITE_URL}${path}`, changeFrequency: "weekly" as const })),
    ...categories.map((c) => ({ url: `${SITE_URL}/category/${c.slug}`, changeFrequency: "weekly" as const })),
    ...allProducts.map((p) => ({ url: `${SITE_URL}/product/${p.slug}`, changeFrequency: "weekly" as const })),
  ];
}
