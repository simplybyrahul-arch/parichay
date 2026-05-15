-- Creator matching profile fields.
-- Safe additive migration only: no drops, no renames.

alter table public.creators
  add column if not exists phone text,
  add column if not exists state text,
  add column if not exists travel_enabled boolean default false,
  add column if not exists service_cities text[] default '{}'::text[],
  add column if not exists service_radius_km integer default 0;

create index if not exists creators_phone_idx on public.creators(phone);
create index if not exists creators_state_idx on public.creators(state);
create index if not exists creators_service_cities_idx on public.creators using gin(service_cities);
create index if not exists creators_travel_enabled_idx on public.creators(travel_enabled);
