create policy "Facilitators can read member weekly progress"
on public.weekly_progress
for select
to authenticated
using (public.is_facilitator_for_profile(profile_id));

create policy "Facilitators can mark attendance in their chapter"
on public.attendance
for insert
to authenticated
with check (
  public.is_chapter_facilitator(chapter_id)
  and public.is_facilitator_for_profile(profile_id)
);
