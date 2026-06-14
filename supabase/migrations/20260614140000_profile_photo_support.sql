insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-images',
  'profile-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read profile images" on storage.objects;
create policy "Public can read profile images"
on storage.objects
for select
to public
using (bucket_id = 'profile-images');

drop policy if exists "Users can upload their own profile images" on storage.objects;
create policy "Users can upload their own profile images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update their own profile images" on storage.objects;
create policy "Users can update their own profile images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete their own profile images" on storage.objects;
create policy "Users can delete their own profile images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop function if exists public.get_public_feed_posts();

create function public.get_public_feed_posts()
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
  author_avatar_url text,
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
    author.avatar_url as author_avatar_url,
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
