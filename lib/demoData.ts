import { Session } from '@supabase/supabase-js';

import { Database, Json } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
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
  country: 'United States',
  created_at: now,
  full_name: 'Demo Leader',
  id: demoUserId,
  appearance: 'dark',
  language: 'en',
  onboarding_complete: true,
  personal_goal: 'Build discipline and help the group stay consistent.',
  role: 'admin',
};

const promptSet = [
  'What did you do?',
  'What made it hard?',
  'What will you do next?',
];

function week(
  weekNumber: number,
  title: string,
  identityStatement: string,
  actText: string,
  milestoneName: string,
): CurriculumWeek {
  return {
    act_text: actText,
    created_at: now,
    id: `00000000-0000-4000-8000-0000000002${String(weekNumber).padStart(2, '0')}`,
    identity_statement: identityStatement,
    learn_text:
      'Read the principle. Keep it practical. This week is about one clear action, repeated with honesty.',
    log_prompts: promptSet as Json,
    milestone_name: milestoneName,
    title,
    week_number: weekNumber,
  };
}

export const demoCurriculumWeeks: CurriculumWeek[] = [
  week(1, 'Show Up', 'I show up.', 'Pick one thing you will show up for this week. Show up every time.', 'Initiate'),
  week(2, 'Keep Your Word', 'I do what I say.', 'Make one clear promise and keep it.', 'Integrity'),
  week(
    3,
    'Control Your Environment',
    'I control my environment.',
    'Remove one distraction and add one positive input.',
    'Environment',
  ),
  week(
    4,
    'Do Hard Things',
    'I do hard things.',
    'Choose one hard thing and do it at least three times.',
    'Discipline',
  ),
  week(
    5,
    'Take Responsibility',
    'I own my life.',
    'Identify one area where you have blamed others and take one action.',
    'Showing Up',
  ),
  week(6, 'Be On Time', 'I respect time.', 'Be on time or early to everything this week.', 'Respect'),
  week(
    7,
    'Limit Distractions',
    'I protect my attention.',
    'Limit one major distraction and create a daily focus block.',
    'Focus',
  ),
  week(
    8,
    'Respect Yourself',
    'I act like someone worth respecting.',
    'Do three things that show self-respect.',
    'Self-Respect',
  ),
  week(
    9,
    'Choose Your Circle',
    'I choose who shapes me.',
    'Spend more time with someone positive and less time with someone negative.',
    'Brotherhood',
  ),
  week(
    10,
    'Finish What You Start',
    'I finish what I start.',
    'Pick one unfinished task and complete it.',
    'Reliable',
  ),
];

export const demoProgress: WeeklyProgress[] = [
  {
    act_complete: true,
    created_at: now,
    id: '00000000-0000-4000-8000-000000000301',
    learn_complete: true,
    log_complete: true,
    profile_id: demoUserId,
    submitted_at: '2026-05-04T12:00:00.000Z',
    week_number: 1,
  },
  {
    act_complete: true,
    created_at: now,
    id: '00000000-0000-4000-8000-000000000302',
    learn_complete: true,
    log_complete: true,
    profile_id: demoUserId,
    submitted_at: '2026-05-11T12:00:00.000Z',
    week_number: 2,
  },
  {
    act_complete: false,
    created_at: now,
    id: '00000000-0000-4000-8000-000000000303',
    learn_complete: true,
    log_complete: false,
    profile_id: demoUserId,
    submitted_at: null,
    week_number: 3,
  },
];

export const demoChapter: Chapter = {
  country: 'United States',
  created_at: now,
  description: 'A coastal chapter focused on discipline, honest accountability, and steady weekly action.',
  facilitator_id: demoUserId,
  id: demoChapterId,
  invite_code: 'BLOKE-SBCA',
  is_public: true,
  join_policy: 'open',
  latitude: 34.4208,
  longitude: -119.6982,
  meeting_day: 'Tuesday',
  meeting_location: 'Downtown community room',
  name: 'Santa Barbara Builders',
  public_join_enabled: true,
  region: 'Santa Barbara, CA',
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
    role: 'facilitator',
  },
  {
    chapter_id: demoChapterId,
    id: '00000000-0000-4000-8000-000000000402',
    joined_at: now,
    profile_id: '00000000-0000-4000-8000-000000000002',
    role: 'member',
  },
  {
    chapter_id: demoChapterId,
    id: '00000000-0000-4000-8000-000000000403',
    joined_at: now,
    profile_id: '00000000-0000-4000-8000-000000000003',
    role: 'member',
  },
];

export const demoMemberProfiles: Profile[] = [
  demoProfile,
  {
    ...demoProfile,
    age: 19,
    full_name: 'Marcus Reed',
    id: '00000000-0000-4000-8000-000000000002',
    personal_goal: 'Be reliable at work and home.',
    role: 'participant',
  },
  {
    ...demoProfile,
    age: 23,
    full_name: 'James Carter',
    id: '00000000-0000-4000-8000-000000000003',
    personal_goal: 'Finish what I start.',
    role: 'participant',
  },
  {
    ...demoProfile,
    age: 20,
    full_name: 'Andre Santos',
    id: '00000000-0000-4000-8000-000000000004',
    personal_goal: 'Find a consistent group and stay accountable.',
    role: 'participant',
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
    created_at: '2026-05-18T08:00:00.000Z',
    id: '00000000-0000-4000-8000-000000000601',
    post_type: 'announcement',
    title: 'Keep the standard simple',
  },
  {
    author_id: demoUserId,
    body: 'Where did your environment help you this week, and where did it pull you off track?',
    chapter_id: demoChapterId,
    created_at: '2026-05-18T08:05:00.000Z',
    id: '00000000-0000-4000-8000-000000000602',
    post_type: 'weekly_prompt',
    title: 'Weekly discussion',
  },
  {
    author_id: '00000000-0000-4000-8000-000000000002',
    body: 'Kept my phone out of the bedroom for five nights. Sleep was better and mornings were cleaner.',
    chapter_id: demoChapterId,
    created_at: '2026-05-18T09:00:00.000Z',
    id: '00000000-0000-4000-8000-000000000603',
    post_type: 'win',
    title: null,
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
