-- Map-ready chapter discovery foundation. Invite codes remain private; the
-- directory RPC exposes only public chapter metadata plus a computed count.

alter table public.chapters
alter column latitude type numeric using latitude::numeric,
alter column longitude type numeric using longitude::numeric;

alter table public.chapters
add column if not exists is_public boolean default true,
add column if not exists public_join_enabled boolean default false,
add column if not exists description text,
add column if not exists meeting_location text,
add column if not exists meeting_day text;

create index if not exists chapters_public_location_idx
on public.chapters(is_public, country, region);

create policy "Authenticated users can read public chapter directory"
on public.chapters
for select
to authenticated
using (is_public = true);

create or replace function public.get_public_chapter_directory(search_text text default null)
returns table (
  id uuid,
  name text,
  country text,
  region text,
  latitude numeric,
  longitude numeric,
  is_public boolean,
  public_join_enabled boolean,
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
    c.public_join_enabled,
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
