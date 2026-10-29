import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
  // Razorpay's payment pages may open pop-ups (net banking, UPI), so allow those
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
];

/**
 * Storefront CSP. The admin panel and POS get a stricter nonce-based policy from proxy.ts instead,
 * so this one is not sent on those paths.
 */
const storefrontCsp = {
  key: "Content-Security-Policy",
  value: [
    "default-src 'self'",
    // Razorpay checkout JS + frame
    "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com",
    "frame-src 'self' https://api.razorpay.com",
    // Supabase storage (legacy images) + Cloudinary CDN (new images)
    "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.com https://res.cloudinary.com",
    "connect-src 'self' https://*.supabase.co https://*.supabase.com https://api.razorpay.com https://lapi.razorpay.com https://track.delhivery.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; "),
};

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/track",
        destination: "/track-order",
        permanent: false,
      },
      {
        source: "/tracking",
        destination: "/track-order",
        permanent: false,
      },
      {
        source: "/orders/track",
        destination: "/track-order",
        permanent: false,
      },
      {
        source: "/trackorder",
        destination: "/track-order",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/",
        headers: [storefrontCsp],
      },
      {
        // Everything except /admin… and /pos…, which get the nonce CSP from proxy.ts
        source: "/:path((?!admin(?:/|$)|pos(?:/|$)).*)",
        headers: [storefrontCsp],
      },
    ];
  },
};

export default nextConfig;
