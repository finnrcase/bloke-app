-- Role-based permissions for Bloke.
--
-- New app roles:
-- - user
-- - chapter_member
-- - chapter_leader
-- - global_admin
--
-- Existing MVP role values remain accepted for compatibility:
-- participant => user, member => chapter_member, facilitator => chapter_leader,
-- admin => global_admin.

alter table public.profiles
drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check
check (role in ('user', 'chapter_member', 'chapter_leader', 'global_admin', 'participant', 'facilitator', 'admin'));

alter table public.chapter_members
drop constraint if exists chapter_members_role_check;

alter table public.chapter_members
add constraint chapter_members_role_check
check (role in ('chapter_member', 'chapter_leader', 'member', 'facilitator'));

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('global_admin', 'admin')
  );
$$;

create or replace function public.is_chapter_leader(target_chapter_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chapter_members cm
    where cm.chapter_id = target_chapter_id
      and (cm.profile_id = (select auth.uid()) or cm.user_id = (select auth.uid()))
      and cm.role in ('chapter_leader', 'facilitator')
      and coalesce(cm.status, 'active') = 'active'
  )
  or exists (
    select 1
    from public.chapters c
    where c.id = target_chapter_id
      and (c.facilitator_id = (select auth.uid()) or c.created_by = (select auth.uid()))
  );
$$;

create or replace function public.can_manage_chapter(target_chapter_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.is_admin() or public.is_chapter_leader(target_chapter_id);
$$;

create or replace function public.is_chapter_facilitator(target_chapter_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.is_chapter_leader(target_chapter_id);
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_chapter_leader(uuid) from public;
revoke all on function public.can_manage_chapter(uuid) from public;
revoke all on function public.is_chapter_facilitator(uuid) from public;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_chapter_leader(uuid) to authenticated;
grant execute on function public.can_manage_chapter(uuid) to authenticated;
grant execute on function public.is_chapter_facilitator(uuid) to authenticated;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.role is null then
      new.role := 'user';
    elsif new.role not in ('user', 'participant') and not public.is_admin() then
      new.role := 'user';
    end if;

    return new;
  end if;

  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only global admins can change profile roles'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

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
    'user',
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

drop policy if exists "Admins can create chapters" on public.chapters;
create policy "Global admins can create chapters"
on public.chapters
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update chapters" on public.chapters;
drop policy if exists "Facilitators can update their chapters" on public.chapters;
create policy "Chapter managers can update chapters"
on public.chapters
for update
to authenticated
using (public.can_manage_chapter(id))
with check (public.can_manage_chapter(id));

drop policy if exists "Chapter facilitators can create invite codes" on public.invite_codes;
create policy "Chapter managers can create invite codes"
on public.invite_codes
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and public.can_manage_chapter(chapter_id)
);

drop policy if exists "Chapter facilitators can update invite codes" on public.invite_codes;
create policy "Chapter managers can update invite codes"
on public.invite_codes
for update
to authenticated
using (public.can_manage_chapter(chapter_id))
with check (public.can_manage_chapter(chapter_id));

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

  if not public.can_manage_chapter(request_row.chapter_id) then
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
    insert into public.chapter_members (chapter_id, profile_id, user_id, role, status)
    values (request_row.chapter_id, request_row.profile_id, request_row.profile_id, 'chapter_member', 'active')
    on conflict (chapter_id, profile_id) do update
    set status = 'active',
        role = coalesce(public.chapter_members.role, 'chapter_member');
  end if;

  return target_request_id;
end;
$$;

revoke all on function public.review_chapter_join_request(uuid, text) from public;
grant execute on function public.review_chapter_join_request(uuid, text) to authenticated;
