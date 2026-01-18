-- Add variant details to order_items
alter table public.order_items
add column if not exists variant_title text,
add column if not exists size text,
add column if not exists color text;
