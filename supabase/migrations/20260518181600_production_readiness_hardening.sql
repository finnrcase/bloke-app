-- Production-readiness hardening: explicit indexes, safer invite joins,
-- role escalation protection, and admin-aware post creation.

create index if not exists profiles_id_idx on public.profiles(id);
create index if not exists chapter_members_profile_id_idx on public.chapter_members(profile_id);
create index if not exists chapter_members_chapter_id_idx on public.chapter_members(chapter_id);
create index if not exists weekly_progress_profile_week_idx on public.weekly_progress(profile_id, week_number);
create index if not exists journal_logs_profile_week_idx on public.journal_logs(profile_id, week_number);
create index if not exists user_badges_profile_id_idx on public.user_badges(profile_id);
create index if not exists chapter_posts_chapter_id_idx on public.chapter_posts(chapter_id);

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
      and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.role is null then
      new.role := 'participant';
    elsif new.role <> 'participant' and not public.is_admin() then
      new.role := 'participant';
    end if;

    return new;
  end if;

  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only admins can change profile roles'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_role_before_write on public.profiles;
create trigger protect_profile_role_before_write
before insert or update on public.profiles
for each row
execute function public.protect_profile_role();

revoke all on function public.protect_profile_role() from public;

create or replace function public.join_chapter_by_invite_code(target_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_chapter_id uuid;
begin
  select c.id
  into target_chapter_id
  from public.chapters c
  where lower(c.invite_code) = lower(trim(target_invite_code));

  if target_chapter_id is null then
    raise exception 'Invalid chapter invite code'
      using errcode = 'P0001';
  end if;

  insert into public.chapter_members (chapter_id, profile_id, role)
  values (target_chapter_id, (select auth.uid()), 'member')
  on conflict (chapter_id, profile_id) do nothing;

  return target_chapter_id;
end;
$$;

revoke all on function public.join_chapter_by_invite_code(text) from public;
grant execute on function public.join_chapter_by_invite_code(text) to authenticated;

drop policy if exists "Facilitators can create chapter posts" on public.chapter_posts;
create policy "Facilitators and admins can create chapter posts"
on public.chapter_posts
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and (
    public.is_chapter_facilitator(chapter_id)
    or public.is_admin()
  )
);

create or replace function public.award_eligible_badges(target_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  completed_weeks integer[];
  streak integer := 0;
  week_cursor integer;
  has_attendance boolean;
  earned_codes text[] := '{}';
begin
  select coalesce(array_agg(week_number order by week_number), '{}')
  into completed_weeks
  from public.weekly_progress
  where profile_id = target_profile_id
    and learn_complete and act_complete and log_complete;

  if   1 = any(completed_weeks) then earned_codes := earned_codes || 'milestone_initiate';   end if;
  if   5 = any(completed_weeks) then earned_codes := earned_codes || 'milestone_showing_up'; end if;
  if  10 = any(completed_weeks) then earned_codes := earned_codes || 'milestone_reliable';   end if;
  if  25 = any(completed_weeks) then earned_codes := earned_codes || 'milestone_grounded';   end if;
  if  50 = any(completed_weeks) then earned_codes := earned_codes || 'milestone_capable';    end if;
  if  75 = any(completed_weeks) then earned_codes := earned_codes || 'milestone_leader';     end if;
  if 100 = any(completed_weeks) then earned_codes := earned_codes || 'completion_builder';   end if;

  if 2 = any(completed_weeks) then earned_codes := earned_codes || 'integrity';   end if;
  if 3 = any(completed_weeks) then earned_codes := earned_codes || 'environment'; end if;
  if 4 = any(completed_weeks) then earned_codes := earned_codes || 'discipline';  end if;

  if array_length(completed_weeks, 1) is not null then
    week_cursor := completed_weeks[array_length(completed_weeks, 1)];
    while week_cursor > 0 and week_cursor = any(completed_weeks) loop
      streak := streak + 1;
      week_cursor := week_cursor - 1;
    end loop;
  end if;

  if streak >=  3 then earned_codes := earned_codes || 'consistency_bronze'; end if;
  if streak >=  5 then earned_codes := earned_codes || 'consistency_silver'; end if;
  if streak >= 10 then earned_codes := earned_codes || 'consistency_gold';   end if;

  select exists (
    select 1
    from public.attendance a
    join public.chapter_members cm
      on cm.chapter_id = a.chapter_id and cm.profile_id = a.profile_id
    where a.profile_id = target_profile_id
  ) into has_attendance;

  if has_attendance then earned_codes := earned_codes || 'brotherhood'; end if;

  insert into public.user_badges (profile_id, badge_id)
  select target_profile_id, b.id
  from public.badges b
  where b.code = any(earned_codes)
  on conflict (profile_id, badge_id) do nothing;
end;
$$;

revoke all on function public.award_eligible_badges(uuid) from public;
