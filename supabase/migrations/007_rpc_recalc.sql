-- Re-create the function with robust fallback logic
CREATE OR REPLACE FUNCTION public.recalculate_all_customer_tiers()
RETURNS void AS $$
DECLARE
  lowest_tier text;
BEGIN
  -- Get the name of the lowest tier (default for 0 spend)
  SELECT name INTO lowest_tier
  FROM public.loyalty_tiers
  ORDER BY min_spend_minor ASC
  LIMIT 1;

  -- Update all customers
  UPDATE public.customers c
  SET status_tier = COALESCE(
      (
          -- Find the highest matching tier
          SELECT name
          FROM public.loyalty_tiers t
          WHERE c.total_spend_minor >= t.min_spend_minor
          ORDER BY t.min_spend_minor DESC
          LIMIT 1
      ),
      -- Fallback to the lowest tier found above, or 'Bronze' if table is empty
      lowest_tier,
      'Bronze'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure permissions
GRANT EXECUTE ON FUNCTION public.recalculate_all_customer_tiers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_all_customer_tiers() TO service_role;
