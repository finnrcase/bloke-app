-- Public chapter joining for map/directory discovery. Invite-code chapters
-- still use join_chapter_by_invite_code and do not expose invite codes.

create or replace function public.join_public_chapter(target_chapter_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  joinable_chapter_id uuid;
begin
  select c.id
  into joinable_chapter_id
  from public.chapters c
  where c.id = target_chapter_id
    and c.is_public = true
    and c.public_join_enabled = true;

  if joinable_chapter_id is null then
    raise exception 'This chapter is not open for public joining'
      using errcode = 'P0001';
  end if;

  insert into public.chapter_members (chapter_id, profile_id, role)
  values (joinable_chapter_id, (select auth.uid()), 'member')
  on conflict (chapter_id, profile_id) do nothing;

  return joinable_chapter_id;
end;
$$;

revoke all on function public.join_public_chapter(uuid) from public;
grant execute on function public.join_public_chapter(uuid) to authenticated;
