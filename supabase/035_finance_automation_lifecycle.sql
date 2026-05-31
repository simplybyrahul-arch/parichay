-- =========================================
-- Finance automation lifecycle compatibility
-- Adds launch-facing finance aliases/status while preserving existing finance columns.
-- =========================================

begin;

alter table public.booking_financials
  add column if not exists customer_id uuid references public.users(id) on delete set null,
  add column if not exists gross_amount numeric not null default 0,
  add column if not exists platform_commission numeric not null default 0,
  add column if not exists provider_amount numeric not null default 0,
  add column if not exists escrow_amount numeric not null default 0,
  add column if not exists status text not null default 'pending',
  add column if not exists refund_amount numeric not null default 0,
  add column if not exists refunded_at timestamptz;

update public.booking_financials
set
  customer_id = coalesce(customer_id, client_id),
  gross_amount = coalesce(nullif(gross_amount, 0), gross_booking_amount, 0),
  platform_commission = coalesce(nullif(platform_commission, 0), platform_commission_amount, 0),
  provider_amount = coalesce(nullif(provider_amount, 0), provider_payout_amount, 0),
  escrow_amount = case
    when escrow_status = 'escrow_held' then coalesce(gross_booking_amount, 0)
    else coalesce(escrow_amount, 0)
  end,
  status = case
    when payout_status = 'completed' then 'payout_released'
    when payout_status = 'ready' then 'payout_ready'
    when escrow_status = 'refunded' then 'refunded'
    when escrow_status = 'escrow_held' then 'payment_received'
    when provider_id is not null then 'quote_selected'
    else coalesce(nullif(status, ''), 'pending')
  end;

create unique index if not exists booking_financials_pending_unique_idx
  on public.booking_financials (booking_id, booking_type)
  where provider_id is null;

create index if not exists booking_financials_customer_id_idx on public.booking_financials(customer_id);
create index if not exists booking_financials_status_idx on public.booking_financials(status);

create or replace function public.mark_booking_financial_payout_ready(p_booking_financial_id uuid)
returns public.booking_financials
language plpgsql
security definer
set search_path = public
as $$
declare
  financial public.booking_financials;
begin
  if not (public.is_admin() or current_setting('request.jwt.claim.role', true) = 'service_role') then
    raise exception 'admin access required';
  end if;

  select * into financial
  from public.booking_financials
  where id = p_booking_financial_id
  for update;

  if not found then
    raise exception 'booking financial not found';
  end if;

  if financial.provider_id is null then
    raise exception 'provider missing';
  end if;

  if financial.payout_status = 'completed' then
    raise exception 'payout already completed';
  end if;

  insert into public.provider_wallets(provider_id)
  values (financial.provider_id)
  on conflict (provider_id) do nothing;

  if financial.payout_status <> 'ready' then
    update public.provider_wallets
    set pending_balance = pending_balance + financial.provider_payout_amount,
        updated_at = now()
    where provider_id = financial.provider_id;
  end if;

  update public.booking_financials
  set payout_status = 'ready',
      status = 'payout_ready',
      escrow_amount = gross_booking_amount,
      updated_at = now()
  where id = p_booking_financial_id
  returning * into financial;

  update public.projects
  set status = 'payout_ready'
  where id = financial.booking_id
    and status in ('delivery_approved', 'completed', 'delivered');

  update public.quick_bookings
  set status = 'payout_ready'
  where id = financial.booking_id
    and status in ('delivery_approved', 'creator_accepted', 'paid_confirmed');

  return financial;
end;
$$;

create or replace function public.release_provider_payout(
  p_booking_financial_id uuid,
  p_payout_method text,
  p_utr_number text
)
returns public.payout_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  financial public.booking_financials;
  payout public.payout_transactions;
begin
  if not (public.is_admin() or current_setting('request.jwt.claim.role', true) = 'service_role') then
    raise exception 'admin access required';
  end if;

  select * into financial
  from public.booking_financials
  where id = p_booking_financial_id
  for update;

  if not found then
    raise exception 'booking financial not found';
  end if;

  if financial.provider_id is null then
    raise exception 'provider missing';
  end if;

  if financial.payout_status = 'completed' then
    raise exception 'payout already completed';
  end if;

  insert into public.provider_wallets(provider_id)
  values (financial.provider_id)
  on conflict (provider_id) do nothing;

  if financial.payout_status <> 'ready' then
    update public.provider_wallets
    set pending_balance = pending_balance + financial.provider_payout_amount,
        updated_at = now()
    where provider_id = financial.provider_id;
  end if;

  update public.provider_wallets
  set pending_balance = greatest(0, pending_balance - financial.provider_payout_amount),
      lifetime_earnings = lifetime_earnings + financial.provider_payout_amount,
      total_withdrawn = total_withdrawn + financial.provider_payout_amount,
      updated_at = now()
  where provider_id = financial.provider_id;

  insert into public.payout_transactions (
    provider_id,
    booking_id,
    booking_financial_id,
    gross_amount,
    commission_deducted,
    net_payout,
    payout_method,
    utr_number,
    status,
    released_at
  )
  values (
    financial.provider_id,
    financial.booking_id,
    financial.id,
    financial.gross_booking_amount,
    financial.platform_commission_amount,
    financial.provider_payout_amount,
    nullif(trim(coalesce(p_payout_method, '')), ''),
    nullif(trim(coalesce(p_utr_number, '')), ''),
    'completed',
    now()
  )
  returning * into payout;

  update public.booking_financials
  set payout_status = 'completed',
      escrow_status = 'released',
      status = 'payout_released',
      escrow_amount = 0,
      updated_at = now()
  where id = financial.id;

  update public.projects
  set status = 'payout_completed'
  where id = financial.booking_id
    and status in ('payout_ready', 'delivery_approved', 'completed', 'delivered');

  update public.quick_bookings
  set status = 'payout_completed'
  where id = financial.booking_id
    and status in ('payout_ready', 'delivery_approved', 'paid_confirmed', 'creator_accepted');

  return payout;
end;
$$;

commit;
