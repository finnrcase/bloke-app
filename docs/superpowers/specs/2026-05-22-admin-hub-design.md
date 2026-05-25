# Admin Hub — Design

**Date:** 2026-05-22
**Scope:** Targeted Admin Hub. Wire the existing admin role + RLS work into a usable `/admin` hub with four sections (Codes, Chapters, Roles, Stats), close three RLS gaps that block role and invite-code management, and add spec-named permission utilities.
**Mode:** Additive — no schema changes beyond one small RLS migration. Existing `app/admin/chapters.tsx` is reused as the Chapters sub-route.

---

## 1. RLS gaps (migration M21 `admin_completeness`)

Three policy gaps block the admin UI's actions:

```sql
-- Admin UPDATE on profiles. The protect_profile_role trigger lets admins change
-- roles, but the existing UPDATE policy only allows own-row writes.
create policy "Global admins can update profiles"
  on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Admin DELETE on chapters (TASK 4: delete chapter if needed).
create policy "Global admins can delete chapters"
  on public.chapters for delete to authenticated
  using (public.is_admin());

-- Chapter manager DELETE on invite_codes (TASK 4: revoke invite codes).
create policy "Chapter managers can delete invite codes"
  on public.invite_codes for delete to authenticated
  using (public.can_manage_chapter(chapter_id));
```

## 2. Permission utilities (TASK 6)

Five new exports in `lib/permissions.ts`. All admin-gated capabilities collapse to `isGlobalAdmin` for now — kept as named exports so callers express intent and future divergence is one-line:

```ts
export const canAccessAdmin          = isGlobalAdmin;
export const canManageChapters       = isGlobalAdmin;
export const canGenerateChapterCodes = isGlobalAdmin;
export const canManageRoles          = isGlobalAdmin;
export const canViewAdminStats       = isGlobalAdmin;
```

## 3. File structure

```
app/admin/
  _layout.tsx     NEW   protected Stack; redirects to /home if !canAccessAdmin
  index.tsx       NEW   hub: four GlassCards linking to the section screens
  chapters.tsx          existing — Manage Chapters (reused)
  codes.tsx       NEW   standalone invite-code generation + revoke
  roles.tsx       NEW   user search + role change + assign chapter leader
  stats.tsx       NEW   counts + recent signups
```

## 4. Screens

**`/admin` (index.tsx)** — header + four `GlassCard` tiles (Codes, Chapters, Roles, Stats), each `Link href` to the sub-route. Match `useTheme()` colors and existing spacing/radius tokens.

**`/admin/codes`** — chapter picker (admin SELECT on chapters covers all rows), `max_uses` (optional integer, must be `> 0`), `expires_at` (optional date), auto-generated 6-char code (editable). "Generate" inserts into `invite_codes` and shows a Copy button. Below the form, a list of existing codes for the selected chapter with Copy and Revoke (DELETE) buttons. Revoke uses M21's new policy.

**`/admin/roles`** — search input matching `profiles.full_name` ILIKE `%q%` or `profiles.username` ILIKE `%q%` (admin SELECT on profiles already in place). Result rows show current role, a role picker (`user` / `chapter_member` / `chapter_leader` / `global_admin`), and Save. Save UPDATEs `profiles.role`. Below role change: a small "Assign as chapter leader" picker (chapter dropdown + Assign) that upserts a `chapter_members` row with `role='chapter_leader'`, `status='active'`. Email search is deferred (would need an admin RPC against `auth.users`); spec called for username/name search as well, which is what we ship.

**`/admin/stats`** — six count cards rendered in a 2-col grid, plus a Recent Signups list (last 10). All queries are simple `select count(*)` / `order by created_at desc` against tables the admin already has SELECT access to:

| Card | Source |
|---|---|
| Total users | `profiles` |
| Total chapters | `chapters` |
| Pending join requests | `chapter_join_requests where status='pending'` |
| Total invite codes | `invite_codes` |
| Active chapter members | `chapter_members where status='active'` |
| Recent signups | `profiles order by created_at desc limit 10` |

No new RPC.

## 5. Community admin entry

Add a single admin-only `GlassCard` at the top of [`app/(tabs)/community.tsx`](../../../app/(tabs)/community.tsx) (above the existing map/list toggle), visible only when `canAccessAdmin(profile)`, with a label like "Admin tools" and a chevron, linking to `/admin`. **Not** restructuring community into 4 sub-tabs — the My Chapter / Activity sub-tabs don't exist yet in code, and that's a separate refactor.

## 6. Visual / TASK 7

Match existing patterns end-to-end:
- `GlassCard` for sections, `AppPressButton` for primary actions, `AppButton` for secondary, `FormTextInput` for inputs.
- Colors from `useTheme()` only — no hardcoded blacks/whites in JSX.
- `SectionHeader` for section titles.
- `spacing` / `radius` / `typography` from `constants/theme`.
- Dark / light theme parity inherited from the theme hook.

## 7. Verification

- `npx tsc --noEmit` clean.
- RLS probes:
  - Non-admin attempts DELETE chapter / DELETE invite_code / UPDATE another user's role → all blocked with `42501`.
  - Admin equivalents → succeed.

## 8. Explicitly NOT doing

- Community 4-sub-tab restructure.
- Email-based user lookup (requires admin RPC over `auth.users`).
- Chapter growth chart (TASK 4 "if available" — no time-series source yet).
- Renaming `isAdmin` → `isGlobalAdmin` as the canonical name. Aliases stay aliases.
- Email-confirmation enforcement (TASK 1 said "if required" — Supabase default email-confirmation is project-level config, not SQL).
