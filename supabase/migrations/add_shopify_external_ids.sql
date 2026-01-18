-- Add external_id columns for Shopify integration
-- Run this in Supabase SQL Editor

alter table public.customers 
add column if not exists external_id text unique;

alter table public.orders 
add column if not exists external_id text unique;

-- Create indexes for faster lookups
create index if not exists idx_customers_external_id on public.customers(external_id);
create index if not exists idx_orders_external_id on public.orders(external_id);
