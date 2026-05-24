-- Equipment vendor provider architecture.
-- Additive migration; existing creator/client/admin data remains intact.

alter table public.users drop constraint if exists users_account_type_check;
alter table public.users
  add constraint users_account_type_check
  check (account_type in ('client', 'creator', 'equipment_vendor', 'admin'));

create table if not exists public.provider_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  provider_type text not null check (provider_type in ('creator', 'equipment_vendor')),
  provider_subtype text check (provider_subtype in ('freelancer', 'studio', 'rental_house', 'individual_vendor')),
  business_name text,
  contact_name text,
  city text,
  state text,
  profile_completion integer not null default 0,
  verified boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.equipment_vendor_profiles (
  provider_id uuid primary key references public.provider_profiles(id) on delete cascade,
  phone text,
  whatsapp_phone text,
  warehouse_address text,
  gst_number text,
  years_in_business integer,
  delivery_available boolean not null default false,
  delivery_radius_km integer not null default 0,
  operator_support_available boolean not null default false,
  equipment_categories text[] not null default '{}',
  response_time text,
  business_logo_url text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.equipment_inventory (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.provider_profiles(id) on delete cascade,
  category text not null,
  equipment_name text not null,
  brand text,
  model text,
  quantity integer not null default 1 check (quantity >= 0),
  condition text not null default 'good',
  operator_required boolean not null default false,
  delivery_available boolean not null default false,
  security_deposit numeric,
  images text[] not null default '{}',
  availability_status text not null default 'available' check (availability_status in ('available', 'limited', 'unavailable', 'maintenance')),
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.equipment_rental_responses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  provider_id uuid not null references public.provider_profiles(id) on delete cascade,
  status text not null default 'sent' check (status in ('sent', 'viewed', 'available', 'unavailable', 'quoted', 'declined', 'selected', 'inactive')),
  match_reason text,
  match_score integer,
  quote_amount numeric,
  notes text,
  available_from date,
  available_to date,
  responded_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (project_id, provider_id)
);

alter table public.provider_profiles enable row level security;
alter table public.equipment_vendor_profiles enable row level security;
alter table public.equipment_inventory enable row level security;
alter table public.equipment_rental_responses enable row level security;

drop policy if exists "Provider owners read own provider profiles" on public.provider_profiles;
create policy "Provider owners read own provider profiles"
  on public.provider_profiles for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Verified provider profiles are public" on public.provider_profiles;
create policy "Verified provider profiles are public"
  on public.provider_profiles for select
  using (verified = true);

drop policy if exists "Provider owners insert own provider profiles" on public.provider_profiles;
create policy "Provider owners insert own provider profiles"
  on public.provider_profiles for insert
  with check (user_id = auth.uid() and verified = false);

drop policy if exists "Provider owners update safe provider profile fields" on public.provider_profiles;
create policy "Provider owners update safe provider profile fields"
  on public.provider_profiles for update
  using (user_id = auth.uid() or public.is_admin())
  with check ((user_id = auth.uid() and verified = false) or public.is_admin());

drop policy if exists "Vendor owners read own vendor profiles" on public.equipment_vendor_profiles;
create policy "Vendor owners read own vendor profiles"
  on public.equipment_vendor_profiles for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.provider_profiles
      where provider_profiles.id = equipment_vendor_profiles.provider_id
        and provider_profiles.user_id = auth.uid()
    )
    or exists (
      select 1 from public.provider_profiles
      where provider_profiles.id = equipment_vendor_profiles.provider_id
        and provider_profiles.verified = true
    )
  );

drop policy if exists "Vendor owners manage own vendor profiles" on public.equipment_vendor_profiles;
create policy "Vendor owners manage own vendor profiles"
  on public.equipment_vendor_profiles for all
  using (
    public.is_admin()
    or exists (
      select 1 from public.provider_profiles
      where provider_profiles.id = equipment_vendor_profiles.provider_id
        and provider_profiles.user_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.provider_profiles
      where provider_profiles.id = equipment_vendor_profiles.provider_id
        and provider_profiles.user_id = auth.uid()
    )
  );

