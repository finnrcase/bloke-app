create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  age integer,
  country text,
  language text default 'en',
  role text check (role in ('participant', 'facilitator', 'admin')),
  onboarding_complete boolean default false,
  created_at timestamptz default now()
);

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text,
  region text,
  invite_code text unique not null,
  facilitator_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table public.chapter_members (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid references public.chapters(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  role text check (role in ('member', 'facilitator')),
  joined_at timestamptz default now(),
  unique (chapter_id, profile_id)
);

create table public.curriculum_weeks (
  id uuid primary key default gen_random_uuid(),
  week_number integer unique not null,
  title text not null,
  identity_statement text,
  learn_text text,
  act_text text,
  log_prompts jsonb,
  milestone_name text,
  created_at timestamptz default now()
);

create table public.weekly_progress (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  week_number integer references public.curriculum_weeks(week_number) on delete cascade,
  learn_complete boolean default false,
  act_complete boolean default false,
  log_complete boolean default false,
  submitted_at timestamptz,
  created_at timestamptz default now(),
  unique (profile_id, week_number)
);

create table public.journal_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  week_number integer,
  answers jsonb,
  created_at timestamptz default now()
);

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text,
  identity_statement text,
  category text,
  level text
);

create table public.user_badges (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  badge_id uuid references public.badges(id) on delete cascade,
  earned_at timestamptz default now(),
  unique (profile_id, badge_id)
);

create table public.chapter_posts (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid references public.chapters(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete cascade,
  title text,
  body text,
  post_type text check (post_type in ('announcement', 'weekly_prompt', 'win')),
  created_at timestamptz default now()
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid references public.chapters(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  attended_at timestamptz default now()
);

create index chapter_members_chapter_id_idx on public.chapter_members(chapter_id);
create index chapter_members_profile_id_idx on public.chapter_members(profile_id);
create index chapters_facilitator_id_idx on public.chapters(facilitator_id);
create index weekly_progress_profile_id_idx on public.weekly_progress(profile_id);
create index journal_logs_profile_id_idx on public.journal_logs(profile_id);
create index user_badges_profile_id_idx on public.user_badges(profile_id);
create index chapter_posts_chapter_id_idx on public.chapter_posts(chapter_id);
create index attendance_chapter_id_idx on public.attendance(chapter_id);
create index attendance_profile_id_idx on public.attendance(profile_id);

alter table public.profiles enable row level security;
alter table public.chapters enable row level security;
alter table public.chapter_members enable row level security;
alter table public.curriculum_weeks enable row level security;
alter table public.weekly_progress enable row level security;
alter table public.journal_logs enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.chapter_posts enable row level security;
alter table public.attendance enable row level security;

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
      and cm.profile_id = auth.uid()
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
      and cm.profile_id = auth.uid()
      and cm.role = 'facilitator'
  )
  or exists (
    select 1
    from public.chapters c
    where c.id = target_chapter_id
      and c.facilitator_id = auth.uid()
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
    where facilitator_membership.profile_id = auth.uid()
      and facilitator_membership.role = 'facilitator'
      and target_membership.profile_id = target_profile_id
  )
  or exists (
    select 1
    from public.chapters c
    join public.chapter_members target_membership
      on target_membership.chapter_id = c.id
    where c.facilitator_id = auth.uid()
      and target_membership.profile_id = target_profile_id
  );
$$;

revoke all on function public.is_chapter_member(uuid) from public;
revoke all on function public.is_chapter_facilitator(uuid) from public;
revoke all on function public.is_facilitator_for_profile(uuid) from public;

grant execute on function public.is_chapter_member(uuid) to authenticated;
grant execute on function public.is_chapter_facilitator(uuid) to authenticated;
grant execute on function public.is_facilitator_for_profile(uuid) to authenticated;

create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "Facilitators can read member profiles in their chapters"
on public.profiles
for select
to authenticated
using (public.is_facilitator_for_profile(id));

create policy "Users can insert their own profile"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Users can read curriculum"
on public.curriculum_weeks
for select
to authenticated
using (true);

create policy "Users can read their own weekly progress"
on public.weekly_progress
for select
to authenticated
using (profile_id = auth.uid());

create policy "Users can insert their own weekly progress"
on public.weekly_progress
for insert
to authenticated
with check (profile_id = auth.uid());

create policy "Users can update their own weekly progress"
on public.weekly_progress
for update
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

create policy "Users can read their own journal logs"
on public.journal_logs
for select
to authenticated
using (profile_id = auth.uid());

create policy "Users can insert their own journal logs"
on public.journal_logs
for insert
to authenticated
with check (profile_id = auth.uid());

create policy "Users can update their own journal logs"
on public.journal_logs
for update
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

create policy "Users can read badges they earned"
on public.badges
for select
to authenticated
using (
  exists (
    select 1
    from public.user_badges ub
    where ub.badge_id = badges.id
      and ub.profile_id = auth.uid()
  )
);

create policy "Users can read their own user badges"
on public.user_badges
for select
to authenticated
using (profile_id = auth.uid());

create policy "Chapter members can read their chapter"
on public.chapters
for select
to authenticated
using (
  facilitator_id = auth.uid()
  or public.is_chapter_member(id)
);

create policy "Chapter members can read memberships in their chapter"
on public.chapter_members
for select
to authenticated
using (public.is_chapter_member(chapter_id));

create policy "Facilitators can read members in their chapter"
on public.chapter_members
for select
to authenticated
using (public.is_chapter_facilitator(chapter_id));

create policy "Chapter members can read chapter posts"
on public.chapter_posts
for select
to authenticated
using (
  public.is_chapter_member(chapter_id)
  or public.is_chapter_facilitator(chapter_id)
);

create policy "Facilitators can create chapter posts"
on public.chapter_posts
for insert
to authenticated
with check (
  author_id = auth.uid()
  and public.is_chapter_facilitator(chapter_id)
);

create policy "Users can read their own attendance"
on public.attendance
for select
to authenticated
using (profile_id = auth.uid());

create policy "Facilitators can read attendance in their chapter"
on public.attendance
for select
to authenticated
using (public.is_chapter_facilitator(chapter_id));
