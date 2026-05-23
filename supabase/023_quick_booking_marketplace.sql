-- OYO-style quick booking marketplace foundation.
-- Separate from the existing projects/RFQ flow.

alter table public.creators
  add column if not exists primary_service text,
  add column if not exists service_tags text[] not null default '{}',
  add column if not exists event_tags text[] not null default '{}',
  add column if not exists latitude numeric,
  add column if not exists longitude numeric,
  add column if not exists starting_price numeric,
  add column if not exists budget_tiers text[] not null default '{}',
  add column if not exists rating numeric not null default 4.5,
  add column if not exists completed_shoots integer not null default 0,
  add column if not exists response_time text,
  add column if not exists is_verified boolean,
  add column if not exists profile_completeness integer not null default 0;

update public.creators
set
  primary_service = coalesce(primary_service, role),
  starting_price = coalesce(starting_price, day_rate),
  is_verified = coalesce(is_verified, verified)
where true;

create table if not exists public.quick_bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.users(id) on delete cascade,
  creator_id uuid references public.creators(id) on delete set null,
  event_type text not null,
  custom_event_type text,
  shoot_date date not null,
  shoot_time time not null,
  duration_hours numeric not null default 4,
  location_address text not null,
  city text not null,
  state text,
  latitude numeric,
  longitude numeric,
  crew_requirements jsonb not null default '{}'::jsonb,
  budget_tier text not null check (budget_tier in ('budget', 'standard', 'premium')),
  custom_budget_amount numeric,
  estimated_total numeric not null default 0,
  status text not null default 'draft' check (
    status in (
      'draft',
      'pending_creator_acceptance',
      'creator_accepted',
      'creator_rejected',
      'more_details_requested',
      'cancelled',
      'expired'
    )
  ),
  responded_at timestamp with time zone,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.creator_availability (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  available_date date not null,
  is_available boolean not null default true,
  notes text,
  created_at timestamp with time zone not null default now(),
  unique (creator_id, available_date)
);

create table if not exists public.creator_notifications (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  booking_id uuid references public.quick_bookings(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamp with time zone not null default now()
);

alter table public.quick_bookings enable row level security;
alter table public.creator_availability enable row level security;
alter table public.creator_notifications enable row level security;

drop policy if exists "Clients view own quick bookings" on public.quick_bookings;
create policy "Clients view own quick bookings"
  on public.quick_bookings for select
  using (client_id = auth.uid() or creator_id = auth.uid() or public.is_admin());

drop policy if exists "Admins manage quick bookings" on public.quick_bookings;
create policy "Admins manage quick bookings"
  on public.quick_bookings for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Creators manage own availability" on public.creator_availability;
create policy "Creators manage own availability"
  on public.creator_availability for all
  using (creator_id = auth.uid() or public.is_admin())
  with check (creator_id = auth.uid() or public.is_admin());

drop policy if exists "Creators view own quick notifications" on public.creator_notifications;
create policy "Creators view own quick notifications"
  on public.creator_notifications for select
  using (creator_id = auth.uid() or public.is_admin());

drop policy if exists "Admins manage quick notifications" on public.creator_notifications;
create policy "Admins manage quick notifications"
  on public.creator_notifications for all
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists quick_bookings_client_id_idx on public.quick_bookings(client_id);
create index if not exists quick_bookings_creator_id_idx on public.quick_bookings(creator_id);
create index if not exists quick_bookings_status_idx on public.quick_bookings(status);
create index if not exists quick_bookings_city_idx on public.quick_bookings(city);
create index if not exists creator_availability_creator_date_idx on public.creator_availability(creator_id, available_date);
create index if not exists creator_notifications_creator_id_idx on public.creator_notifications(creator_id);
