-- Shopify Webhook Tables Migration
-- Run this in Supabase SQL Editor

-- 1. WEBHOOK EVENTS TABLE (Idempotency)
create table if not exists public.webhook_events (
    id uuid primary key default uuid_generate_v4(),
    topic text not null,
    payload_hash text not null unique,  -- SHA256 of raw payload for idempotency
    resource_id text,                   -- Shopify resource ID (order_id, checkout_id, etc.)
    status text not null default 'received', -- received, processed, failed
    error_message text,
    raw_payload jsonb,                  -- Store full payload for debugging
    received_at timestamptz default now(),
    processed_at timestamptz,
    created_at timestamptz default now()
);

create index if not exists idx_webhook_events_payload_hash on public.webhook_events(payload_hash);
create index if not exists idx_webhook_events_topic on public.webhook_events(topic);
create index if not exists idx_webhook_events_resource_id on public.webhook_events(resource_id);
create index if not exists idx_webhook_events_status on public.webhook_events(status);

-- 2. SHOPIFY CHECKOUTS TABLE
create table if not exists public.shopify_checkouts (
    id uuid primary key default uuid_generate_v4(),
    shopify_checkout_id text unique not null,
    shopify_checkout_token text,
    customer_id uuid references public.customers(id) on delete set null,
    
    -- Customer info (denormalized for quick access)
    email text,
    full_name text,
    phone text,
    
    -- Address
    shipping_address jsonb,
    
    -- Money fields (stored as minor units - cents/fils)
    subtotal_minor bigint default 0,
    total_tax_minor bigint default 0,
    total_shipping_minor bigint default 0,
    total_price_minor bigint default 0,
    currency text default 'QAR',
    
    -- Status
    abandoned_checkout_url text,
    completed_at timestamptz,
    
    -- Raw data
    raw_payload jsonb,
    
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_shopify_checkouts_shopify_id on public.shopify_checkouts(shopify_checkout_id);
create index if not exists idx_shopify_checkouts_customer_id on public.shopify_checkouts(customer_id);
create index if not exists idx_shopify_checkouts_email on public.shopify_checkouts(email);

-- 3. SHOPIFY CHECKOUT ITEMS TABLE
create table if not exists public.shopify_checkout_items (
    id uuid primary key default uuid_generate_v4(),
    checkout_id uuid references public.shopify_checkouts(id) on delete cascade not null,
    shopify_line_item_id text,
    
    -- Product info
    title text not null,
    variant_title text,
    sku text,
    
    -- Parsed variant attributes
    size text,
    color text,
    
    -- Quantities and pricing (minor units)
    quantity int not null default 1,
    unit_price_minor bigint default 0,
    line_total_minor bigint default 0,
    
    -- Custom measurements from line item properties
    measurements jsonb,
    
    -- Raw properties
    properties jsonb,
    
    created_at timestamptz default now()
);

create index if not exists idx_shopify_checkout_items_checkout_id on public.shopify_checkout_items(checkout_id);

-- 4. SHOPIFY REFUNDS TABLE
create table if not exists public.shopify_refunds (
    id uuid primary key default uuid_generate_v4(),
    shopify_refund_id text unique not null,
    shopify_order_id text not null,
    order_id uuid references public.orders(id) on delete set null,
    
    -- Refund details
    reason text,
    note text,
    
    -- Money (minor units)
    refund_amount_minor bigint default 0,
    currency text default 'QAR',
    
    -- Refund line items
    refund_line_items jsonb,
    
    -- Raw data
    raw_payload jsonb,
    
    refunded_at timestamptz,
    created_at timestamptz default now()
);

create index if not exists idx_shopify_refunds_shopify_refund_id on public.shopify_refunds(shopify_refund_id);
create index if not exists idx_shopify_refunds_shopify_order_id on public.shopify_refunds(shopify_order_id);
create index if not exists idx_shopify_refunds_order_id on public.shopify_refunds(order_id);

-- 5. SHOPIFY ORDER EVENTS TABLE (Timeline)
create table if not exists public.shopify_order_events (
    id uuid primary key default uuid_generate_v4(),
    shopify_order_id text not null,
    order_id uuid references public.orders(id) on delete cascade,
    
    event_type text not null,  -- checkout_created, order_created, order_paid, order_cancelled, refund_created
    topic text not null,       -- Original webhook topic
    payload_hash text,         -- Link to webhook_events
    
    -- Event metadata
    metadata jsonb,
    
    occurred_at timestamptz default now(),
    created_at timestamptz default now()
);

create index if not exists idx_shopify_order_events_shopify_order_id on public.shopify_order_events(shopify_order_id);
create index if not exists idx_shopify_order_events_order_id on public.shopify_order_events(order_id);
create index if not exists idx_shopify_order_events_event_type on public.shopify_order_events(event_type);

-- 6. CREATE ORDER_ITEMS TABLE IF NOT EXISTS (needed before altering)
create table if not exists public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references public.orders(id) on delete cascade not null,
  product_name text not null,
  quantity int not null default 1,
  unit_price_minor bigint not null default 0,
  unit_cost_minor bigint,
  created_at timestamptz default now()
);

