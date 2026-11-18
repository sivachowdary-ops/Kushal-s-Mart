import type { MetadataRoute } from "next";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.kushalsmart.in").replace(/\/+$/, "");

// Keeps crawlers on the shop pages and off APIs, admin, POS and per-customer pages,
// each of which costs a server render.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin", "/pos", "/cart", "/checkout", "/order/", "/track-order"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
