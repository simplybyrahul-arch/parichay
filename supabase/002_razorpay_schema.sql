-- Add Razorpay fields to projects table
alter table public.projects 
add column razorpay_order_id text,
add column payment_id text,
add column payment_signature text;

-- Update the status check to include 'funded'
alter table public.projects drop constraint "projects_status_check";
alter table public.projects add constraint projects_status_check check (status in ('draft', 'pending', 'funded', 'in_progress', 'completed', 'cancelled'));

-- Create a dedicated payments tracking table
create table public.payments (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) not null,
  client_id uuid references public.users(id) not null,
  razorpay_order_id text not null,
  razorpay_payment_id text,
  razorpay_signature text,
  amount integer not null, -- amount in paise
  currency text default 'INR',
  status text check (status in ('created', 'authorized', 'captured', 'refunded', 'failed')) default 'created',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.payments enable row level security;

-- Clients can see their own payments
create policy "Clients see their own payments." 
  on public.payments for select 
  using ( auth.uid() = client_id );

-- Clients can insert payments
create policy "Clients can insert payments." 
  on public.payments for insert 
  with check ( auth.uid() = client_id );

