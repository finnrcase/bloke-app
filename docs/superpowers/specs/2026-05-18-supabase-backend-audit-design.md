# BLOKE Supabase Backend — Audit & Fix Design

**Date:** 2026-05-18
**Scope:** Audit the existing Supabase backend, fix real gaps with additive migrations, create a fresh Supabase project, apply everything.
**Mode:** Audit & fix gaps — keep existing M1–M5, client, auth context, and types untouched.

---

## 1. Current state (audit)

The backend is already substantially built and good quality:

- **Schema** — 10 tables, UUID PKs, FKs, indexes ([M1](../../../supabase/migrations/20260518173826_bloke_mvp_schema.sql)).
- **RLS** — enabled on every table; per-user and per-chapter policies; `SECURITY DEFINER` helper functions (`is_chapter_member`, `is_chapter_facilitator`, `is_facilitator_for_profile`) avoid RLS recursion.
- **RPCs** — `join_chapter_by_invite_code`, `get_chapter_member_count`.
- **Seed** — curriculum weeks 1–10 + 17 badges.
- **Client** — `lib/supabase.ts` (AsyncStorage persistence), `AuthProvider`, `RouteGuard`, hand-written `Database` types.

### Confirmed issues

| # | Issue | Severity |
|---|-------|----------|
| 1 | `lib/badges.ts` awards badges client-side; `user_badges` INSERT policy only checks `profile_id = auth.uid()` — any user can grant themselves any badge. | High (security) |
| 2 | `AuthContext.completeOnboarding()` writes `auth.users` user-metadata that nothing reads; `isProfileComplete` reads `profiles.onboarding_complete`. Dead code. | Medium (correctness) |
| 3 | Two `badges` SELECT policies — M1's "read badges they earned" is shadowed by M3's `using (true)`. | Low (cleanliness) |
| 4 | No `profiles` row auto-creation; works today only because onboarding upserts. | Medium (robustness) |
| 5 | No facilitator UPDATE policy on `chapters` — "facilitators manage chapters" is unenforced. | Medium (feature gap) |
| 6 | `weekly_progress.week_number` / `journal_logs.week_number` nullable; `journal_logs` has no FK and no one-per-week constraint. | Low (integrity) |

---

## 2. Fix design

Additive migrations only — existing M1–M5 are not modified. M6–M9 close the
audited gaps; M10–M11 were added during implementation to resolve Supabase
advisor findings (anticipated by step 7.10).

### M6 — `harden_badge_awards` (issues 1, 3)

Move all badge-award logic server-side into a `SECURITY DEFINER` function, fired by triggers. Remove the client INSERT path so badges can only be earned, never granted.

