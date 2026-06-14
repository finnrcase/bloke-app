-- Private reflection journal connected to the 52-week curriculum.
--
-- Keeps the legacy journal_logs weekly JSON table intact, while adding a
-- normalized answer history that can support search, growth summaries, reports,
-- and future personal insight features.

create extension if not exists pg_trgm;

create table if not exists public.curriculum_reflection_questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.curriculum_weeks(id) on delete cascade,
  week_number integer not null references public.curriculum_weeks(week_number) on delete cascade,
  question_order smallint not null check (question_order between 1 and 3),
  prompt text not null check (char_length(trim(prompt)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint curriculum_reflection_questions_week_order_unique unique (week_number, question_order),
  constraint curriculum_reflection_questions_lesson_order_unique unique (lesson_id, question_order),
  constraint curriculum_reflection_questions_id_lesson_unique unique (id, lesson_id)
);

create table if not exists public.curriculum_reflections (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.curriculum_weeks(id) on delete cascade,
  question_id uuid not null,
  reflection_text text not null check (char_length(trim(reflection_text)) between 1 and 5000),
  visibility text not null default 'private'
    check (visibility in ('private', 'mentor_shared', 'chapter_shared')),
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint curriculum_reflections_question_lesson_fkey
    foreign key (question_id, lesson_id)
    references public.curriculum_reflection_questions(id, lesson_id)
    on delete cascade,
  constraint curriculum_reflections_profile_question_unique unique (profile_id, question_id)
);

comment on table public.curriculum_reflections is
  'Private-by-default curriculum reflection answers. Policies expose rows only to the author unless future sharing policies are explicitly added.';
comment on column public.curriculum_reflections.profile_id is
  'The authenticated user/profile who wrote the reflection.';
comment on column public.curriculum_reflections.lesson_id is
  'The curriculum lesson/week this reflection belongs to.';
comment on column public.curriculum_reflections.question_id is
  'The specific reflection question answered.';

create index if not exists curriculum_reflection_questions_lesson_idx
on public.curriculum_reflection_questions(lesson_id, question_order);

create index if not exists curriculum_reflections_profile_submitted_idx
on public.curriculum_reflections(profile_id, submitted_at desc);

create index if not exists curriculum_reflections_profile_lesson_idx
on public.curriculum_reflections(profile_id, lesson_id);

create index if not exists curriculum_reflections_question_idx
on public.curriculum_reflections(question_id);

create index if not exists curriculum_reflections_text_trgm_idx
on public.curriculum_reflections using gin (reflection_text gin_trgm_ops);

create or replace function public.set_reflection_journal_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_curriculum_reflection_questions_updated_at on public.curriculum_reflection_questions;
create trigger set_curriculum_reflection_questions_updated_at
before update on public.curriculum_reflection_questions
for each row execute function public.set_reflection_journal_updated_at();

drop trigger if exists set_curriculum_reflections_updated_at on public.curriculum_reflections;
create trigger set_curriculum_reflections_updated_at
before update on public.curriculum_reflections
for each row execute function public.set_reflection_journal_updated_at();

insert into public.curriculum_reflection_questions (
  lesson_id,
  week_number,
  question_order,
  prompt
)
select
  cw.id,
  cw.week_number,
  prompts.ordinality::smallint,
  prompts.prompt
from public.curriculum_weeks cw
cross join lateral jsonb_array_elements_text(cw.log_prompts) with ordinality as prompts(prompt, ordinality)
where cw.log_prompts is not null
  and jsonb_typeof(cw.log_prompts) = 'array'
  and prompts.ordinality between 1 and 3
on conflict (week_number, question_order) do update
set
  lesson_id = excluded.lesson_id,
  prompt = excluded.prompt;

insert into public.curriculum_reflections (
  profile_id,
  lesson_id,
  question_id,
  reflection_text,
  submitted_at,
  created_at,
  updated_at
)
select
  jl.profile_id,
  cw.id,
  crq.id,
  trim(answer_items.answer_json ->> 'answer'),
  coalesce(jl.created_at, now()),
  coalesce(jl.created_at, now()),
  coalesce(jl.created_at, now())
from public.journal_logs jl
join public.curriculum_weeks cw
  on cw.week_number = jl.week_number
cross join lateral jsonb_array_elements(jl.answers) with ordinality as answer_items(answer_json, ordinality)
join public.curriculum_reflection_questions crq
  on crq.week_number = jl.week_number
  and crq.question_order = answer_items.ordinality::smallint
where jl.profile_id is not null
  and jl.answers is not null
  and jsonb_typeof(jl.answers) = 'array'
  and char_length(trim(coalesce(answer_items.answer_json ->> 'answer', ''))) > 0
on conflict (profile_id, question_id) do update
set
  reflection_text = excluded.reflection_text,
  submitted_at = excluded.submitted_at,
  updated_at = now();

alter table public.curriculum_reflection_questions enable row level security;
alter table public.curriculum_reflections enable row level security;

drop policy if exists "Users can read curriculum reflection questions" on public.curriculum_reflection_questions;
create policy "Users can read curriculum reflection questions"
on public.curriculum_reflection_questions
for select
to authenticated
using (true);

drop policy if exists "Users can read their own curriculum reflections" on public.curriculum_reflections;
create policy "Users can read their own curriculum reflections"
on public.curriculum_reflections
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "Users can insert their own curriculum reflections" on public.curriculum_reflections;
create policy "Users can insert their own curriculum reflections"
on public.curriculum_reflections
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "Users can update their own curriculum reflections" on public.curriculum_reflections;
create policy "Users can update their own curriculum reflections"
on public.curriculum_reflections
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

revoke all on function public.set_reflection_journal_updated_at() from public;
