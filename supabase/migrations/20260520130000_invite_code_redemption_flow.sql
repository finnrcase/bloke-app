-- Invite code redemption flow.
-- Codes create chapter join requests, then leaders approve them through
-- review_chapter_join_request. This keeps invite access auditable and
-- preserves the approval queue.

create or replace function public.redeem_invite_code(target_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.invite_codes%rowtype;
  existing_member_id uuid;
  existing_request_id uuid;
  next_request_id uuid;
begin
  if nullif(trim(target_invite_code), '') is null then
    raise exception 'Enter an invite code'
      using errcode = 'P0001';
  end if;

  select *
  into invite_row
  from public.invite_codes
  where code = upper(trim(target_invite_code))
  for update;

  if invite_row.id is null then
    raise exception 'Invalid invite code'
      using errcode = 'P0001';
  end if;

  if invite_row.expires_at is not null and invite_row.expires_at <= now() then
    raise exception 'Invite code has expired'
      using errcode = 'P0001';
  end if;

  if invite_row.max_uses is not null and invite_row.current_uses >= invite_row.max_uses then
    raise exception 'Invite code has reached its usage limit'
      using errcode = 'P0001';
  end if;

  select cm.id
  into existing_member_id
  from public.chapter_members cm
  where cm.chapter_id = invite_row.chapter_id
    and (cm.profile_id = (select auth.uid()) or cm.user_id = (select auth.uid()))
    and cm.status in ('active', 'pending')
  limit 1;

  if existing_member_id is not null then
    raise exception 'You already have a membership for this chapter'
      using errcode = 'P0001';
  end if;

  select jr.id
  into existing_request_id
  from public.chapter_join_requests jr
  where jr.chapter_id = invite_row.chapter_id
    and jr.profile_id = (select auth.uid())
    and jr.status = 'pending'
  limit 1;

  if existing_request_id is not null then
    return existing_request_id;
  end if;

  insert into public.chapter_join_requests (chapter_id, profile_id, message)
  values (invite_row.chapter_id, (select auth.uid()), 'Redeemed invite code ' || invite_row.code)
  returning id into next_request_id;

  update public.invite_codes
  set current_uses = current_uses + 1
  where id = invite_row.id;

  return next_request_id;
end;
$$;

revoke all on function public.redeem_invite_code(text) from public;
grant execute on function public.redeem_invite_code(text) to authenticated;
