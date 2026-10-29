import { createHash } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Server-side rate limiter shared by every Vercel instance.
 *
 * Counts live in Supabase (public.rate_limit via the rate_limit_hit function — see
 * supabase/migrations/20261030_shared_rate_limits.sql). Per-process memory reset on every cold
 * start and was separate per instance, so limits were easy to get around. If the database
 * function isn't available (migration not run, or a DB hiccup), this falls back to the old
 * in-memory counter rather than blocking customers.
 */

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingRequests: number;
  retryAfterSeconds: number;
}

// ── In-memory fallback ─────────────────────────────────────────────────────

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

function memoryRateLimit(key: string, config: RateLimitConfig, increment: boolean): RateLimitResult {
  const now = Date.now();
  for (const [k, record] of memoryStore) {
    if (record.resetAt <= now) memoryStore.delete(k);
  }
  const record = memoryStore.get(key);
  const active = record && record.resetAt > now ? record : null;

  if (!increment) {
    const count = active?.count ?? 0;
    const allowed = count < config.maxRequests;
    return {
      allowed,
      remainingRequests: Math.max(config.maxRequests - count, 0),
      retryAfterSeconds: allowed || !active ? 0 : Math.ceil((active.resetAt - now) / 1000),
    };
  }

  if (!active) {
    memoryStore.set(key, { count: 1, resetAt: now + config.windowSeconds * 1000 });
    return { allowed: true, remainingRequests: config.maxRequests - 1, retryAfterSeconds: 0 };
  }
  active.count++;
  const allowed = active.count <= config.maxRequests;
  return {
    allowed,
    remainingRequests: Math.max(config.maxRequests - active.count, 0),
    retryAfterSeconds: allowed ? 0 : Math.ceil((active.resetAt - now) / 1000),
  };
}

// ── Shared limiter ─────────────────────────────────────────────────────────

let warnedFallback = false;

async function sharedRateLimit(identifier: string, config: RateLimitConfig, increment: boolean): Promise<RateLimitResult> {
  // Hash so the table never holds raw IP addresses
  const key = createHash("sha256").update(identifier).digest("hex");
  try {
    const { data, error } = await supabaseAdmin.rpc("rate_limit_hit", {
      p_key: key,
      p_max: config.maxRequests,
      p_window_seconds: config.windowSeconds,
      p_increment: increment,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error("rate_limit_hit returned no row");
    return {
      allowed: !!row.allowed,
      remainingRequests: Number(row.remaining) || 0,
      retryAfterSeconds: Number(row.retry_after_seconds) || 0,
    };
  } catch (err) {
    if (!warnedFallback) {
      warnedFallback = true;
      console.warn("[rate-limit] Shared limiter unavailable, using per-instance memory:", err instanceof Error ? err.message : err);
    }
    return memoryRateLimit(key, config, increment);
  }
}

/** Counts one request and says whether it's within the limit. */
export function checkRateLimit(identifier: string, config: RateLimitConfig): Promise<RateLimitResult> {
  return sharedRateLimit(identifier, config, true);
}

/** Says whether `identifier` is currently over the limit, without counting this request. */
export function peekRateLimit(identifier: string, config: RateLimitConfig): Promise<RateLimitResult> {
  return sharedRateLimit(identifier, config, false);
}

/**
 * Client IP. On Vercel these headers are set by the platform (a client can't spoof
 * x-vercel-forwarded-for / x-real-ip), so prefer them over the raw x-forwarded-for chain.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

// Pre-configured rate limit profiles
export const RATE_LIMITS = {
  /** Admin login: 5 failed checks per 15 minutes */
  adminLogin: { maxRequests: 5, windowSeconds: 15 * 60 } as RateLimitConfig,
  /** Order creation: 10 orders per 15 minutes per IP */
  orderCreate: { maxRequests: 10, windowSeconds: 15 * 60 } as RateLimitConfig,
  /** Track orders: 20 lookups per 15 minutes */
  trackOrders: { maxRequests: 20, windowSeconds: 15 * 60 } as RateLimitConfig,
  /** Live courier tracking: 60 per 15 minutes (a lookup can fetch several orders' tracking) */
  tracking: { maxRequests: 60, windowSeconds: 15 * 60 } as RateLimitConfig,
  /** File upload: 30 uploads per 15 minutes */
  upload: { maxRequests: 30, windowSeconds: 15 * 60 } as RateLimitConfig,
} as const;
