import { Session } from '@supabase/supabase-js';

import { Database, Json } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileDetail = Database['public']['Tables']['profile_details']['Row'];
type Chapter = Database['public']['Tables']['chapters']['Row'];
type ChapterMember = Database['public']['Tables']['chapter_members']['Row'];
type ChapterPost = Database['public']['Tables']['chapter_posts']['Row'];
type ChapterPostReaction = Database['public']['Tables']['chapter_post_reactions']['Row'];
type ChapterPromptResponse = Database['public']['Tables']['chapter_prompt_responses']['Row'];
type ChapterJoinRequest = Database['public']['Tables']['chapter_join_requests']['Row'];
type CurriculumWeek = Database['public']['Tables']['curriculum_weeks']['Row'];
type WeeklyProgress = Database['public']['Tables']['weekly_progress']['Row'];
type UserBadge = Database['public']['Tables']['user_badges']['Row'];
type Badge = Database['public']['Tables']['badges']['Row'];
type Attendance = Database['public']['Tables']['attendance']['Row'];
type DirectoryChapter = Database['public']['Functions']['get_public_chapter_directory']['Returns'][number];
type DemoChatChannel = Database['public']['Functions']['get_my_chapter_chat_channels']['Returns'][number];
type DemoChatMessage = Database['public']['Functions']['get_chapter_chat_messages']['Returns'][number];
type ReflectionQuestion = Database['public']['Tables']['curriculum_reflection_questions']['Row'];
type CurriculumReflection = Database['public']['Tables']['curriculum_reflections']['Row'];

const now = '2026-05-18T12:00:00.000Z';

export const demoUserId = '00000000-0000-4000-8000-000000000001';
export const demoChapterId = '00000000-0000-4000-8000-000000000101';

export const demoSession: Session = {
  access_token: 'demo-access-token',
  expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
  expires_in: 60 * 60,
  refresh_token: 'demo-refresh-token',
  token_type: 'bearer',
  user: {
    app_metadata: {},
    aud: 'authenticated',
    created_at: now,
    email: 'demo@bloke.local',
    id: demoUserId,
    user_metadata: {},
  },
};

export const demoProfile: Profile = {
  age: 21,
  avatar_url: 'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?auto=format&fit=crop&w=480&q=80',
  birthdate: '2005-04-12',
  bio: 'Demo profile for local walkthroughs.',
  city: 'Santa Barbara',
  country: 'United States',
  created_at: now,
  current_curriculum_week: 3,
  curriculum_completed_at: null,
  curriculum_started_at: '2026-04-27T12:00:00.000Z',
  first_name: 'Demo',
  full_name: 'Demo Leader',
  home_chapter_id: demoChapterId,
  id: demoUserId,
  appearance: 'dark',
  language: 'en',
  last_curriculum_activity_at: '2026-05-18T12:00:00.000Z',
  last_name: 'Leader',
  onboarding_complete: true,
  personal_goal: 'Build discipline and help the group stay consistent.',
  role: 'corporate_bloke',
  state: 'CA',
  username: 'demo_leader',
};

export const demoProfileDetails: ProfileDetail = {
  career_interests: ['Community leadership', 'Mentoring', 'Operations'],
  created_at: now,
  goals: ['Become a leader', 'Improve confidence', 'Find a mentor'],
  interests: ['Fitness', 'Public Speaking', 'Entrepreneurship', 'Adventure'],
  languages_spoken: ['English', 'Spanish'],
  personal_aspirations:
    'Build a life that is steady, useful, and generous enough to make younger men believe discipline is possible.',
  profile_id: demoUserId,
  updated_at: now,
};

type CurriculumSeed = {
  activity: string;
  identity: string;
  lesson: string;
  milestone: string;
  phase: string;
  title: string;
};