```sql
-- M6: harden_badge_awards
-- Server-owned badge awarding. Removes the client's ability to self-award.

-- Issue 3: drop the redundant SELECT policy (shadowed by "Users can read badge definitions").
drop policy if exists "Users can read badges they earned" on public.badges;

-- Issue 1: remove the client INSERT path. Awards now happen only via trigger.
drop policy if exists "Users can insert their own user badges" on public.user_badges;

-- Idempotent badge evaluation for one profile.
create or replace function public.award_eligible_badges(target_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  completed_weeks integer[];
  streak integer := 0;
  week_cursor integer;
  has_attendance boolean;
  earned_codes text[] := '{}';
begin
  -- Weeks where learn + act + log are all complete.
  select coalesce(array_agg(week_number order by week_number), '{}')
  into completed_weeks
  from public.weekly_progress
  where profile_id = target_profile_id
    and learn_complete and act_complete and log_complete;

  -- Milestone badges: tied to completing a specific week.
  if  1 = any(completed_weeks) then earned_codes := earned_codes || 'milestone_initiate';   end if;
  if  5 = any(completed_weeks) then earned_codes := earned_codes || 'milestone_showing_up'; end if;
  if 10 = any(completed_weeks) then earned_codes := earned_codes || 'milestone_reliable';   end if;
  if 25 = any(completed_weeks) then earned_codes := earned_codes || 'milestone_grounded';   end if;
  if 50 = any(completed_weeks) then earned_codes := earned_codes || 'milestone_capable';    end if;
  if 75 = any(completed_weeks) then earned_codes := earned_codes || 'milestone_leader';     end if;

  -- Category badges: tied to specific weeks.
  if 2 = any(completed_weeks) then earned_codes := earned_codes || 'integrity';   end if;
  if 3 = any(completed_weeks) then earned_codes := earned_codes || 'environment'; end if;
  if 4 = any(completed_weeks) then earned_codes := earned_codes || 'discipline';  end if;

  -- Streak: consecutive completed weeks ending at the highest completed week.
  if array_length(completed_weeks, 1) is not null then
    week_cursor := completed_weeks[array_length(completed_weeks, 1)];
    while week_cursor > 0 and week_cursor = any(completed_weeks) loop
      streak := streak + 1;
      week_cursor := week_cursor - 1;
    end loop;
  end if;

  if streak >=  3 then earned_codes := earned_codes || 'consistency_bronze'; end if;
  if streak >=  5 then earned_codes := earned_codes || 'consistency_silver'; end if;
  if streak >= 10 then earned_codes := earned_codes || 'consistency_gold';   end if;

  -- Brotherhood: any attendance record in a chapter the user belongs to.
  select exists (
    select 1
    from public.attendance a
    join public.chapter_members cm
      on cm.chapter_id = a.chapter_id and cm.profile_id = a.profile_id
    where a.profile_id = target_profile_id
  ) into has_attendance;

  if has_attendance then earned_codes := earned_codes || 'brotherhood'; end if;

  -- Insert missing awards; unique (profile_id, badge_id) keeps this idempotent.
  insert into public.user_badges (profile_id, badge_id)
  select target_profile_id, b.id
  from public.badges b
  where b.code = any(earned_codes)
  on conflict (profile_id, badge_id) do nothing;
end;
$$;

revoke all on function public.award_eligible_badges(uuid) from public;
-- Not granted to authenticated: only the SECURITY DEFINER triggers below invoke it.

create or replace function public.trg_award_badges_weekly_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.award_eligible_badges(new.profile_id);
  return new;
end;
$$;

create or replace function public.trg_award_badges_attendance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.award_eligible_badges(new.profile_id);
  return new;
end;
$$;

-- Only fires when a week is actually complete (null flags -> false -> no fire).
create trigger award_badges_after_weekly_progress
after insert or update on public.weekly_progress
for each row
when (new.learn_complete and new.act_complete and new.log_complete)
execute function public.trg_award_badges_weekly_progress();

create trigger award_badges_after_attendance
after insert on public.attendance
for each row
execute function public.trg_award_badges_attendance();
```

**Why triggers, not an RPC:** the client never participates in awarding, so there is no logic to keep in sync and no path to forge an award. `lib/badges.ts` becomes read-only.

### M7 — `profile_provisioning` (issue 4)

```sql
-- M7: profile_provisioning
-- Auto-create a profiles row when an auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, onboarding_complete)
  values (new.id, 'participant', false)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
```

The existing `profiles` INSERT/UPDATE policies stay — onboarding's upsert still works (the row exists, so it takes the UPDATE path).

### M8 — `chapter_management` (issue 5)

Chapter creation stays admin-only (created via SQL/dashboard, per product decision), so no INSERT policy is added — only the facilitator UPDATE policy.

```sql
-- M8: chapter_management
-- Facilitators can edit chapters they run. Creation stays admin-only.
create policy "Facilitators can update their chapter"
on public.chapters
for update
to authenticated
using (public.is_chapter_facilitator(id))
with check (public.is_chapter_facilitator(id));
```

### M9 — `data_integrity` (issue 6)

```sql
-- M9: data_integrity
-- Safe to tighten: the new project starts empty.
alter table public.weekly_progress
  alter column week_number set not null;

alter table public.journal_logs
  alter column week_number set not null;

alter table public.journal_logs
  add constraint journal_logs_week_number_fkey
  foreign key (week_number) references public.curriculum_weeks(week_number) on delete cascade;

alter table public.journal_logs
  add constraint journal_logs_profile_week_unique
  unique (profile_id, week_number);

create index if not exists journal_logs_week_number_idx
  on public.journal_logs(week_number);
```

### M10 — `advisor_hardening` (advisor-driven)

- Revokes `EXECUTE` (anon, authenticated) on the internal functions.
- Adds covering indexes for the FKs flagged by the performance advisor
  (`chapter_posts.author_id`, `user_badges.badge_id`, `weekly_progress.week_number`).
- Rewrites 13 RLS policies to wrap `auth.uid()` in `(select auth.uid())` so it
  evaluates once per statement (the `auth_rls_initplan` advisor).

### M11 — `restrict_definer_functions` (advisor-driven)

- `revoke all ... from public` on the trigger/handler functions — the default
  `PUBLIC` grant kept them REST-reachable even after M10. Triggers still fire.
- Removes direct `anon` access to the RLS helper functions and the
  invite-join / member-count RPCs (signed-in users only).
