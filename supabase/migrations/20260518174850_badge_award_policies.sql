create policy "Users can read badge definitions"
on public.badges
for select
to authenticated
using (true);

create policy "Users can insert their own user badges"
on public.user_badges
for insert
to authenticated
with check (profile_id = auth.uid());