const curriculumProgram: CurriculumSeed[] = [
  {
    activity: 'Choose one commitment this week and show up every time without renegotiating.',
    identity: 'I show up.',
    lesson: 'Showing up is the first proof that your word matters. Start with presence before performance.',
    milestone: 'Initiate',
    phase: 'Foundation',
    title: 'Show Up',
  },
  {
    activity: 'Make one clear promise to yourself and one to another person. Keep both and record the proof.',
    identity: 'I do what I say.',
    lesson: 'Trust is built when your actions match your promises, especially in small private choices.',
    milestone: 'Integrity',
    phase: 'Foundation',
    title: 'Keep Your Word',
  },
  {
    activity: 'Remove one distraction and add one positive input where you spend the most time.',
    identity: 'I control my environment.',
    lesson: 'Your surroundings train you. A disciplined environment makes disciplined action easier.',
    milestone: 'Environment',
    phase: 'Foundation',
    title: 'Control Your Environment',
  },
  {
    activity: 'Choose one hard but healthy action and do it at least three times this week.',
    identity: 'I do hard things.',
    lesson: 'Hard things reveal where you are strong and where you need training.',
    milestone: 'Discipline',
    phase: 'Foundation',
    title: 'Do Hard Things',
  },
  {
    activity: 'Name one area where you have blamed circumstances and take one concrete corrective action.',
    identity: 'I own my life.',
    lesson: 'Responsibility is the move from blame to agency. You cannot lead what you refuse to own.',
    milestone: 'Showing Up',
    phase: 'Foundation',
    title: 'Take Responsibility',
  },
  {
    activity: 'Arrive early to every commitment you control this week.',
    identity: 'I respect time.',
    lesson: 'Punctuality is respect made visible. It tells others your word has weight.',
    milestone: 'Respect',
    phase: 'Foundation',
    title: 'Be On Time',
  },
  {
    activity: 'Limit one major distraction and create a daily focus block.',
    identity: 'I protect my attention.',
    lesson: 'Attention is a resource. What captures it eventually shapes your character.',
    milestone: 'Focus',
    phase: 'Foundation',
    title: 'Limit Distractions',
  },
  {
    activity: 'Do three practical things that show self-respect in body, space, and speech.',
    identity: 'I act like someone worth respecting.',
    lesson: 'Self-respect grows when your daily choices line up with your standards.',
    milestone: 'Self-Respect',
    phase: 'Foundation',
    title: 'Respect Yourself',
  },
  {
    activity: 'Spend intentional time with someone who strengthens your standards.',
    identity: 'I choose who shapes me.',
    lesson: 'Your circle normalizes either growth or drift. Choose men who call you upward.',
    milestone: 'Brotherhood',
    phase: 'Foundation',
    title: 'Choose Your Circle',
  },
  {
    activity: 'Pick one unfinished task and complete it before starting a new one.',
    identity: 'I finish what I start.',
    lesson: 'Finishing builds confidence because it proves you can close loops.',
    milestone: 'Reliable',
    phase: 'Foundation',
    title: 'Finish What You Start',
  },
  {
    activity: 'Tell the truth in one conversation you have been avoiding.',
    identity: 'I tell the truth quickly.',
    lesson: 'Truth spoken early prevents small issues from becoming hidden patterns.',
    milestone: 'Honesty',
    phase: 'Integrity',
    title: 'Tell the Truth',
  },
  {
    activity: 'Design a 20-minute morning standard and complete it four times.',
    identity: 'I begin before the day pulls me.',
    lesson: 'A steady morning creates momentum before pressure and distraction arrive.',
    milestone: 'Rhythm',
    phase: 'Integrity',
    title: 'Build a Morning Standard',
  },
  {
    activity: 'Complete three workouts or active training sessions this week.',
    identity: 'I train the body I live in.',
    lesson: 'Physical training teaches patience, effort, and respect for limits.',
    milestone: 'Strength',
    phase: 'Integrity',
    title: 'Train Your Body',
  },
  {
    activity: 'Choose a bedtime window and protect it for five nights.',
    identity: 'I recover on purpose.',
    lesson: 'Rest is not weakness. Recovery protects discipline, mood, and judgment.',
    milestone: 'Recovery',
    phase: 'Integrity',
    title: 'Master Sleep',
  },
  {
    activity: 'Track every dollar you spend for seven days.',
    identity: 'I tell the truth about money.',
    lesson: 'Money reveals habits. Tracking it gives you choices instead of surprises.',
    milestone: 'Stewardship',
    phase: 'Integrity',
    title: 'Manage Money Basics',
  },
  {
    activity: 'Put your highest responsibility before entertainment each day.',
    identity: 'I earn my comfort.',
    lesson: 'Reward feels cleaner when it follows effort instead of replacing it.',
    milestone: 'Self-Control',
    phase: 'Integrity',
    title: 'Work Before Reward',
  },
  {
    activity: 'Ask three men one thoughtful question and listen without interrupting.',
    identity: 'I seek understanding before answers.',
    lesson: 'Better questions open better choices and make you easier to help.',
    milestone: 'Wisdom',
    phase: 'Integrity',
    title: 'Ask Better Questions',
  },
  {
    activity: 'In one important conversation, summarize what you heard before giving your view.',
    identity: 'I listen to understand.',
    lesson: 'Listening is leadership because it honors reality before responding.',
    milestone: 'Presence',
    phase: 'Integrity',
    title: 'Listen First',
  },
  {
    activity: 'When triggered this week, pause for 90 seconds before responding.',
    identity: 'I feel without being ruled.',
    lesson: 'Emotions carry information, but they should not drive the whole vehicle.',
    milestone: 'Emotional Control',
    phase: 'Integrity',
    title: 'Own Your Emotions',
  },
  {
    activity: 'Make one repair: apologize, replace, clarify, or follow through.',
    identity: 'I repair what I damage.',
    lesson: 'Maturity is not never failing. Maturity is returning quickly and honestly.',
    milestone: 'Repair',
    phase: 'Integrity',
    title: 'Repair Quickly',
  },
  {
    activity: 'Do one useful act for someone without announcing it.',
    identity: 'I serve when no one claps.',
    lesson: 'Service trains humility and turns strength outward.',
    milestone: 'Service',
    phase: 'Service',
    title: 'Serve Without Spotlight',
  },
  {
    activity: 'Write down three specific things you are grateful for each day.',
    identity: 'I notice what is good.',
    lesson: 'Gratitude strengthens perspective without denying hard realities.',
    milestone: 'Gratitude',
    phase: 'Service',
    title: 'Practice Gratitude',
  },
  {
    activity: 'Create one small proof each day that you are becoming reliable.',
    identity: 'I build confidence through evidence.',
    lesson: 'Confidence grows from kept promises, not hype.',
    milestone: 'Confidence',
    phase: 'Service',
    title: 'Build Confidence',
  },
  {
    activity: 'Practice one direct, respectful conversation instead of hinting or avoiding.',
    identity: 'I say what I mean with respect.',
    lesson: 'Clear speech reduces confusion and helps others trust your leadership.',
    milestone: 'Communication',
    phase: 'Service',
    title: 'Speak Clearly',
  },
  {
    activity: 'Choose one standard and model it publicly for your group.',
    identity: 'I go first.',
    lesson: 'Leadership begins when your life becomes an example others can inspect.',
    milestone: 'Grounded',
    phase: 'Service',
    title: 'Lead by Example',
  },
  {
    activity: 'Set one clear boundary around time, behavior, or attention.',
    identity: 'I protect what matters.',
    lesson: 'Boundaries are not walls. They are commitments with edges.',
    milestone: 'Boundaries',
    phase: 'Service',
    title: 'Set Boundaries',
  },
  {
    activity: 'Ask one trusted man for advice on a specific area of growth.',
    identity: 'I learn from men ahead of me.',
    lesson: 'A mentor helps you see patterns you cannot yet see alone.',
    milestone: 'Mentorship',
    phase: 'Service',
    title: 'Choose Mentors',
  },
  {
    activity: 'Invite feedback on one behavior and thank the person before defending yourself.',
    identity: 'I receive correction without quitting.',
    lesson: 'Correction is a gift when it helps you become more honest and useful.',
    milestone: 'Teachable',
    phase: 'Service',
    title: 'Become Teachable',
  },
  {
    activity: 'Address one small conflict directly, calmly, and respectfully.',
    identity: 'I face conflict cleanly.',
    lesson: 'Avoided conflict often becomes resentment. Clean conflict seeks truth and repair.',
    milestone: 'Courage',
    phase: 'Service',
    title: 'Handle Conflict',
  },
  {
    activity: 'Review your open commitments and close or renegotiate each one honestly.',
    identity: 'I do not spend promises cheaply.',
    lesson: 'Your word loses value when you offer it casually. Promise less and deliver more.',
    milestone: 'Trust',
    phase: 'Service',
    title: 'Protect Your Word',
  },
  {
    activity: 'Spend two focused hours improving one career or trade skill.',
    identity: 'I prepare for useful work.',
    lesson: 'Skill creates options. Options increase your ability to serve and lead.',
    milestone: 'Career',
    phase: 'Craft',
    title: 'Build Career Skills',
  },
  {
    activity: 'Plan your week on paper before Monday begins.',
    identity: 'I aim my week before it starts.',
    lesson: 'Planning turns values into appointments and responsibilities into action.',
    milestone: 'Planning',
    phase: 'Craft',
    title: 'Plan Your Week',
  },
  {
    activity: 'Create or update a simple budget for the next 30 days.',
    identity: 'I direct money with purpose.',
    lesson: 'Financial discipline is a form of stewardship and future protection.',
    milestone: 'Finance',
    phase: 'Craft',
    title: 'Build Financial Discipline',
  },
  {
    activity: 'Audit how you speak about women and correct one pattern.',
    identity: 'I honor women in speech and action.',
    lesson: 'Respect is shown in private speech, public behavior, and personal boundaries.',
    milestone: 'Honor',
    phase: 'Craft',
    title: 'Respect Women',
  },
  {
    activity: 'Reach out to one friend with encouragement and one honest question.',
    identity: 'I build friendships that strengthen me.',
    lesson: 'Healthy friendship combines honesty, encouragement, and accountability.',
    milestone: 'Friendship',
    phase: 'Craft',
    title: 'Build Healthy Friendships',
  },
  {
    activity: 'Do one right thing you have delayed because of fear.',
    identity: 'I move toward what is right.',
    lesson: 'Fear is not always a stop sign. Sometimes it marks the next training ground.',
    milestone: 'Courage Under Pressure',
    phase: 'Craft',
    title: 'Face Fear',
  },
  {
    activity: 'Write the lesson from a recent setback and take the next small step.',
    identity: 'I get back up with wisdom.',
    lesson: 'Setbacks become training when you extract lessons and return to action.',
    milestone: 'Resilience',
    phase: 'Craft',
    title: 'Recover from Setbacks',
  },
  {
    activity: 'Choose one daily habit and complete it five days in a row.',
    identity: 'I repeat what matters.',
    lesson: 'Consistency is ordinary faithfulness repeated until it changes you.',
    milestone: 'Consistency',
    phase: 'Craft',
    title: 'Stay Consistent',
  },
  {
    activity: 'Name three values and make one decision this week that honors them.',
    identity: 'I live from my deepest values.',
    lesson: 'Values become real when they guide decisions under pressure.',
    milestone: 'Values',
    phase: 'Craft',
    title: 'Practice Faith and Values',
  },
  {
    activity: 'Make one contribution that strengthens your chapter or local community.',
    identity: 'I contribute to the circle.',
    lesson: 'Community strengthens when each man brings presence, honesty, and help.',
    milestone: 'Community',
    phase: 'Craft',
    title: 'Build Community',
  },
  {
    activity: 'Encourage someone younger or newer with one lesson you have learned.',
    identity: 'I pass on what I am learning.',
    lesson: 'You do not need to be finished to be useful. Share what is real and tested.',
    milestone: 'Mentor',
    phase: 'Leadership',
    title: 'Mentor Someone Behind You',
  },
  {
    activity: 'Spend the first 30 minutes of free time creating, practicing, or building.',
    identity: 'I build before I browse.',
    lesson: 'Creation makes you active in your life. Consumption can make you passive.',
    milestone: 'Creation',
    phase: 'Leadership',
    title: 'Create Before Consuming',
  },
  {
    activity: 'Identify one need and handle it without waiting for permission.',
    identity: 'I act without being chased.',
    lesson: 'Initiative is seeing what needs doing and moving before someone asks twice.',
    milestone: 'Initiative',
    phase: 'Leadership',
    title: 'Take Initiative',
  },
  {
    activity: 'Facilitate a short check-in with two or more men.',
    identity: 'I create space for others to grow.',
    lesson: 'Leading a group means setting tone, asking good questions, and keeping trust.',
    milestone: 'Facilitation',
    phase: 'Leadership',
    title: 'Lead a Small Group',
  },
  {
    activity: 'When something goes wrong this week, respond with one grounded action.',
    identity: 'I bend without breaking.',
    lesson: 'Resilience combines recovery, meaning, and returning to the work.',
    milestone: 'Resilient',
    phase: 'Leadership',
    title: 'Build Resilience',
  },
  {
    activity: 'Use a simple decision filter: truth, responsibility, counsel, next consequence.',
    identity: 'I slow down for wisdom.',
    lesson: 'Better decisions come from clarity, counsel, and consequences considered early.',
    milestone: 'Judgment',
    phase: 'Leadership',
    title: 'Make Better Decisions',
  },
  {
    activity: 'Name one resentment and take one step toward release or repair.',
    identity: 'I release bitterness and pursue repair.',
    lesson: 'Forgiveness frees your future from being governed by old wounds.',
    milestone: 'Forgiveness',
    phase: 'Leadership',
    title: 'Practice Forgiveness',
  },
  {
    activity: 'Do one specific act that strengthens a family relationship.',
    identity: 'I honor my family with action.',
    lesson: 'Family strength grows through attention, service, and honest repair.',
    milestone: 'Family',
    phase: 'Leadership',
    title: 'Strengthen Family Bonds',
  },
  {
    activity: 'In every room you enter this week, look for one way to add strength.',
    identity: 'I add strength where I go.',
    lesson: 'A mature man leaves rooms more honest, steady, and hopeful.',
    milestone: 'Impact',
    phase: 'Leadership',
    title: 'Leave People Better',
  },
  {
    activity: 'Write a one-paragraph mission for the man you are becoming.',
    identity: 'I know what I am building.',
    lesson: 'Mission focuses your effort and helps you say no with confidence.',
    milestone: 'Capable',
    phase: 'Leadership',
    title: 'Build Your Mission',
  },
  {
    activity: 'Choose one leadership responsibility and prepare a simple plan for it.',
    identity: 'I prepare before responsibility arrives.',
    lesson: 'Leadership expands when preparation meets trust.',
    milestone: 'Ready',
    phase: 'Leadership',
    title: 'Prepare to Lead',
  },
  {
    activity: 'Create your next 12-month growth plan with standards, support, and service.',
    identity: 'I continue the work.',
    lesson: 'Completion is not the end. It is proof that you can commit to a longer road.',
    milestone: 'Builder',
    phase: 'Leadership',
    title: 'Commit to the Next Year',
  },
];

