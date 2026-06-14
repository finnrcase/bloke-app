-- Full Bloke curriculum engine.
--
-- Prepares the program for 52 sequential weeks. Each week has one lesson, one
-- activity, and exactly three reflection questions. Progress is timestamped and
-- future weeks are locked at the database layer until the previous week is
-- complete.

alter table public.curriculum_weeks
add column if not exists lesson_title text,
add column if not exists activity_title text,
add column if not exists program_phase text;

alter table public.curriculum_weeks
drop constraint if exists curriculum_weeks_week_number_range_check;

alter table public.curriculum_weeks
add constraint curriculum_weeks_week_number_range_check
check (week_number between 1 and 52);

alter table public.curriculum_weeks
drop constraint if exists curriculum_weeks_three_log_prompts_check;

alter table public.curriculum_weeks
add constraint curriculum_weeks_three_log_prompts_check
check (
  log_prompts is null
  or (
    jsonb_typeof(log_prompts) = 'array'
    and jsonb_array_length(log_prompts) = 3
  )
);

alter table public.weekly_progress
add column if not exists started_at timestamptz,
add column if not exists learn_completed_at timestamptz,
add column if not exists act_completed_at timestamptz,
add column if not exists log_completed_at timestamptz,
add column if not exists completed_at timestamptz,
add column if not exists updated_at timestamptz not null default now();

alter table public.weekly_progress
drop constraint if exists weekly_progress_week_number_range_check;

alter table public.weekly_progress
add constraint weekly_progress_week_number_range_check
check (week_number between 1 and 52);

alter table public.profiles
add column if not exists current_curriculum_week integer not null default 1,
add column if not exists curriculum_started_at timestamptz,
add column if not exists curriculum_completed_at timestamptz,
add column if not exists last_curriculum_activity_at timestamptz;

alter table public.profiles
drop constraint if exists profiles_current_curriculum_week_range_check;

alter table public.profiles
add constraint profiles_current_curriculum_week_range_check
check (current_curriculum_week between 1 and 52);

create index if not exists curriculum_weeks_week_number_idx on public.curriculum_weeks(week_number);
create index if not exists weekly_progress_profile_week_completion_idx
on public.weekly_progress(profile_id, week_number, learn_complete, act_complete, log_complete);

create temp table bloke_curriculum_seed (
  week_number integer primary key,
  title text not null,
  identity_statement text not null,
  program_phase text not null,
  milestone_name text not null,
  lesson_focus text not null,
  activity_text text not null
) on commit drop;

insert into bloke_curriculum_seed
  (week_number, title, identity_statement, program_phase, milestone_name, lesson_focus, activity_text)
