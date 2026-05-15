-- Booking broadcast foundation.
-- This migration is additive and keeps existing booking/payment behavior intact.

create extension if not exists pgcrypto;

-- 1. Projects: add structured booking/broadcast fields without removing existing columns.
alter table public.projects
  add column if not exists booking_type text,
  add column if not exists booking_location text,
  add column if not exists event_date date,
  add column if not exists estimated_days integer default 1,
  add column if not exists requirement_summary text,
  add column if not exists selected_creator_id uuid references public.creators(id),
  add column if not exists selected_at timestamp with time zone,
  add column if not exists payment_status text default 'not_required',
  add column if not exists parichay_assigned boolean default false,
  add column if not exists parichay_coordinator_id uuid references public.users(id),
  add column if not exists expires_at timestamp with time zone,
  add column if not exists delivered_at timestamp with time zone;

do $$
declare
  status_constraint_name text;
begin
  select conname into status_constraint_name
  from pg_constraint
  where conrelid = 'public.projects'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%status%'
    and pg_get_constraintdef(oid) not ilike '%payment_status%'
  limit 1;

  if status_constraint_name is not null then
    execute format('alter table public.projects drop constraint %I', status_constraint_name);

    alter table public.projects add constraint projects_status_check check (
      status in (
        'draft',
        'pending',
        'funded',
        'in_progress',
        'completed',
        'cancelled',
        'open',
        'matching',
        'receiving_interest',
        'client_selecting',
        'pending_payment',
        'escrowed',
        'confirmed',
        'delivered',
        'expired',
        'disputed'
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.projects'::regclass
      and conname = 'projects_payment_status_check'
  ) then
    alter table public.projects add constraint projects_payment_status_check check (
      payment_status in (
        'not_required',
        'pending_payment',
        'escrowed',
        'released',
        'refunded',
        'disputed'
      )
    );
  end if;
end $$;

-- 2. Creators: add matching and notification preference support.
alter table public.creators
  add column if not exists city text,
  add column if not exists creator_type text,
  add column if not exists budget_flexibility boolean default false,
  add column if not exists whatsapp_opt_in boolean default true,
  add column if not exists available_for_booking boolean default true,
  add column if not exists capacity_per_day integer;

-- 3. Project invites / creator responses.
create table if not exists public.project_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  creator_id uuid not null references public.creators(id) on delete cascade,
  status text not null default 'sent' check (
    status in (
      'sent',
      'viewed',
      'interested',
      'declined',
      'shortlisted',
      'selected',
      'not_selected',
      'inactive'
    )
  ),
  match_reason text,
  match_score numeric,
  notification_status text not null default 'pending' check (
    notification_status in ('pending', 'created', 'failed')
  ),
  whatsapp_status text not null default 'not_sent' check (
    whatsapp_status in (
      'not_sent',
      'queued',
      'sent',
      'failed',
      'skipped_disabled',
      'reminder_sent'
    )
  ),
  whatsapp_sent_at timestamp with time zone,
  whatsapp_reminder_sent_at timestamp with time zone,
  secure_token text,
  secure_token_expires_at timestamp with time zone,
  viewed_at timestamp with time zone,
  responded_at timestamp with time zone,
  response_note text,
  availability_note text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (project_id, creator_id)
);

create index if not exists project_invites_project_id_idx on public.project_invites(project_id);
create index if not exists project_invites_creator_id_idx on public.project_invites(creator_id);
create index if not exists project_invites_status_idx on public.project_invites(status);
create index if not exists project_invites_created_at_idx on public.project_invites(created_at);
create index if not exists project_invites_secure_token_idx on public.project_invites(secure_token);

-- 4. Website notifications.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  creator_id uuid references public.creators(id) on delete set null,
  type text not null,
  title text not null,
  message text not null,
  data jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamp with time zone not null default now(),
  read_at timestamp with time zone
);

create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_project_id_idx on public.notifications(project_id);
create index if not exists notifications_read_idx on public.notifications(read);
create index if not exists notifications_created_at_idx on public.notifications(created_at);

