-- ============================================================================
-- Kushal's Mart — Delhivery Shipment Creation Log Migration
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.shipment_creation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL,
  order_number TEXT,
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN NOT NULL,
  waybill TEXT,
  error_message TEXT,
  raw_response JSONB
);

CREATE INDEX IF NOT EXISTS idx_shipment_log_order_id ON public.shipment_creation_log(order_id);
CREATE INDEX IF NOT EXISTS idx_shipment_log_order_number ON public.shipment_creation_log(order_number);
CREATE INDEX IF NOT EXISTS idx_shipment_log_attempted_at ON public.shipment_creation_log(attempted_at DESC);

COMMENT ON TABLE public.shipment_creation_log IS 'Audit trail of every automatic and manual Delhivery shipment dispatch attempt.';
