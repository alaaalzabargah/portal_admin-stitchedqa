-- Settings System Migration
-- Creates tables for system settings, general settings, and enhances portal users

-- 1. SYSTEM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  category text NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- 2. GENERAL SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.general_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_name text NOT NULL,
  store_description text,
  contact_email text,
  phone text,
  address text,
  logo_url text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- 3. ENHANCE PORTAL USERS TABLE
ALTER TABLE public.portal_users 
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS last_login timestamptz,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 4. INSERT DEFAULT SYSTEM SETTINGS
INSERT INTO public.system_settings (key, value, category, description) VALUES
  ('currency.default', '{"code": "QAR", "symbol": "ر.ق", "name": "Qatari Riyal", "decimal_places": 2}', 'currency', 'Default currency for the system'),
  ('units.measurement', '{"system": "metric", "unit": "cm"}', 'units', 'Default measurement unit system'),
  ('loyalty.gold_threshold', '{"amount_minor": 50000}', 'loyalty', 'Spending threshold for Gold tier (in minor units)'),
  ('loyalty.vip_threshold', '{"amount_minor": 150000}', 'loyalty', 'Spending threshold for VIP tier (in minor units)')
ON CONFLICT (key) DO NOTHING;

-- 5. INSERT DEFAULT GENERAL SETTINGS
INSERT INTO public.general_settings (store_name, store_description, contact_email, phone, address) VALUES
  ('STITCHED', 'Premium luxury abayas tailored for elegance and sophistication.', 'contact@stitched.bh', '+973 XXXX XXXX', 'Manama, Bahrain')
ON CONFLICT (id) DO NOTHING;

-- 6. CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON public.system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(key);
CREATE INDEX IF NOT EXISTS idx_portal_users_is_active ON public.portal_users(is_active);

-- 7. ENABLE RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.general_settings ENABLE ROW LEVEL SECURITY;

-- 8. RLS POLICIES FOR SYSTEM SETTINGS
CREATE POLICY "Portal users can view system settings"
  ON public.system_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portal_users
      WHERE portal_users.id = auth.uid()
      AND portal_users.is_active = true
    )
  );

CREATE POLICY "Owners and managers can update system settings"
  ON public.system_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portal_users
      WHERE portal_users.id = auth.uid()
      AND portal_users.role IN ('owner', 'manager')
      AND portal_users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.portal_users
      WHERE portal_users.id = auth.uid()
      AND portal_users.role IN ('owner', 'manager')
      AND portal_users.is_active = true
    )
  );

-- 9. RLS POLICIES FOR GENERAL SETTINGS
CREATE POLICY "Portal users can view general settings"
  ON public.general_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portal_users
      WHERE portal_users.id = auth.uid()
      AND portal_users.is_active = true
    )
  );

CREATE POLICY "Owners and managers can update general settings"
  ON public.general_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portal_users
      WHERE portal_users.id = auth.uid()
      AND portal_users.role IN ('owner', 'manager')
      AND portal_users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.portal_users
      WHERE portal_users.id = auth.uid()
      AND portal_users.role IN ('owner', 'manager')
      AND portal_users.is_active = true
    )
  );

-- 10. UPDATE TRIGGER FOR TIMESTAMPS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON public.system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_general_settings_updated_at BEFORE UPDATE ON public.general_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portal_users_updated_at BEFORE UPDATE ON public.portal_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
