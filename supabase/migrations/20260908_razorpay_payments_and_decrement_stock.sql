-- ============================================================================
-- Razorpay Payment Integration — Database Migration
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================================

-- 1. Create or adapt the payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES public."Order"(id) ON DELETE CASCADE,
  razorpay_order_id TEXT NOT NULL UNIQUE,       -- Razorpay order ID (order_...)
  razorpay_payment_id TEXT UNIQUE,              -- Set once payment completes (pay_...)
  amount INTEGER NOT NULL,                      -- paise (₹1 = 100 paise)
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'active', 'paid', 'failed', 'refunded', 'partially_refunded')),
  failure_reason TEXT,
  raw_webhook_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- If payments table was created with Cashfree columns previously, migrate them safely:
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'cashfree_order_id'
  ) THEN
    ALTER TABLE public.payments RENAME COLUMN cashfree_order_id TO razorpay_order_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'cf_payment_id'
  ) THEN
    ALTER TABLE public.payments RENAME COLUMN cf_payment_id TO razorpay_payment_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'payment_session_id'
  ) THEN
    ALTER TABLE public.payments DROP COLUMN payment_session_id;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments (order_id);

-- 2. Enable Row Level Security and grant table permissions
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.payments TO service_role;
GRANT ALL ON TABLE public.payments TO postgres;

-- 3. Atomic stock decrement function — prevents race conditions
--    Returns TRUE if stock was successfully decremented, FALSE if insufficient stock
CREATE OR REPLACE FUNCTION decrement_stock(p_variant_id TEXT, p_qty INT)
RETURNS BOOLEAN AS $$
DECLARE
  rows_affected INT;
BEGIN
  UPDATE "ProductVariant"
  SET stock = stock - p_qty, "updatedAt" = NOW()
  WHERE id = p_variant_id AND stock >= p_qty;

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service_role (used by supabaseAdmin)
GRANT EXECUTE ON FUNCTION decrement_stock(TEXT, INT) TO service_role;

-- ============================================================================
-- VERIFICATION:
--   SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'payments';
--   SELECT proname FROM pg_proc WHERE proname = 'decrement_stock';
-- ============================================================================
