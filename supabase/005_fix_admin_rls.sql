-- 1. Create a secure function that bypasses RLS to check for admin status
create or replace function public.is_admin()
returns boolean
language sql security definer set search_path = public
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and account_type = 'admin'
  );
$$;

-- 2. Drop the recursive policies that are causing the 500 Internal Server Errors
drop policy if exists "Admins can view all users" on public.users;
drop policy if exists "Admins can update all users" on public.users;
drop policy if exists "Admins can view all creators" on public.creators;
drop policy if exists "Admins can update all creators" on public.creators;
drop policy if exists "Admins can view all projects" on public.projects;
drop policy if exists "Admins can update all projects" on public.projects;
drop policy if exists "Admins can view all payments" on public.payments;
drop policy if exists "Admins can update all payments" on public.payments;

-- 3. Re-create the policies using the safe function
create policy "Admins can view all users" on public.users for select using ( public.is_admin() );
create policy "Admins can update all users" on public.users for update using ( public.is_admin() );

create policy "Admins can view all creators" on public.creators for select using ( public.is_admin() );
create policy "Admins can update all creators" on public.creators for update using ( public.is_admin() );

create policy "Admins can view all projects" on public.projects for select using ( public.is_admin() );
create policy "Admins can update all projects" on public.projects for update using ( public.is_admin() );

create policy "Admins can view all payments" on public.payments for select using ( public.is_admin() );
create policy "Admins can update all payments" on public.payments for update using ( public.is_admin() );
