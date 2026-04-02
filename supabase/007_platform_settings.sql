create table public.platform_settings (
  key text primary key,
  value text not null,
  description text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Protect table
alter table public.platform_settings enable row level security;

-- Everyone can read settings (e.g., to check if maintenance mode is ON)
create policy "Settings are viewable by everyone." 
  on public.platform_settings for select 
  using ( true );

-- Admins can insert/update settings
create policy "Admins can update settings" 
  on public.platform_settings for update 
  using ( public.is_admin() );

create policy "Admins can insert settings" 
  on public.platform_settings for insert 
  with check ( public.is_admin() );

-- Insert defaults
insert into public.platform_settings (key, value, description) values
  ('maintenance_mode', 'false', 'Is the platform currently down for maintenance?'),
  ('platform_fee_percent', '5', 'Percentage of project budget taken as fee'),
  ('auto_approve_creators', 'false', 'Skip manual verification for new creators?');
