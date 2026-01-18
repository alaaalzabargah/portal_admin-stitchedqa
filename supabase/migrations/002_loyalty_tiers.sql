-- 1. Ensure system_settings table exists (if not already created)
create table if not exists public.system_settings (
  id uuid primary key default uuid_generate_v4(),
  key text unique not null,
  value jsonb not null,
  category text,
  description text,
  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id)
);

-- RLS for system_settings (if created newly)
alter table public.system_settings enable row level security;

do $$ begin
  create policy "Everyone can read system settings" on public.system_settings
    for select using (true);
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create policy "Managers manage system settings" on public.system_settings
    for all using ( (select role from public.portal_users where id = auth.uid()) in ('owner', 'manager') );
exception
  when duplicate_object then null;
end $$;


-- 2. Create Loyalty Tiers Table
create table if not exists public.loyalty_tiers (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  min_spend_minor bigint not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. RLS for loyalty_tiers
alter table public.loyalty_tiers enable row level security;

create policy "Everyone can read loyalty tiers" on public.loyalty_tiers
  for select using (true);

create policy "Managers manage loyalty tiers" on public.loyalty_tiers
  for all using ( (select role from public.portal_users where id = auth.uid()) in ('owner', 'manager') );

-- 4. Seed Default Tiers
-- Bronze: 0 - 1,000 QAR
-- Silver: 1,000 - 5,000 QAR
-- Gold: 5,000 - 10,000 QAR
-- VIP: 10,000+ QAR
insert into public.loyalty_tiers (name, min_spend_minor)
values 
  ('Bronze', 0),
  ('Silver', 100000),
  ('Gold', 500000),
  ('VIP', 1000000)
on conflict (name) do update 
set min_spend_minor = excluded.min_spend_minor;

-- 5. Cleanup old system settings (optional, keeping clean)
delete from public.system_settings where key in ('loyalty.gold_threshold', 'loyalty.vip_threshold');
