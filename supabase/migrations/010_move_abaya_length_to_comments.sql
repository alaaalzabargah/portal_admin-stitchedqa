-- 1. Add additional_comments column
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS additional_comments text;

COMMENT ON COLUMN public.customers.additional_comments IS 'Stores additional notes from Shopify (e.g. customer note)';
