-- Corporate Bloke central voice.
--
-- Adds a first-class corporate_bloke role with admin permissions and
-- prominence metadata for public feed posts.

alter table public.profiles
drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check
check (role in ('user', 'chapter_member', 'chapter_leader', 'global_admin', 'corporate_bloke', 'participant', 'facilitator', 'admin'));

create or replace function public.is_corporate_bloke()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'corporate_bloke'
  );
$$;

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
      and p.role in ('global_admin', 'corporate_bloke', 'admin')
  );
$$;

revoke all on function public.is_corporate_bloke() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.is_corporate_bloke() to authenticated;
grant execute on function public.is_admin() to authenticated;

alter table public.chapter_posts
add column if not exists is_featured boolean not null default false,
add column if not exists featured_until timestamptz,
add column if not exists feed_priority integer not null default 0;

alter table public.chapter_posts
drop constraint if exists chapter_posts_feed_priority_check;

alter table public.chapter_posts
add constraint chapter_posts_feed_priority_check
check (feed_priority between 0 and 100);

alter table public.chapter_posts
drop constraint if exists chapter_posts_post_type_check;

alter table public.chapter_posts
add constraint chapter_posts_post_type_check
check (
  post_type in (
    'announcement',
    'weekly_prompt',
    'win',
    'chapter_event',
    'success_story',
    'member_highlight',
    'volunteer_opportunity',
    'challenge',
    'inspiration',
    'corporate_announcement',
    'chapter_spotlight',
    'promoted_activity',
    'curriculum_update',
    'featured_challenge',
    'weekly_reflection',
    'national_announcement'
  )
);

alter table public.chapter_posts
drop constraint if exists chapter_posts_public_feed_content_check;

alter table public.chapter_posts
add constraint chapter_posts_public_feed_content_check
check (
  is_public = false
  or (
    body is not null
    and char_length(trim(body)) between 1 and 1200
    and cover_image_url is not null
    and trim(cover_image_url) ~* '^https?://'
    and post_type in (
      'chapter_event',
      'success_story',
      'member_highlight',
      'volunteer_opportunity',
      'challenge',
      'inspiration',
      'corporate_announcement',
      'chapter_spotlight',
      'promoted_activity',
      'curriculum_update',
      'featured_challenge',
      'weekly_reflection',
      'national_announcement'
    )
  )
);

create index if not exists chapter_posts_public_feed_prominence_idx
on public.chapter_posts(is_public, status, moderation_status, is_featured desc, feed_priority desc, published_at desc)
where is_public = true;

drop policy if exists "Chapter leaders and admins can create public feed posts" on public.chapter_posts;
create policy "Chapter leaders and admins can create public feed posts"
on public.chapter_posts
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and is_public = true
  and status = 'published'
  and moderation_status in ('approved', 'needs_review')
  and post_type in (
    'chapter_event',
    'success_story',
    'member_highlight',
    'volunteer_opportunity',
    'challenge',
    'inspiration',
    'corporate_announcement',
    'chapter_spotlight',
    'promoted_activity',
    'curriculum_update',
    'featured_challenge',
    'weekly_reflection',
    'national_announcement'
  )
  and (
    post_type not in (
      'corporate_announcement',
      'chapter_spotlight',
      'promoted_activity',
      'curriculum_update',
      'featured_challenge',
      'weekly_reflection',
      'national_announcement'
    )
    or public.is_corporate_bloke()
  )
  and (
    public.is_corporate_bloke()
    or (
      is_featured = false
      and feed_priority = 0
      and featured_until is null
    )
  )
  and (
    public.is_admin()
    or (
      chapter_id is not null
      and public.can_manage_chapter(chapter_id)
    )
  )
);

drop policy if exists "Chapter leaders and admins can update public feed posts" on public.chapter_posts;
create policy "Chapter leaders and admins can update public feed posts"
on public.chapter_posts
for update
to authenticated
using (
  is_public = true
  and (
    public.is_admin()
    or (
      chapter_id is not null
      and public.can_manage_chapter(chapter_id)
    )
  )
)
with check (
  is_public = true
  and (
    post_type not in (
      'corporate_announcement',
      'chapter_spotlight',
      'promoted_activity',
      'curriculum_update',
      'featured_challenge',
      'weekly_reflection',
      'national_announcement'
    )
    or public.is_corporate_bloke()
  )
  and (
    public.is_corporate_bloke()
    or (
      is_featured = false
      and feed_priority = 0
      and featured_until is null
    )
  )
  and (
    public.is_admin()
    or (
      chapter_id is not null
      and public.can_manage_chapter(chapter_id)
    )
  )
);

create or replace function public.get_public_feed_posts()
returns table (
  id uuid,
  cover_image_url text,
  title text,
  description text,
  post_type text,
  chapter_id uuid,
  chapter_name text,
  author_id uuid,
  author_name text,
  author_role text,
  is_corporate_bloke boolean,
  is_featured boolean,
  feed_priority integer,
  featured_until timestamptz,
  created_at timestamptz,
  published_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.cover_image_url,
    p.title,
    p.body as description,
    p.post_type,
    p.chapter_id,
    coalesce(c.name, 'Corporate Bloke') as chapter_name,
    p.author_id,
    case
      when author.role = 'corporate_bloke' then 'Corporate Bloke'
      else coalesce(nullif(trim(author.full_name), ''), author.username, 'Bloke leader')
    end as author_name,
    author.role as author_role,
    author.role = 'corporate_bloke' as is_corporate_bloke,
    (p.is_featured or author.role = 'corporate_bloke') as is_featured,
    p.feed_priority,
    p.featured_until,
    p.created_at,
    p.published_at
  from public.chapter_posts p
  left join public.chapters c on c.id = p.chapter_id
  left join public.profiles author on author.id = p.author_id
  where p.is_public = true
    and p.status = 'published'
    and p.moderation_status = 'approved'
    and p.published_at <= now()
  order by
    (author.role = 'corporate_bloke') desc,
    (p.is_featured and (p.featured_until is null or p.featured_until >= now())) desc,
    p.feed_priority desc,
    p.published_at desc nulls last,
    p.created_at desc;
$$;

revoke all on function public.get_public_feed_posts() from public;
grant execute on function public.get_public_feed_posts() to anon, authenticated;
