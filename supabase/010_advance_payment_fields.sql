-- Advance payment fields for selected-creator bookings.
-- Safe local migration only: no drops, no renames.

alter table public.payments
  add column if not exists creator_id uuid references public.creators(id) on delete set null,
  add column if not exists payment_type text default 'standard',
  add column if not exists paid_at timestamptz;

do $$
declare
  status_constraint_name text;
begin
  select conname into status_constraint_name
  from pg_constraint
  where conrelid = 'public.payments'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%status%';

  if status_constraint_name is not null then
    execute format('alter table public.payments drop constraint %I', status_constraint_name);
  end if;

  alter table public.payments add constraint payments_status_check check (
    status in ('created', 'pending', 'authorized', 'captured', 'paid', 'refunded', 'failed')
  );
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.payments'::regclass
      and conname = 'payments_payment_type_check'
  ) then
    alter table public.payments add constraint payments_payment_type_check check (
      payment_type in ('standard', 'advance', 'escrow_ready')
    );
  end if;
end $$;

create index if not exists payments_creator_id_idx on public.payments(creator_id);
create index if not exists payments_payment_type_idx on public.payments(payment_type);
create index if not exists payments_paid_at_idx on public.payments(paid_at);
