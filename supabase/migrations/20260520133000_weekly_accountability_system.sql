-- Weekly accountability check-ins power goals, workout tracking, habits,
-- streaks, consistency percentage, and chapter leaderboards.

create table if not exists public.weekly_checkins (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,
  weekly_goal text not null,
  workout_target integer not null default 3 check (workout_target > 0),
  workout_completed integer not null default 0 check (workout_completed >= 0),
  habit_name text not null,
  habit_target integer not null default 7 check (habit_target > 0),
  habit_completed integer not null default 0 check (habit_completed >= 0),
  reflection text,
  consistency_score integer not null default 0 check (consistency_score between 0 and 100),
  submitted_at timestamptz,
  created_at timestamptz default now(),
  constraint weekly_checkins_profile_week_unique unique (profile_id, week_start)
);

create index if not exists weekly_checkins_profile_id_idx
on public.weekly_checkins(profile_id);

create index if not exists weekly_checkins_week_start_idx
on public.weekly_checkins(week_start desc);

alter table public.weekly_checkins enable row level security;

drop policy if exists "Users can read their own weekly checkins" on public.weekly_checkins;
create policy "Users can read their own weekly checkins"
on public.weekly_checkins
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "Chapter members can read chapter weekly checkins" on public.weekly_checkins;
create policy "Chapter members can read chapter weekly checkins"
on public.weekly_checkins
for select
to authenticated
using (
  exists (
    select 1
    from public.chapter_members viewer
    join public.chapter_members target
      on target.chapter_id = viewer.chapter_id
    where (viewer.profile_id = (select auth.uid()) or viewer.user_id = (select auth.uid()))
      and viewer.status = 'active'
      and target.status = 'active'
      and (target.profile_id = weekly_checkins.profile_id or target.user_id = weekly_checkins.profile_id)
  )
);

drop policy if exists "Users can insert their own weekly checkins" on public.weekly_checkins;
create policy "Users can insert their own weekly checkins"
on public.weekly_checkins
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "Users can update their own weekly checkins" on public.weekly_checkins;
create policy "Users can update their own weekly checkins"
on public.weekly_checkins
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));
