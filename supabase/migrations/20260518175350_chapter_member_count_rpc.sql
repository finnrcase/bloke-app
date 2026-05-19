create or replace function public.get_chapter_member_count(target_chapter_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.chapter_members cm
  where cm.chapter_id = target_chapter_id
    and (
      public.is_chapter_member(target_chapter_id)
      or public.is_chapter_facilitator(target_chapter_id)
    );
$$;

revoke all on function public.get_chapter_member_count(uuid) from public;
grant execute on function public.get_chapter_member_count(uuid) to authenticated;
