create table public.audit_logs (
  id uuid default uuid_generate_v4() primary key,
  admin_id uuid references auth.users not null,
  action text not null,
  target_id text,
  metadata jsonb default '{}'::jsonb,
  ip_address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Protect the audit logs (append only, viewable only by admins)
alter table public.audit_logs enable row level security;

create policy "Admins can view audit logs" 
  on public.audit_logs for select 
  using ( public.is_admin() );

-- For insertion, since we log from server actions running as service role or admin context,
-- let's allow admins to insert
create policy "Admins can insert audit logs" 
  on public.audit_logs for insert 
  with check ( public.is_admin() );