values
  (1, 'Show Up', 'I show up.', 'Foundation', 'Initiate', 'Showing up is the first proof that your word matters. Start with presence before performance.', 'Choose one commitment this week and show up every time without renegotiating.'),
  (2, 'Keep Your Word', 'I do what I say.', 'Foundation', 'Integrity', 'Trust is built when your actions match your promises, especially in small private choices.', 'Make one clear promise to yourself and one to another person. Keep both and record the proof.'),
  (3, 'Control Your Environment', 'I control my environment.', 'Foundation', 'Environment', 'Your surroundings train you. A disciplined environment makes disciplined action easier.', 'Remove one distraction and add one positive input where you spend the most time.'),
  (4, 'Do Hard Things', 'I do hard things.', 'Foundation', 'Discipline', 'Hard things reveal where you are strong and where you need training.', 'Choose one hard but healthy action and do it at least three times this week.'),
  (5, 'Take Responsibility', 'I own my life.', 'Foundation', 'Showing Up', 'Responsibility is the move from blame to agency. You cannot lead what you refuse to own.', 'Name one area where you have blamed circumstances and take one concrete corrective action.'),
  (6, 'Be On Time', 'I respect time.', 'Foundation', 'Respect', 'Punctuality is respect made visible. It tells others your word has weight.', 'Arrive early to every commitment you control this week.'),
  (7, 'Limit Distractions', 'I protect my attention.', 'Foundation', 'Focus', 'Attention is a resource. What captures it eventually shapes your character.', 'Limit one major distraction and create a daily focus block.'),
  (8, 'Respect Yourself', 'I act like someone worth respecting.', 'Foundation', 'Self-Respect', 'Self-respect grows when your daily choices line up with your standards.', 'Do three practical things that show self-respect in body, space, and speech.'),
  (9, 'Choose Your Circle', 'I choose who shapes me.', 'Foundation', 'Brotherhood', 'Your circle normalizes either growth or drift. Choose men who call you upward.', 'Spend intentional time with someone who strengthens your standards.'),
  (10, 'Finish What You Start', 'I finish what I start.', 'Foundation', 'Reliable', 'Finishing builds confidence because it proves you can close loops.', 'Pick one unfinished task and complete it before starting a new one.'),
  (11, 'Tell the Truth', 'I tell the truth quickly.', 'Integrity', 'Honesty', 'Truth spoken early prevents small issues from becoming hidden patterns.', 'Tell the truth in one conversation you have been avoiding.'),
  (12, 'Build a Morning Standard', 'I begin before the day pulls me.', 'Integrity', 'Rhythm', 'A steady morning creates momentum before pressure and distraction arrive.', 'Design a 20-minute morning standard and complete it four times.'),
  (13, 'Train Your Body', 'I train the body I live in.', 'Integrity', 'Strength', 'Physical training teaches patience, effort, and respect for limits.', 'Complete three workouts or active training sessions this week.'),
  (14, 'Master Sleep', 'I recover on purpose.', 'Integrity', 'Recovery', 'Rest is not weakness. Recovery protects discipline, mood, and judgment.', 'Choose a bedtime window and protect it for five nights.'),
  (15, 'Manage Money Basics', 'I tell the truth about money.', 'Integrity', 'Stewardship', 'Money reveals habits. Tracking it gives you choices instead of surprises.', 'Track every dollar you spend for seven days.'),
  (16, 'Work Before Reward', 'I earn my comfort.', 'Integrity', 'Self-Control', 'Reward feels cleaner when it follows effort instead of replacing it.', 'Put your highest responsibility before entertainment each day.'),
  (17, 'Ask Better Questions', 'I seek understanding before answers.', 'Integrity', 'Wisdom', 'Better questions open better choices and make you easier to help.', 'Ask three men one thoughtful question and listen without interrupting.'),
  (18, 'Listen First', 'I listen to understand.', 'Integrity', 'Presence', 'Listening is leadership because it honors reality before responding.', 'In one important conversation, summarize what you heard before giving your view.'),
  (19, 'Own Your Emotions', 'I feel without being ruled.', 'Integrity', 'Emotional Control', 'Emotions carry information, but they should not drive the whole vehicle.', 'When triggered this week, pause for 90 seconds before responding.'),
  (20, 'Repair Quickly', 'I repair what I damage.', 'Integrity', 'Repair', 'Maturity is not never failing. Maturity is returning quickly and honestly.', 'Make one repair: apologize, replace, clarify, or follow through.'),
  (21, 'Serve Without Spotlight', 'I serve when no one claps.', 'Service', 'Service', 'Service trains humility and turns strength outward.', 'Do one useful act for someone without announcing it.'),
  (22, 'Practice Gratitude', 'I notice what is good.', 'Service', 'Gratitude', 'Gratitude strengthens perspective without denying hard realities.', 'Write down three specific things you are grateful for each day.'),
  (23, 'Build Confidence', 'I build confidence through evidence.', 'Service', 'Confidence', 'Confidence grows from kept promises, not hype.', 'Create one small proof each day that you are becoming reliable.'),
  (24, 'Speak Clearly', 'I say what I mean with respect.', 'Service', 'Communication', 'Clear speech reduces confusion and helps others trust your leadership.', 'Practice one direct, respectful conversation instead of hinting or avoiding.'),
  (25, 'Lead by Example', 'I go first.', 'Service', 'Grounded', 'Leadership begins when your life becomes an example others can inspect.', 'Choose one standard and model it publicly for your group.'),
  (26, 'Set Boundaries', 'I protect what matters.', 'Service', 'Boundaries', 'Boundaries are not walls. They are commitments with edges.', 'Set one clear boundary around time, behavior, or attention.'),
  (27, 'Choose Mentors', 'I learn from men ahead of me.', 'Service', 'Mentorship', 'A mentor helps you see patterns you cannot yet see alone.', 'Ask one trusted man for advice on a specific area of growth.'),
  (28, 'Become Teachable', 'I receive correction without quitting.', 'Service', 'Teachable', 'Correction is a gift when it helps you become more honest and useful.', 'Invite feedback on one behavior and thank the person before defending yourself.'),
  (29, 'Handle Conflict', 'I face conflict cleanly.', 'Service', 'Courage', 'Avoided conflict often becomes resentment. Clean conflict seeks truth and repair.', 'Address one small conflict directly, calmly, and respectfully.'),
  (30, 'Protect Your Word', 'I do not spend promises cheaply.', 'Service', 'Trust', 'Your word loses value when you offer it casually. Promise less and deliver more.', 'Review your open commitments and close or renegotiate each one honestly.'),
  (31, 'Build Career Skills', 'I prepare for useful work.', 'Craft', 'Career', 'Skill creates options. Options increase your ability to serve and lead.', 'Spend two focused hours improving one career or trade skill.'),
  (32, 'Plan Your Week', 'I aim my week before it starts.', 'Craft', 'Planning', 'Planning turns values into appointments and responsibilities into action.', 'Plan your week on paper before Monday begins.'),
  (33, 'Build Financial Discipline', 'I direct money with purpose.', 'Craft', 'Finance', 'Financial discipline is a form of stewardship and future protection.', 'Create or update a simple budget for the next 30 days.'),
  (34, 'Respect Women', 'I honor women in speech and action.', 'Craft', 'Honor', 'Respect is shown in private speech, public behavior, and personal boundaries.', 'Audit how you speak about women and correct one pattern.'),
  (35, 'Build Healthy Friendships', 'I build friendships that strengthen me.', 'Craft', 'Friendship', 'Healthy friendship combines honesty, encouragement, and accountability.', 'Reach out to one friend with encouragement and one honest question.'),
  (36, 'Face Fear', 'I move toward what is right.', 'Craft', 'Courage Under Pressure', 'Fear is not always a stop sign. Sometimes it marks the next training ground.', 'Do one right thing you have delayed because of fear.'),
  (37, 'Recover from Setbacks', 'I get back up with wisdom.', 'Craft', 'Resilience', 'Setbacks become training when you extract lessons and return to action.', 'Write the lesson from a recent setback and take the next small step.'),
  (38, 'Stay Consistent', 'I repeat what matters.', 'Craft', 'Consistency', 'Consistency is ordinary faithfulness repeated until it changes you.', 'Choose one daily habit and complete it five days in a row.'),
  (39, 'Practice Faith and Values', 'I live from my deepest values.', 'Craft', 'Values', 'Values become real when they guide decisions under pressure.', 'Name three values and make one decision this week that honors them.'),
  (40, 'Build Community', 'I contribute to the circle.', 'Craft', 'Community', 'Community strengthens when each man brings presence, honesty, and help.', 'Make one contribution that strengthens your chapter or local community.'),
  (41, 'Mentor Someone Behind You', 'I pass on what I am learning.', 'Leadership', 'Mentor', 'You do not need to be finished to be useful. Share what is real and tested.', 'Encourage someone younger or newer with one lesson you have learned.'),
  (42, 'Create Before Consuming', 'I build before I browse.', 'Leadership', 'Creation', 'Creation makes you active in your life. Consumption can make you passive.', 'Spend the first 30 minutes of free time creating, practicing, or building.'),
  (43, 'Take Initiative', 'I act without being chased.', 'Leadership', 'Initiative', 'Initiative is seeing what needs doing and moving before someone asks twice.', 'Identify one need and handle it without waiting for permission.'),
  (44, 'Lead a Small Group', 'I create space for others to grow.', 'Leadership', 'Facilitation', 'Leading a group means setting tone, asking good questions, and keeping trust.', 'Facilitate a short check-in with two or more men.'),
  (45, 'Build Resilience', 'I bend without breaking.', 'Leadership', 'Resilient', 'Resilience combines recovery, meaning, and returning to the work.', 'When something goes wrong this week, respond with one grounded action.'),
  (46, 'Make Better Decisions', 'I slow down for wisdom.', 'Leadership', 'Judgment', 'Better decisions come from clarity, counsel, and consequences considered early.', 'Use a simple decision filter: truth, responsibility, counsel, next consequence.'),
  (47, 'Practice Forgiveness', 'I release bitterness and pursue repair.', 'Leadership', 'Forgiveness', 'Forgiveness frees your future from being governed by old wounds.', 'Name one resentment and take one step toward release or repair.'),
  (48, 'Strengthen Family Bonds', 'I honor my family with action.', 'Leadership', 'Family', 'Family strength grows through attention, service, and honest repair.', 'Do one specific act that strengthens a family relationship.'),
  (49, 'Leave People Better', 'I add strength where I go.', 'Leadership', 'Impact', 'A mature man leaves rooms more honest, steady, and hopeful.', 'In every room you enter this week, look for one way to add strength.'),
  (50, 'Build Your Mission', 'I know what I am building.', 'Leadership', 'Capable', 'Mission focuses your effort and helps you say no with confidence.', 'Write a one-paragraph mission for the man you are becoming.'),
  (51, 'Prepare to Lead', 'I prepare before responsibility arrives.', 'Leadership', 'Ready', 'Leadership expands when preparation meets trust.', 'Choose one leadership responsibility and prepare a simple plan for it.'),
  (52, 'Commit to the Next Year', 'I continue the work.', 'Leadership', 'Builder', 'Completion is not the end. It is proof that you can commit to a longer road.', 'Create your next 12-month growth plan with standards, support, and service.');

