-- Social chapter backend architecture.
--
-- This migration is additive to the MVP schema. It preserves existing app
-- columns such as profiles.age, chapters.invite_code, and
-- chapter_members.profile_id while adding the broader discovery/membership
-- model requested for Bloke.

create extension if not exists pgcrypto;

alter table public.profiles
add column if not exists username text,
add column if not exists avatar_url text,
add column if not exists bio text,
add column if not exists home_chapter_id uuid;

alter table public.chapters
add column if not exists slug text,
add column if not exists city text,
add column if not exists state text,
add column if not exists member_count integer not null default 0,
add column if not exists created_by uuid references public.profiles(id) on delete set null,
add column if not exists is_verified boolean not null default false;

update public.chapters
set
  slug = coalesce(
    slug,
    lower(regexp_replace(regexp_replace(trim(name), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))
      || '-' || substr(replace(id::text, '-', ''), 1, 6)
  ),
  city = coalesce(city, region),
  created_by = coalesce(created_by, facilitator_id),
  member_count = greatest(member_count, 0);

alter table public.chapters
alter column slug set not null;

create or replace function public.ensure_chapter_public_fields()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  base_slug text;
begin
  if new.slug is null or trim(new.slug) = '' then
    base_slug := lower(regexp_replace(regexp_replace(trim(new.name), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'));
    new.slug := coalesce(nullif(base_slug, ''), 'chapter') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  else
    new.slug := lower(regexp_replace(regexp_replace(trim(new.slug), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'));
  end if;

  if new.city is null then
    new.city := new.region;
  end if;

  if new.created_by is null then
    new.created_by := new.facilitator_id;
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_chapter_public_fields_before_write on public.chapters;
create trigger ensure_chapter_public_fields_before_write
before insert or update on public.chapters
for each row execute function public.ensure_chapter_public_fields();

alter table public.profiles
drop constraint if exists profiles_home_chapter_id_fkey;

alter table public.profiles
add constraint profiles_home_chapter_id_fkey
foreign key (home_chapter_id) references public.chapters(id) on delete set null;

alter table public.profiles
drop constraint if exists profiles_username_format_check;

alter table public.profiles
add constraint profiles_username_format_check
check (username is null or username ~ '^[a-z0-9_]{3,32}$');

alter table public.profiles
drop constraint if exists profiles_bio_length_check;

alter table public.profiles
add constraint profiles_bio_length_check
check (bio is null or char_length(bio) <= 280);

alter table public.chapters
drop constraint if exists chapters_slug_format_check;

alter table public.chapters
add constraint chapters_slug_format_check
check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

alter table public.chapters
drop constraint if exists chapters_member_count_nonnegative_check;

alter table public.chapters
add constraint chapters_member_count_nonnegative_check
check (member_count >= 0);

alter table public.chapter_members
add column if not exists user_id uuid references public.profiles(id) on delete cascade,
add column if not exists status text not null default 'active';

update public.chapter_members
set user_id = coalesce(user_id, profile_id);

alter table public.chapter_members
drop constraint if exists chapter_members_status_check;

alter table public.chapter_members
add constraint chapter_members_status_check
check (status in ('pending', 'active', 'rejected', 'removed'));

create table if not exists public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz,
  max_uses integer,
  current_uses integer not null default 0,
  created_at timestamptz default now(),
  constraint invite_codes_code_format_check check (code = upper(trim(code)) and char_length(code) between 4 and 64),
  constraint invite_codes_max_uses_check check (max_uses is null or max_uses > 0),
  constraint invite_codes_current_uses_check check (current_uses >= 0 and (max_uses is null or current_uses <= max_uses))
);

insert into public.invite_codes (code, chapter_id, created_by, max_uses, current_uses)
select c.invite_code, c.id, coalesce(c.created_by, c.facilitator_id), null, 0
from public.chapters c
where c.invite_code is not null
on conflict (code) do update
set
  chapter_id = excluded.chapter_id,
  created_by = coalesce(public.invite_codes.created_by, excluded.created_by);

create table if not exists public.chapter_events (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  title text not null,
  description text,
  location text,
  event_date timestamptz not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  constraint chapter_events_title_length_check check (char_length(trim(title)) between 1 and 140)
);

create unique index if not exists profiles_username_key
on public.profiles(lower(username))
where username is not null;

create index if not exists profiles_home_chapter_id_idx on public.profiles(home_chapter_id);
create unique index if not exists chapters_slug_key on public.chapters(slug);
create index if not exists chapters_city_state_idx on public.chapters(city, state);
create index if not exists chapters_created_by_idx on public.chapters(created_by);
create index if not exists chapters_verified_idx on public.chapters(is_verified) where is_verified = true;
create index if not exists chapter_members_user_id_idx on public.chapter_members(user_id);
create index if not exists chapter_members_status_idx on public.chapter_members(status);
create unique index if not exists chapter_members_chapter_user_unique_idx
on public.chapter_members(chapter_id, user_id)
where user_id is not null;
create index if not exists invite_codes_chapter_id_idx on public.invite_codes(chapter_id);
create index if not exists invite_codes_created_by_idx on public.invite_codes(created_by);
create index if not exists invite_codes_expires_at_idx on public.invite_codes(expires_at);
create index if not exists chapter_events_chapter_id_idx on public.chapter_events(chapter_id);
create index if not exists chapter_events_event_date_idx on public.chapter_events(event_date);
create index if not exists chapter_events_created_by_idx on public.chapter_events(created_by);

alter table public.invite_codes enable row level security;
alter table public.chapter_events enable row level security;

create or replace function public.sync_chapter_member_user_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.profile_id is null and new.user_id is not null then
    new.profile_id = new.user_id;
  end if;

  if new.user_id is null and new.profile_id is not null then
    new.user_id = new.profile_id;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_chapter_member_user_columns_before_write on public.chapter_members;
create trigger sync_chapter_member_user_columns_before_write
before insert or update on public.chapter_members
for each row execute function public.sync_chapter_member_user_columns();

create or replace function public.refresh_chapter_member_count(target_chapter_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.chapters c
  set member_count = (
    select count(*)::integer
    from public.chapter_members cm
    where cm.chapter_id = target_chapter_id
      and coalesce(cm.status, 'active') = 'active'
  )
  where c.id = target_chapter_id;
$$;

create or replace function public.refresh_chapter_member_count_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.refresh_chapter_member_count(new.chapter_id);
    return new;
  end if;

  if tg_op = 'UPDATE' then
    perform public.refresh_chapter_member_count(new.chapter_id);

    if old.chapter_id is distinct from new.chapter_id then
      perform public.refresh_chapter_member_count(old.chapter_id);
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    perform public.refresh_chapter_member_count(old.chapter_id);
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists refresh_chapter_member_count_after_write on public.chapter_members;
create trigger refresh_chapter_member_count_after_write
after insert or update or delete on public.chapter_members
for each row execute function public.refresh_chapter_member_count_trigger();

select public.refresh_chapter_member_count(id)
from public.chapters;

create or replace function public.is_chapter_member(target_chapter_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chapter_members cm
    where cm.chapter_id = target_chapter_id
      and (cm.profile_id = auth.uid() or cm.user_id = auth.uid())
      and coalesce(cm.status, 'active') = 'active'
  );
$$;

create or replace function public.is_chapter_facilitator(target_chapter_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chapter_members cm
    where cm.chapter_id = target_chapter_id
      and (cm.profile_id = auth.uid() or cm.user_id = auth.uid())
      and cm.role = 'facilitator'
      and coalesce(cm.status, 'active') = 'active'
  )
  or exists (
    select 1
    from public.chapters c
    where c.id = target_chapter_id
      and (c.facilitator_id = auth.uid() or c.created_by = auth.uid())
  );
$$;

create or replace function public.is_facilitator_for_profile(target_profile_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chapter_members facilitator_membership
    join public.chapter_members target_membership
      on target_membership.chapter_id = facilitator_membership.chapter_id
    where (facilitator_membership.profile_id = auth.uid() or facilitator_membership.user_id = auth.uid())
      and facilitator_membership.role = 'facilitator'
      and coalesce(facilitator_membership.status, 'active') = 'active'
      and (target_membership.profile_id = target_profile_id or target_membership.user_id = target_profile_id)
      and coalesce(target_membership.status, 'active') = 'active'
  )
  or exists (
    select 1
    from public.chapters c
    join public.chapter_members target_membership
      on target_membership.chapter_id = c.id
    where (c.facilitator_id = auth.uid() or c.created_by = auth.uid())
      and (target_membership.profile_id = target_profile_id or target_membership.user_id = target_profile_id)
      and coalesce(target_membership.status, 'active') = 'active'
  );
$$;

revoke all on function public.sync_chapter_member_user_columns() from public;
revoke all on function public.refresh_chapter_member_count(uuid) from public;
revoke all on function public.refresh_chapter_member_count_trigger() from public;
revoke all on function public.is_chapter_member(uuid) from public;
revoke all on function public.is_chapter_facilitator(uuid) from public;
revoke all on function public.is_facilitator_for_profile(uuid) from public;

grant execute on function public.is_chapter_member(uuid) to authenticated;
grant execute on function public.is_chapter_facilitator(uuid) to authenticated;
grant execute on function public.is_facilitator_for_profile(uuid) to authenticated;

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
    full_name,
    avatar_url,
    role,
    onboarding_complete
  )
  values (
    new.id,
    nullif(lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', ''), '[^a-z0-9_]', '', 'g')), ''),
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'avatar_url', ''),
    'participant',
    false
  )
  on conflict (id) do update
  set
    username = coalesce(public.profiles.username, excluded.username),
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

  return new;
end;
$$;

drop policy if exists "Authenticated users can read public profiles" on public.profiles;
create policy "Authenticated users can read public profiles"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can read verified public chapters" on public.chapters;
create policy "Authenticated users can read verified public chapters"
on public.chapters
for select
to authenticated
using (coalesce(is_public, true) = true);

drop policy if exists "Users can create chapter membership requests" on public.chapter_members;
create policy "Users can create chapter membership requests"
on public.chapter_members
for insert
to authenticated
with check (
  (profile_id = auth.uid() or user_id = auth.uid())
  and coalesce(status, 'pending') in ('pending', 'active')
);

drop policy if exists "Users can update their pending chapter memberships" on public.chapter_members;
create policy "Users can update their pending chapter memberships"
on public.chapter_members
for update
to authenticated
using (
  (profile_id = auth.uid() or user_id = auth.uid())
  and status = 'pending'
)
with check (
  (profile_id = auth.uid() or user_id = auth.uid())
  and status = 'pending'
);

drop policy if exists "Chapter facilitators can read invite codes" on public.invite_codes;
create policy "Chapter facilitators can read invite codes"
on public.invite_codes
for select
to authenticated
using (public.is_chapter_facilitator(chapter_id) or public.is_admin());

drop policy if exists "Chapter facilitators can create invite codes" on public.invite_codes;
create policy "Chapter facilitators can create invite codes"
on public.invite_codes
for insert
to authenticated
with check (
  created_by = auth.uid()
  and (public.is_chapter_facilitator(chapter_id) or public.is_admin())
);

drop policy if exists "Chapter facilitators can update invite codes" on public.invite_codes;
create policy "Chapter facilitators can update invite codes"
on public.invite_codes
for update
to authenticated
using (public.is_chapter_facilitator(chapter_id) or public.is_admin())
with check (public.is_chapter_facilitator(chapter_id) or public.is_admin());

drop policy if exists "Chapter members can read chapter events" on public.chapter_events;
create policy "Chapter members can read chapter events"
on public.chapter_events
for select
to authenticated
using (public.is_chapter_member(chapter_id) or public.is_chapter_facilitator(chapter_id) or public.is_admin());

drop policy if exists "Chapter facilitators can create chapter events" on public.chapter_events;
create policy "Chapter facilitators can create chapter events"
on public.chapter_events
for insert
to authenticated
with check (
  created_by = auth.uid()
  and (public.is_chapter_facilitator(chapter_id) or public.is_admin())
);

drop policy if exists "Chapter facilitators can update chapter events" on public.chapter_events;
create policy "Chapter facilitators can update chapter events"
on public.chapter_events
for update
to authenticated
using (public.is_chapter_facilitator(chapter_id) or public.is_admin())
with check (public.is_chapter_facilitator(chapter_id) or public.is_admin());

drop policy if exists "Chapter facilitators can delete chapter events" on public.chapter_events;
create policy "Chapter facilitators can delete chapter events"
on public.chapter_events
for delete
to authenticated
using (public.is_chapter_facilitator(chapter_id) or public.is_admin());