function week(seed: CurriculumSeed, index: number): CurriculumWeek {
  const weekNumber = index + 1;

  return {
    act_text: seed.activity,
    activity_title: `Activity: ${seed.title}`,
    created_at: now,
    id: `00000000-0000-4000-8000-0000000002${String(weekNumber).padStart(2, '0')}`,
    identity_statement: seed.identity,
    learn_text: seed.lesson,
    lesson_title: `Lesson: ${seed.title}`,
    log_prompts: [
      `Where did you practice "${seed.title}" this week?`,
      'What resisted this standard in your habits, environment, or relationships?',
      'What specific proof will you create before next week?',
    ] as Json,
    milestone_name: seed.milestone,
    program_phase: seed.phase,
    title: seed.title,
    week_number: weekNumber,
  };
}

export const demoCurriculumWeeks: CurriculumWeek[] = curriculumProgram.map(week);

export const demoReflectionQuestions: ReflectionQuestion[] = demoCurriculumWeeks.flatMap((curriculumWeek) => {
  const prompts = Array.isArray(curriculumWeek.log_prompts)
    ? curriculumWeek.log_prompts.filter((prompt): prompt is string => typeof prompt === 'string')
    : [];

  return prompts.map((prompt, index) => ({
    created_at: now,
    id: `demo-question-${String(curriculumWeek.week_number).padStart(2, '0')}-${index + 1}`,
    lesson_id: curriculumWeek.id,
    prompt,
    question_order: index + 1,
    updated_at: now,
    week_number: curriculumWeek.week_number,
  }));
});

