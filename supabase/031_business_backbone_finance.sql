-- Business backbone finance layer.
-- Additive migration: keeps existing projects, quick_bookings, payments, creators, and vendor tables intact.

do $$
begin
  alter table public.provider_profiles
    alter column profile_completion type numeric
    using profile_completion::numeric;

  alter table public.provider_profiles drop constraint if exists provider_profiles_provider_type_check;
  alter table public.provider_profiles
    add constraint provider_profiles_provider_type_check
    check (provider_type in ('creator', 'studio', 'equipment_vendor'));
exception
  when undefined_table then
    create table public.provider_profiles (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null unique references public.users(id) on delete cascade,
      provider_type text not null check (provider_type in ('creator', 'studio', 'equipment_vendor')),
      provider_subtype text,
      business_name text,
      city text,
      state text,
      verified boolean not null default false,
      profile_completion numeric not null default 0,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
end $$;

do $$
begin
  alter table public.projects drop constraint if exists projects_status_check;
  alter table public.projects add constraint projects_status_check check (
    status in (
      'draft', 'pending', 'funded', 'in_progress', 'completed', 'cancelled',
      'open', 'matching', 'receiving_interest', 'client_selecting',
      'pending_payment', 'escrowed', 'confirmed', 'delivered', 'expired',
      'disputed', 'submitted', 'pending_review', 'open_for_quotes',
      'quotes_received', 'awarded', 'checking_availability', 'provider_selected',
      'paid_confirmed', 'delivery_submitted', 'delivery_approved',
      'payout_ready', 'payout_completed', 'refunded'
    )
  );
exception
  when undefined_table then null;
end $$;

do $$
begin
  alter table public.quick_bookings drop constraint if exists quick_bookings_status_check;
  alter table public.quick_bookings add constraint quick_bookings_status_check check (
    status in (
      'draft', 'matched', 'pending_creator_acceptance', 'creator_accepted',
      'creator_rejected', 'more_details_requested', 'paid_confirmed',
      'in_progress', 'delivery_submitted', 'delivery_approved',
      'payout_ready', 'payout_completed', 'cancelled', 'expired',
      'disputed', 'refunded'
    )
  );
exception
  when undefined_table then null;
end $$;

insert into public.provider_profiles (
  user_id,
  provider_type,
  provider_subtype,
  business_name,
  city,
  state,
  verified,
  profile_completion
)
select
  c.id,
  case when c.creator_type = 'studio_owner' then 'studio' else 'creator' end,
  case when c.creator_type = 'studio_owner' then 'studio' else coalesce(c.creator_type, 'freelancer') end,
  coalesce(u.full_name, c.role, 'ShotcutCrew Provider'),
  c.city,
  c.state,
  coalesce(c.verified, false),
  coalesce(c.profile_completeness, 40)
from public.creators c
join public.users u on u.id = c.id
where u.account_type = 'creator'
on conflict (user_id) do update
set
  provider_type = case when excluded.provider_subtype = 'studio' then 'studio' else public.provider_profiles.provider_type end,
  provider_subtype = coalesce(public.provider_profiles.provider_subtype, excluded.provider_subtype),
  business_name = coalesce(public.provider_profiles.business_name, excluded.business_name),
  city = coalesce(public.provider_profiles.city, excluded.city),
  state = coalesce(public.provider_profiles.state, excluded.state),
  verified = public.provider_profiles.verified or excluded.verified,
  profile_completion = greatest(public.provider_profiles.profile_completion, excluded.profile_completion),
  updated_at = now();

create table if not exists public.booking_financials (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null,
  booking_type text not null check (booking_type in ('quick_booking', 'custom_project', 'equipment_rental')),
  provider_id uuid references public.provider_profiles(id) on delete set null,
  client_id uuid references public.users(id) on delete set null,
  gross_booking_amount numeric not null,
  platform_commission_percent numeric not null,
  platform_commission_amount numeric not null,
  client_service_fee_percent numeric not null,
  client_service_fee_amount numeric not null,
  gateway_fee_amount numeric not null default 0,
  tax_amount numeric not null default 0,
  provider_payout_amount numeric not null,
  client_payable_amount numeric not null,
  platform_revenue numeric not null,
  escrow_status text not null default 'pending',
  payout_status text not null default 'not_ready',
  currency text not null default 'INR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_id, booking_type, provider_id)
);

create table if not exists public.provider_wallets (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null unique references public.provider_profiles(id) on delete cascade,
  pending_balance numeric not null default 0,
  available_balance numeric not null default 0,
  lifetime_earnings numeric not null default 0,
  total_withdrawn numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payout_transactions (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.provider_profiles(id) on delete cascade,
  booking_id uuid,
  booking_financial_id uuid references public.booking_financials(id) on delete set null,
  gross_amount numeric not null,
  commission_deducted numeric not null,
  net_payout numeric not null,
  payout_method text,
  utr_number text,
  status text not null default 'pending',
  released_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists booking_financials_booking_id_idx on public.booking_financials(booking_id);
create index if not exists booking_financials_provider_id_idx on public.booking_financials(provider_id);
create index if not exists booking_financials_client_id_idx on public.booking_financials(client_id);
create index if not exists booking_financials_booking_type_idx on public.booking_financials(booking_type);
create index if not exists booking_financials_escrow_status_idx on public.booking_financials(escrow_status);
create index if not exists booking_financials_payout_status_idx on public.booking_financials(payout_status);
create index if not exists provider_wallets_provider_id_idx on public.provider_wallets(provider_id);
create index if not exists payout_transactions_provider_id_idx on public.payout_transactions(provider_id);
create index if not exists payout_transactions_booking_financial_id_idx on public.payout_transactions(booking_financial_id);
create index if not exists payout_transactions_status_idx on public.payout_transactions(status);

alter table public.booking_financials enable row level security;
alter table public.provider_wallets enable row level security;
alter table public.payout_transactions enable row level security;

drop policy if exists "Admins manage booking financials" on public.booking_financials;
create policy "Admins manage booking financials"
  on public.booking_financials for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Clients read own booking financials" on public.booking_financials;
create policy "Clients read own booking financials"
  on public.booking_financials for select
  using (client_id = auth.uid());

drop policy if exists "Providers read own booking financials" on public.booking_financials;
create policy "Providers read own booking financials"
  on public.booking_financials for select
  using (
    exists (
      select 1
      from public.provider_profiles
      where provider_profiles.id = booking_financials.provider_id
        and provider_profiles.user_id = auth.uid()
    )
  );

drop policy if exists "Admins manage provider wallets" on public.provider_wallets;
create policy "Admins manage provider wallets"
  on public.provider_wallets for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Providers read own wallets" on public.provider_wallets;
create policy "Providers read own wallets"
  on public.provider_wallets for select
  using (
    exists (
      select 1
      from public.provider_profiles
      where provider_profiles.id = provider_wallets.provider_id
        and provider_profiles.user_id = auth.uid()
    )
  );

drop policy if exists "Admins manage payout transactions" on public.payout_transactions;
create policy "Admins manage payout transactions"
  on public.payout_transactions for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Providers read own payout transactions" on public.payout_transactions;
create policy "Providers read own payout transactions"
  on public.payout_transactions for select
  using (
    exists (
      select 1
      from public.provider_profiles
      where provider_profiles.id = payout_transactions.provider_id
        and provider_profiles.user_id = auth.uid()
    )
  );

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
