alter table public.chapter_posts
add column if not exists cover_image_url text,
add column if not exists is_public boolean not null default false,
add column if not exists moderation_status text not null default 'approved',
add column if not exists status text not null default 'published',
add column if not exists published_at timestamptz,
add column if not exists updated_at timestamptz,
add column if not exists is_featured boolean not null default false,
add column if not exists feed_priority integer not null default 0,
add column if not exists featured_until timestamptz;

update public.chapter_posts
set
  published_at = coalesce(published_at, created_at, now()),
  updated_at = coalesce(updated_at, created_at, now()),
  status = coalesce(status, 'published'),
  moderation_status = coalesce(moderation_status, 'approved')
where published_at is null
  or updated_at is null
  or status is null
  or moderation_status is null;

alter table public.chapter_posts
drop constraint if exists chapter_posts_community_body_check;

alter table public.chapter_posts
add constraint chapter_posts_community_body_check
check (
  is_public = false
  or nullif(trim(coalesce(body, '')), '') is not null
  or nullif(trim(coalesce(cover_image_url, '')), '') is not null
);

create index if not exists chapter_posts_community_feed_idx
on public.chapter_posts(is_public, status, moderation_status, published_at desc, created_at desc);

create index if not exists chapter_posts_community_author_idx
on public.chapter_posts(author_id, created_at desc);

create table if not exists public.chapter_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.chapter_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_comment_id uuid references public.chapter_post_comments(id) on delete cascade,
  body text not null,
  moderation_status text not null default 'approved',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists chapter_post_comments_post_id_idx
on public.chapter_post_comments(post_id, created_at);

create index if not exists chapter_post_comments_author_id_idx
on public.chapter_post_comments(author_id, created_at desc);

alter table public.chapter_post_comments enable row level security;

alter table public.chapter_post_reactions
drop constraint if exists chapter_post_reactions_reaction_type_check;

alter table public.chapter_post_reactions
add constraint chapter_post_reactions_reaction_type_check
check (reaction_type in ('respect', 'like', 'celebrate', 'inspired', 'accountable'));

create unique index if not exists chapter_post_reactions_unique_reaction_idx
on public.chapter_post_reactions(post_id, profile_id, reaction_type);

alter table public.chapter_post_reactions enable row level security;
alter table public.chapter_posts enable row level security;

create or replace function public.is_community_feed_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('global_admin', 'admin', 'corporate_bloke')
  );
$$;

revoke all on function public.is_community_feed_admin() from public;
grant execute on function public.is_community_feed_admin() to authenticated;

drop policy if exists "Anyone can read public feed posts" on public.chapter_posts;
drop policy if exists "Chapter leaders and admins can create public feed posts" on public.chapter_posts;
drop policy if exists "Chapter leaders and admins can update public feed posts" on public.chapter_posts;
drop policy if exists "Authenticated users can read community feed posts" on public.chapter_posts;
drop policy if exists "Authenticated users can create community feed posts" on public.chapter_posts;
drop policy if exists "Users and admins can update community feed posts" on public.chapter_posts;
drop policy if exists "Users and admins can delete community feed posts" on public.chapter_posts;

create policy "Authenticated users can read community feed posts"
on public.chapter_posts
for select
to authenticated
using (
  is_public = true
  and status = 'published'
  and moderation_status = 'approved'
);

create policy "Authenticated users can create community feed posts"
on public.chapter_posts
for insert
to authenticated
with check (
  author_id = auth.uid()
  and is_public = true
  and status = 'published'
  and moderation_status = 'approved'
  and nullif(trim(coalesce(body, '')), '') is not null
);

create policy "Users and admins can update community feed posts"
on public.chapter_posts
for update
to authenticated
using (
  author_id = auth.uid()
  or public.is_community_feed_admin()
)
with check (
  author_id = auth.uid()
  or public.is_community_feed_admin()
);

create policy "Users and admins can delete community feed posts"
on public.chapter_posts
for delete
to authenticated
using (
  author_id = auth.uid()
  or public.is_community_feed_admin()
);

drop policy if exists "Anyone can read approved public feed comments" on public.chapter_post_comments;
drop policy if exists "Authenticated users can read community comments" on public.chapter_post_comments;
drop policy if exists "Authenticated users can create community comments" on public.chapter_post_comments;
drop policy if exists "Users and admins can update community comments" on public.chapter_post_comments;
drop policy if exists "Users and admins can delete community comments" on public.chapter_post_comments;

