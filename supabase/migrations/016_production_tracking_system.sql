-- Create production stage enum
do $$ begin
    create type production_stage as enum (
        'pending',
        'cutting',
        'sewing',
        'qc',
        'ready',
        'delivered'
    );
exception
    when duplicate_object then null;
end $$;

-- Create tailors table
create table if not exists public.tailors (
    id uuid primary key default uuid_generate_v4(),
    full_name text not null,
    phone text,
    specialty text,
    status text not null default 'active',
    commission_rate float default 0.0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Create production_assignments table
create table if not exists public.production_assignments (
    id uuid primary key default uuid_generate_v4(),
    order_item_id uuid not null references public.order_items(id) on delete cascade,
    tailor_id uuid references public.tailors(id) on delete set null,
    stage production_stage not null default 'pending',
    cost_price_minor int not null default 0,
    assigned_at timestamptz,
    target_due_at timestamptz,
    completed_at timestamptz,
    is_paid boolean default false,
    alert_50_sent boolean default false,
    alert_80_sent boolean default false,
    notes text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Create production_status_history table
create table if not exists public.production_status_history (
    id uuid primary key default uuid_generate_v4(),
    assignment_id uuid not null references public.production_assignments(id) on delete cascade,
    previous_stage production_stage,
    new_stage production_stage not null,
    changed_at timestamptz default now(),
    changed_by uuid references auth.users(id),
    notes text
);

-- Enable RLS
alter table public.tailors enable row level security;
alter table public.production_assignments enable row level security;
alter table public.production_status_history enable row level security;

-- Policies for tailors
drop policy if exists "Managers manage tailors" on public.tailors;
create policy "Managers manage tailors" on public.tailors
    for all using ( (select role from public.portal_users where id = auth.uid()) in ('owner', 'manager') );

-- Policies for production_assignments
drop policy if exists "Viewers read production" on public.production_assignments;
create policy "Viewers read production" on public.production_assignments
    for select using ( true );

drop policy if exists "Managers manage production" on public.production_assignments;
create policy "Managers manage production" on public.production_assignments
    for all using ( (select role from public.portal_users where id = auth.uid()) in ('owner', 'manager') );

-- Policies for production_status_history
drop policy if exists "Viewers read history" on public.production_status_history;
create policy "Viewers read history" on public.production_status_history
    for select using ( true );

drop policy if exists "Managers manage history" on public.production_status_history;
create policy "Managers manage history" on public.production_status_history
    for all using ( (select role from public.portal_users where id = auth.uid()) in ('owner', 'manager') );

-- Trigger for production_assignments updated_at
drop trigger if exists update_production_assignment_timestamp on production_assignments;
create trigger update_production_assignment_timestamp
    before update on production_assignments
    for each row execute function update_updated_at_column();

-- Trigger for tailors updated_at
drop trigger if exists update_tailor_timestamp on tailors;
create trigger update_tailor_timestamp
    before update on tailors
    for each row execute function update_updated_at_column();

-- Function to automatically log status changes
create or replace function log_production_status_change()
returns trigger as $$
begin
    if (TG_OP = 'UPDATE' and OLD.stage is distinct from NEW.stage) then
        insert into public.production_status_history (
            assignment_id,
            previous_stage,
            new_stage,
            changed_by,
            notes
        ) values (
            NEW.id,
            OLD.stage,
            NEW.stage,
            auth.uid(),
            NEW.notes
        );
    end if;
    return NEW;
end;
$$ language plpgsql security definer;

-- Trigger to auto-log status changes
drop trigger if exists auto_log_production_status on production_assignments;
create trigger auto_log_production_status
    after update on production_assignments
    for each row execute function log_production_status_change();

-- Indexes for performance
create index if not exists idx_production_assignments_stage on production_assignments(stage);
create index if not exists idx_production_assignments_tailor on production_assignments(tailor_id);
create index if not exists idx_production_assignments_order_item on production_assignments(order_item_id);
create index if not exists idx_production_assignments_target_due on production_assignments(target_due_at);
create index if not exists idx_production_status_history_assignment on production_status_history(assignment_id);
