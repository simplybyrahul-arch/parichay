-- Equipment vendor operational tools.
-- Adds persisted availability, operator/team, and maintenance records for vendor dashboard tabs.

create table if not exists public.equipment_vendor_availability (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.provider_profiles(id) on delete cascade,
  available_date date not null,
  status text not null default 'available' check (status in ('available', 'limited', 'blocked')),
  notes text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (provider_id, available_date)
);

create table if not exists public.equipment_vendor_operators (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.provider_profiles(id) on delete cascade,
  name text not null,
  role text not null,
  phone text,
  skills text[] not null default '{}',
  available_for_bookings boolean not null default true,
  notes text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.equipment_maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.provider_profiles(id) on delete cascade,
  inventory_id uuid references public.equipment_inventory(id) on delete cascade,
  title text not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed')),
  maintenance_date date,
  notes text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.equipment_vendor_availability enable row level security;
alter table public.equipment_vendor_operators enable row level security;
alter table public.equipment_maintenance_logs enable row level security;

drop policy if exists "Vendor owners manage own availability" on public.equipment_vendor_availability;
create policy "Vendor owners manage own availability"
  on public.equipment_vendor_availability for all
  using (
    public.is_admin()
    or exists (
      select 1 from public.provider_profiles
      where provider_profiles.id = equipment_vendor_availability.provider_id
        and provider_profiles.user_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.provider_profiles
      where provider_profiles.id = equipment_vendor_availability.provider_id
        and provider_profiles.user_id = auth.uid()
    )
  );

drop policy if exists "Vendor owners manage own operators" on public.equipment_vendor_operators;
create policy "Vendor owners manage own operators"
  on public.equipment_vendor_operators for all
  using (
    public.is_admin()
    or exists (
      select 1 from public.provider_profiles
      where provider_profiles.id = equipment_vendor_operators.provider_id
        and provider_profiles.user_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.provider_profiles
      where provider_profiles.id = equipment_vendor_operators.provider_id
        and provider_profiles.user_id = auth.uid()
    )
  );

drop policy if exists "Vendor owners manage own maintenance logs" on public.equipment_maintenance_logs;
create policy "Vendor owners manage own maintenance logs"
  on public.equipment_maintenance_logs for all
  using (
    public.is_admin()
    or exists (
      select 1 from public.provider_profiles
      where provider_profiles.id = equipment_maintenance_logs.provider_id
        and provider_profiles.user_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.provider_profiles
      where provider_profiles.id = equipment_maintenance_logs.provider_id
        and provider_profiles.user_id = auth.uid()
    )
  );

create index if not exists equipment_vendor_availability_provider_date_idx
  on public.equipment_vendor_availability(provider_id, available_date);

create index if not exists equipment_vendor_operators_provider_id_idx
  on public.equipment_vendor_operators(provider_id);

create index if not exists equipment_maintenance_logs_provider_id_idx
  on public.equipment_maintenance_logs(provider_id);

create index if not exists equipment_maintenance_logs_inventory_id_idx
  on public.equipment_maintenance_logs(inventory_id);