function findDemoQuestion(weekNumber: number, questionOrder: number) {
  const question = demoReflectionQuestions.find(
    (item) => item.week_number === weekNumber && item.question_order === questionOrder,
  );

  if (!question) {
    throw new Error(`Missing demo reflection question ${weekNumber}.${questionOrder}`);
  }

  return question;
}

function demoReflection(
  weekNumber: number,
  questionOrder: number,
  reflectionText: string,
  submittedAt: string,
): CurriculumReflection {
  const question = findDemoQuestion(weekNumber, questionOrder);

  return {
    created_at: submittedAt,
    id: `demo-reflection-${String(weekNumber).padStart(2, '0')}-${questionOrder}`,
    lesson_id: question.lesson_id,
    profile_id: demoUserId,
    question_id: question.id,
    reflection_text: reflectionText,
    submitted_at: submittedAt,
    updated_at: submittedAt,
    visibility: 'private',
  };
}

export const demoCurriculumReflections: CurriculumReflection[] = [
  demoReflection(1, 1, 'I showed up for the chapter check-in and finished my morning walk even when I wanted to skip it.', '2026-05-04T12:00:00.000Z'),
  demoReflection(1, 2, 'My schedule resisted me. I learned I need to decide the night before instead of negotiating in the morning.', '2026-05-04T12:00:00.000Z'),
  demoReflection(1, 3, 'I will put the next meeting and workout on the calendar with an alarm and a backup ride.', '2026-05-04T12:00:00.000Z'),
  demoReflection(2, 1, 'I kept my promise to call my mentor and to finish the weekly reading before Sunday night.', '2026-05-11T12:00:00.000Z'),
  demoReflection(2, 2, 'I noticed how easy it is to make vague promises. Clear words made accountability easier.', '2026-05-11T12:00:00.000Z'),
  demoReflection(2, 3, 'I will make fewer promises this week and write down the ones I do make.', '2026-05-11T12:00:00.000Z'),
];

