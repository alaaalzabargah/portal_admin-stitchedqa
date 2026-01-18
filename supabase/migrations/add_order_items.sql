-- Order Items table for COGS calculation
-- Run this in Supabase SQL Editor

create table if not exists public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references public.orders(id) on delete cascade not null,
  product_name text not null,
  quantity int not null default 1,
  unit_price_minor bigint not null default 0,
  unit_cost_minor bigint,  -- NULL if cost unknown
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.order_items enable row level security;

-- Policies
drop policy if exists "Viewers read order_items" on public.order_items;
create policy "Viewers read order_items" on public.order_items
  for select using ( true );

drop policy if exists "Managers manage order_items" on public.order_items;
create policy "Managers manage order_items" on public.order_items
  for all using ( (select role from public.portal_users where id = auth.uid()) in ('owner', 'manager') );

-- Indexes for performance
create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_orders_created_at on public.orders(created_at);
create index if not exists idx_orders_source on public.orders(source);
create index if not exists idx_expenses_incurred_at on public.expenses(incurred_at);
create index if not exists idx_expenses_category on public.expenses(category);
