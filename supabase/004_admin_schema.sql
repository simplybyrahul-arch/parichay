-- 1. Alter account_type check constraint to include 'admin'
alter table public.users drop constraint users_account_type_check;
alter table public.users add constraint users_account_type_check check (account_type in ('client', 'creator', 'admin'));

-- 2. Add RLS policies for Admin across all tables
-- Users Table
create policy "Admins can view all users" 
  on public.users for select 
  using ( (select account_type from public.users where id = auth.uid()) = 'admin' );

create policy "Admins can update all users" 
  on public.users for update 
  using ( (select account_type from public.users where id = auth.uid()) = 'admin' );

-- Creators Table
create policy "Admins can view all creators" 
  on public.creators for select 
  using ( (select account_type from public.users where id = auth.uid()) = 'admin' );

create policy "Admins can update all creators" 
  on public.creators for update 
  using ( (select account_type from public.users where id = auth.uid()) = 'admin' );

-- Projects Table
create policy "Admins can view all projects" 
  on public.projects for select 
  using ( (select account_type from public.users where id = auth.uid()) = 'admin' );

create policy "Admins can update all projects" 
  on public.projects for update 
  using ( (select account_type from public.users where id = auth.uid()) = 'admin' );

-- Payments Table
create policy "Admins can view all payments" 
  on public.payments for select 
  using ( (select account_type from public.users where id = auth.uid()) = 'admin' );

create policy "Admins can update all payments" 
  on public.payments for update 
  using ( (select account_type from public.users where id = auth.uid()) = 'admin' );
