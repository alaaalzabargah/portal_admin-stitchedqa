-- Add was_deposit column to orders table
-- This permanently records whether an order was originally placed as a deposit,
-- even after the order is later marked as fully paid.

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS was_deposit boolean NOT NULL DEFAULT false;

-- Backfill: any order currently partially_paid is definitely a deposit
UPDATE public.orders
SET was_deposit = true
WHERE financial_status = 'partially_paid';

-- Backfill: any order that is now 'paid' but has a paid_amount_minor that differs
-- from total_amount_minor AND was likely a deposit (paid_amount < total when it was created)
-- We also catch orders where paid_amount equals total (already collected) but were
-- originally deposits by checking if there's a pattern of deposit items in notes or
-- if paid_amount_minor was updated after creation.
-- Conservative approach: only mark currently partially_paid ones.
-- Orders already marked as paid that WERE deposits are lost unless we can detect them.

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_orders_was_deposit ON public.orders(was_deposit) WHERE was_deposit = true;

-- Add deposit_paid_at column to track when a deposit was converted to full payment
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS deposit_paid_at timestamptz;