-- 5. WhatsApp message delivery tracking. Sending is intentionally not implemented here.
create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  invite_id uuid references public.project_invites(id) on delete cascade,
  creator_id uuid references public.creators(id) on delete set null,
  user_id uuid references public.users(id) on delete set null,
  recipient_phone text,
  message_type text not null default 'booking_invite',
  provider text,
  provider_message_id text,
  status text not null default 'pending' check (
    status in (
      'pending',
      'queued',
      'sent',
      'delivered',
      'failed',
      'skipped_disabled'
    )
  ),
  error_message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  sent_at timestamp with time zone,
  delivered_at timestamp with time zone
);

create index if not exists whatsapp_messages_project_id_idx on public.whatsapp_messages(project_id);
create index if not exists whatsapp_messages_invite_id_idx on public.whatsapp_messages(invite_id);
create index if not exists whatsapp_messages_creator_id_idx on public.whatsapp_messages(creator_id);
create index if not exists whatsapp_messages_user_id_idx on public.whatsapp_messages(user_id);
create index if not exists whatsapp_messages_status_idx on public.whatsapp_messages(status);
create index if not exists whatsapp_messages_created_at_idx on public.whatsapp_messages(created_at);

-- 6. Project disputes.
create table if not exists public.project_disputes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  raised_by uuid not null references public.users(id),
  reason text not null,
  details text,
  status text not null default 'open' check (
    status in ('open', 'under_review', 'resolved', 'rejected')
  ),
  resolution text,
  resolution_type text check (
    resolution_type is null or resolution_type in ('full_release', 'partial_release', 'refund')
  ),
  created_at timestamp with time zone not null default now(),
  resolved_at timestamp with time zone
);

create index if not exists project_disputes_project_id_idx on public.project_disputes(project_id);
create index if not exists project_disputes_raised_by_idx on public.project_disputes(raised_by);
create index if not exists project_disputes_status_idx on public.project_disputes(status);
create index if not exists project_disputes_created_at_idx on public.project_disputes(created_at);

-- 7. updated_at helper and scoped update guards.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.enforce_project_invite_update_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  owns_project boolean;
begin
  if actor_id is null or public.is_admin() then
    return new;
  end if;

  select exists (
    select 1
    from public.projects
    where id = old.project_id
      and client_id = actor_id
  ) into owns_project;

  if actor_id = old.creator_id then
    if new.id is distinct from old.id
      or new.project_id is distinct from old.project_id
      or new.creator_id is distinct from old.creator_id
      or new.match_reason is distinct from old.match_reason
      or new.match_score is distinct from old.match_score
      or new.notification_status is distinct from old.notification_status
      or new.whatsapp_status is distinct from old.whatsapp_status
      or new.whatsapp_sent_at is distinct from old.whatsapp_sent_at
      or new.whatsapp_reminder_sent_at is distinct from old.whatsapp_reminder_sent_at
      or new.secure_token is distinct from old.secure_token
      or new.secure_token_expires_at is distinct from old.secure_token_expires_at
      or new.created_at is distinct from old.created_at
    then
      raise exception 'Creators can update only response fields on their own invites';
    end if;

    return new;
  end if;

  if owns_project then
    if new.id is distinct from old.id
      or new.project_id is distinct from old.project_id
      or new.creator_id is distinct from old.creator_id
      or new.match_reason is distinct from old.match_reason
      or new.match_score is distinct from old.match_score
      or new.notification_status is distinct from old.notification_status
      or new.whatsapp_status is distinct from old.whatsapp_status
      or new.whatsapp_sent_at is distinct from old.whatsapp_sent_at
      or new.whatsapp_reminder_sent_at is distinct from old.whatsapp_reminder_sent_at
      or new.secure_token is distinct from old.secure_token
      or new.secure_token_expires_at is distinct from old.secure_token_expires_at
      or new.viewed_at is distinct from old.viewed_at
      or new.responded_at is distinct from old.responded_at
      or new.response_note is distinct from old.response_note
      or new.availability_note is distinct from old.availability_note
      or new.created_at is distinct from old.created_at
    then
      raise exception 'Clients can update only invite selection status for their own projects';
    end if;

    return new;
  end if;

  raise exception 'Not allowed to update this invite';