export const demoProgress: WeeklyProgress[] = [
  {
    act_completed_at: '2026-05-03T18:00:00.000Z',
    act_complete: true,
    completed_at: '2026-05-04T12:00:00.000Z',
    created_at: now,
    id: '00000000-0000-4000-8000-000000000301',
    learn_completed_at: '2026-04-28T12:00:00.000Z',
    learn_complete: true,
    log_completed_at: '2026-05-04T12:00:00.000Z',
    log_complete: true,
    profile_id: demoUserId,
    started_at: '2026-04-27T12:00:00.000Z',
    submitted_at: '2026-05-04T12:00:00.000Z',
    updated_at: '2026-05-04T12:00:00.000Z',
    week_number: 1,
  },
  {
    act_completed_at: '2026-05-10T18:00:00.000Z',
    act_complete: true,
    completed_at: '2026-05-11T12:00:00.000Z',
    created_at: now,
    id: '00000000-0000-4000-8000-000000000302',
    learn_completed_at: '2026-05-05T12:00:00.000Z',
    learn_complete: true,
    log_completed_at: '2026-05-11T12:00:00.000Z',
    log_complete: true,
    profile_id: demoUserId,
    started_at: '2026-05-05T12:00:00.000Z',
    submitted_at: '2026-05-11T12:00:00.000Z',
    updated_at: '2026-05-11T12:00:00.000Z',
    week_number: 2,
  },
  {
    act_completed_at: null,
    act_complete: false,
    completed_at: null,
    created_at: now,
    id: '00000000-0000-4000-8000-000000000303',
    learn_completed_at: '2026-05-12T12:00:00.000Z',
    learn_complete: true,
    log_completed_at: null,
    log_complete: false,
    profile_id: demoUserId,
    started_at: '2026-05-12T12:00:00.000Z',
    submitted_at: null,
    updated_at: '2026-05-12T12:00:00.000Z',
    week_number: 3,
  },
];

export const demoChapter: Chapter = {
  city: 'Santa Barbara',
  country: 'United States',
  created_at: now,
  created_by: demoUserId,
  description: 'A coastal chapter focused on discipline, honest accountability, and steady weekly action.',
  facilitator_id: demoUserId,
  id: demoChapterId,
  invite_code: 'BLOKE-SBCA',
  is_public: true,
  is_verified: true,
  join_policy: 'open',
  latitude: 34.4208,
  longitude: -119.6982,
  member_count: 3,
  meeting_day: 'Tuesday',
  meeting_location: 'Downtown community room',
  name: 'Santa Barbara Builders',
  public_join_enabled: true,
  region: 'Santa Barbara, CA',
  slug: 'santa-barbara-builders',
  state: 'CA',
};

export const demoDirectoryChapters: DirectoryChapter[] = [
  {
    country: demoChapter.country,
    description: demoChapter.description,
    id: demoChapter.id,
    is_public: demoChapter.is_public,
    join_policy: demoChapter.join_policy,
    latitude: demoChapter.latitude,
    longitude: demoChapter.longitude,
    meeting_day: demoChapter.meeting_day,
    meeting_location: demoChapter.meeting_location,
    member_count: 12,
    name: demoChapter.name,
    public_join_enabled: demoChapter.public_join_enabled,
    region: demoChapter.region,
  },
  {
    country: 'United States',
    description: 'A warm, high-standard chapter for young men building purpose in the city.',
    id: '00000000-0000-4000-8000-000000000102',
    is_public: true,
    join_policy: 'request',
    latitude: 34.0522,
    longitude: -118.2437,
    meeting_day: 'Saturday',
    meeting_location: 'Westside recreation center',
    member_count: 8,
    name: 'Los Angeles Westside',
    public_join_enabled: false,
    region: 'Los Angeles, CA',
  },
  {
    country: 'Eswatini',
    description: 'A chapter for consistent action, brotherhood, and local leadership development.',
    id: '00000000-0000-4000-8000-000000000103',
    is_public: true,
    join_policy: 'invite_code',
    latitude: -26.3054,
    longitude: 31.1367,
    meeting_day: 'Thursday',
    meeting_location: 'Facilitator confirmed weekly',
    member_count: 6,
    name: 'Mbabane Brotherhood',
    public_join_enabled: false,
    region: 'Mbabane',
  },
  {
    country: 'Kenya',
    description: 'A practical chapter helping members show up, keep their word, and build reliable habits.',
    id: '00000000-0000-4000-8000-000000000104',
    is_public: true,
    join_policy: 'open',
    latitude: -1.2921,
    longitude: 36.8219,
    meeting_day: 'Wednesday',
    meeting_location: 'Community partner space',
    member_count: 14,
    name: 'Nairobi Builders',
    public_join_enabled: true,
    region: 'Nairobi',
  },
  {
    country: 'Philippines',
    description: 'A chapter centered on focus, respect, and finishing what you start.',
    id: '00000000-0000-4000-8000-000000000105',
    is_public: true,
    join_policy: 'request',
    latitude: 14.5995,
    longitude: 120.9842,
    meeting_day: 'Sunday',
    meeting_location: 'Local facilitator meetup point',
    member_count: 10,
    name: 'Manila Chapter',
    public_join_enabled: false,
    region: 'Manila',
  },
];

