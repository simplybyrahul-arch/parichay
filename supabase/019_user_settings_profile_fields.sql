-- User settings/profile fields for role-based settings pages.
-- Safe additive migration only: no drops, no renames.

alter table public.users
  add column if not exists phone text,
  add column if not exists whatsapp_phone text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists notification_preferences jsonb not null default '{}'::jsonb;

alter table public.creators
  add column if not exists phone text,
  add column if not exists whatsapp_phone text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists role text,
  add column if not exists capacity_per_day integer,
  add column if not exists service_radius_km integer default 0,
  add column if not exists whatsapp_opt_in boolean default true,
  add column if not exists available_for_booking boolean default true,
  add column if not exists budget_flexibility boolean default false,
  add column if not exists travel_enabled boolean default false;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'creators'
      and column_name = 'equipment'
      and data_type = 'ARRAY'
  ) then
    alter table public.creators alter column equipment set default '{}'::text[];
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'creators'
      and column_name = 'tags'
      and data_type = 'ARRAY'
  ) then
    alter table public.creators alter column tags set default '{}'::text[];
  end if;
end $$;

alter table public.creators
  add column if not exists service_cities text[] default '{}'::text[];

insert into public.platform_settings (key, value, description) values
  ('platform_name', 'ShotcutCrew', 'Public platform display name'),
  ('support_email', 'rahul@shotcutcrew.com', 'Support contact email shown in settings'),
  ('default_city', 'Bilaspur', 'Default operating city or region'),
  ('booking_expiry_hours', '72', 'Default booking opportunity expiry window in hours'),
  ('payment_mode_display', 'QR payment', 'Public payment mode label'),
  ('qr_payment_label', 'Scan the QR and submit UTR/payment proof.', 'QR payment instruction text')
on conflict (key) do nothing;
