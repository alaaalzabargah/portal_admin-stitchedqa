-- Fix Infinite Recursion in Portal Users RLS
-- The "Owners can manage all users" policy creates infinite recursion
-- because it queries portal_users to check if the user is an owner

-- IMPORTANT: Must drop policy BEFORE function due to dependency

-- 1. DROP THE PROBLEMATIC POLICY FIRST
DROP POLICY IF EXISTS "Owners can manage all portal users" ON public.portal_users;

-- 2. NOW DROP THE FUNCTION (no dependencies remain)
DROP FUNCTION IF EXISTS public.is_owner();

-- 3. CREATE SAFE OWNER POLICY USING SECURITY DEFINER FUNCTION
-- This function runs with elevated privileges and doesn't trigger RLS recursion
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.portal_users
    WHERE id = auth.uid()
    AND role = 'owner'
    AND is_active = true
  );
$$;

-- 4. CREATE NEW OWNER POLICY USING THE FUNCTION
CREATE POLICY "Owners can manage all portal users"
  ON public.portal_users
  FOR ALL
  TO authenticated
  USING (public.is_owner())
  WITH CHECK (public.is_owner());

-- 5. GRANT EXECUTE ON FUNCTION
GRANT EXECUTE ON FUNCTION public.is_owner() TO authenticated;