export const demoJoinRequests: ChapterJoinRequest[] = [
  {
    chapter_id: '00000000-0000-4000-8000-000000000102',
    created_at: '2026-05-18T10:00:00.000Z',
    id: '00000000-0000-4000-8000-000000000701',
    message: 'Looking for a steady group near work.',
    profile_id: '00000000-0000-4000-8000-000000000004',
    reviewed_at: null,
    reviewed_by: null,
    status: 'pending',
  },
];

export const demoChapterMembers: ChapterMember[] = [
  {
    chapter_id: demoChapterId,
    id: '00000000-0000-4000-8000-000000000401',
    joined_at: now,
    profile_id: demoUserId,
    role: 'chapter_leader',
    status: 'active',
    user_id: demoUserId,
  },
  {
    chapter_id: demoChapterId,
    id: '00000000-0000-4000-8000-000000000402',
    joined_at: now,
    profile_id: '00000000-0000-4000-8000-000000000002',
    role: 'chapter_member',
    status: 'active',
    user_id: '00000000-0000-4000-8000-000000000002',
  },
  {
    chapter_id: demoChapterId,
    id: '00000000-0000-4000-8000-000000000403',
    joined_at: now,
    profile_id: '00000000-0000-4000-8000-000000000003',
    role: 'chapter_member',
    status: 'active',
    user_id: '00000000-0000-4000-8000-000000000003',
  },
];

export const demoMemberProfiles: Profile[] = [
  demoProfile,
  {
    ...demoProfile,
    age: 19,
    avatar_url: 'https://images.unsplash.com/photo-1542327897-d73f4005b533?auto=format&fit=crop&w=480&q=80',
    birthdate: '2007-02-08',
    city: 'Goleta',
    first_name: 'Marcus',
    full_name: 'Marcus Reed',
    id: '00000000-0000-4000-8000-000000000002',
    last_name: 'Reed',
    personal_goal: 'Be reliable at work and home.',
    role: 'user',
    state: 'CA',
    username: 'marcus_reed',
  },
  {
    ...demoProfile,
    age: 23,
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=480&q=80',
    birthdate: '2003-09-17',
    city: 'Santa Barbara',
    first_name: 'James',
    full_name: 'James Carter',
    id: '00000000-0000-4000-8000-000000000003',
    last_name: 'Carter',
    personal_goal: 'Finish what I start.',
    role: 'user',
    state: 'CA',
    username: 'james_carter',
  },
  {
    ...demoProfile,
    age: 20,
    avatar_url: null,
    birthdate: '2006-01-28',
    city: 'Carpinteria',
    first_name: 'Andre',
    full_name: 'Andre Santos',
    id: '00000000-0000-4000-8000-000000000004',
    last_name: 'Santos',
    personal_goal: 'Find a consistent group and stay accountable.',
    role: 'user',
    state: 'CA',
    username: 'andre_santos',
  },
];

export const demoMemberProgress: WeeklyProgress[] = [
  ...demoProgress,
  {
    ...demoProgress[0],
    id: '00000000-0000-4000-8000-000000000311',
    profile_id: '00000000-0000-4000-8000-000000000002',
    submitted_at: '2026-05-15T12:00:00.000Z',
  },
  {
    ...demoProgress[1],
    id: '00000000-0000-4000-8000-000000000312',
    profile_id: '00000000-0000-4000-8000-000000000002',
    submitted_at: '2026-05-16T12:00:00.000Z',
  },
  {
    ...demoProgress[0],
    id: '00000000-0000-4000-8000-000000000321',
    profile_id: '00000000-0000-4000-8000-000000000003',
    submitted_at: '2026-04-20T12:00:00.000Z',
  },
];

export const demoAttendance: Attendance[] = [
  {
    attended_at: '2026-05-04T18:00:00.000Z',
    chapter_id: demoChapterId,
    id: '00000000-0000-4000-8000-000000000501',
    profile_id: demoUserId,
  },
  {
    attended_at: '2026-05-11T18:00:00.000Z',
    chapter_id: demoChapterId,
    id: '00000000-0000-4000-8000-000000000502',
    profile_id: demoUserId,
  },
];

export const demoChapterPosts: ChapterPost[] = [
  {
    author_id: demoUserId,
    body: 'This week, keep the promise small enough to keep and clear enough to measure.',
    chapter_id: demoChapterId,
    cover_image_url: null,
    created_at: '2026-05-18T08:00:00.000Z',
    feed_priority: 0,
    featured_until: null,
    id: '00000000-0000-4000-8000-000000000601',
    is_featured: false,
    is_public: false,
    moderation_status: 'approved',
    post_type: 'announcement',
    published_at: '2026-05-18T08:00:00.000Z',
    status: 'published',
    title: 'Keep the standard simple',
    updated_at: '2026-05-18T08:00:00.000Z',
  },
  {
    author_id: demoUserId,
    body: 'Where did your environment help you this week, and where did it pull you off track?',
    chapter_id: demoChapterId,
    cover_image_url: null,
    created_at: '2026-05-18T08:05:00.000Z',
    feed_priority: 0,
    featured_until: null,
    id: '00000000-0000-4000-8000-000000000602',
    is_featured: false,
    is_public: false,
    moderation_status: 'approved',
    post_type: 'weekly_prompt',
    published_at: '2026-05-18T08:05:00.000Z',
    status: 'published',
    title: 'Weekly discussion',
    updated_at: '2026-05-18T08:05:00.000Z',
  },
  {
    author_id: '00000000-0000-4000-8000-000000000002',
    body: 'Kept my phone out of the bedroom for five nights. Sleep was better and mornings were cleaner.',
    chapter_id: demoChapterId,
    cover_image_url: null,
    created_at: '2026-05-18T09:00:00.000Z',
    feed_priority: 0,
    featured_until: null,
    id: '00000000-0000-4000-8000-000000000603',
    is_featured: false,
    is_public: false,
    moderation_status: 'approved',
    post_type: 'win',
    published_at: '2026-05-18T09:00:00.000Z',
    status: 'published',
    title: null,
    updated_at: '2026-05-18T09:00:00.000Z',
  },
];

