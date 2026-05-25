-- Admin completeness: three RLS gaps that block the admin hub UI.
-- Roles UI needs admin UPDATE on profiles. Chapters UI needs admin DELETE.
-- Invite-code revoke needs chapter-manager DELETE on invite_codes.

create policy "Global admins can update profiles"
  on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Global admins can delete chapters"
  on public.chapters for delete to authenticated
  using (public.is_admin());

create policy "Chapter managers can delete invite codes"
  on public.invite_codes for delete to authenticated
  using (public.can_manage_chapter(chapter_id));
