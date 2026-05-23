-- Marketplace profile fields for AI-powered Quick Booking matching.

alter table public.creators
  add column if not exists specialization_tags text[] not null default '{}',
  add column if not exists style_tags text[] not null default '{}',
  add column if not exists travel_radius_km integer not null default 0,
  add column if not exists travel_locations text[] not null default '{}',
  add column if not exists budget_tiers text[] not null default '{}',
  add column if not exists instant_booking_enabled boolean not null default false,
  add column if not exists response_rate numeric not null default 0,
  add column if not exists completion_rate numeric not null default 0,
  add column if not exists repeat_clients integer not null default 0;

alter table public.portfolio_items
  add column if not exists event_tags text[] not null default '{}',
  add column if not exists featured boolean not null default false;

alter table public.creator_availability
  add column if not exists status text not null default 'available',
  add constraint creator_availability_status_check
    check (status in ('available', 'blocked', 'unavailable', 'vacation')) not valid;

create index if not exists creators_specialization_tags_gin_idx
  on public.creators using gin (specialization_tags);

create index if not exists creators_style_tags_gin_idx
  on public.creators using gin (style_tags);

create index if not exists creators_budget_tiers_gin_idx
  on public.creators using gin (budget_tiers);

create index if not exists portfolio_items_featured_idx
  on public.portfolio_items(creator_id, featured);
