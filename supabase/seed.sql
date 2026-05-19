insert into public.curriculum_weeks (
  week_number,
  title,
  identity_statement,
  learn_text,
  act_text,
  log_prompts,
  milestone_name
)
values
  (
    1,
    'Show Up',
    'I show up.',
    'Showing up is the first proof that change is real. This week is about building trust with yourself through simple, repeated action.',
    'Pick one thing you will show up for this week. Show up every time.',
    '["What did you choose to show up for?", "Where did you follow through?", "What made it easier or harder to show up?"]'::jsonb,
    'First Step'
  ),
  (
    2,
    'Keep Your Word',
    'I do what I say.',
    'Your word gets stronger when it is specific, realistic, and followed by action. Keep one promise before making ten more.',
    'Make one clear promise and keep it.',
    '["What promise did you make?", "Did you keep it?", "What did keeping or breaking it teach you?"]'::jsonb,
    'Word Kept'
  ),
  (
    3,
    'Control Your Environment',
    'I control my environment.',
    'Your surroundings shape your choices. A better environment makes the right action easier and the wrong action harder.',
    'Remove one distraction and add one positive input.',
    '["What distraction did you remove?", "What positive input did you add?", "How did your environment affect your choices this week?"]'::jsonb,
    'Environment Reset'
  ),
  (
    4,
    'Do Hard Things',
    'I do hard things.',
    'Hard things train courage, discipline, and confidence. The goal is not to suffer; the goal is to practice doing what matters when it is uncomfortable.',
    'Choose one hard thing and do it at least three times.',
    '["What hard thing did you choose?", "How many times did you do it?", "What changed after repeating it?"]'::jsonb,
    'Hard Thing Done'
  ),
  (
    5,
    'Take Responsibility',
    'I own my life.',
    'Responsibility is power. When you own your choices, you get a real path forward instead of waiting for someone else to change.',
    'Identify one area where you have blamed others and take one action.',
    '["Where have you blamed others?", "What part can you own?", "What action did you take?"]'::jsonb,
    'Owned It'
  ),
  (
    6,
    'Be On Time',
    'I respect time.',
    'Time is respect in practical form. Being on time shows that your word, your people, and your work matter.',
    'Be on time or early to everything this week.',
    '["Where were you on time or early?", "Where were you late?", "What needs to change so you can respect time consistently?"]'::jsonb,
    'On Time'
  ),
  (
    7,
    'Limit Distractions',
    'I protect my attention.',
    'Attention is one of your strongest resources. Protecting it helps you think clearly, act intentionally, and finish what matters.',
    'Limit one major distraction and create a daily focus block.',
    '["What distraction did you limit?", "When was your focus block?", "What did protected attention make possible?"]'::jsonb,
    'Focus Block'
  ),
  (
    8,
    'Respect Yourself',
    'I act like someone worth respecting.',
    'Self-respect grows through behavior. Small choices in health, honesty, speech, and discipline teach you how to see yourself.',
    'Do three things that show self-respect.',
    '["What three self-respecting actions did you take?", "Which one mattered most?", "How did those actions affect the way you saw yourself?"]'::jsonb,
    'Self-Respect'
  ),
  (
    9,
    'Choose Your Circle',
    'I choose who shapes me.',
    'The people around you influence what feels normal. Choose relationships that pull you toward honesty, discipline, and strength.',
    'Spend more time with someone positive and less time with someone negative.',
    '["Who did you spend more positive time with?", "What negative influence did you limit?", "How did your circle shape your week?"]'::jsonb,
    'Circle Chosen'
  ),
  (
    10,
    'Finish What You Start',
    'I finish what I start.',
    'Finishing builds trust. Completing one unfinished task proves that your effort can become evidence.',
    'Pick one unfinished task and complete it.',
    '["What unfinished task did you choose?", "What did you complete?", "What did finishing give back to you?"]'::jsonb,
    'Builder Complete'
  )
on conflict (week_number) do update
set
  title = excluded.title,
  identity_statement = excluded.identity_statement,
  learn_text = excluded.learn_text,
  act_text = excluded.act_text,
  log_prompts = excluded.log_prompts,
  milestone_name = excluded.milestone_name;

insert into public.badges (
  code,
  name,
  description,
  identity_statement,
  category,
  level
)
values
  (
    'consistency_bronze',
    'Consistency Bronze',
    'Awarded for beginning a pattern of weekly follow-through.',
    'I keep showing up.',
    'consistency',
    'bronze'
  ),
  (
    'consistency_silver',
    'Consistency Silver',
    'Awarded for sustained weekly follow-through.',
    'I keep showing up.',
    'consistency',
    'silver'
  ),
  (
    'consistency_gold',
    'Consistency Gold',
    'Awarded for strong and repeated weekly follow-through.',
    'I keep showing up.',
    'consistency',
    'gold'
  ),
  (
    'integrity',
    'Integrity',
    'Awarded for keeping your word and choosing honesty in action.',
    'I do what I say.',
    'character',
    'core'
  ),
  (
    'discipline',
    'Discipline',
    'Awarded for doing hard things and protecting attention.',
    'I do hard things.',
    'character',
    'core'
  ),
  (
    'environment',
    'Environment',
    'Awarded for shaping surroundings that support better choices.',
    'I control my environment.',
    'growth',
    'core'
  ),
  (
    'brotherhood',
    'Brotherhood',
    'Awarded for positive participation in the chapter community.',
    'I choose who shapes me.',
    'community',
    'core'
  ),
  (
    'milestone_initiate',
    'Initiate',
    'Awarded for completing Week 1.',
    'I show up.',
    'milestone',
    'week_1'
  ),
  (
    'milestone_showing_up',
    'Showing Up',
    'Awarded for completing Week 5.',
    'I keep showing up.',
    'milestone',
    'week_5'
  ),
  (
    'milestone_reliable',
    'Reliable',
    'Awarded for completing Week 10.',
    'I finish what I start.',
    'milestone',
    'week_10'
  ),
  (
    'milestone_grounded',
    'Grounded',
    'Awarded for completing Week 25.',
    'I stay steady.',
    'milestone',
    'week_25'
  ),
  (
    'milestone_capable',
    'Capable',
    'Awarded for completing Week 50.',
    'I can do hard things.',
    'milestone',
    'week_50'
  ),
  (
    'milestone_leader',
    'Leader',
    'Awarded for completing Week 75.',
    'I lead with responsibility.',
    'milestone',
    'week_75'
  ),
  (
    'leadership_participant',
    'Leadership Participant',
    'Awarded for active and consistent participation.',
    'I contribute.',
    'leadership',
    'participant'
  ),
  (
    'leadership_contributor',
    'Leadership Contributor',
    'Awarded for supporting others and adding value to the group.',
    'I strengthen the group.',
    'leadership',
    'contributor'
  ),
  (
    'leadership_leader',
    'Leadership Leader',
    'Awarded for dependable leadership in the chapter.',
    'I lead with responsibility.',
    'leadership',
    'leader'
  ),
  (
    'completion_builder',
    'Completion Builder',
    'Awarded for completing the MVP curriculum path.',
    'I finish what I start.',
    'completion',
    'builder'
  )
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  identity_statement = excluded.identity_statement,
  category = excluded.category,
  level = excluded.level;
