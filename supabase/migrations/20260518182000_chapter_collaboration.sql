-- Chapter-scoped collaboration tools. No DMs and no public feed.

create table if not exists public.chapter_prompt_responses (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  prompt_post_id uuid not null references public.chapter_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) <= 600),
  created_at timestamptz default now(),
  unique (prompt_post_id, author_id)
);

create table if not exists public.chapter_post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.chapter_posts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  reaction_type text not null default 'respect' check (reaction_type = 'respect'),
  created_at timestamptz default now(),
  unique (post_id, profile_id, reaction_type)
);

create index if not exists chapter_prompt_responses_chapter_id_idx
on public.chapter_prompt_responses(chapter_id);

create index if not exists chapter_prompt_responses_prompt_post_id_idx
on public.chapter_prompt_responses(prompt_post_id);

create index if not exists chapter_post_reactions_post_id_idx
on public.chapter_post_reactions(post_id);

alter table public.chapter_prompt_responses enable row level security;
alter table public.chapter_post_reactions enable row level security;

create policy "Chapter members can read prompt responses"
on public.chapter_prompt_responses
for select
to authenticated
using (public.is_chapter_member(chapter_id) or public.is_chapter_facilitator(chapter_id));

create policy "Chapter members can create prompt responses"
on public.chapter_prompt_responses
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and (public.is_chapter_member(chapter_id) or public.is_chapter_facilitator(chapter_id))
  and exists (
    select 1
    from public.chapter_posts p
    where p.id = prompt_post_id
      and p.chapter_id = chapter_prompt_responses.chapter_id
      and p.post_type = 'weekly_prompt'
  )
);

create policy "Chapter members can update their prompt responses"
on public.chapter_prompt_responses
for update
to authenticated
using (author_id = (select auth.uid()))
with check (
  author_id = (select auth.uid())
  and (public.is_chapter_member(chapter_id) or public.is_chapter_facilitator(chapter_id))
);

create policy "Chapter members can create wins"
on public.chapter_posts
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and post_type = 'win'
  and title is null
  and body is not null
  and char_length(body) <= 280
  and (public.is_chapter_member(chapter_id) or public.is_chapter_facilitator(chapter_id))
);

create policy "Chapter members can read reactions in their chapter"
on public.chapter_post_reactions
for select
to authenticated
using (
  exists (
    select 1
    from public.chapter_posts p
    where p.id = chapter_post_reactions.post_id
      and (public.is_chapter_member(p.chapter_id) or public.is_chapter_facilitator(p.chapter_id))
  )
);

create policy "Chapter members can react respect to others wins"
on public.chapter_post_reactions
for insert
to authenticated
with check (
  profile_id = (select auth.uid())
  and reaction_type = 'respect'
  and exists (
    select 1
    from public.chapter_posts p
    where p.id = chapter_post_reactions.post_id
      and p.post_type = 'win'
      and p.author_id <> (select auth.uid())
      and (public.is_chapter_member(p.chapter_id) or public.is_chapter_facilitator(p.chapter_id))
  )
);

create policy "Chapter members can remove their own reactions"
on public.chapter_post_reactions
for delete
to authenticated
using (profile_id = (select auth.uid()));

create policy "Chapter members can read attendance in their chapter"
on public.attendance
for select
to authenticated
using (public.is_chapter_member(chapter_id) or public.is_chapter_facilitator(chapter_id));
