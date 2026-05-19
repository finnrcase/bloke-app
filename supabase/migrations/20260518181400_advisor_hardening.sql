-- Advisor-driven hardening: lock down internal functions, index foreign keys,
-- and make RLS auth checks evaluate once per query instead of once per row.

-- 1. Internal functions must not be reachable through the REST API.
--    Triggers still call them (definer context), so this is safe.
revoke execute on function public.award_eligible_badges(uuid) from anon, authenticated;
revoke execute on function public.trg_award_badges_weekly_progress() from anon, authenticated;
revoke execute on function public.trg_award_badges_attendance() from anon, authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated;

-- 2. Covering indexes for foreign keys flagged by the performance advisor.
create index if not exists chapter_posts_author_id_idx on public.chapter_posts(author_id);
create index if not exists user_badges_badge_id_idx on public.user_badges(badge_id);
create index if not exists weekly_progress_week_number_idx on public.weekly_progress(week_number);

-- 3. Wrap auth.uid() in a scalar subquery so the planner evaluates it once
--    per statement instead of once per row (auth_rls_initplan advisor).
alter policy "Users can read their own profile" on public.profiles
  using (id = (select auth.uid()));
alter policy "Users can insert their own profile" on public.profiles
  with check (id = (select auth.uid()));
alter policy "Users can update their own profile" on public.profiles
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

alter policy "Users can read their own weekly progress" on public.weekly_progress
  using (profile_id = (select auth.uid()));
alter policy "Users can insert their own weekly progress" on public.weekly_progress
  with check (profile_id = (select auth.uid()));
alter policy "Users can update their own weekly progress" on public.weekly_progress
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

alter policy "Users can read their own journal logs" on public.journal_logs
  using (profile_id = (select auth.uid()));
alter policy "Users can insert their own journal logs" on public.journal_logs
  with check (profile_id = (select auth.uid()));
alter policy "Users can update their own journal logs" on public.journal_logs
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

alter policy "Users can read their own user badges" on public.user_badges
  using (profile_id = (select auth.uid()));

alter policy "Chapter members can read their chapter" on public.chapters
  using (
    facilitator_id = (select auth.uid())
    or public.is_chapter_member(id)
  );

alter policy "Facilitators can create chapter posts" on public.chapter_posts
  with check (
    author_id = (select auth.uid())
    and public.is_chapter_facilitator(chapter_id)
  );

alter policy "Users can read their own attendance" on public.attendance
  using (profile_id = (select auth.uid()));
