-- Creator tags for Quick Booking matching from shared bookingOptions config.
-- The app uses public.creators as the creator profile table.

alter table public.creators
  add column if not exists primary_service text,
  add column if not exists service_tags text[] not null default '{}',
  add column if not exists event_tags text[] not null default '{}',
  add column if not exists equipment_tags text[] not null default '{}',
  add column if not exists post_production_tags text[] not null default '{}';

update public.creators
set service_tags = array[primary_service]
where primary_service is not null
  and (service_tags is null or cardinality(service_tags) = 0);

create index if not exists creators_equipment_tags_gin_idx
  on public.creators using gin (equipment_tags);

create index if not exists creators_post_production_tags_gin_idx
  on public.creators using gin (post_production_tags);
