-- 1. ENUMS & EXTENSIONS
create extension if not exists "uuid-ossp";

do $$ begin
    create type user_role as enum ('owner', 'manager', 'viewer');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type order_status as enum ('pending', 'paid', 'shipped', 'completed', 'cancelled', 'returned');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type order_source as enum ('shopify', 'whatsapp', 'website', 'walk_in');
exception
    when duplicate_object then null;
end $$;



-- 2. PORTAL USERS
create table if not exists public.portal_users (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  role user_role not null default 'viewer',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. CUSTOMERS
create table if not exists public.customers (
  id uuid primary key default uuid_generate_v4(),
  full_name text,
  phone text unique not null,
  email text,

  notes text,
  status_tier text default 'Normal',
  tags text[],
  total_spend_minor bigint default 0,
  order_count int default 0,
  marketing_opt_in boolean default false,
  external_id text unique,  -- Shopify customer ID
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);



-- 5. ORDERS
create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid references public.customers(id) on delete set null,
  external_id text,
  source order_source not null default 'walk_in',
  status order_status not null default 'pending',
  currency text not null default 'QAR',
  total_amount_minor bigint not null default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. EXPENSES
create table if not exists public.expenses (
  id uuid primary key default uuid_generate_v4(),
  category text not null,
  amount_minor bigint not null,
  currency text not null default 'QAR',
  description text,
  attachment_path text,
  incurred_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_by uuid references auth.users(id)
);



create table if not exists public.marketing_campaigns (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  template_name text,
  target_segment jsonb,
  status text default 'draft',
  scheduled_for timestamptz,
  created_at timestamptz default now()
);

-- 8. SECURITY
alter table public.portal_users enable row level security;
alter table public.customers enable row level security;

alter table public.orders enable row level security;
alter table public.expenses enable row level security;

alter table public.marketing_campaigns enable row level security;

create or replace function public.get_my_role()
returns user_role as $$
declare
  _role user_role;
begin
  select role into _role from public.portal_users where id = auth.uid();
  return _role;
end;
$$ language plpgsql security definer;

-- Drop existing policies to allow re-run
drop policy if exists "Users can view own record" on public.portal_users;
create policy "Users can view own record" on public.portal_users
  for select using ( auth.uid() = id );

drop policy if exists "Users can update own record" on public.portal_users;
create policy "Users can update own record" on public.portal_users
  for update using ( auth.uid() = id );

drop policy if exists "Viewers read customers" on public.customers;
create policy "Viewers read customers" on public.customers
  for select using ( true );
  
drop policy if exists "Managers manage customers" on public.customers;
create policy "Managers manage customers" on public.customers
  for all using ( (select role from public.portal_users where id = auth.uid()) in ('owner', 'manager') );



drop policy if exists "Viewers read orders" on public.orders;
create policy "Viewers read orders" on public.orders
  for select using ( true );

drop policy if exists "Managers manage orders" on public.orders;
create policy "Managers manage orders" on public.orders
  for all using ( (select role from public.portal_users where id = auth.uid()) in ('owner', 'manager') );

drop policy if exists "Managers manage expenses" on public.expenses;
create policy "Managers manage expenses" on public.expenses
  for all using ( (select role from public.portal_users where id = auth.uid()) in ('owner', 'manager') );

drop policy if exists "Managers manage marketing" on public.marketing_campaigns;
create policy "Managers manage marketing" on public.marketing_campaigns
  for all using ( (select role from public.portal_users where id = auth.uid()) in ('owner', 'manager') );

-- 9. TRIGGERS
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists update_customer_timestamp on customers;
create trigger update_customer_timestamp before update on customers for each row execute function update_updated_at_column();

drop trigger if exists update_order_timestamp on orders;
create trigger update_order_timestamp before update on orders for each row execute function update_updated_at_column();

drop trigger if exists update_user_timestamp on portal_users;
create trigger update_user_timestamp before update on portal_users for each row execute function update_updated_at_column();
