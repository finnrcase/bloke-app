-- Tighten week_number integrity. Safe to apply: the project starts empty.

alter table public.weekly_progress
  alter column week_number set not null;

alter table public.journal_logs
  alter column week_number set not null;

alter table public.journal_logs
  add constraint journal_logs_week_number_fkey
  foreign key (week_number) references public.curriculum_weeks(week_number) on delete cascade;

-- One journal log per profile per week, so the client can upsert answers.
alter table public.journal_logs
  add constraint journal_logs_profile_week_unique
  unique (profile_id, week_number);

create index if not exists journal_logs_week_number_idx
  on public.journal_logs(week_number);
