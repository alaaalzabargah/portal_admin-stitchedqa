-- Rename abaya_length_cm to product_length_cm for generic product terminology
-- Migration: Rename column for generic branding

-- Rename the column
ALTER TABLE public.customers 
RENAME COLUMN abaya_length_cm TO product_length_cm;

-- Update the comment
COMMENT ON COLUMN public.customers.product_length_cm IS 'Full Length for custom measurements';