insert into public.curriculum_weeks (
  week_number,
  title,
  identity_statement,
  learn_text,
  act_text,
  log_prompts,
  milestone_name,
  lesson_title,
  activity_title,
  program_phase
)
select
  seed.week_number,
  seed.title,
  seed.identity_statement,
  seed.lesson_focus as learn_text,
  seed.activity_text as act_text,
  jsonb_build_array(
    'Where did you practice "' || seed.title || '" this week?',
    'What resisted this standard in your habits, environment, or relationships?',
    'What specific proof will you create before next week?'
  ) as log_prompts,
  seed.milestone_name,
  'Lesson: ' || seed.title,
  'Activity: ' || seed.title,
  seed.program_phase
from bloke_curriculum_seed seed
on conflict (week_number) do update
set
  title = excluded.title,
  identity_statement = excluded.identity_statement,
  learn_text = excluded.learn_text,
  act_text = excluded.act_text,
  log_prompts = excluded.log_prompts,
  milestone_name = excluded.milestone_name,
  lesson_title = excluded.lesson_title,
  activity_title = excluded.activity_title,
  program_phase = excluded.program_phase;

create or replace function public.enforce_sequential_weekly_progress()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.week_number < 1 or new.week_number > 52 then
    raise exception 'Week number must be between 1 and 52.';
  end if;

  if new.profile_id is null then
    raise exception 'Progress must belong to a profile.';
  end if;

  if new.week_number > 1 and not exists (
    select 1
    from public.weekly_progress previous_progress
    where previous_progress.profile_id = new.profile_id
      and previous_progress.week_number = new.week_number - 1
      and previous_progress.learn_complete = true
      and previous_progress.act_complete = true
      and previous_progress.log_complete = true
  ) then
    raise exception 'Complete the previous week before starting this one.';
  end if;

  return new;
