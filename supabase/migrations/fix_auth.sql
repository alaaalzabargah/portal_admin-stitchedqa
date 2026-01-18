-- Run this in Supabase SQL Editor to clean up potential conflicting triggers

-- 1. Drop common triggers on auth.users (if they exist)
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_inserted on auth.users;

-- 2. Drop common functions that might be called by unexpected triggers
drop function if exists public.handle_new_user();
drop function if exists public.handle_auth_user_created();

-- 3. Ensure extensions are available
create extension if not exists "uuid-ossp";

-- 4. Verify auth schema usage (optional, just ensuring permissions)
grant usage on schema public to postgres, anon, authenticated, service_role;
