-- Facilitators can edit chapters they run. Chapter creation stays admin-only
-- (done via SQL/dashboard), so no INSERT policy is added here.

create policy "Facilitators can update their chapter"
on public.chapters
for update
to authenticated
using (public.is_chapter_facilitator(id))
with check (public.is_chapter_facilitator(id));
