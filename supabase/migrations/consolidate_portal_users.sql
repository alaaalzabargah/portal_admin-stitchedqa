-- Consolidate Portal Users Schema
-- Add display_name and ensure schema consistency

-- 1. ADD DISPLAY_NAME COLUMN
ALTER TABLE public.portal_users 
  ADD COLUMN IF NOT EXISTS display_name text;

-- 2. BACKFILL DISPLAY_NAME FROM FULL_NAME OR EMAIL
UPDATE public.portal_users
SET display_name = COALESCE(full_name, split_part(email, '@', 1))
WHERE display_name IS NULL;

-- 3. ADD COMMENT FOR CLARITY
COMMENT ON COLUMN public.portal_users.display_name IS 'User-friendly display name, editable by owner';

-- 4. CREATE INDEX FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_portal_users_display_name ON public.portal_users(display_name);

-- 5. ADD RLS POLICY FOR OWNER TO MANAGE ALL USERS
DROP POLICY IF EXISTS "Owners can manage all users" ON public.portal_users;

CREATE POLICY "Owners can manage all users"
  ON public.portal_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portal_users AS self
      WHERE self.id = auth.uid()
      AND self.role = 'owner'
      AND self.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.portal_users AS self
      WHERE self.id = auth.uid()
      AND self.role = 'owner'
      AND self.is_active = true
    )
  );