-- Enable RLS on order_items if just created
alter table public.order_items enable row level security;

drop policy if exists "Viewers read order_items" on public.order_items;
create policy "Viewers read order_items" on public.order_items
  for select using ( true );

drop policy if exists "Managers manage order_items" on public.order_items;
create policy "Managers manage order_items" on public.order_items
  for all using ( (select role from public.portal_users where id = auth.uid()) in ('owner', 'manager') );

create index if not exists idx_order_items_order_id on public.order_items(order_id);

-- 6b. EXTEND ORDER_ITEMS TABLE with Shopify fields
alter table public.order_items
add column if not exists variant_title text,
add column if not exists size text,
add column if not exists color text,
add column if not exists measurements jsonb,
add column if not exists shopify_line_item_id text,
add column if not exists sku text;

-- 7. EXTEND ORDERS TABLE with additional Shopify fields
alter table public.orders
add column if not exists shopify_order_id text unique,
add column if not exists shopify_order_number text,
add column if not exists subtotal_minor bigint default 0,
add column if not exists total_tax_minor bigint default 0,
add column if not exists total_shipping_minor bigint default 0,
add column if not exists paid_amount_minor bigint default 0,
add column if not exists financial_status text,
add column if not exists fulfillment_status text,
add column if not exists shipping_address jsonb,
add column if not exists raw_payload jsonb;

create index if not exists idx_orders_shopify_order_id on public.orders(shopify_order_id);
create index if not exists idx_orders_financial_status on public.orders(financial_status);

-- 8. RLS POLICIES

-- webhook_events (service role only, no RLS needed for server writes)
alter table public.webhook_events enable row level security;
drop policy if exists "Service role full access to webhook_events" on public.webhook_events;
create policy "Service role full access to webhook_events" on public.webhook_events
    for all using (true);

-- shopify_checkouts
alter table public.shopify_checkouts enable row level security;
drop policy if exists "Viewers read shopify_checkouts" on public.shopify_checkouts;
create policy "Viewers read shopify_checkouts" on public.shopify_checkouts
    for select using (true);
drop policy if exists "Managers manage shopify_checkouts" on public.shopify_checkouts;
create policy "Managers manage shopify_checkouts" on public.shopify_checkouts
    for all using ((select role from public.portal_users where id = auth.uid()) in ('owner', 'manager'));

-- shopify_checkout_items
alter table public.shopify_checkout_items enable row level security;
drop policy if exists "Viewers read shopify_checkout_items" on public.shopify_checkout_items;
create policy "Viewers read shopify_checkout_items" on public.shopify_checkout_items
    for select using (true);
drop policy if exists "Managers manage shopify_checkout_items" on public.shopify_checkout_items;
create policy "Managers manage shopify_checkout_items" on public.shopify_checkout_items
    for all using ((select role from public.portal_users where id = auth.uid()) in ('owner', 'manager'));

-- shopify_refunds
alter table public.shopify_refunds enable row level security;
drop policy if exists "Viewers read shopify_refunds" on public.shopify_refunds;
create policy "Viewers read shopify_refunds" on public.shopify_refunds
    for select using (true);
drop policy if exists "Managers manage shopify_refunds" on public.shopify_refunds;
create policy "Managers manage shopify_refunds" on public.shopify_refunds
    for all using ((select role from public.portal_users where id = auth.uid()) in ('owner', 'manager'));

-- shopify_order_events
alter table public.shopify_order_events enable row level security;
drop policy if exists "Viewers read shopify_order_events" on public.shopify_order_events;
create policy "Viewers read shopify_order_events" on public.shopify_order_events
    for select using (true);
drop policy if exists "Managers manage shopify_order_events" on public.shopify_order_events;
create policy "Managers manage shopify_order_events" on public.shopify_order_events
    for all using ((select role from public.portal_users where id = auth.uid()) in ('owner', 'manager'));

-- 9. TRIGGERS for updated_at
drop trigger if exists update_shopify_checkout_timestamp on shopify_checkouts;
create trigger update_shopify_checkout_timestamp 
    before update on shopify_checkouts 
    for each row execute function update_updated_at_column();
