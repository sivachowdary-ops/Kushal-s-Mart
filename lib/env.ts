import { z } from "zod/v4";

/**
 * Server-side environment variable validation.
 * Validates that all required env vars are set at import time.
 * Import this in server-side code to get early failure on misconfiguration.
 */
const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
});

let _serverEnv: z.infer<typeof serverEnvSchema> | null = null;

export function getServerEnv() {
  if (!_serverEnv) {
    const result = serverEnvSchema.safeParse(process.env);
    if (!result.success) {
      console.error("[ENV] Missing or invalid server environment variables:", result.error.format());
      throw new Error("Server environment validation failed. Check .env.local");
    }
    _serverEnv = result.data;
  }
  return _serverEnv;
}

export function getClientEnv() {
  const result = clientEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!result.success) {
    console.error("[ENV] Missing or invalid client environment variables:", result.error.format());
  }
  return result.data;
}
