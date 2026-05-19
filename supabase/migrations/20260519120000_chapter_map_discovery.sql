-- Chapter map discovery hardening.
--
-- This keeps discovery scoped to public chapter metadata only. Invite codes
-- remain private, and request approval stays with facilitators/admins.

alter table public.chapters
add column if not exists latitude numeric,
add column if not exists longitude numeric,
add column if not exists is_public boolean default true,
add column if not exists description text,
add column if not exists meeting_location text,
add column if not exists meeting_day text,
add column if not exists join_policy text default 'invite_code';

alter table public.chapters
drop constraint if exists chapters_join_policy_check;

alter table public.chapters
add constraint chapters_join_policy_check
check (join_policy in ('invite_code', 'request', 'open'));

update public.chapters
set join_policy = case
  when coalesce(public_join_enabled, false) then 'open'
  when join_policy is null then 'invite_code'
  else join_policy
end;

create index if not exists chapters_is_public_idx on public.chapters(is_public);
create index if not exists chapters_country_idx on public.chapters(country);
create index if not exists chapters_region_idx on public.chapters(region);
create index if not exists chapters_latitude_longitude_idx on public.chapters(latitude, longitude);

drop policy if exists "Authenticated users can read public chapter directory" on public.chapters;
drop policy if exists "Authenticated users can read public chapters" on public.chapters;
create policy "Authenticated users can read public chapters"
on public.chapters
for select
to authenticated
using (is_public = true);

drop policy if exists "Chapter members can read memberships in their chapter" on public.chapter_members;
drop policy if exists "Users can read their own chapter membership" on public.chapter_members;
create policy "Users can read their own chapter membership"
on public.chapter_members
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "Admins can insert chapter memberships" on public.chapter_members;
create policy "Admins can insert chapter memberships"
on public.chapter_members
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update chapter memberships" on public.chapter_members;
create policy "Admins can update chapter memberships"
on public.chapter_members
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete chapter memberships" on public.chapter_members;
create policy "Admins can delete chapter memberships"
on public.chapter_members
for delete
to authenticated
using (public.is_admin());

create table if not exists public.chapter_join_requests (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  message text,
  created_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null
);

create unique index if not exists chapter_join_requests_pending_unique_idx
on public.chapter_join_requests(chapter_id, profile_id)
where status = 'pending';

create index if not exists chapter_join_requests_chapter_id_idx
on public.chapter_join_requests(chapter_id);

create index if not exists chapter_join_requests_profile_id_idx
on public.chapter_join_requests(profile_id);

alter table public.chapter_join_requests enable row level security;

drop policy if exists "Users can create their own chapter join requests" on public.chapter_join_requests;
create policy "Users can create their own chapter join requests"
on public.chapter_join_requests
for insert
to authenticated
with check (
  profile_id = (select auth.uid())
  and status = 'pending'
  and exists (
    select 1
    from public.chapters c
    where c.id = chapter_join_requests.chapter_id
      and c.is_public = true
      and c.join_policy = 'request'
  )
);

drop policy if exists "Users can read their own chapter join requests" on public.chapter_join_requests;
create policy "Users can read their own chapter join requests"
on public.chapter_join_requests
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "Facilitators can read requests for their chapter" on public.chapter_join_requests;
create policy "Facilitators can read requests for their chapter"
on public.chapter_join_requests
for select
to authenticated
using (public.is_chapter_facilitator(chapter_id));

drop policy if exists "Facilitators can review requests for their chapter" on public.chapter_join_requests;
create policy "Facilitators can review requests for their chapter"
on public.chapter_join_requests
for update
to authenticated
using (public.is_chapter_facilitator(chapter_id))
with check (
  public.is_chapter_facilitator(chapter_id)
  and status in ('approved', 'rejected')
  and reviewed_by = (select auth.uid())
  and reviewed_at is not null
);

drop policy if exists "Admins can manage all chapter join requests" on public.chapter_join_requests;
create policy "Admins can manage all chapter join requests"
on public.chapter_join_requests
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Facilitators can read join request profiles" on public.profiles;
create policy "Facilitators can read join request profiles"
on public.profiles
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.chapter_join_requests jr
    where jr.profile_id = profiles.id
      and public.is_chapter_facilitator(jr.chapter_id)
  )
);

drop function if exists public.get_public_chapter_directory(text);

