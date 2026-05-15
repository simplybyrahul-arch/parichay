-- Restrict project timeline writes to creators/coordinators/admins.
-- Clients can still view timeline updates for their own projects.

drop policy if exists "Project participants add updates" on public.project_updates;

create policy "Project creators and coordinators add updates"
  on public.project_updates for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.projects
      where projects.id = project_updates.project_id
        and (
          projects.creator_id = auth.uid()
          or projects.selected_creator_id = auth.uid()
          or projects.parichay_coordinator_id = auth.uid()
          or public.is_admin()
        )
    )
  );