- Remaining advisor WARNs after M11 (5 total) are intentional: client RPCs and
  RLS helper functions that must stay executable by `authenticated`.

---

## 3. Client / integration changes

| File | Change |
|------|--------|
| `lib/badges.ts` | Delete `awardBadgeCodes`, `awardMilestoneBadges`, `awardStreakBadges`, `awardCategoryBadges`. Keep `getUserStreak`, `getNextMilestone`, and their helpers (read-only). |
| `app/(tabs)/curriculum.tsx` | Remove the import + the `Promise.all([award...])` block (the trigger handles it). Change `journal_logs.insert(...)` → `.upsert(..., { onConflict: 'profile_id,week_number' })` so re-submits don't violate the new unique constraint. |
| `context/AuthContext.tsx` | Remove `completeOnboarding` entirely (it wrote unused metadata). Keep `refreshProfile`. |
| `app/onboarding.tsx` | Drop the `completeOnboarding()` call; the profile upsert already sets `onboarding_complete: true`, and `refreshProfile()` picks it up. |
| `lib/auth.ts` *(new)* | Typed helpers `signUpWithEmail`, `signInWithEmail`, `signOutUser` returning a consistent `{ error: string \| null, ... }` shape — removes duplicated `if (!supabase)` + try/catch boilerplate. |
| `app/(public)/login.tsx`, `signup.tsx` | Refactor to call the `lib/auth.ts` helpers. |
| `types/database.ts` | No new public RPCs to add (`award_eligible_badges` is trigger-only). `Functions` block stays as-is — verified against final schema. |

---

## 4. New Supabase project

1. `list_organizations` → pick the org.
2. `get_cost` + `confirm_cost` → confirm with the user before creating.
3. `create_project` (region near the user; strong DB password).
4. Apply migrations in order: M1, M2, M3, M4, M5, M6, M7, M8, M9.
5. Run `seed.sql`.
6. `get_advisors` (security + performance) — review and address anything real.
7. Write `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` into `bloke-app/.env` (gitignored).

---

## 5. Folder structure

Current layout is already clean and scalable — keep it:

```
bloke-app/
  app/                 expo-router screens (route groups: (public), (tabs))
  components/          shared UI
  constants/           theme, screen metadata
  context/             AuthContext
  hooks/
  lib/                 supabase.ts, env.ts, auth.ts (new), badges.ts, routes.ts
  supabase/
    migrations/        M1–M9 *.sql
    seed.sql
    index.ts
  types/               database.ts, navigation.ts
```

`lib/` holds the Supabase client plus all data-access/auth helpers. If query helpers multiply later, split into `lib/queries/` — not now (YAGNI).

---

## 6. Environment variables

`.env` (gitignored) and `.env.example` (committed):

```
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
```

`EXPO_PUBLIC_`-prefixed vars are inlined by Expo at build time. The anon key is safe to ship — RLS is the security boundary. The service-role key must never appear in the app.

---

## 7. Implementation steps

1. Write M6–M9 SQL files into `supabase/migrations/` (timestamps after `20260518175702`).
2. Edit `lib/badges.ts` — remove award functions.
3. Create `lib/auth.ts`.
4. Edit `app/(public)/login.tsx`, `app/(public)/signup.tsx` — use `lib/auth.ts`.
5. Edit `context/AuthContext.tsx` — remove `completeOnboarding`.
6. Edit `app/onboarding.tsx` — drop `completeOnboarding()` call.
7. Edit `app/(tabs)/curriculum.tsx` — remove award calls, upsert journal logs.
8. `npx tsc --noEmit` — confirm types pass.
9. Create the Supabase project (confirm cost first), apply M1–M9, run seed.
10. `get_advisors` review.
11. Write `bloke-app/.env`.
12. Commit (excluding `.env`).

---

## 8. Recommended improvements (out of scope, noted for later)

- **Streak logic is duplicated** — `lib/badges.ts:getUserStreak` and `app/(tabs)/progress.tsx:getStreak` both compute streaks client-side. Consolidate into one helper.
- **`completion_builder` badge** is mapped to week 100 but only 10 curriculum weeks exist — currently unreachable. Decide its real trigger (e.g. all seeded weeks complete).
- **Leadership badges** (`leadership_*`) have no award path — define criteria or remove from seed.
- **`updated_at` columns + triggers** on mutable tables for future audit/sync needs.
- **Realtime** on `chapter_posts` for live chapter feeds when the community feature grows.

---

## 9. Explicitly NOT doing (YAGNI)

Rewriting M1–M5; `updated_at`/audit columns; leadership-badge automation; admin-role policies; public chapter-creation policy.
