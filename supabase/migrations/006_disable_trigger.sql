-- Drop the trigger to verify if it is causing the 400 error
DROP TRIGGER IF EXISTS trigger_recalculate_tiers ON public.loyalty_tiers;
DROP FUNCTION IF EXISTS public.recalculate_all_customer_tiers();
