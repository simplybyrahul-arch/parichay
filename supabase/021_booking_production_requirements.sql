-- Production booking requirements.
-- Additive only: keeps existing booking flow and records intact.

alter table public.projects
  add column if not exists event_type text,
  add column if not exists custom_event_type text,
  add column if not exists crew_requirements jsonb not null default '{}'::jsonb,
  add column if not exists equipment_requirements jsonb not null default '{}'::jsonb,
  add column if not exists post_production_requirements jsonb not null default '{}'::jsonb;

create index if not exists projects_event_type_idx
  on public.projects(event_type);

create index if not exists projects_crew_requirements_gin_idx
  on public.projects using gin (crew_requirements);

create index if not exists projects_equipment_requirements_gin_idx
  on public.projects using gin (equipment_requirements);

create index if not exists projects_post_production_requirements_gin_idx
  on public.projects using gin (post_production_requirements);
