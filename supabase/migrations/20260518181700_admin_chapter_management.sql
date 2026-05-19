-- Admin chapter management.
--
-- To make your own account admin, run this manually in the Supabase SQL editor
-- as the project owner, replacing the placeholder with your auth.users.id:
--
-- update public.profiles
-- set role = 'admin'
-- where id = '<MY_AUTH_USER_ID>';
--
-- Do not run this from the frontend and never expose the service_role key.

alter table public.chapters
add column if not exists latitude double precision,
add column if not exists longitude double precision;

create policy "Admins can read all chapters"
on public.chapters
for select
to authenticated
using (public.is_admin());

create policy "Admins can create chapters"
on public.chapters
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update chapters"
on public.chapters
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can read chapter memberships"
on public.chapter_members
for select
to authenticated
using (public.is_admin());

create policy "Admins can read profiles"
on public.profiles
for select
to authenticated
using (public.is_admin());
