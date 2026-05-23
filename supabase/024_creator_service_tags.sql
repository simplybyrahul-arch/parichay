-- Creator multi-service support.
-- The app uses public.creators as the creator profile table.

alter table public.creators
  add column if not exists primary_service text,
  add column if not exists service_tags text[] not null default '{}',
  add column if not exists event_tags text[] not null default '{}';

update public.creators
set
  primary_service = coalesce(primary_service, role),
  service_tags = case
    when (service_tags is null or cardinality(service_tags) = 0) and coalesce(primary_service, role) is not null
      then array[coalesce(primary_service, role)]
    else service_tags
  end
where true;

create index if not exists creators_service_tags_gin_idx
  on public.creators using gin (service_tags);

create index if not exists creators_event_tags_gin_idx
  on public.creators using gin (event_tags);
