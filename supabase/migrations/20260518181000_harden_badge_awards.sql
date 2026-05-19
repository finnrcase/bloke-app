-- Server-owned badge awarding. Removes the client's ability to self-award badges.

-- Drop the redundant SELECT policy on badges (shadowed by "Users can read badge definitions").
drop policy if exists "Users can read badges they earned" on public.badges;

-- Remove the client INSERT path on user_badges. Awards now happen only via trigger.
drop policy if exists "Users can insert their own user badges" on public.user_badges;

-- Idempotent badge evaluation for one profile. SECURITY DEFINER so it can write
-- user_badges regardless of the (now insert-less) RLS policy set.
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
  -- Weeks where learn + act + log are all complete.
  select coalesce(array_agg(week_number order by week_number), '{}')
  into completed_weeks
  from public.weekly_progress
  where profile_id = target_profile_id
    and learn_complete and act_complete and log_complete;

  -- Milestone badges: tied to completing a specific week.
  if  1 = any(completed_weeks) then earned_codes := earned_codes || 'milestone_initiate';   end if;
  if  5 = any(completed_weeks) then earned_codes := earned_codes || 'milestone_showing_up'; end if;
  if 10 = any(completed_weeks) then earned_codes := earned_codes || 'milestone_reliable';   end if;
  if 25 = any(completed_weeks) then earned_codes := earned_codes || 'milestone_grounded';   end if;
  if 50 = any(completed_weeks) then earned_codes := earned_codes || 'milestone_capable';    end if;
  if 75 = any(completed_weeks) then earned_codes := earned_codes || 'milestone_leader';     end if;

  -- Category badges: tied to specific weeks.
  if 2 = any(completed_weeks) then earned_codes := earned_codes || 'integrity';   end if;
  if 3 = any(completed_weeks) then earned_codes := earned_codes || 'environment'; end if;
  if 4 = any(completed_weeks) then earned_codes := earned_codes || 'discipline';  end if;

  -- Streak: consecutive completed weeks ending at the highest completed week.
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

  -- Brotherhood: any attendance record in a chapter the user belongs to.
  select exists (
    select 1
    from public.attendance a
    join public.chapter_members cm
      on cm.chapter_id = a.chapter_id and cm.profile_id = a.profile_id
    where a.profile_id = target_profile_id
  ) into has_attendance;

  if has_attendance then earned_codes := earned_codes || 'brotherhood'; end if;

  -- Insert missing awards; unique (profile_id, badge_id) keeps this idempotent.
  insert into public.user_badges (profile_id, badge_id)
  select target_profile_id, b.id
  from public.badges b
  where b.code = any(earned_codes)
  on conflict (profile_id, badge_id) do nothing;
end;
$$;

revoke all on function public.award_eligible_badges(uuid) from public;
-- Not granted to authenticated: only the SECURITY DEFINER triggers below invoke it.

create or replace function public.trg_award_badges_weekly_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.award_eligible_badges(new.profile_id);
  return new;
end;
$$;

create or replace function public.trg_award_badges_attendance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.award_eligible_badges(new.profile_id);
  return new;
end;
$$;

-- Only fires when a week is actually complete (null flags -> false -> no fire).
create trigger award_badges_after_weekly_progress
after insert or update on public.weekly_progress
for each row
when (new.learn_complete and new.act_complete and new.log_complete)
execute function public.trg_award_badges_weekly_progress();

create trigger award_badges_after_attendance
after insert on public.attendance
for each row
execute function public.trg_award_badges_attendance();
