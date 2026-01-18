-- Add color column to loyalty_tiers table if it doesn't exist
do $$ 
begin
    if not exists (select 1 from information_schema.columns where table_name = 'loyalty_tiers' and column_name = 'color') then
        alter table public.loyalty_tiers add column color text not null default '#000000';
    end if;
end $$;

-- Update specific default tiers with their signature colors
update public.loyalty_tiers set color = '#CD7F32' where name = 'Bronze';
update public.loyalty_tiers set color = '#C0C0C0' where name = 'Silver';
update public.loyalty_tiers set color = '#FFD700' where name = 'Gold';
update public.loyalty_tiers set color = '#7F00FF' where name = 'VIP';
