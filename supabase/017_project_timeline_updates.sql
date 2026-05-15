-- Project timeline / milestone updates.
-- Safe additive migration only: no drops, no renames.

create table if not exists public.project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  message text,
  status text not null default 'update' check (
    status in ('update', 'milestone', 'in_progress', 'delivered', 'completed')
  ),
  created_at timestamp with time zone not null default now()
);

create index if not exists project_updates_project_id_idx on public.project_updates(project_id);
create index if not exists project_updates_user_id_idx on public.project_updates(user_id);
create index if not exists project_updates_created_at_idx on public.project_updates(created_at);

alter table public.project_updates enable row level security;

drop policy if exists "Admins manage project updates" on public.project_updates;
drop policy if exists "Project participants view updates" on public.project_updates;
drop policy if exists "Project participants add updates" on public.project_updates;

create policy "Admins manage project updates"
  on public.project_updates for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Project participants view updates"
  on public.project_updates for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = project_updates.project_id
        and (
          projects.client_id = auth.uid()
          or projects.creator_id = auth.uid()
          or projects.selected_creator_id = auth.uid()
          or projects.parichay_coordinator_id = auth.uid()
        )
    )
  );

create policy "Project participants add updates"
  on public.project_updates for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.projects
      where projects.id = project_updates.project_id
        and (
          projects.client_id = auth.uid()
          or projects.creator_id = auth.uid()
          or projects.selected_creator_id = auth.uid()
          or projects.parichay_coordinator_id = auth.uid()
        )
    )
  );