end;
$$;

create or replace function public.enforce_notification_update_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if auth.uid() <> old.user_id then
    raise exception 'Not allowed to update this notification';
  end if;

  if new.id is distinct from old.id
    or new.user_id is distinct from old.user_id
    or new.project_id is distinct from old.project_id
    or new.creator_id is distinct from old.creator_id
    or new.type is distinct from old.type
    or new.title is distinct from old.title
    or new.message is distinct from old.message
    or new.data is distinct from old.data
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Users can update only read fields on their own notifications';
  end if;

  return new;
end;
$$;

drop trigger if exists project_invites_update_scope on public.project_invites;
create trigger project_invites_update_scope
  before update on public.project_invites
  for each row execute function public.enforce_project_invite_update_scope();

drop trigger if exists project_invites_set_updated_at on public.project_invites;
create trigger project_invites_set_updated_at
  before update on public.project_invites
  for each row execute function public.set_updated_at();

drop trigger if exists notifications_update_scope on public.notifications;
create trigger notifications_update_scope
  before update on public.notifications
  for each row execute function public.enforce_notification_update_scope();

-- 8. RLS policies.
alter table public.project_invites enable row level security;
alter table public.notifications enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.project_disputes enable row level security;

-- project_invites
drop policy if exists "Admins manage all project invites" on public.project_invites;
drop policy if exists "Creators view their project invites" on public.project_invites;
drop policy if exists "Creators update their project invite responses" on public.project_invites;
drop policy if exists "Clients view invites for their projects" on public.project_invites;
drop policy if exists "Clients update invite selection for their projects" on public.project_invites;

create policy "Admins manage all project invites"
  on public.project_invites for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Creators view their project invites"
  on public.project_invites for select
  using (auth.uid() = creator_id);

create policy "Creators update their project invite responses"
  on public.project_invites for update
  using (auth.uid() = creator_id)
  with check (auth.uid() = creator_id);

create policy "Clients view invites for their projects"
  on public.project_invites for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = project_invites.project_id
        and projects.client_id = auth.uid()
    )
  );

create policy "Clients update invite selection for their projects"
  on public.project_invites for update
  using (
    exists (
      select 1 from public.projects
      where projects.id = project_invites.project_id
        and projects.client_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects
      where projects.id = project_invites.project_id
        and projects.client_id = auth.uid()
    )
  );

-- notifications
drop policy if exists "Admins manage all notifications" on public.notifications;
drop policy if exists "Users view own notifications" on public.notifications;
drop policy if exists "Users update own notification read state" on public.notifications;

create policy "Admins manage all notifications"
  on public.notifications for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Users view own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users update own notification read state"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- whatsapp_messages: admin-only for now to avoid exposing phone/provider payloads.
drop policy if exists "Admins manage all WhatsApp messages" on public.whatsapp_messages;

create policy "Admins manage all WhatsApp messages"
  on public.whatsapp_messages for all
  using (public.is_admin())
  with check (public.is_admin());

-- project_disputes
drop policy if exists "Admins manage all project disputes" on public.project_disputes;
drop policy if exists "Clients create disputes for own projects" on public.project_disputes;
drop policy if exists "Clients view own project disputes" on public.project_disputes;
drop policy if exists "Selected creators view assigned project disputes" on public.project_disputes;

create policy "Admins manage all project disputes"
  on public.project_disputes for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Clients create disputes for own projects"
  on public.project_disputes for insert
  with check (
    raised_by = auth.uid()
    and exists (
      select 1 from public.projects
      where projects.id = project_disputes.project_id
        and projects.client_id = auth.uid()
    )
  );

create policy "Clients view own project disputes"
  on public.project_disputes for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = project_disputes.project_id
        and projects.client_id = auth.uid()
    )
  );

create policy "Selected creators view assigned project disputes"
  on public.project_disputes for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = project_disputes.project_id
        and (
          projects.creator_id = auth.uid()
          or projects.selected_creator_id = auth.uid()
        )
    )
  );