create function public.get_public_chapter_directory(search_text text default null)
returns table (
  id uuid,
  name text,
  country text,
  region text,
  latitude numeric,
  longitude numeric,
  is_public boolean,
  public_join_enabled boolean,
  join_policy text,
  description text,
  meeting_location text,
  meeting_day text,
  member_count integer
)
language sql
security definer
set search_path = public
as $$
  select
    c.id,
    c.name,
    c.country,
    c.region,
    c.latitude,
    c.longitude,
    c.is_public,
    (coalesce(c.join_policy, 'invite_code') = 'open') as public_join_enabled,
    coalesce(c.join_policy, 'invite_code') as join_policy,
    c.description,
    c.meeting_location,
    c.meeting_day,
    count(cm.id)::integer as member_count
  from public.chapters c
  left join public.chapter_members cm
    on cm.chapter_id = c.id
  where c.is_public = true
    and (
      search_text is null
      or trim(search_text) = ''
      or c.country ilike '%' || trim(search_text) || '%'
      or c.region ilike '%' || trim(search_text) || '%'
      or c.name ilike '%' || trim(search_text) || '%'
    )
  group by c.id
  order by c.country nulls last, c.region nulls last, c.name;
$$;

revoke all on function public.get_public_chapter_directory(text) from public;
grant execute on function public.get_public_chapter_directory(text) to authenticated;

create or replace function public.join_public_chapter(target_chapter_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  joinable_chapter_id uuid;
begin
  select c.id
  into joinable_chapter_id
  from public.chapters c
  where c.id = target_chapter_id
    and c.is_public = true
    and c.join_policy = 'open';

  if joinable_chapter_id is null then
    raise exception 'This chapter is not open for public joining'
      using errcode = 'P0001';
  end if;

  insert into public.chapter_members (chapter_id, profile_id, role)
  values (joinable_chapter_id, (select auth.uid()), 'member')
  on conflict (chapter_id, profile_id) do nothing;

  return joinable_chapter_id;
end;
$$;

revoke all on function public.join_public_chapter(uuid) from public;
grant execute on function public.join_public_chapter(uuid) to authenticated;

create or replace function public.request_chapter_join(
  target_chapter_id uuid,
  request_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_request_id uuid;
  next_request_id uuid;
begin
  if not exists (
    select 1
    from public.chapters c
    where c.id = target_chapter_id
      and c.is_public = true
      and c.join_policy = 'request'
  ) then
    raise exception 'This chapter is not accepting join requests'
      using errcode = 'P0001';
  end if;

  select jr.id
  into existing_request_id
  from public.chapter_join_requests jr
  where jr.chapter_id = target_chapter_id
    and jr.profile_id = (select auth.uid())
    and jr.status = 'pending'
  limit 1;

  if existing_request_id is not null then
    return existing_request_id;
  end if;

  insert into public.chapter_join_requests (chapter_id, profile_id, message)
  values (target_chapter_id, (select auth.uid()), nullif(trim(request_message), ''))
  returning id into next_request_id;

  return next_request_id;
end;
$$;

revoke all on function public.request_chapter_join(uuid, text) from public;
grant execute on function public.request_chapter_join(uuid, text) to authenticated;

create or replace function public.review_chapter_join_request(
  target_request_id uuid,
  next_status text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.chapter_join_requests%rowtype;
begin
  if next_status not in ('approved', 'rejected') then
    raise exception 'Join request status must be approved or rejected'
      using errcode = 'P0001';
  end if;

  select *
  into request_row
  from public.chapter_join_requests
  where id = target_request_id
  for update;

  if request_row.id is null then
    raise exception 'Join request not found'
      using errcode = 'P0001';
  end if;

  if not (public.is_admin() or public.is_chapter_facilitator(request_row.chapter_id)) then
    raise exception 'Not authorized to review this request'
      using errcode = '42501';
  end if;

  update public.chapter_join_requests
  set
    status = next_status,
    reviewed_at = now(),
    reviewed_by = (select auth.uid())
  where id = target_request_id;

  if next_status = 'approved' then
    insert into public.chapter_members (chapter_id, profile_id, role)
    values (request_row.chapter_id, request_row.profile_id, 'member')
    on conflict (chapter_id, profile_id) do nothing;
  end if;

  return target_request_id;
end;
$$;

revoke all on function public.review_chapter_join_request(uuid, text) from public;
grant execute on function public.review_chapter_join_request(uuid, text) to authenticated;
