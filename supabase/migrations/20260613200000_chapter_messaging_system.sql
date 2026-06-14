-- Chapter messaging system.
--
-- Adds chapter-scoped channels, messages, reports, and moderation helpers.
-- Existing chapter membership functions remain the source of truth for access.

create table if not exists public.chapter_chat_channels (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  event_id uuid references public.chapter_events(id) on delete set null,
  name text not null,
  description text,
  channel_type text not null default 'general',
  status text not null default 'active',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint chapter_chat_channels_type_check
    check (channel_type in ('general', 'event', 'announcements', 'small_group')),
  constraint chapter_chat_channels_status_check
    check (status in ('active', 'archived', 'hidden')),
  constraint chapter_chat_channels_name_length_check
    check (char_length(trim(name)) between 1 and 96)
);

create table if not exists public.chapter_chat_channel_members (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.chapter_chat_channels(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz default now(),
  constraint chapter_chat_channel_members_role_check
    check (role in ('member', 'moderator')),
  unique (channel_id, profile_id)
);

create table if not exists public.chapter_chat_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.chapter_chat_channels(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text,
  message_type text not null default 'text',
  attachment_url text,
  attachment_name text,
  attachment_mime_type text,
  attachment_size integer,
  location_latitude numeric(9, 6),
  location_longitude numeric(9, 6),
  location_label text,
  moderation_status text not null default 'visible',
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint chapter_chat_messages_type_check
    check (message_type in ('text', 'photo', 'file', 'location')),
  constraint chapter_chat_messages_moderation_status_check
    check (moderation_status in ('visible', 'reported', 'hidden', 'removed')),
  constraint chapter_chat_messages_body_length_check
    check (body is null or char_length(body) <= 2000),
  constraint chapter_chat_messages_attachment_url_check
    check (attachment_url is null or attachment_url ~* '^https?://'),
  constraint chapter_chat_messages_attachment_size_check
    check (attachment_size is null or attachment_size >= 0),
  constraint chapter_chat_messages_location_latitude_check
    check (location_latitude is null or (location_latitude >= -90 and location_latitude <= 90)),
  constraint chapter_chat_messages_location_longitude_check
    check (location_longitude is null or (location_longitude >= -180 and location_longitude <= 180)),
  constraint chapter_chat_messages_content_check
    check (
      deleted_at is not null
      or (body is not null and char_length(trim(body)) > 0)
      or (message_type in ('photo', 'file') and attachment_url is not null)
      or (
        message_type = 'location'
        and (
          location_label is not null
          or (location_latitude is not null and location_longitude is not null)
        )
      )
    )
);

create table if not exists public.chapter_chat_message_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chapter_chat_messages(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'open',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  constraint chapter_chat_message_reports_reason_check
    check (reason in ('harassment', 'unsafe', 'spam', 'privacy', 'other')),
  constraint chapter_chat_message_reports_status_check
    check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  constraint chapter_chat_message_reports_details_length_check
    check (details is null or char_length(details) <= 1000),
  unique (message_id, reporter_id)
);

create unique index if not exists chapter_chat_channels_default_unique_idx
on public.chapter_chat_channels(chapter_id, channel_type)
where event_id is null and channel_type in ('general', 'announcements');

create unique index if not exists chapter_chat_channels_event_unique_idx
on public.chapter_chat_channels(event_id)
where event_id is not null and channel_type = 'event';

create index if not exists chapter_chat_channels_chapter_id_idx
on public.chapter_chat_channels(chapter_id, status);

create index if not exists chapter_chat_channel_members_profile_id_idx
on public.chapter_chat_channel_members(profile_id);

create index if not exists chapter_chat_messages_channel_created_idx
on public.chapter_chat_messages(channel_id, created_at);

create index if not exists chapter_chat_messages_chapter_moderation_idx
on public.chapter_chat_messages(chapter_id, moderation_status, created_at desc);

create index if not exists chapter_chat_messages_author_id_idx
on public.chapter_chat_messages(author_id, created_at desc);

create index if not exists chapter_chat_message_reports_chapter_status_idx
on public.chapter_chat_message_reports(chapter_id, status, created_at desc);

create index if not exists chapter_chat_message_reports_reporter_id_idx
on public.chapter_chat_message_reports(reporter_id, created_at desc);

alter table public.chapter_chat_channels enable row level security;
alter table public.chapter_chat_channel_members enable row level security;
alter table public.chapter_chat_messages enable row level security;
alter table public.chapter_chat_message_reports enable row level security;

create or replace function public.set_chapter_chat_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_chapter_chat_channels_updated_at_before_write on public.chapter_chat_channels;
create trigger set_chapter_chat_channels_updated_at_before_write
before insert or update on public.chapter_chat_channels
for each row execute function public.set_chapter_chat_updated_at();

drop trigger if exists set_chapter_chat_messages_updated_at_before_write on public.chapter_chat_messages;
create trigger set_chapter_chat_messages_updated_at_before_write
before insert or update on public.chapter_chat_messages
for each row execute function public.set_chapter_chat_updated_at();

revoke all on function public.set_chapter_chat_updated_at() from public;

create or replace function public.sync_chapter_chat_message_chapter()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_chapter_id uuid;
begin
  select channel.chapter_id
  into target_chapter_id
  from public.chapter_chat_channels channel
  where channel.id = new.channel_id;

  if target_chapter_id is null then
    raise exception 'Chat channel not found'
      using errcode = 'P0001';
  end if;

  new.chapter_id := target_chapter_id;
  return new;
end;
$$;

drop trigger if exists sync_chapter_chat_message_chapter_before_write on public.chapter_chat_messages;
create trigger sync_chapter_chat_message_chapter_before_write
before insert or update on public.chapter_chat_messages
for each row execute function public.sync_chapter_chat_message_chapter();

revoke all on function public.sync_chapter_chat_message_chapter() from public;

create or replace function public.create_default_chapter_chat_channels()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.chapter_chat_channels (chapter_id, name, description, channel_type, created_by)
  values
    (new.id, 'General Chapter Chat', 'Open coordination and accountability for active chapter members.', 'general', coalesce(new.created_by, new.facilitator_id)),
    (new.id, 'Announcements', 'Leader and admin updates for this chapter.', 'announcements', coalesce(new.created_by, new.facilitator_id))
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists create_default_chapter_chat_channels_after_chapter_insert on public.chapters;
create trigger create_default_chapter_chat_channels_after_chapter_insert
after insert on public.chapters
for each row execute function public.create_default_chapter_chat_channels();

revoke all on function public.create_default_chapter_chat_channels() from public;

create or replace function public.create_event_chapter_chat_channel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.chapter_chat_channels (chapter_id, event_id, name, description, channel_type, created_by)
  values (
    new.chapter_id,
    new.id,
    left('Event: ' || new.title, 96),
    'Discussion for event coordination, rides, reminders, and accountability follow-up.',
    'event',
    new.created_by
  )
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists create_event_chapter_chat_channel_after_event_insert on public.chapter_events;
create trigger create_event_chapter_chat_channel_after_event_insert
after insert on public.chapter_events
for each row execute function public.create_event_chapter_chat_channel();

revoke all on function public.create_event_chapter_chat_channel() from public;

insert into public.chapter_chat_channels (chapter_id, name, description, channel_type, created_by)
select c.id, 'General Chapter Chat', 'Open coordination and accountability for active chapter members.', 'general', coalesce(c.created_by, c.facilitator_id)
from public.chapters c
on conflict do nothing;

insert into public.chapter_chat_channels (chapter_id, name, description, channel_type, created_by)
select c.id, 'Announcements', 'Leader and admin updates for this chapter.', 'announcements', coalesce(c.created_by, c.facilitator_id)
from public.chapters c
on conflict do nothing;

insert into public.chapter_chat_channels (chapter_id, event_id, name, description, channel_type, created_by)
select
  e.chapter_id,
  e.id,
  left('Event: ' || e.title, 96),
  'Discussion for event coordination, rides, reminders, and accountability follow-up.',
  'event',
  e.created_by
from public.chapter_events e
on conflict do nothing;

create or replace function public.can_access_chapter_chat_channel(target_channel_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chapter_chat_channels channel
    where channel.id = target_channel_id
      and channel.status = 'active'
      and (
        public.is_admin()
        or public.can_manage_chapter(channel.chapter_id)
        or (
          channel.channel_type <> 'small_group'
          and public.is_chapter_member(channel.chapter_id)
        )
        or (
          channel.channel_type = 'small_group'
          and exists (
            select 1
            from public.chapter_chat_channel_members member
            where member.channel_id = channel.id
              and member.profile_id = (select auth.uid())
          )
        )
      )
  );
$$;

revoke all on function public.can_access_chapter_chat_channel(uuid) from public;
grant execute on function public.can_access_chapter_chat_channel(uuid) to authenticated;

create or replace function public.get_my_chapter_chat_channels()
returns table (
  id uuid,
  chapter_id uuid,
  chapter_name text,
  name text,
  description text,
  channel_type text,
  event_id uuid,
  latest_message_at timestamptz,
  can_moderate boolean,
  is_read_only boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    channel.id,
    channel.chapter_id,
    chapter.name as chapter_name,
    channel.name,
    channel.description,
    channel.channel_type,
    channel.event_id,
    (
      select max(message.created_at)
      from public.chapter_chat_messages message
      where message.channel_id = channel.id
        and message.deleted_at is null
        and message.moderation_status in ('visible', 'reported')
    ) as latest_message_at,
    (public.is_admin() or public.can_manage_chapter(channel.chapter_id)) as can_moderate,
    (
      channel.channel_type = 'announcements'
      and not (public.is_admin() or public.can_manage_chapter(channel.chapter_id))
    ) as is_read_only,
    channel.created_at
  from public.chapter_chat_channels channel
  join public.chapters chapter on chapter.id = channel.chapter_id
  where public.can_access_chapter_chat_channel(channel.id)
  order by
    chapter.name,
    case channel.channel_type
      when 'general' then 1
      when 'announcements' then 2
      when 'event' then 3
      else 4
    end,
    latest_message_at desc nulls last,
    channel.created_at desc,
    channel.name;
$$;

revoke all on function public.get_my_chapter_chat_channels() from public;
grant execute on function public.get_my_chapter_chat_channels() to authenticated;

create or replace function public.get_chapter_chat_messages(target_channel_id uuid)
returns table (
  id uuid,
  channel_id uuid,
  chapter_id uuid,
  author_id uuid,
  author_name text,
  author_avatar_url text,
  body text,
  message_type text,
  attachment_url text,
  attachment_name text,
  attachment_mime_type text,
  attachment_size integer,
  location_latitude numeric,
  location_longitude numeric,
  location_label text,
  moderation_status text,
  created_at timestamptz,
  can_delete boolean
)
language sql
security definer
set search_path = public
as $$
  select
    message.id,
    message.channel_id,
    message.chapter_id,
    message.author_id,
    coalesce(nullif(trim(author.full_name), ''), author.username, 'Bloke member') as author_name,
    author.avatar_url as author_avatar_url,
    message.body,
    message.message_type,
    message.attachment_url,
    message.attachment_name,
    message.attachment_mime_type,
    message.attachment_size,
    message.location_latitude,
    message.location_longitude,
    message.location_label,
    message.moderation_status,
    message.created_at,
    (public.is_admin() or public.can_manage_chapter(message.chapter_id)) as can_delete
  from public.chapter_chat_messages message
  left join public.profiles author on author.id = message.author_id
  where message.channel_id = target_channel_id
    and public.can_access_chapter_chat_channel(target_channel_id)
    and message.deleted_at is null
    and (
      message.moderation_status in ('visible', 'reported')
      or public.is_admin()
      or public.can_manage_chapter(message.chapter_id)
    )
  order by message.created_at asc;
$$;

revoke all on function public.get_chapter_chat_messages(uuid) from public;
grant execute on function public.get_chapter_chat_messages(uuid) to authenticated;

create or replace function public.delete_chapter_chat_message(target_message_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  message_row public.chapter_chat_messages%rowtype;
begin
  select *
  into message_row
  from public.chapter_chat_messages
  where id = target_message_id
  for update;

  if message_row.id is null then
    raise exception 'Message not found'
      using errcode = 'P0001';
  end if;

  if not (public.is_admin() or public.can_manage_chapter(message_row.chapter_id)) then
    raise exception 'Only chapter leaders or admins can delete messages'
      using errcode = '42501';
  end if;

  update public.chapter_chat_messages
  set
    deleted_at = now(),
    deleted_by = (select auth.uid()),
    moderation_status = 'hidden'
  where id = target_message_id;

  return target_message_id;
end;
$$;

revoke all on function public.delete_chapter_chat_message(uuid) from public;
grant execute on function public.delete_chapter_chat_message(uuid) to authenticated;

create or replace function public.report_chapter_chat_message(
  target_message_id uuid,
  report_reason text,
  report_details text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  message_row public.chapter_chat_messages%rowtype;
  report_id uuid;
begin
  if report_reason not in ('harassment', 'unsafe', 'spam', 'privacy', 'other') then
    raise exception 'Unsupported report reason'
      using errcode = 'P0001';
  end if;

  select *
  into message_row
  from public.chapter_chat_messages
  where id = target_message_id
    and deleted_at is null;

  if message_row.id is null then
    raise exception 'Message not found'
      using errcode = 'P0001';
  end if;

  if not public.can_access_chapter_chat_channel(message_row.channel_id) then
    raise exception 'Not authorized to report this message'
      using errcode = '42501';
  end if;

  if message_row.author_id = (select auth.uid()) then
    raise exception 'You cannot report your own message'
      using errcode = 'P0001';
  end if;

  insert into public.chapter_chat_message_reports (message_id, chapter_id, reporter_id, reason, details)
  values (target_message_id, message_row.chapter_id, (select auth.uid()), report_reason, nullif(trim(report_details), ''))
  on conflict (message_id, reporter_id) do update
  set
    reason = excluded.reason,
    details = excluded.details,
    status = 'open',
    reviewed_by = null,
    reviewed_at = null
  returning id into report_id;

  update public.chapter_chat_messages
  set moderation_status = 'reported'
  where id = target_message_id
    and moderation_status = 'visible';

  return report_id;
end;
$$;

revoke all on function public.report_chapter_chat_message(uuid, text, text) from public;
grant execute on function public.report_chapter_chat_message(uuid, text, text) to authenticated;

create or replace function public.review_chapter_chat_message_report(
  target_report_id uuid,
  next_status text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if next_status not in ('reviewing', 'resolved', 'dismissed') then
    raise exception 'Unsupported report status'
      using errcode = 'P0001';
  end if;

  if not public.is_admin() then
    raise exception 'Only admins can review message reports'
      using errcode = '42501';
  end if;

  update public.chapter_chat_message_reports
  set
    status = next_status,
    reviewed_by = (select auth.uid()),
    reviewed_at = now()
  where id = target_report_id;

  if not found then
    raise exception 'Report not found'
      using errcode = 'P0001';
  end if;

  return target_report_id;
end;
$$;

revoke all on function public.review_chapter_chat_message_report(uuid, text) from public;
grant execute on function public.review_chapter_chat_message_report(uuid, text) to authenticated;

create or replace function public.get_chapter_chat_message_reports()
returns table (
  id uuid,
  message_id uuid,
  chapter_id uuid,
  chapter_name text,
  channel_name text,
  reason text,
  details text,
  status text,
  reporter_id uuid,
  reporter_name text,
  author_id uuid,
  author_name text,
  message_body text,
  message_type text,
  attachment_name text,
  created_at timestamptz,
  reviewed_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    report.id,
    report.message_id,
    report.chapter_id,
    chapter.name as chapter_name,
    channel.name as channel_name,
    report.reason,
    report.details,
    report.status,
    report.reporter_id,
    coalesce(nullif(trim(reporter.full_name), ''), reporter.username, 'Bloke member') as reporter_name,
    message.author_id,
    coalesce(nullif(trim(author.full_name), ''), author.username, 'Bloke member') as author_name,
    message.body as message_body,
    message.message_type,
    message.attachment_name,
    report.created_at,
    report.reviewed_at
  from public.chapter_chat_message_reports report
  join public.chapter_chat_messages message on message.id = report.message_id
  join public.chapter_chat_channels channel on channel.id = message.channel_id
  join public.chapters chapter on chapter.id = report.chapter_id
  left join public.profiles reporter on reporter.id = report.reporter_id
  left join public.profiles author on author.id = message.author_id
  where public.is_admin()
  order by
    case report.status
      when 'open' then 1
      when 'reviewing' then 2
      when 'resolved' then 3
      else 4
    end,
    report.created_at desc;
$$;

revoke all on function public.get_chapter_chat_message_reports() from public;
grant execute on function public.get_chapter_chat_message_reports() to authenticated;

drop policy if exists "Chapter members can read chat channels" on public.chapter_chat_channels;
create policy "Chapter members can read chat channels"
on public.chapter_chat_channels
for select
to authenticated
using (public.can_access_chapter_chat_channel(id));

drop policy if exists "Chapter leaders can manage chat channels" on public.chapter_chat_channels;
create policy "Chapter leaders can manage chat channels"
on public.chapter_chat_channels
for all
to authenticated
using (public.is_admin() or public.can_manage_chapter(chapter_id))
with check (public.is_admin() or public.can_manage_chapter(chapter_id));

drop policy if exists "Channel members can read their small group memberships" on public.chapter_chat_channel_members;
create policy "Channel members can read their small group memberships"
on public.chapter_chat_channel_members
for select
to authenticated
using (
  profile_id = (select auth.uid())
  or exists (
    select 1
    from public.chapter_chat_channels channel
    where channel.id = chapter_chat_channel_members.channel_id
      and (public.is_admin() or public.can_manage_chapter(channel.chapter_id))
  )
);

drop policy if exists "Chapter leaders can manage small group members" on public.chapter_chat_channel_members;
create policy "Chapter leaders can manage small group members"
on public.chapter_chat_channel_members
for all
to authenticated
using (
  exists (
    select 1
    from public.chapter_chat_channels channel
    where channel.id = chapter_chat_channel_members.channel_id
      and (public.is_admin() or public.can_manage_chapter(channel.chapter_id))
  )
)
with check (
  exists (
    select 1
    from public.chapter_chat_channels channel
    where channel.id = chapter_chat_channel_members.channel_id
      and (public.is_admin() or public.can_manage_chapter(channel.chapter_id))
  )
);

drop policy if exists "Chapter members can read chat messages" on public.chapter_chat_messages;
create policy "Chapter members can read chat messages"
on public.chapter_chat_messages
for select
to authenticated
using (
  public.can_access_chapter_chat_channel(channel_id)
  and deleted_at is null
  and (
    moderation_status in ('visible', 'reported')
    or public.is_admin()
    or public.can_manage_chapter(chapter_id)
  )
);

drop policy if exists "Chapter members can create chat messages" on public.chapter_chat_messages;
create policy "Chapter members can create chat messages"
on public.chapter_chat_messages
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and public.can_access_chapter_chat_channel(channel_id)
  and exists (
    select 1
    from public.chapter_chat_channels channel
    where channel.id = chapter_chat_messages.channel_id
      and channel.status = 'active'
      and (
        channel.channel_type <> 'announcements'
        or public.is_admin()
        or public.can_manage_chapter(channel.chapter_id)
      )
  )
);

drop policy if exists "Users can read their chat message reports" on public.chapter_chat_message_reports;
create policy "Users can read their chat message reports"
on public.chapter_chat_message_reports
for select
to authenticated
using (
  reporter_id = (select auth.uid())
  or public.is_admin()
  or public.can_manage_chapter(chapter_id)
);

drop policy if exists "Users can create chat message reports" on public.chapter_chat_message_reports;
create policy "Users can create chat message reports"
on public.chapter_chat_message_reports
for insert
to authenticated
with check (
  reporter_id = (select auth.uid())
  and exists (
    select 1
    from public.chapter_chat_messages message
    where message.id = chapter_chat_message_reports.message_id
      and message.chapter_id = chapter_chat_message_reports.chapter_id
      and message.author_id is distinct from (select auth.uid())
      and public.can_access_chapter_chat_channel(message.channel_id)
  )
);

drop policy if exists "Admins can update chat message reports" on public.chapter_chat_message_reports;
create policy "Admins can update chat message reports"
on public.chapter_chat_message_reports
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());
