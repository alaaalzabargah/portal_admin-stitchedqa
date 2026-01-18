-- Fix infinite recursion in portal_users RLS policy
-- Run this in your Supabase SQL Editor

-- Drop the problematic policy
drop policy if exists "Owners manage users" on public.portal_users;

-- Create simpler policies that don't cause recursion
create policy "Users can view own record" on public.portal_users
  for select using ( auth.uid() = id );

create policy "Users can update own record" on public.portal_users
  for update using ( auth.uid() = id );
