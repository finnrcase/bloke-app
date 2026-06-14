-- Public Bloke community feed.
--
-- Extends the existing chapter_posts backbone so chapter/private posts,
-- public movement posts, reactions, and future comments share one content id.

alter table public.chapter_posts
add column if not exists cover_image_url text,
add column if not exists is_public boolean not null default false,
add column if not exists published_at timestamptz,
add column if not exists status text not null default 'published',
add column if not exists moderation_status text not null default 'approved',
add column if not exists updated_at timestamptz default now();

update public.chapter_posts
set published_at = coalesce(published_at, created_at, now())
where published_at is null;

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
    'corporate_announcement'
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
      'corporate_announcement'
    )
  )
);

alter table public.chapter_posts
drop constraint if exists chapter_posts_status_check;

alter table public.chapter_posts
add constraint chapter_posts_status_check
check (status in ('draft', 'published', 'hidden', 'archived'));

alter table public.chapter_posts
drop constraint if exists chapter_posts_moderation_status_check;

alter table public.chapter_posts
add constraint chapter_posts_moderation_status_check
check (moderation_status in ('approved', 'needs_review', 'hidden', 'removed'));

create index if not exists chapter_posts_public_feed_idx
on public.chapter_posts(is_public, status, moderation_status, published_at desc)
where is_public = true;

create index if not exists chapter_posts_author_public_idx
on public.chapter_posts(author_id, is_public, published_at desc);

create or replace function public.set_chapter_posts_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();

  if new.is_public = true and new.published_at is null and new.status = 'published' then
    new.published_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists set_chapter_posts_updated_at_before_write on public.chapter_posts;
create trigger set_chapter_posts_updated_at_before_write
before insert or update on public.chapter_posts
for each row execute function public.set_chapter_posts_updated_at();

revoke all on function public.set_chapter_posts_updated_at() from public;

drop policy if exists "Anyone can read public feed posts" on public.chapter_posts;
create policy "Anyone can read public feed posts"
on public.chapter_posts
for select
to anon, authenticated
using (
  is_public = true
  and status = 'published'
  and moderation_status = 'approved'
  and published_at <= now()
);

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
    'corporate_announcement'
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
    public.is_admin()
    or (
      chapter_id is not null
      and public.can_manage_chapter(chapter_id)
    )
  )
);

alter table public.chapter_post_reactions
drop constraint if exists chapter_post_reactions_reaction_type_check;

alter table public.chapter_post_reactions
add constraint chapter_post_reactions_reaction_type_check
check (reaction_type in ('respect', 'like', 'celebrate', 'inspired', 'accountable'));

create table if not exists public.chapter_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.chapter_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_comment_id uuid references public.chapter_post_comments(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  moderation_status text not null default 'approved' check (moderation_status in ('approved', 'needs_review', 'hidden', 'removed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists chapter_post_comments_post_id_idx
on public.chapter_post_comments(post_id, created_at);

create index if not exists chapter_post_comments_author_id_idx
on public.chapter_post_comments(author_id, created_at desc);

alter table public.chapter_post_comments enable row level security;

drop policy if exists "Anyone can read approved public feed comments" on public.chapter_post_comments;
create policy "Anyone can read approved public feed comments"
on public.chapter_post_comments
for select
to anon, authenticated
using (
  moderation_status = 'approved'
  and exists (
    select 1
    from public.chapter_posts p
    where p.id = chapter_post_comments.post_id
      and p.is_public = true
      and p.status = 'published'
      and p.moderation_status = 'approved'
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
    coalesce(c.name, 'Bloke HQ') as chapter_name,
    p.author_id,
    coalesce(nullif(trim(author.full_name), ''), author.username, 'Bloke leader') as author_name,
    p.created_at,
    p.published_at
  from public.chapter_posts p
  left join public.chapters c on c.id = p.chapter_id
  left join public.profiles author on author.id = p.author_id
  where p.is_public = true
    and p.status = 'published'
    and p.moderation_status = 'approved'
    and p.published_at <= now()
  order by p.published_at desc nulls last, p.created_at desc;
$$;

revoke all on function public.get_public_feed_posts() from public;
grant execute on function public.get_public_feed_posts() to anon, authenticated;
