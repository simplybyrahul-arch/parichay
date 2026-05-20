-- Equipment catalog and script analysis foundation.
-- Additive only; booking flow continues to write through projects.

create table if not exists public.equipment_catalog (
  id text primary key,
  name text not null,
  category text not null,
  subcategory text,
  description text,
  price_per_day numeric not null default 0,
  image_url text,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.equipment_packages (
  id text primary key,
  name text not null,
  description text,
  estimated_price numeric not null default 0,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.equipment_package_items (
  package_id text not null references public.equipment_packages(id) on delete cascade,
  equipment_id text not null references public.equipment_catalog(id) on delete cascade,
  quantity integer not null default 1,
  primary key (package_id, equipment_id)
);

create table if not exists public.booking_equipment (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.projects(id) on delete cascade,
  equipment_id text not null references public.equipment_catalog(id),
  quantity integer not null default 1,
  total_price numeric not null default 0,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.script_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  booking_id uuid references public.projects(id) on delete set null,
  input_text text not null,
  analysis_json jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

alter table public.equipment_catalog enable row level security;
alter table public.equipment_packages enable row level security;
alter table public.equipment_package_items enable row level security;
alter table public.booking_equipment enable row level security;
alter table public.script_analyses enable row level security;

drop policy if exists "Public read active equipment catalog" on public.equipment_catalog;
create policy "Public read active equipment catalog"
  on public.equipment_catalog for select
  using (is_active = true);

drop policy if exists "Admins manage equipment catalog" on public.equipment_catalog;
create policy "Admins manage equipment catalog"
  on public.equipment_catalog for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Public read active equipment packages" on public.equipment_packages;
create policy "Public read active equipment packages"
  on public.equipment_packages for select
  using (is_active = true);

drop policy if exists "Admins manage equipment packages" on public.equipment_packages;
create policy "Admins manage equipment packages"
  on public.equipment_packages for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Public read equipment package items" on public.equipment_package_items;
create policy "Public read equipment package items"
  on public.equipment_package_items for select
  using (true);

drop policy if exists "Admins manage equipment package items" on public.equipment_package_items;
create policy "Admins manage equipment package items"
  on public.equipment_package_items for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Project clients read booking equipment" on public.booking_equipment;
create policy "Project clients read booking equipment"
  on public.booking_equipment for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = booking_equipment.booking_id
        and (
          projects.client_id = auth.uid()
          or projects.selected_creator_id = auth.uid()
          or projects.creator_id = auth.uid()
          or public.is_admin()
        )
    )
  );

drop policy if exists "Admins manage booking equipment" on public.booking_equipment;
create policy "Admins manage booking equipment"
  on public.booking_equipment for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Users read own script analyses" on public.script_analyses;
create policy "Users read own script analyses"
  on public.script_analyses for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Admins manage script analyses" on public.script_analyses;
create policy "Admins manage script analyses"
  on public.script_analyses for all
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists equipment_catalog_category_idx on public.equipment_catalog(category);
create index if not exists booking_equipment_booking_id_idx on public.booking_equipment(booking_id);
create index if not exists script_analyses_user_id_idx on public.script_analyses(user_id);
create index if not exists script_analyses_created_at_idx on public.script_analyses(created_at);
