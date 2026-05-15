-- WhatsApp invite support fields.
-- Safe local migration only: no drops, no renames.

alter table public.creators
  add column if not exists whatsapp_phone text;

alter table public.users
  add column if not exists whatsapp_phone text;

create index if not exists creators_whatsapp_phone_idx on public.creators(whatsapp_phone);
create index if not exists users_whatsapp_phone_idx on public.users(whatsapp_phone);
