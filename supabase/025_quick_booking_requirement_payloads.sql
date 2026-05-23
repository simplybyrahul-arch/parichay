-- Store quick booking equipment and post-production selections for matching.

alter table public.quick_bookings
  add column if not exists equipment_requirements jsonb not null default '{}'::jsonb,
  add column if not exists post_production_requirements jsonb not null default '{}'::jsonb;
