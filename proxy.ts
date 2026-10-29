import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Strict Content Security Policy for the admin panel and POS: only scripts carrying this
 * request's random nonce may run (Next.js adds it to its own scripts automatically). If an XSS
 * bug ever appeared, an injected script couldn't run and steal the admin's session token.
 * The storefront keeps the policy from next.config.ts — a nonce needs every page rendered per
 * request, which would switch off the storefront's caching.
 */
function strictCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // React and Tailwind set inline style attributes, which nonces can't cover
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://*.supabase.co https://res.cloudinary.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Admin APIs: quick Bearer-token presence check at the edge ───────────
  // Route handlers do the full verifyAdmin / verifyAdminOrStaff check.
  if (pathname.startsWith("/api/admin/")) {
    if (pathname.startsWith("/api/admin/auth/") || pathname === "/api/admin/health") {
      return NextResponse.next();
    }
    if (!request.headers.get("Authorization")?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // ── Admin panel and POS pages: per-request nonce CSP ────────────────────
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = strictCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp); // Next.js reads the nonce from here

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  matcher: ["/api/admin/:path*", "/admin", "/admin/:path*", "/pos", "/pos/:path*"],
};
