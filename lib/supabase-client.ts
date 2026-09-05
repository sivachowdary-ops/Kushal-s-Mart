import { createClient } from "@supabase/supabase-js";

/**
 * Browser-side Supabase client using the public anon key.
 * Safe to use in "use client" components — respects RLS policies.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