export const demoPublicFeedPosts: Database['public']['Functions']['get_public_feed_posts']['Returns'] = [
  {
    author_id: demoUserId,
    author_avatar_url: demoProfile.avatar_url,
    author_name: 'Corporate Bloke',
    author_role: 'corporate_bloke',
    chapter_id: null,
    chapter_name: 'Corporate Bloke',
    cover_image_url:
      'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=1400&q=80',
    created_at: '2026-05-22T17:30:00.000Z',
    description:
      'This week, every chapter is invited to run the same reflection: where are you keeping your word, and where are you negotiating with it?',
    feed_priority: 100,
    featured_until: null,
    id: '00000000-0000-4000-8000-000000000640',
    is_corporate_bloke: true,
    is_featured: true,
    post_type: 'weekly_reflection',
    published_at: '2026-05-22T17:30:00.000Z',
    title: 'National weekly reflection',
  },
  {
    author_id: demoUserId,
    author_avatar_url: demoProfile.avatar_url,
    author_name: 'Demo Leader',
    author_role: 'chapter_leader',
    chapter_id: demoChapterId,
    chapter_name: demoChapter.name,
    cover_image_url:
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1400&q=80',
    created_at: '2026-05-21T17:30:00.000Z',
    description:
      'Twelve men showed up before work, phones away, with one promise for the week. Small standards, kept together, become a different life.',
    feed_priority: 0,
    featured_until: null,
    id: '00000000-0000-4000-8000-000000000641',
    is_corporate_bloke: false,
    is_featured: false,
    post_type: 'success_story',
    published_at: '2026-05-21T17:30:00.000Z',
    title: 'Morning accountability circle',
  },
  {
    author_id: demoUserId,
    author_avatar_url: demoProfile.avatar_url,
    author_name: 'Bloke HQ',
    author_role: 'global_admin',
    chapter_id: null,
    chapter_name: 'Bloke HQ',
    cover_image_url:
      'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1400&q=80',
    created_at: '2026-05-20T16:00:00.000Z',
    description:
      'This month’s challenge is simple: choose one discipline, track it daily, and tell your chapter the truth every week.',
    feed_priority: 0,
    featured_until: null,
    id: '00000000-0000-4000-8000-000000000642',
    is_corporate_bloke: false,
    is_featured: false,
    post_type: 'challenge',
    published_at: '2026-05-20T16:00:00.000Z',
    title: '30 days of kept promises',
  },
  {
    author_id: demoUserId,
    author_avatar_url: demoProfile.avatar_url,
    author_name: 'Demo Leader',
    author_role: 'chapter_leader',
    chapter_id: demoChapterId,
    chapter_name: demoChapter.name,
    cover_image_url:
      'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=1400&q=80',
    created_at: '2026-05-19T18:15:00.000Z',
    description:
      'Volunteer mentors needed for the Saturday skills lab. Bring patience, a notebook, and a willingness to listen before leading.',
    feed_priority: 0,
    featured_until: null,
    id: '00000000-0000-4000-8000-000000000643',
    is_corporate_bloke: false,
    is_featured: false,
    post_type: 'volunteer_opportunity',
    published_at: '2026-05-19T18:15:00.000Z',
    title: 'Saturday skills lab',
  },
];

export const demoChapterChatChannels: DemoChatChannel[] = [
  {
    can_moderate: true,
    channel_type: 'general',
    chapter_id: demoChapterId,
    chapter_name: demoChapter.name,
    created_at: '2026-05-18T12:00:00.000Z',
    description: 'Open coordination and accountability for active chapter members.',
    event_id: null,
    id: '00000000-0000-4000-8000-000000000901',
    is_read_only: false,
    latest_message_at: '2026-05-22T14:15:00.000Z',
    name: 'General Chapter Chat',
  },
  {
    can_moderate: true,
    channel_type: 'announcements',
    chapter_id: demoChapterId,
    chapter_name: demoChapter.name,
    created_at: '2026-05-18T12:00:00.000Z',
    description: 'Leader and admin updates for this chapter.',
    event_id: null,
    id: '00000000-0000-4000-8000-000000000902',
    is_read_only: false,
    latest_message_at: '2026-05-21T17:00:00.000Z',
    name: 'Announcements',
  },
  {
    can_moderate: true,
    channel_type: 'event',
    chapter_id: demoChapterId,
    chapter_name: demoChapter.name,
    created_at: '2026-05-18T12:00:00.000Z',
    description: 'Discussion for event coordination, rides, reminders, and accountability follow-up.',
    event_id: '00000000-0000-4000-8000-000000000951',
    id: '00000000-0000-4000-8000-000000000903',
    is_read_only: false,
    latest_message_at: '2026-05-20T18:30:00.000Z',
    name: 'Event: Weekly Chapter Circle',
  },
];