create policy "Authenticated users can read community comments"
on public.chapter_post_comments
for select
to authenticated
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

create policy "Authenticated users can create community comments"
on public.chapter_post_comments
for insert
to authenticated
with check (
  author_id = auth.uid()
  and moderation_status = 'approved'
  and nullif(trim(body), '') is not null
  and exists (
    select 1
    from public.chapter_posts p
    where p.id = chapter_post_comments.post_id
      and p.is_public = true
      and p.status = 'published'
      and p.moderation_status = 'approved'
  )
);

create policy "Users and admins can update community comments"
on public.chapter_post_comments
for update
to authenticated
using (
  author_id = auth.uid()
  or public.is_community_feed_admin()
)
with check (
  author_id = auth.uid()
  or public.is_community_feed_admin()
);

create policy "Users and admins can delete community comments"
on public.chapter_post_comments
for delete
to authenticated
using (
  author_id = auth.uid()
  or public.is_community_feed_admin()
);

drop policy if exists "Chapter members can read reactions in their chapter" on public.chapter_post_reactions;
drop policy if exists "Chapter members can react respect to others wins" on public.chapter_post_reactions;
drop policy if exists "Chapter members can remove their own reactions" on public.chapter_post_reactions;
drop policy if exists "Authenticated users can read community reactions" on public.chapter_post_reactions;
drop policy if exists "Authenticated users can create community reactions" on public.chapter_post_reactions;
drop policy if exists "Users can delete their own community reactions" on public.chapter_post_reactions;

create policy "Authenticated users can read community reactions"
on public.chapter_post_reactions
for select
to authenticated
using (
  exists (
    select 1
    from public.chapter_posts p
    where p.id = chapter_post_reactions.post_id
      and p.is_public = true
      and p.status = 'published'
      and p.moderation_status = 'approved'
  )
);

create policy "Authenticated users can create community reactions"
on public.chapter_post_reactions
for insert
to authenticated
with check (
  profile_id = auth.uid()
  and exists (
    select 1
    from public.chapter_posts p
    where p.id = chapter_post_reactions.post_id
      and p.is_public = true
      and p.status = 'published'
      and p.moderation_status = 'approved'
  )
);

create policy "Users can delete their own community reactions"
on public.chapter_post_reactions
for delete
to authenticated
using (profile_id = auth.uid());

drop function if exists public.get_community_feed_posts();

create function public.get_community_feed_posts()
returns table (
  id uuid,
  author_id uuid,
  author_name text,
  author_avatar_url text,
  author_role text,
  content text,
  image_url text,
  created_at timestamptz,
  can_delete boolean,
  like_count bigint,
  comment_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.author_id,
    coalesce(nullif(trim(author.full_name), ''), author.username, 'Bloke member') as author_name,
    author.avatar_url as author_avatar_url,
    author.role as author_role,
    p.body as content,
    p.cover_image_url as image_url,
    coalesce(p.published_at, p.created_at) as created_at,
    (p.author_id = auth.uid() or public.is_community_feed_admin()) as can_delete,
    coalesce(reaction_counts.like_count, 0) as like_count,
    coalesce(comment_counts.comment_count, 0) as comment_count
  from public.chapter_posts p
  left join public.profiles author on author.id = p.author_id
  left join lateral (
    select count(*) as like_count
    from public.chapter_post_reactions r
    where r.post_id = p.id
      and r.reaction_type = 'like'
  ) reaction_counts on true
  left join lateral (
    select count(*) as comment_count
    from public.chapter_post_comments c
    where c.post_id = p.id
      and c.moderation_status = 'approved'
  ) comment_counts on true
  where p.is_public = true
    and p.status = 'published'
    and p.moderation_status = 'approved'
  order by coalesce(p.published_at, p.created_at) desc nulls last, p.created_at desc;
$$;

revoke all on function public.get_community_feed_posts() from public;
grant execute on function public.get_community_feed_posts() to authenticated;

do $$
begin
  if to_regprocedure('public.get_public_feed_posts()') is not null then
    revoke all on function public.get_public_feed_posts() from public;
    grant execute on function public.get_public_feed_posts() to authenticated;
  end if;
end $$;
