-- Add is_test flag to orders table to filter out test/dummy orders from financial reports
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

-- Partial index for efficient queries that filter out test orders
CREATE INDEX IF NOT EXISTS idx_orders_is_test ON public.orders(is_test) WHERE is_test = false;
