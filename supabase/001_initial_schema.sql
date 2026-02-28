-- 1. Create a public profiles table that ties to the auth.users table
create table public.users (
  id uuid references auth.users not null primary key,
  full_name text,
  account_type text check (account_type in ('client', 'creator')) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Note: In Supabase, you usually want to set up Row Level Security (RLS)
-- To allow users to read/update their own profile
alter table public.users enable row level security;

create policy "Users can view their own profile." 
  on public.users for select 
  using ( auth.uid() = id );

create policy "Users can update their own profile." 
  on public.users for update 
  using ( auth.uid() = id );

-- This trigger automatically creates a profile entry when a new user signs up
create function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.users (id, full_name, account_type)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'account_type'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. Create the Creators table to hold specialized portfolio data
create table public.creators (
  id uuid references public.users(id) not null primary key,
  slug text unique not null,
  role text not null,
  location text not null,
  bio text,
  day_rate integer not null,
  verified boolean default false,
  equipment jsonb default '[]'::jsonb,
  tags jsonb default '[]'::jsonb,
  profile_image_url text
);

alter table public.creators enable row level security;

-- Creators can be viewed by anyone (for the search directory)
create policy "Creators are viewable by everyone." 
  on public.creators for select 
  using ( true );

create policy "Creators can update their own profile." 
  on public.creators for update 
  using ( auth.uid() = id );

create policy "Creators can insert their own profile." 
  on public.creators for insert 
  with check ( auth.uid() = id );


-- 3. Create the Projects/Jobs table
create table public.projects (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.users(id) not null,
  creator_id uuid references public.creators(id), -- Nullable initially if it's an open job
  title text not null,
  description text not null,
  budget integer not null,
  status text check (status in ('draft', 'pending', 'in_progress', 'completed', 'cancelled')) default 'pending',
  start_date date,
  end_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.projects enable row level security;

-- Clients can see their own projects, Creators can see projects they are assigned to
create policy "Clients see their own projects." 
  on public.projects for select 
  using ( auth.uid() = client_id );

create policy "Creators see assigned projects." 
  on public.projects for select 
  using ( auth.uid() = creator_id );

create policy "Clients can insert projects." 
  on public.projects for insert 
  with check ( auth.uid() = client_id );

create policy "Clients can update their own projects." 
  on public.projects for update 
  using ( auth.uid() = client_id );
