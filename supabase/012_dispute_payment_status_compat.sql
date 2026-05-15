-- Internal dispute/release/refund payment status compatibility.
-- Safe local migration only: no drops, no data changes.

do $$
declare
  status_constraint_name text;
begin
  select conname into status_constraint_name
  from pg_constraint
  where conrelid = 'public.payments'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%status%'
  limit 1;

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
      'disputed',
      'released',
      'refunded',
      'failed'
    )
  );
end $$;
