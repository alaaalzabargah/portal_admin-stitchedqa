-- Recalculate status_tier for ALL customers based on their current total_spend_minor
-- logic: Find the highest tier where min_spend_minor <= customer.total_spend_minor

UPDATE public.customers c
SET status_tier = COALESCE(
    (
        SELECT name
        FROM public.loyalty_tiers t
        WHERE c.total_spend_minor >= t.min_spend_minor
        ORDER BY t.min_spend_minor DESC
        LIMIT 1
    ),
    'Bronze' -- Fallback if no tier matches (shouldn't happen if Bronze is 0)
);
