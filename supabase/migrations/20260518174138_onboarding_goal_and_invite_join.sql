alter table public.profiles
add column if not exists personal_goal text;

create or replace function public.join_chapter_by_invite_code(target_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_chapter_id uuid;
begin
  select c.id
  into target_chapter_id
  from public.chapters c
  where lower(c.invite_code) = lower(trim(target_invite_code));

  if target_chapter_id is null then
    raise exception 'Invalid chapter invite code'
      using errcode = 'P0001';
  end if;

  insert into public.chapter_members (chapter_id, profile_id, role)
  values (target_chapter_id, auth.uid(), 'member')
  on conflict (chapter_id, profile_id) do update
  set role = excluded.role;

  return target_chapter_id;
end;
$$;

revoke all on function public.join_chapter_by_invite_code(text) from public;
grant execute on function public.join_chapter_by_invite_code(text) to authenticated;
