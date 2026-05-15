-- Project-specific UPI QR payment support.
-- Additive local migration only: keeps Razorpay checkout fields and existing records intact.

alter table public.payments
  add column if not exists coordinator_id uuid references public.users(id) on delete set null,
  add column if not exists payment_method text,
  add column if not exists payment_reference text,
  add column if not exists payment_proof_url text,
  add column if not exists qr_payload text,
  add column if not exists verified_by uuid references public.users(id) on delete set null,
  add column if not exists verified_at timestamptz,
  add column if not exists verification_note text,
  add column if not exists updated_at timestamptz not null default now();

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
    status in (
      'created',
      'pending',
      'authorized',
      'captured',
      'paid',
      'refunded',
      'failed',
      'qr_pending',
      'proof_uploaded',
      'coordinator_verified',
      'admin_verified',
      'received',
      'rejected',
      'disputed',
      'released'
    )
  );
end $$;

do $$
declare
  method_constraint_name text;
begin
  select conname into method_constraint_name
  from pg_constraint
  where conrelid = 'public.payments'::regclass
    and contype = 'c'
    and conname = 'payments_payment_method_check';

  if method_constraint_name is null then
    alter table public.payments add constraint payments_payment_method_check check (
      payment_method is null or payment_method in (
        'razorpay_checkout',
        'qr_upi',
        'bank_transfer',
        'cash'
      )
    );
  end if;
end $$;

do $$
declare
  type_constraint_name text;
begin
  select conname into type_constraint_name
  from pg_constraint
  where conrelid = 'public.payments'::regclass
    and contype = 'c'
    and conname = 'payments_payment_type_check';

  if type_constraint_name is not null then
    execute format('alter table public.payments drop constraint %I', type_constraint_name);
  end if;

  alter table public.payments add constraint payments_payment_type_check check (
    payment_type in ('standard', 'advance', 'escrow_ready', 'qr_upi')
  );
end $$;

do $$
declare
  payment_status_constraint_name text;
begin
  select conname into payment_status_constraint_name
  from pg_constraint
  where conrelid = 'public.projects'::regclass
    and contype = 'c'
    and conname = 'projects_payment_status_check';

  if payment_status_constraint_name is not null then
    execute format('alter table public.projects drop constraint %I', payment_status_constraint_name);
  end if;

  alter table public.projects add constraint projects_payment_status_check check (
    payment_status in (
      'not_required',
      'pending_payment',
      'escrowed',
      'released',
      'refunded',
      'disputed',
      'qr_pending',
      'proof_uploaded',
      'coordinator_verified',
      'payment_received',
      'paid',
      'rejected'
    )
  );
end $$;

create or replace function public.set_payment_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_payment_updated_at();

create index if not exists payments_payment_method_idx on public.payments(payment_method);
create index if not exists payments_payment_reference_idx on public.payments(payment_reference);
create index if not exists payments_verified_by_idx on public.payments(verified_by);
create index if not exists payments_verified_at_idx on public.payments(verified_at);
create index if not exists payments_coordinator_id_idx on public.payments(coordinator_id);