end;
$$;

create or replace function public.set_weekly_progress_timestamps()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.started_at := coalesce(new.started_at, now());
  else
    new.started_at := coalesce(new.started_at, old.started_at, now());
  end if;

  new.updated_at := now();

  if new.learn_complete = true then
    if tg_op = 'INSERT' then
      new.learn_completed_at := coalesce(new.learn_completed_at, now());
    else
      new.learn_completed_at := coalesce(new.learn_completed_at, old.learn_completed_at, now());
    end if;
  end if;

  if new.act_complete = true then
    if tg_op = 'INSERT' then
      new.act_completed_at := coalesce(new.act_completed_at, now());
    else
      new.act_completed_at := coalesce(new.act_completed_at, old.act_completed_at, now());
    end if;
  end if;

  if new.log_complete = true then
    if tg_op = 'INSERT' then
      new.log_completed_at := coalesce(new.log_completed_at, now());
    else
      new.log_completed_at := coalesce(new.log_completed_at, old.log_completed_at, now());
    end if;
  end if;

  if new.learn_complete = true and new.act_complete = true and new.log_complete = true then
    if tg_op = 'INSERT' then
      new.completed_at := coalesce(new.completed_at, new.submitted_at, now());
    else
      new.completed_at := coalesce(new.completed_at, old.completed_at, new.submitted_at, now());
    end if;
    new.submitted_at := coalesce(new.submitted_at, new.completed_at);
  end if;

  return new;
end;
$$;

create or replace function public.sync_profile_curriculum_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_week integer;
  completed_count integer;
begin
  select coalesce(min(week_numbers.week_number), 52)
  into next_week
  from generate_series(1, 52) as week_numbers(week_number)
  where not exists (
    select 1
    from public.weekly_progress wp
    where wp.profile_id = new.profile_id
      and wp.week_number = week_numbers.week_number
      and wp.learn_complete = true
      and wp.act_complete = true
      and wp.log_complete = true
  );

  select count(*)
  into completed_count
  from public.weekly_progress wp
  where wp.profile_id = new.profile_id
    and wp.week_number between 1 and 52
    and wp.learn_complete = true
    and wp.act_complete = true
    and wp.log_complete = true;

  update public.profiles
  set
    current_curriculum_week = next_week,
    curriculum_started_at = coalesce(public.profiles.curriculum_started_at, new.started_at, new.created_at, now()),
    curriculum_completed_at = case
      when completed_count >= 52 then coalesce(public.profiles.curriculum_completed_at, new.completed_at, now())
      else null
    end,
    last_curriculum_activity_at = now()
  where id = new.profile_id;

  return new;
