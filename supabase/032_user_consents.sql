-- User consent tracking for ShotcutCrew legal policies.

create table if not exists public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null,
  accepted_terms boolean not null default false,
  accepted_privacy boolean not null default false,
  accepted_refund_policy boolean not null default false,
  accepted_creator_agreement boolean not null default false,
  accepted_equipment_terms boolean not null default false,
  accepted_ai_disclaimer boolean not null default false,
  terms_version text not null default 'v2.0',
  accepted_at timestamptz not null default now()
);

alter table public.user_consents enable row level security;

drop policy if exists "Users read own consent records" on public.user_consents;
create policy "Users read own consent records"
  on public.user_consents for select
  using (user_id = auth.uid());

drop policy if exists "Admins manage consent records" on public.user_consents;
create policy "Admins manage consent records"
  on public.user_consents for all
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists user_consents_user_id_idx on public.user_consents(user_id);
create index if not exists user_consents_role_idx on public.user_consents(role);
create index if not exists user_consents_terms_version_idx on public.user_consents(terms_version);
