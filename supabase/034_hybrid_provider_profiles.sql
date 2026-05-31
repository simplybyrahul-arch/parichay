-- Allow a single user to own multiple provider capabilities, such as
-- a creator profile and an equipment vendor profile.

do $$
begin
  alter table public.provider_profiles
    drop constraint if exists provider_profiles_user_id_key;

  create unique index if not exists provider_profiles_user_provider_type_key
    on public.provider_profiles(user_id, provider_type);
exception
  when undefined_table then null;
end $$;
