-- Finish the function lockdown. M10 revoked anon/authenticated, but Postgres's
-- default PUBLIC grant kept the internal trigger functions reachable via REST.

-- Trigger/handler functions are internal machinery: remove every grant.
-- Triggers still fire (they run as part of DML, not as REST calls).
revoke all on function public.trg_award_badges_weekly_progress() from public;
revoke all on function public.trg_award_badges_attendance() from public;
revoke all on function public.handle_new_user() from public;

-- RLS helper functions are only needed by authenticated-role policy checks.
-- Keep them executable by `authenticated`; drop direct anon access.
revoke execute on function public.is_chapter_member(uuid) from anon;
revoke execute on function public.is_chapter_facilitator(uuid) from anon;
revoke execute on function public.is_facilitator_for_profile(uuid) from anon;

-- The invite-join and member-count RPCs are for signed-in users only.
revoke execute on function public.join_chapter_by_invite_code(text) from anon;
revoke execute on function public.get_chapter_member_count(uuid) from anon;
