-- 1. Create a function that recalculates tiers for ALL customers
CREATE OR REPLACE FUNCTION public.recalculate_all_customer_tiers()
RETURNS TRIGGER AS $$
BEGIN
  -- Batch update all customers based on the new tier rules
  UPDATE public.customers c
  SET status_tier = COALESCE(
      (
          SELECT name
          FROM public.loyalty_tiers t
          WHERE c.total_spend_minor >= t.min_spend_minor
          ORDER BY t.min_spend_minor DESC
          LIMIT 1
      ),
      'Bronze' -- Fallback
  );
  
  RETURN NULL; -- Result is ignored for AFTER triggers
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the Trigger on loyalty_tiers table
DROP TRIGGER IF EXISTS trigger_recalculate_tiers ON public.loyalty_tiers;

CREATE TRIGGER trigger_recalculate_tiers
AFTER INSERT OR UPDATE OF min_spend_minor OR DELETE
ON public.loyalty_tiers
FOR EACH STATEMENT
EXECUTE FUNCTION public.recalculate_all_customer_tiers();
