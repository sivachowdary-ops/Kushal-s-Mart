import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Edge middleware for route protection.
 * Checks authentication for admin routes at the edge layer
 * before they even reach the page/API handler.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth check for admin auth endpoints and system health probe
  if (
    pathname.startsWith("/api/admin/auth/") ||
    pathname === "/api/admin/health"
  ) {
    return NextResponse.next();
  }

  // For admin API routes: check for Authorization header
  if (pathname.startsWith("/api/admin/")) {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Let the route handler do the full admin role verification
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/admin/:path*",
  ],
};
