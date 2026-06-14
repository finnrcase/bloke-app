-- Structured interests and goals.
--
-- Adds canonical option tables and private per-profile selections capped at 5
-- each. Admin reporting functions return aggregate counts only.

create table if not exists public.interest_options (
  id text primary key,
  label text not null,
  sort_order integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint interest_options_id_format_check check (id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint interest_options_label_length_check check (char_length(trim(label)) between 1 and 80)
);

create table if not exists public.goal_options (
  id text primary key,
  label text not null,
  sort_order integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint goal_options_id_format_check check (id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint goal_options_label_length_check check (char_length(trim(label)) between 1 and 100)
);

insert into public.interest_options (id, label, sort_order)
values
  ('fitness', 'Fitness', 10),
  ('entrepreneurship', 'Entrepreneurship', 20),
  ('leadership', 'Leadership', 30),
  ('faith', 'Faith', 40),
  ('career-growth', 'Career Growth', 50),
  ('public-speaking', 'Public Speaking', 60),
  ('finance', 'Finance', 70),
  ('relationships', 'Relationships', 80),
  ('mental-health', 'Mental Health', 90),
  ('adventure', 'Adventure', 100)
on conflict (id) do update
set
  label = excluded.label,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.goal_options (id, label, sort_order)
values
  ('build-a-business', 'Build a business', 10),
  ('improve-fitness', 'Improve fitness', 20),
  ('become-a-leader', 'Become a leader', 30),
  ('improve-confidence', 'Improve confidence', 40),
  ('find-a-mentor', 'Find a mentor', 50),
  ('grow-career', 'Grow career', 60),
  ('improve-relationships', 'Improve relationships', 70)
on conflict (id) do update
set
  label = excluded.label,
  sort_order = excluded.sort_order,
  is_active = true;

create table if not exists public.profile_interests (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  interest_id text not null references public.interest_options(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (profile_id, interest_id)
);

create table if not exists public.profile_goals (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  goal_id text not null references public.goal_options(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (profile_id, goal_id)
);

alter table public.interest_options enable row level security;
alter table public.goal_options enable row level security;
alter table public.profile_interests enable row level security;
alter table public.profile_goals enable row level security;

create index if not exists interest_options_active_sort_idx on public.interest_options(is_active, sort_order);
create index if not exists goal_options_active_sort_idx on public.goal_options(is_active, sort_order);
create index if not exists profile_interests_interest_id_idx on public.profile_interests(interest_id);
create index if not exists profile_goals_goal_id_idx on public.profile_goals(goal_id);
create index if not exists profile_interests_profile_id_idx on public.profile_interests(profile_id);
create index if not exists profile_goals_profile_id_idx on public.profile_goals(profile_id);

create or replace function public.enforce_profile_interest_limit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (
    select count(*)
    from public.profile_interests pi
    where pi.profile_id = new.profile_id
      and pi.interest_id <> new.interest_id
  ) >= 5 then
    raise exception 'Select up to 5 interests.';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_profile_goal_limit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (
    select count(*)
    from public.profile_goals pg
    where pg.profile_id = new.profile_id
      and pg.goal_id <> new.goal_id
  ) >= 5 then
    raise exception 'Select up to 5 goals.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_profile_interest_limit_before_write on public.profile_interests;
create trigger enforce_profile_interest_limit_before_write
before insert or update on public.profile_interests
for each row execute function public.enforce_profile_interest_limit();

drop trigger if exists enforce_profile_goal_limit_before_write on public.profile_goals;
create trigger enforce_profile_goal_limit_before_write
before insert or update on public.profile_goals
for each row execute function public.enforce_profile_goal_limit();

insert into public.profile_interests (profile_id, interest_id)
select profile_id, id
from (
  select
    pd.profile_id,
    io.id,
    row_number() over (partition by pd.profile_id order by io.sort_order) as selection_rank
  from public.profile_details pd
  cross join lateral unnest(coalesce(pd.interests, '{}'::text[])) as legacy_interest(label)
  join public.interest_options io on lower(io.label) = lower(trim(legacy_interest.label))
) ranked_interests
where selection_rank <= 5
on conflict do nothing;

insert into public.profile_goals (profile_id, goal_id)
select profile_id, id
from (
  select
    pd.profile_id,
    go.id,
    row_number() over (partition by pd.profile_id order by go.sort_order) as selection_rank
  from public.profile_details pd
  cross join lateral unnest(coalesce(pd.goals, '{}'::text[])) as legacy_goal(label)
  join public.goal_options go on lower(go.label) = lower(trim(legacy_goal.label))
) ranked_goals
where selection_rank <= 5
on conflict do nothing;

drop policy if exists "Anyone can read active interest options" on public.interest_options;
create policy "Anyone can read active interest options"
on public.interest_options
for select
to anon, authenticated
using (is_active = true or public.is_admin());

drop policy if exists "Admins can manage interest options" on public.interest_options;
create policy "Admins can manage interest options"
on public.interest_options
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Anyone can read active goal options" on public.goal_options;
create policy "Anyone can read active goal options"
on public.goal_options
for select
to anon, authenticated
using (is_active = true or public.is_admin());

drop policy if exists "Admins can manage goal options" on public.goal_options;
create policy "Admins can manage goal options"
on public.goal_options
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Users and admins can read profile interests" on public.profile_interests;
create policy "Users and admins can read profile interests"
on public.profile_interests
for select
to authenticated
using (profile_id = (select auth.uid()) or public.is_admin());

drop policy if exists "Users and admins can insert profile interests" on public.profile_interests;
create policy "Users and admins can insert profile interests"
on public.profile_interests
for insert
to authenticated
with check (profile_id = (select auth.uid()) or public.is_admin());

drop policy if exists "Users and admins can delete profile interests" on public.profile_interests;
create policy "Users and admins can delete profile interests"
on public.profile_interests
for delete
to authenticated
using (profile_id = (select auth.uid()) or public.is_admin());

drop policy if exists "Users and admins can read profile goals" on public.profile_goals;
create policy "Users and admins can read profile goals"
on public.profile_goals
for select
to authenticated
using (profile_id = (select auth.uid()) or public.is_admin());

drop policy if exists "Users and admins can insert profile goals" on public.profile_goals;
create policy "Users and admins can insert profile goals"
on public.profile_goals
for insert
to authenticated
with check (profile_id = (select auth.uid()) or public.is_admin());

drop policy if exists "Users and admins can delete profile goals" on public.profile_goals;
create policy "Users and admins can delete profile goals"
on public.profile_goals
for delete
to authenticated
using (profile_id = (select auth.uid()) or public.is_admin());

drop policy if exists "Authenticated users can read profile details" on public.profile_details;

drop policy if exists "Users and admins can read profile details" on public.profile_details;
create policy "Users and admins can read profile details"
on public.profile_details
for select
to authenticated
using (profile_id = (select auth.uid()) or public.is_admin());

create or replace function public.save_my_profile_structured_selections(
  interest_ids text[],
  goal_ids text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile_id uuid := (select auth.uid());
  normalized_interest_ids text[];
  normalized_goal_ids text[];
  requested_interest_count integer;
  requested_goal_count integer;
  next_interest_labels text[];
  next_goal_labels text[];
begin
  if current_profile_id is null then
    raise exception 'You must be signed in to save selections.';
  end if;

  select count(distinct input_id)
  into requested_interest_count
  from unnest(coalesce(interest_ids, '{}'::text[])) as input_id
  where nullif(trim(input_id), '') is not null;

  select count(distinct input_id)
  into requested_goal_count
  from unnest(coalesce(goal_ids, '{}'::text[])) as input_id
  where nullif(trim(input_id), '') is not null;

  if requested_interest_count > 5 then
    raise exception 'Select up to 5 interests.';
  end if;

  if requested_goal_count > 5 then
    raise exception 'Select up to 5 goals.';
  end if;

  select coalesce(array_agg(io.id order by io.sort_order), '{}'::text[])
  into normalized_interest_ids
  from (
    select distinct trim(input_id) as id
    from unnest(coalesce(interest_ids, '{}'::text[])) as input_id
    where nullif(trim(input_id), '') is not null
  ) requested
  join public.interest_options io on io.id = requested.id and io.is_active = true;

  select coalesce(array_agg(go.id order by go.sort_order), '{}'::text[])
  into normalized_goal_ids
  from (
    select distinct trim(input_id) as id
    from unnest(coalesce(goal_ids, '{}'::text[])) as input_id
    where nullif(trim(input_id), '') is not null
  ) requested
  join public.goal_options go on go.id = requested.id and go.is_active = true;

  if cardinality(normalized_interest_ids) <> requested_interest_count then
    raise exception 'One or more interests are not available.';
  end if;

  if cardinality(normalized_goal_ids) <> requested_goal_count then
    raise exception 'One or more goals are not available.';
  end if;

  delete from public.profile_interests where profile_id = current_profile_id;
  delete from public.profile_goals where profile_id = current_profile_id;

  insert into public.profile_interests (profile_id, interest_id)
  select current_profile_id, id
  from unnest(normalized_interest_ids) as id;

  insert into public.profile_goals (profile_id, goal_id)
  select current_profile_id, id
  from unnest(normalized_goal_ids) as id;

  select coalesce(array_agg(io.label order by io.sort_order), '{}'::text[])
  into next_interest_labels
  from public.interest_options io
  where io.id = any(normalized_interest_ids);

  select coalesce(array_agg(go.label order by go.sort_order), '{}'::text[])
  into next_goal_labels
  from public.goal_options go
  where go.id = any(normalized_goal_ids);

  insert into public.profile_details (profile_id, interests, goals)
  values (current_profile_id, next_interest_labels, next_goal_labels)
  on conflict (profile_id) do update
  set
    interests = excluded.interests,
    goals = excluded.goals;
end;
$$;

create or replace function public.get_admin_profile_interest_stats(limit_count integer default 10)
returns table (
  id text,
  label text,
  selection_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  return query
  select
    io.id,
    io.label,
    count(pi.profile_id)::bigint as selection_count
  from public.interest_options io
  left join public.profile_interests pi on pi.interest_id = io.id
  where io.is_active = true
  group by io.id, io.label, io.sort_order
  order by selection_count desc, io.sort_order
  limit greatest(1, least(coalesce(limit_count, 10), 50));
end;
$$;

create or replace function public.get_admin_profile_goal_stats(limit_count integer default 10)
returns table (
  id text,
  label text,
  selection_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  return query
  select
    go.id,
    go.label,
    count(pg.profile_id)::bigint as selection_count
  from public.goal_options go
  left join public.profile_goals pg on pg.goal_id = go.id
  where go.is_active = true
  group by go.id, go.label, go.sort_order
  order by selection_count desc, go.sort_order
  limit greatest(1, least(coalesce(limit_count, 10), 50));
end;
$$;

create or replace function public.get_admin_profile_geographic_trends(limit_count integer default 10)
returns table (
  city text,
  state text,
  member_count bigint,
  top_interest text,
  top_goal text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  return query
  with profile_locations as (
    select
      p.id,
      coalesce(nullif(trim(p.city), ''), 'Unknown') as city,
      coalesce(nullif(trim(p.state), ''), '') as state
    from public.profiles p
  ),
  grouped_locations as (
    select
      pl.city,
      pl.state,
      count(*)::bigint as member_count
    from profile_locations pl
    group by pl.city, pl.state
  )
  select
    gl.city,
    gl.state,
    gl.member_count,
    (
      select io.label
      from profile_locations pl
      join public.profile_interests pi on pi.profile_id = pl.id
      join public.interest_options io on io.id = pi.interest_id
      where pl.city = gl.city
        and pl.state = gl.state
      group by io.label, io.sort_order
      order by count(*) desc, io.sort_order
      limit 1
    ) as top_interest,
    (
      select go.label
      from profile_locations pl
      join public.profile_goals pg on pg.profile_id = pl.id
      join public.goal_options go on go.id = pg.goal_id
      where pl.city = gl.city
        and pl.state = gl.state
      group by go.label, go.sort_order
      order by count(*) desc, go.sort_order
      limit 1
    ) as top_goal
  from grouped_locations gl
  order by gl.member_count desc, gl.city, gl.state
  limit greatest(1, least(coalesce(limit_count, 10), 50));
end;
$$;

revoke all on function public.save_my_profile_structured_selections(text[], text[]) from public;
revoke all on function public.get_admin_profile_interest_stats(integer) from public;
revoke all on function public.get_admin_profile_goal_stats(integer) from public;
revoke all on function public.get_admin_profile_geographic_trends(integer) from public;

grant execute on function public.save_my_profile_structured_selections(text[], text[]) to authenticated;
grant execute on function public.get_admin_profile_interest_stats(integer) to authenticated;
grant execute on function public.get_admin_profile_goal_stats(integer) to authenticated;
grant execute on function public.get_admin_profile_geographic_trends(integer) to authenticated;
