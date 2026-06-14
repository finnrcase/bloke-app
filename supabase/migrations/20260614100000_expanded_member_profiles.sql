-- Expanded member profiles.
--
-- Keeps account identity on profiles while storing richer connection and
-- matching data in a one-to-one details table.

alter table public.profiles
add column if not exists first_name text,
add column if not exists last_name text,
add column if not exists birthdate date,
add column if not exists city text,
add column if not exists state text;

update public.profiles
set
  first_name = coalesce(
    nullif(trim(first_name), ''),
    nullif(split_part(trim(full_name), ' ', 1), '')
  ),
  last_name = coalesce(
    nullif(trim(last_name), ''),
    nullif(trim(regexp_replace(trim(coalesce(full_name, '')), '^\S+\s*', '')), '')
  )
where full_name is not null
  and (
    first_name is null
    or last_name is null
  );

alter table public.profiles
drop constraint if exists profiles_first_name_length_check;

alter table public.profiles
add constraint profiles_first_name_length_check
check (first_name is null or char_length(trim(first_name)) between 1 and 80);

alter table public.profiles
drop constraint if exists profiles_last_name_length_check;

alter table public.profiles
add constraint profiles_last_name_length_check
check (last_name is null or char_length(trim(last_name)) between 1 and 100);

alter table public.profiles
drop constraint if exists profiles_city_length_check;

alter table public.profiles
add constraint profiles_city_length_check
check (city is null or char_length(trim(city)) between 1 and 120);

alter table public.profiles
drop constraint if exists profiles_state_length_check;

alter table public.profiles
add constraint profiles_state_length_check
check (state is null or char_length(trim(state)) between 1 and 120);

alter table public.profiles
drop constraint if exists profiles_birthdate_reasonable_check;

alter table public.profiles
add constraint profiles_birthdate_reasonable_check
check (
  birthdate is null
  or (
    birthdate <= current_date
    and birthdate >= date '1900-01-01'
  )
);

create or replace function public.sync_profile_name_fields()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  normalized_full_name text;
begin
  new.first_name := nullif(trim(new.first_name), '');
  new.last_name := nullif(trim(new.last_name), '');
  new.full_name := nullif(trim(new.full_name), '');
  new.city := nullif(trim(new.city), '');
  new.state := nullif(trim(new.state), '');

  if new.first_name is not null or new.last_name is not null then
    normalized_full_name := nullif(trim(concat_ws(' ', new.first_name, new.last_name)), '');
    new.full_name := coalesce(normalized_full_name, new.full_name);
  elsif new.full_name is not null then
    new.first_name := nullif(split_part(new.full_name, ' ', 1), '');
    new.last_name := nullif(trim(regexp_replace(new.full_name, '^\S+\s*', '')), '');
  end if;

  return new;
end;
$$;

drop trigger if exists sync_profile_name_fields_before_write on public.profiles;
create trigger sync_profile_name_fields_before_write
before insert or update of first_name, last_name, full_name, city, state on public.profiles
for each row execute function public.sync_profile_name_fields();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    username,
    first_name,
    last_name,
    full_name,
    avatar_url,
    role,
    onboarding_complete
  )
  values (
    new.id,
    nullif(lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', ''), '[^a-z0-9_]', '', 'g')), ''),
    nullif(new.raw_user_meta_data->>'first_name', ''),
    nullif(new.raw_user_meta_data->>'last_name', ''),
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(trim(concat_ws(' ', nullif(new.raw_user_meta_data->>'first_name', ''), nullif(new.raw_user_meta_data->>'last_name', ''))), '')
    ),
    nullif(new.raw_user_meta_data->>'avatar_url', ''),
    'user',
    false
  )
  on conflict (id) do update
  set
    username = coalesce(public.profiles.username, excluded.username),
    first_name = coalesce(public.profiles.first_name, excluded.first_name),
    last_name = coalesce(public.profiles.last_name, excluded.last_name),
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

  return new;
end;
$$;

create table if not exists public.profile_details (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  languages_spoken text[] not null default '{}'::text[],
  interests text[] not null default '{}'::text[],
  goals text[] not null default '{}'::text[],
  career_interests text[] not null default '{}'::text[],
  personal_aspirations text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_details_languages_count_check check (cardinality(languages_spoken) <= 12),
  constraint profile_details_interests_count_check check (cardinality(interests) <= 24),
  constraint profile_details_goals_count_check check (cardinality(goals) <= 16),
  constraint profile_details_career_interests_count_check check (cardinality(career_interests) <= 16),
  constraint profile_details_aspirations_length_check check (
    personal_aspirations is null
    or char_length(trim(personal_aspirations)) <= 1200
  )
);

alter table public.profile_details enable row level security;

create index if not exists profiles_first_last_name_idx on public.profiles(first_name, last_name);
create index if not exists profiles_city_state_idx on public.profiles(city, state);
create index if not exists profile_details_languages_spoken_gin_idx on public.profile_details using gin(languages_spoken);
create index if not exists profile_details_interests_gin_idx on public.profile_details using gin(interests);
create index if not exists profile_details_goals_gin_idx on public.profile_details using gin(goals);
create index if not exists profile_details_career_interests_gin_idx on public.profile_details using gin(career_interests);

create or replace function public.touch_profile_details_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists touch_profile_details_updated_at_before_update on public.profile_details;
create trigger touch_profile_details_updated_at_before_update
before update on public.profile_details
for each row execute function public.touch_profile_details_updated_at();

drop policy if exists "Authenticated users can read profile details" on public.profile_details;
create policy "Authenticated users can read profile details"
on public.profile_details
for select
to authenticated
using (true);

drop policy if exists "Users can insert their own profile details" on public.profile_details;
create policy "Users can insert their own profile details"
on public.profile_details
for insert
to authenticated
with check (profile_id = (select auth.uid()) or public.is_admin());

drop policy if exists "Users can update their own profile details" on public.profile_details;
create policy "Users can update their own profile details"
on public.profile_details
for update
to authenticated
using (profile_id = (select auth.uid()) or public.is_admin())
with check (profile_id = (select auth.uid()) or public.is_admin());

drop policy if exists "Admins can delete profile details" on public.profile_details;
create policy "Admins can delete profile details"
on public.profile_details
for delete
to authenticated
using (public.is_admin());
