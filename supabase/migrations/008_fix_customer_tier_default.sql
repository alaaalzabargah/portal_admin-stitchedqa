-- 1. Fix any customers with orphaned tier values (tier names that don't exist)
-- Set them to NULL temporarily
UPDATE public.customers
SET status_tier = NULL
WHERE status_tier NOT IN (SELECT name FROM public.loyalty_tiers);

-- 2. Recalculate tiers for all customers based on spending
UPDATE public.customers c
SET status_tier = COALESCE(
    (
        SELECT name
        FROM public.loyalty_tiers t
        WHERE c.total_spend_minor >= t.min_spend_minor
        ORDER BY t.min_spend_minor DESC
        LIMIT 1
    ),
    (SELECT name FROM public.loyalty_tiers ORDER BY min_spend_minor ASC LIMIT 1)
);

-- 3. Change the default value from 'Normal' to the lowest tier dynamically
DO $$
DECLARE
    lowest_tier text;
BEGIN
    SELECT name INTO lowest_tier
    FROM public.loyalty_tiers
    ORDER BY min_spend_minor ASC
    LIMIT 1;
    
    EXECUTE format('ALTER TABLE public.customers ALTER COLUMN status_tier SET DEFAULT %L', lowest_tier);
END $$;

-- 4. Add foreign key constraint
ALTER TABLE public.customers
    ADD CONSTRAINT fk_customers_status_tier 
    FOREIGN KEY (status_tier) 
    REFERENCES public.loyalty_tiers(name)
    ON UPDATE CASCADE
    ON DELETE SET DEFAULT;