export const demoChapterChatMessages: DemoChatMessage[] = [
  {
    attachment_mime_type: null,
    attachment_name: null,
    attachment_size: null,
    attachment_url: null,
    author_avatar_url: demoProfile.avatar_url,
    author_id: demoUserId,
    author_name: 'Demo Leader',
    body: 'Use this channel to coordinate rides, check-ins, and accountability partners for the week.',
    can_delete: true,
    channel_id: '00000000-0000-4000-8000-000000000901',
    chapter_id: demoChapterId,
    created_at: '2026-05-22T13:00:00.000Z',
    id: '00000000-0000-4000-8000-000000000911',
    location_label: null,
    location_latitude: null,
    location_longitude: null,
    message_type: 'text',
    moderation_status: 'visible',
  },
  {
    attachment_mime_type: 'image/jpeg',
    attachment_name: 'chapter-circle.jpg',
    attachment_size: null,
    attachment_url:
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80',
    author_avatar_url: demoMemberProfiles[1]?.avatar_url ?? null,
    author_id: '00000000-0000-4000-8000-000000000002',
    author_name: 'Marcus Reed',
    body: 'Photo from last week. Good reminder that showing up early changes the tone.',
    can_delete: true,
    channel_id: '00000000-0000-4000-8000-000000000901',
    chapter_id: demoChapterId,
    created_at: '2026-05-22T13:20:00.000Z',
    id: '00000000-0000-4000-8000-000000000912',
    location_label: null,
    location_latitude: null,
    location_longitude: null,
    message_type: 'photo',
    moderation_status: 'visible',
  },
  {
    attachment_mime_type: 'application/pdf',
    attachment_name: 'accountability-partner-guide.pdf',
    attachment_size: 245760,
    attachment_url: 'https://example.com/accountability-partner-guide.pdf',
    author_avatar_url: demoProfile.avatar_url,
    author_id: demoUserId,
    author_name: 'Demo Leader',
    body: 'Bring this guide to your first accountability partner conversation.',
    can_delete: true,
    channel_id: '00000000-0000-4000-8000-000000000902',
    chapter_id: demoChapterId,
    created_at: '2026-05-21T17:00:00.000Z',
    id: '00000000-0000-4000-8000-000000000913',
    location_label: null,
    location_latitude: null,
    location_longitude: null,
    message_type: 'file',
    moderation_status: 'visible',
  },
  {
    attachment_mime_type: null,
    attachment_name: null,
    attachment_size: null,
    attachment_url: null,
    author_avatar_url: demoMemberProfiles[2]?.avatar_url ?? null,
    author_id: '00000000-0000-4000-8000-000000000003',
    author_name: 'James Carter',
    body: 'Meet at the front entrance. I can wait there five minutes before we head in.',
    can_delete: true,
    channel_id: '00000000-0000-4000-8000-000000000903',
    chapter_id: demoChapterId,
    created_at: '2026-05-20T18:30:00.000Z',
    id: '00000000-0000-4000-8000-000000000914',
    location_label: 'Downtown community room',
    location_latitude: 34.4208,
    location_longitude: -119.6982,
    message_type: 'location',
    moderation_status: 'visible',
  },
];

export const demoPromptResponses: ChapterPromptResponse[] = [
  {
    author_id: demoUserId,
    body: 'My environment helped when I planned the night before. It pulled me off track when I kept my phone nearby.',
    chapter_id: demoChapterId,
    created_at: '2026-05-18T09:30:00.000Z',
    id: '00000000-0000-4000-8000-000000000621',
    prompt_post_id: '00000000-0000-4000-8000-000000000602',
  },
];

export const demoPostReactions: ChapterPostReaction[] = [
  {
    created_at: '2026-05-18T10:00:00.000Z',
    id: '00000000-0000-4000-8000-000000000631',
    post_id: '00000000-0000-4000-8000-000000000603',
    profile_id: demoUserId,
    reaction_type: 'respect',
  },
];

export const demoBadges: Badge[] = [
  {
    category: 'streak',
    code: 'consistency_bronze',
    description: 'Complete 3 weeks in a row.',
    id: '00000000-0000-4000-8000-000000000701',
    identity_statement: 'I keep showing up.',
    level: 'bronze',
    name: 'Consistency Bronze',
  },
  {
    category: 'identity',
    code: 'integrity',
    description: 'Complete Week 2.',
    id: '00000000-0000-4000-8000-000000000702',
    identity_statement: 'I do what I say.',
    level: 'core',
    name: 'Integrity',
  },
  {
    category: 'identity',
    code: 'environment',
    description: 'Complete Week 3.',
    id: '00000000-0000-4000-8000-000000000703',
    identity_statement: 'I control my environment.',
    level: 'core',
    name: 'Environment',
  },
  {
    category: 'community',
    code: 'brotherhood',
    description: 'Join a chapter and attend.',
    id: '00000000-0000-4000-8000-000000000704',
    identity_statement: 'I build with others.',
    level: 'core',
    name: 'Brotherhood',
  },
];

export const demoUserBadges: UserBadge[] = demoBadges.slice(0, 2).map((badge, index) => ({
  badge_id: badge.id,
  earned_at: index === 0 ? '2026-05-04T12:00:00.000Z' : '2026-05-11T12:00:00.000Z',
  id: `00000000-0000-4000-8000-0000000008${String(index + 1).padStart(2, '0')}`,
  profile_id: demoUserId,
}));

export function getDemoProgressForProfile(profileId: string) {
  return demoMemberProgress.filter((progress) => progress.profile_id === profileId);
}
