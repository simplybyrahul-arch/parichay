-- Creator portfolio media items.
-- Safe additive migration only: no drops, no renames.

create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  title text,
  description text,
  sort_order integer not null default 0,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists portfolio_items_creator_id_idx on public.portfolio_items(creator_id);
create index if not exists portfolio_items_public_idx on public.portfolio_items(is_public);
create index if not exists portfolio_items_sort_idx on public.portfolio_items(creator_id, sort_order, created_at);

alter table public.portfolio_items enable row level security;

drop policy if exists "Public can read public portfolio items" on public.portfolio_items;
drop policy if exists "Creators can manage their portfolio items" on public.portfolio_items;

create policy "Public can read public portfolio items"
  on public.portfolio_items for select
  using (is_public = true);

create policy "Creators can manage their portfolio items"
  on public.portfolio_items for all
  using (auth.uid() = creator_id)
  with check (auth.uid() = creator_id);
