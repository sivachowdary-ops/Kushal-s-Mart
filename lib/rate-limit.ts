/**
 * Server-side in-memory rate limiter.
 * NOTE: This is per-process — suitable for single-instance deployments.
 * For multi-instance, use Redis-based rate limiting.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitRecord>();

// Clean up expired entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (record.resetAt <= now) store.delete(key);
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; remainingRequests: number; retryAfterSeconds: number } {
  const now = Date.now();
  const key = identifier;
  const record = store.get(key);

  if (!record || record.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + config.windowSeconds * 1000 });
    return { allowed: true, remainingRequests: config.maxRequests - 1, retryAfterSeconds: 0 };
  }

  if (record.count >= config.maxRequests) {
    const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, remainingRequests: 0, retryAfterSeconds };
  }

  record.count++;
  return { allowed: true, remainingRequests: config.maxRequests - record.count, retryAfterSeconds: 0 };
}

/** Get client IP from request headers (works behind proxies) */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

// Pre-configured rate limit profiles
export const RATE_LIMITS = {
  /** Admin login: 5 attempts per 15 minutes */
  adminLogin: { maxRequests: 5, windowSeconds: 15 * 60 } as RateLimitConfig,
  /** 2FA verification: 10 attempts per 15 minutes */
  twoFactor: { maxRequests: 10, windowSeconds: 15 * 60 } as RateLimitConfig,
  /** Order creation: 10 orders per 15 minutes per IP */
  orderCreate: { maxRequests: 10, windowSeconds: 15 * 60 } as RateLimitConfig,
  /** Track orders: 20 lookups per 15 minutes */
  trackOrders: { maxRequests: 20, windowSeconds: 15 * 60 } as RateLimitConfig,
  /** File upload: 30 uploads per 15 minutes */
  upload: { maxRequests: 30, windowSeconds: 15 * 60 } as RateLimitConfig,
} as const;
