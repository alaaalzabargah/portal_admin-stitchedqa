-- Add Measurement Fields to Customers Table
-- Supports both standard sizes and custom measurements

-- 1. ADD MEASUREMENT COLUMNS
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS measurement_type text DEFAULT 'standard' CHECK (measurement_type IN ('standard', 'custom')),
  ADD COLUMN IF NOT EXISTS standard_size text CHECK (standard_size IN ('xs', 's', 'm', 'l', 'xl', '2xl', '3xl')),
  ADD COLUMN IF NOT EXISTS height_cm numeric(5,2),
  
  -- Custom measurement fields (all in cm)
  ADD COLUMN IF NOT EXISTS shoulder_width_cm numeric(5,2),
  ADD COLUMN IF NOT EXISTS bust_cm numeric(5,2),
  ADD COLUMN IF NOT EXISTS waist_cm numeric(5,2),
  ADD COLUMN IF NOT EXISTS hips_cm numeric(5,2),
  ADD COLUMN IF NOT EXISTS sleeve_length_cm numeric(5,2),
  ADD COLUMN IF NOT EXISTS abaya_length_cm numeric(5,2),
  ADD COLUMN IF NOT EXISTS arm_hole_cm numeric(5,2);

-- 2. ADD COMMENTS FOR CLARITY
COMMENT ON COLUMN public.customers.measurement_type IS 'Type of measurement: standard (size chart) or custom (individual measurements)';
COMMENT ON COLUMN public.customers.standard_size IS 'Standard size when using size chart (XS-3XL)';
COMMENT ON COLUMN public.customers.height_cm IS 'Customer height in centimeters';
COMMENT ON COLUMN public.customers.shoulder_width_cm IS 'Shoulder width for custom measurements';
COMMENT ON COLUMN public.customers.bust_cm IS 'Bust measurement for custom measurements';
COMMENT ON COLUMN public.customers.waist_cm IS 'Waist measurement for custom measurements';
COMMENT ON COLUMN public.customers.hips_cm IS 'Hips measurement for custom measurements';
COMMENT ON COLUMN public.customers.sleeve_length_cm IS 'Sleeve length for custom measurements';
COMMENT ON COLUMN public.customers.abaya_length_cm IS 'Full Length for custom measurements';
COMMENT ON COLUMN public.customers.arm_hole_cm IS 'Arm hole measurement for custom measurements';

-- 3. CREATE INDEX FOR MEASUREMENT TYPE
CREATE INDEX IF NOT EXISTS idx_customers_measurement_type ON public.customers(measurement_type);
CREATE INDEX IF NOT EXISTS idx_customers_standard_size ON public.customers(standard_size) WHERE standard_size IS NOT NULL;