drop policy if exists "Public read active verified inventory" on public.equipment_inventory;
create policy "Public read active verified inventory"
  on public.equipment_inventory for select
  using (
    is_active = true
    and exists (
      select 1 from public.provider_profiles
      where provider_profiles.id = equipment_inventory.provider_id
        and provider_profiles.verified = true
    )
  );

drop policy if exists "Vendor owners manage own inventory" on public.equipment_inventory;
create policy "Vendor owners manage own inventory"
  on public.equipment_inventory for all
  using (
    public.is_admin()
    or exists (
      select 1 from public.provider_profiles
      where provider_profiles.id = equipment_inventory.provider_id
        and provider_profiles.user_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.provider_profiles
      where provider_profiles.id = equipment_inventory.provider_id
        and provider_profiles.user_id = auth.uid()
    )
  );

drop policy if exists "Clients view own rental responses" on public.equipment_rental_responses;
create policy "Clients view own rental responses"
  on public.equipment_rental_responses for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.projects
      where projects.id = equipment_rental_responses.project_id
        and projects.client_id = auth.uid()
    )
    or exists (
      select 1 from public.provider_profiles
      where provider_profiles.id = equipment_rental_responses.provider_id
        and provider_profiles.user_id = auth.uid()
    )
  );

drop policy if exists "Vendors update own rental responses" on public.equipment_rental_responses;
create policy "Vendors update own rental responses"
  on public.equipment_rental_responses for update
  using (
    public.is_admin()
    or exists (
      select 1 from public.provider_profiles
      where provider_profiles.id = equipment_rental_responses.provider_id
        and provider_profiles.user_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.provider_profiles
      where provider_profiles.id = equipment_rental_responses.provider_id
        and provider_profiles.user_id = auth.uid()
    )
  );

drop policy if exists "Admins manage rental responses" on public.equipment_rental_responses;
create policy "Admins manage rental responses"
  on public.equipment_rental_responses for all
  using (public.is_admin())
  with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('equipment-inventory', 'equipment-inventory', true)
on conflict (id) do nothing;

drop policy if exists "Vendor owners upload inventory images" on storage.objects;
create policy "Vendor owners upload inventory images"
  on storage.objects for insert
  with check (
    bucket_id = 'equipment-inventory'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Vendor owners update inventory images" on storage.objects;
create policy "Vendor owners update inventory images"
  on storage.objects for update
  using (
    bucket_id = 'equipment-inventory'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Vendor owners delete inventory images" on storage.objects;
create policy "Vendor owners delete inventory images"
  on storage.objects for delete
  using (
    bucket_id = 'equipment-inventory'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Public read inventory images" on storage.objects;
create policy "Public read inventory images"
  on storage.objects for select
  using (bucket_id = 'equipment-inventory');

create index if not exists provider_profiles_user_id_idx on public.provider_profiles(user_id);
create index if not exists provider_profiles_type_verified_idx on public.provider_profiles(provider_type, verified);
create index if not exists provider_profiles_city_idx on public.provider_profiles(city);
create index if not exists equipment_vendor_categories_idx on public.equipment_vendor_profiles using gin(equipment_categories);
create index if not exists equipment_inventory_provider_id_idx on public.equipment_inventory(provider_id);
create index if not exists equipment_inventory_category_idx on public.equipment_inventory(category);
create index if not exists equipment_inventory_name_idx on public.equipment_inventory using gin(to_tsvector('simple', equipment_name));
create index if not exists equipment_rental_responses_project_id_idx on public.equipment_rental_responses(project_id);
create index if not exists equipment_rental_responses_provider_id_idx on public.equipment_rental_responses(provider_id);
create index if not exists equipment_rental_responses_status_idx on public.equipment_rental_responses(status);
