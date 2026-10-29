-- ==============================================================================
-- Migration: 20261030_shared_rate_limits.sql
-- Rate limits shared by every Vercel server instance (login, checkout, tracking, uploads).
-- Run in Supabase SQL Editor. Safe to re-run.
-- ==============================================================================

-- 1. Counter table — keys are SHA-256 hashes (no raw IP addresses stored)
CREATE TABLE IF NOT EXISTS public.rate_limit (
  key      TEXT PRIMARY KEY,
  count    INT NOT NULL,
  reset_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE public.rate_limit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rate_limit FROM anon, authenticated;
GRANT ALL ON TABLE public.rate_limit TO service_role;

-- 2. Atomic "count one attempt" — one statement, so parallel requests can't race past the limit.
--    p_increment = false only checks the current state (used to block before counting failures).
DROP FUNCTION IF EXISTS public.rate_limit_hit(TEXT, INT, INT);
CREATE OR REPLACE FUNCTION public.rate_limit_hit(p_key TEXT, p_max INT, p_window_seconds INT, p_increment BOOLEAN DEFAULT TRUE)
RETURNS TABLE (allowed BOOLEAN, remaining INT, retry_after_seconds INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.rate_limit%ROWTYPE;
BEGIN
  IF NOT p_increment THEN
    SELECT * INTO r FROM public.rate_limit WHERE key = p_key;
    IF NOT FOUND OR r.reset_at <= NOW() THEN
      RETURN QUERY SELECT TRUE, p_max, 0;
    ELSE
      RETURN QUERY SELECT
        r.count < p_max,
        GREATEST(p_max - r.count, 0),
        CASE WHEN r.count < p_max THEN 0 ELSE CEIL(EXTRACT(EPOCH FROM (r.reset_at - NOW())))::INT END;
    END IF;
    RETURN;
  END IF;

  INSERT INTO public.rate_limit AS rl (key, count, reset_at)
  VALUES (p_key, 1, NOW() + make_interval(secs => p_window_seconds))
  ON CONFLICT (key) DO UPDATE SET
    count    = CASE WHEN rl.reset_at <= NOW() THEN 1 ELSE rl.count + 1 END,
    reset_at = CASE WHEN rl.reset_at <= NOW() THEN NOW() + make_interval(secs => p_window_seconds) ELSE rl.reset_at END
  RETURNING * INTO r;

  -- Occasionally clear out long-expired counters so the table stays small
  IF random() < 0.01 THEN
    DELETE FROM public.rate_limit WHERE reset_at < NOW() - INTERVAL '1 day';
  END IF;

  RETURN QUERY SELECT
    r.count <= p_max,
    GREATEST(p_max - r.count, 0),
    CASE WHEN r.count <= p_max THEN 0
         ELSE CEIL(EXTRACT(EPOCH FROM (r.reset_at - NOW())))::INT END;
END;
$$;

-- Server (service_role) only — the public anon key must not be able to call or reset it
REVOKE ALL ON FUNCTION public.rate_limit_hit(TEXT, INT, INT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(TEXT, INT, INT, BOOLEAN) TO service_role;

-- VERIFY:
--   SELECT * FROM public.rate_limit_hit('test-key', 2, 60);   -- run 3 times: true, true, false
--   DELETE FROM public.rate_limit WHERE key = 'test-key';
--   SELECT has_function_privilege('anon', 'public.rate_limit_hit(text,int,int,boolean)', 'execute');  -- expect false
