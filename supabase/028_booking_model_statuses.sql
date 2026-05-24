-- Adds purpose-specific project lifecycle statuses for non-quick booking models.
-- Safe for existing data: no rows are renamed or deleted.

do $$
declare
  status_constraint_name text;
begin
  select conname into status_constraint_name
  from pg_constraint
  where conrelid = 'public.projects'::regclass
    and contype = 'c'
    and conname = 'projects_status_check';

  if status_constraint_name is not null then
    execute format('alter table public.projects drop constraint %I', status_constraint_name);
  end if;

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
      'disputed',
      'submitted',
      'pending_review',
      'open_for_quotes',
      'quotes_received',
      'awarded',
      'checking_availability',
      'provider_selected'
    )
  );
end $$;