end;
$$;

update public.weekly_progress
set
  started_at = coalesce(started_at, created_at, submitted_at, now()),
  learn_completed_at = case when learn_complete then coalesce(learn_completed_at, submitted_at, created_at, now()) else learn_completed_at end,
  act_completed_at = case when act_complete then coalesce(act_completed_at, submitted_at, created_at, now()) else act_completed_at end,
  log_completed_at = case when log_complete then coalesce(log_completed_at, submitted_at, created_at, now()) else log_completed_at end,
  completed_at = case
    when learn_complete and act_complete and log_complete then coalesce(completed_at, submitted_at, created_at, now())
    else completed_at
  end,
  updated_at = now();

drop trigger if exists enforce_sequential_weekly_progress_before_write on public.weekly_progress;
create trigger enforce_sequential_weekly_progress_before_write
before insert or update on public.weekly_progress
for each row execute function public.enforce_sequential_weekly_progress();

drop trigger if exists set_weekly_progress_timestamps_before_write on public.weekly_progress;
create trigger set_weekly_progress_timestamps_before_write
before insert or update on public.weekly_progress
for each row execute function public.set_weekly_progress_timestamps();

drop trigger if exists sync_profile_curriculum_status_after_write on public.weekly_progress;
create trigger sync_profile_curriculum_status_after_write
after insert or update on public.weekly_progress
for each row execute function public.sync_profile_curriculum_status();

create or replace function public.award_eligible_badges(target_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  completed_weeks integer[];
  streak integer := 0;
  week_cursor integer;
  has_attendance boolean;
  earned_codes text[] := '{}';
begin
  select coalesce(array_agg(week_number order by week_number), '{}')
  into completed_weeks
  from public.weekly_progress
  where profile_id = target_profile_id
    and learn_complete and act_complete and log_complete;

  if  1 = any(completed_weeks) then earned_codes := earned_codes || 'milestone_initiate';   end if;
  if  5 = any(completed_weeks) then earned_codes := earned_codes || 'milestone_showing_up'; end if;
  if 10 = any(completed_weeks) then earned_codes := earned_codes || 'milestone_reliable';   end if;
  if 25 = any(completed_weeks) then earned_codes := earned_codes || 'milestone_grounded';   end if;
  if 50 = any(completed_weeks) then earned_codes := earned_codes || 'milestone_capable';    end if;
  if 51 = any(completed_weeks) then earned_codes := earned_codes || 'milestone_leader';     end if;
  if 52 = any(completed_weeks) then earned_codes := earned_codes || 'completion_builder';   end if;

  if 2 = any(completed_weeks) then earned_codes := earned_codes || 'integrity';   end if;
  if 3 = any(completed_weeks) then earned_codes := earned_codes || 'environment'; end if;
  if 4 = any(completed_weeks) then earned_codes := earned_codes || 'discipline';  end if;

  if array_length(completed_weeks, 1) is not null then
    week_cursor := completed_weeks[array_length(completed_weeks, 1)];
    while week_cursor > 0 and week_cursor = any(completed_weeks) loop
      streak := streak + 1;
      week_cursor := week_cursor - 1;
    end loop;
  end if;

  if streak >=  3 then earned_codes := earned_codes || 'consistency_bronze'; end if;
  if streak >=  5 then earned_codes := earned_codes || 'consistency_silver'; end if;
  if streak >= 10 then earned_codes := earned_codes || 'consistency_gold';   end if;

  select exists (
    select 1
    from public.attendance a
    join public.chapter_members cm
      on cm.chapter_id = a.chapter_id and cm.profile_id = a.profile_id
    where a.profile_id = target_profile_id
  ) into has_attendance;

  if has_attendance then earned_codes := earned_codes || 'brotherhood'; end if;

  insert into public.user_badges (profile_id, badge_id)
  select target_profile_id, b.id
  from public.badges b
  where b.code = any(earned_codes)
  on conflict (profile_id, badge_id) do nothing;
end;
$$;

revoke all on function public.enforce_sequential_weekly_progress() from public;
revoke all on function public.set_weekly_progress_timestamps() from public;
revoke all on function public.sync_profile_curriculum_status() from public;
