-- ==============================================================================
-- Migration: 20261025_security_hardening.sql
-- Run in Supabase SQL Editor. Safe to re-run.
--
--   1. decrement_stock: only callable by service_role, rejects non-positive qty,
--      pinned search_path (SECURITY DEFINER hardening)
--   2. Positive-quantity constraints so bad rows can never be stored
--   3. RLS on shipment_creation_log (was created without it)
--   4. Move POS staff role from user_metadata (user-editable) to app_metadata
-- ==============================================================================

-- 1. Atomic stock decrement — service_role only ---------------------------------
CREATE OR REPLACE FUNCTION public.decrement_stock(p_variant_id TEXT, p_qty INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_affected INT;
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN
    RETURN FALSE;
  END IF;

  UPDATE "ProductVariant"
  SET stock = stock - p_qty, "updatedAt" = NOW()
  WHERE id = p_variant_id AND stock >= p_qty;

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$;

-- Postgres grants EXECUTE to PUBLIC by default, and Supabase also grants it to
-- anon/authenticated — which would let anyone with the public anon key call it.
REVOKE ALL ON FUNCTION public.decrement_stock(TEXT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_stock(TEXT, INT) TO service_role;

-- 2. Quantity / stock sanity constraints ---------------------------------------
-- NOT VALID: enforced for new rows without failing on any historical bad rows.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orderitem_quantity_positive') THEN
    ALTER TABLE public."OrderItem"
      ADD CONSTRAINT orderitem_quantity_positive CHECK (quantity > 0) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'productvariant_stock_nonnegative') THEN
    ALTER TABLE public."ProductVariant"
      ADD CONSTRAINT productvariant_stock_nonnegative CHECK (stock >= 0) NOT VALID;
  END IF;
END $$;

-- 3. shipment_creation_log: server-only table ----------------------------------
ALTER TABLE public.shipment_creation_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.shipment_creation_log FROM anon, authenticated;
GRANT ALL ON TABLE public.shipment_creation_log TO service_role;

-- 4. POS staff role → app_metadata ---------------------------------------------
-- The app now ignores user_metadata.role. Existing cashiers need app_metadata.role
-- or they will be locked out of the POS.
--
-- REVIEW FIRST — anyone could have set user_metadata.role themselves:
--   SELECT id, email, created_at, raw_user_meta_data->>'role' AS claimed_role
--   FROM auth.users
--   WHERE raw_user_meta_data->>'role' IN ('pos_staff', 'admin');
--
-- Then promote ONLY the emails you recognise as your cashiers:
--   UPDATE auth.users
--   SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role":"pos_staff"}'::jsonb
--   WHERE email IN ('cashier1@example.com');
-- ==============================================================================

-- VERIFY:
--   SELECT has_function_privilege('anon', 'public.decrement_stock(text,int)', 'execute');  -- expect false
--   SELECT relname, relrowsecurity FROM pg_class
--   WHERE relnamespace = 'public'::regnamespace AND relkind = 'r';                         -- expect all true
