-- Migration: Add Guest tier and tier management constraints
-- This creates a system-level Guest tier and prevents users from:
-- 1. Creating tiers with min_spend = 0
-- 2. Using the name "Guest"
-- 3. Modifying or deleting the Guest tier

-- 1. Add is_system flag to loyalty_tiers
ALTER TABLE public.loyalty_tiers ADD COLUMN IF NOT EXISTS is_system boolean DEFAULT false NOT NULL;

-- 2. Insert Guest tier as system tier
INSERT INTO public.loyalty_tiers (name, min_spend_minor, is_system, color)
VALUES ('Guest', 0, true, '#9CA3AF')
ON CONFLICT (name) DO UPDATE 
SET min_spend_minor = 0, is_system = true, color = COALESCE(EXCLUDED.color, public.loyalty_tiers.color);

-- 3. Create constraint to prevent non-system tiers from having min_spend = 0
ALTER TABLE public.loyalty_tiers DROP CONSTRAINT IF EXISTS check_non_system_min_spend;
ALTER TABLE public.loyalty_tiers 
ADD CONSTRAINT check_non_system_min_spend 
CHECK (is_system = true OR min_spend_minor > 0);

-- 4. Add unique constraint comment
COMMENT ON COLUMN public.loyalty_tiers.is_system IS 'System tiers (like Guest) cannot be modified or deleted by users';
COMMENT ON CONSTRAINT check_non_system_min_spend ON public.loyalty_tiers IS 'Non-system tiers must have min_spend > 0';

-- 5. Create function to prevent Guest tier modifications
CREATE OR REPLACE FUNCTION prevent_guest_tier_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent deletion of Guest tier
    IF TG_OP = 'DELETE' AND OLD.name = 'Guest' THEN
        RAISE EXCEPTION 'Cannot delete the Guest tier';
    END IF;
    
    -- Prevent changing Guest tier name or making it non-system
    IF TG_OP = 'UPDATE' AND OLD.name = 'Guest' THEN
        IF NEW.name != 'Guest' THEN
            RAISE EXCEPTION 'Cannot rename the Guest tier';
        END IF;
        IF NEW.is_system = false THEN
            RAISE EXCEPTION 'Cannot make Guest tier non-system';
        END IF;
        IF NEW.min_spend_minor != 0 THEN
            RAISE EXCEPTION 'Guest tier must have min_spend = 0';
        END IF;
    END IF;
    
    -- Prevent creating new tiers named Guest
    IF TG_OP = 'INSERT' AND NEW.name = 'Guest' AND NEW.is_system = false THEN
        RAISE EXCEPTION 'Cannot create a tier named "Guest" - this name is reserved';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger
DROP TRIGGER IF EXISTS trigger_prevent_guest_changes ON public.loyalty_tiers;
CREATE TRIGGER trigger_prevent_guest_changes
BEFORE INSERT OR UPDATE OR DELETE ON public.loyalty_tiers
FOR EACH ROW
EXECUTE FUNCTION prevent_guest_tier_changes();

-- 7. Update existing customers without a tier to use Guest
UPDATE public.customers
SET status_tier = 'Guest'
WHERE status_tier IS NULL OR status_tier NOT IN (SELECT name FROM public.loyalty_tiers);

-- 8. Update the default value for customers table
ALTER TABLE public.customers ALTER COLUMN status_tier SET DEFAULT 'Guest';

-- 9. Create settings for default tier configuration
INSERT INTO public.system_settings (key, value, category, description)
VALUES 
    ('loyalty.default_tier_name', '"Guest"'::jsonb, 'loyalty', 'Name of the default tier for new customers'),
    ('loyalty.default_tier_color', '"#9CA3AF"'::jsonb, 'loyalty', 'Color of the default tier')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, description = EXCLUDED.description;

COMMENT ON TABLE public.loyalty_tiers IS 'Customer loyalty tiers. Guest tier (min_spend=0) is system-managed and cannot be modified.';
