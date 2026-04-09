-- Add production_status to orders table to track manual statuses from Google Sheets

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS production_status text;

-- Optional: add a comment to explain what it is used for
COMMENT ON COLUMN public.orders.production_status IS 'Manual tracking status imported from Google Sheets, e.g. Processing, Completed, etc.';
