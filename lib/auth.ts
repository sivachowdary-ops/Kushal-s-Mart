import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

if (!process.env.JWT_SECRET) {
  console.warn("[SECURITY] JWT_SECRET not set — admin JWT signing disabled. Set JWT_SECRET in .env.local");
}
const JWT_SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "PLACEHOLDER_WILL_FAIL_VERIFICATION"
);

const COOKIE_NAME = "km_admin_token";

export interface AdminJwtPayload {
  id: string;
  email: string;
  role: string;
}

/**
 * Hash a plain text password using bcryptjs (salt rounds = 10).
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

/**
 * Compare a plain text password with a bcrypt hash.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Sign a JWT token for an authenticated admin user (valid for 7 days).
 */
export async function signAdminToken(payload: AdminJwtPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET_KEY);
}

/**
 * Verify a JWT token and return the payload.
 */
export async function verifyAdminToken(token: string): Promise<AdminJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY);
    return {
      id: payload.id as string,
      email: payload.email as string,
      role: (payload.role as string) || "admin",
    };
  } catch (error) {
    return null;
  }
}

/**
 * Set the admin JWT token in HTTP-only cookie.
 */
export async function setAdminAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: "/",
  });
}

/**
 * Clear the admin auth cookie on logout.
 */
export async function clearAdminAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Get current authenticated admin user from request cookies.
 */
export async function getAuthenticatedAdmin(): Promise<AdminJwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifyAdminToken(token);
}
