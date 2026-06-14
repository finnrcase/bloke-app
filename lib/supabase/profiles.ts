import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileDetail = Database['public']['Tables']['profile_details']['Row'];
export type ProfileDetailUpsert = Database['public']['Tables']['profile_details']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
export type InterestOption = Pick<Database['public']['Tables']['interest_options']['Row'], 'id' | 'is_active' | 'label' | 'sort_order'>;
export type GoalOption = Pick<Database['public']['Tables']['goal_options']['Row'], 'id' | 'is_active' | 'label' | 'sort_order'>;
export type RankedSelectionStat = Database['public']['Functions']['get_admin_profile_interest_stats']['Returns'][number];
export type GeographicTrend = Database['public']['Functions']['get_admin_profile_geographic_trends']['Returns'][number];

const NOT_CONFIGURED = 'Supabase is not configured. Add your Expo public Supabase env vars.';

export const DEFAULT_INTEREST_OPTIONS: InterestOption[] = [
  { id: 'fitness', is_active: true, label: 'Fitness', sort_order: 10 },
  { id: 'entrepreneurship', is_active: true, label: 'Entrepreneurship', sort_order: 20 },
  { id: 'leadership', is_active: true, label: 'Leadership', sort_order: 30 },
  { id: 'faith', is_active: true, label: 'Faith', sort_order: 40 },
  { id: 'career-growth', is_active: true, label: 'Career Growth', sort_order: 50 },
  { id: 'public-speaking', is_active: true, label: 'Public Speaking', sort_order: 60 },
  { id: 'finance', is_active: true, label: 'Finance', sort_order: 70 },
  { id: 'relationships', is_active: true, label: 'Relationships', sort_order: 80 },
  { id: 'mental-health', is_active: true, label: 'Mental Health', sort_order: 90 },
  { id: 'adventure', is_active: true, label: 'Adventure', sort_order: 100 },
];

export const DEFAULT_GOAL_OPTIONS: GoalOption[] = [
  { id: 'build-a-business', is_active: true, label: 'Build a business', sort_order: 10 },
  { id: 'improve-fitness', is_active: true, label: 'Improve fitness', sort_order: 20 },
  { id: 'become-a-leader', is_active: true, label: 'Become a leader', sort_order: 30 },
  { id: 'improve-confidence', is_active: true, label: 'Improve confidence', sort_order: 40 },
  { id: 'find-a-mentor', is_active: true, label: 'Find a mentor', sort_order: 50 },
  { id: 'grow-career', is_active: true, label: 'Grow career', sort_order: 60 },
  { id: 'improve-relationships', is_active: true, label: 'Improve relationships', sort_order: 70 },
];

export async function getCurrentProfile(userId: string) {
  if (!supabase) {
    return { data: null, error: NOT_CONFIGURED };
  }

  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  return { data, error: error?.message ?? null };
}

export async function upsertCurrentProfile(profile: ProfileUpdate & { id: string }) {
  if (!supabase) {
    return { data: null, error: NOT_CONFIGURED };
  }

  const { data, error } = await supabase.from('profiles').upsert(profile).select('*').single();
  return { data, error: error?.message ?? null };
}

export async function updateCurrentProfileAvatar(profileId: string, avatarUrl: string) {
  if (!supabase) {
    return { data: null, error: NOT_CONFIGURED };
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', profileId)
    .select('*')
    .single();

  return { data, error: error?.message ?? null };
}

export async function getCurrentProfileDetails(profileId: string) {
  if (!supabase) {
    return { data: null, error: NOT_CONFIGURED };
  }

  const { data, error } = await supabase.from('profile_details').select('*').eq('profile_id', profileId).maybeSingle();
  return { data, error: error?.message ?? null };
}

export async function upsertCurrentProfileDetails(details: ProfileDetailUpsert) {
  if (!supabase) {
    return { data: null, error: NOT_CONFIGURED };
  }

  const { data, error } = await supabase.from('profile_details').upsert(details).select('*').single();
  return { data, error: error?.message ?? null };
}

export async function getStructuredProfileOptions() {
  if (!supabase) {
    return {
      data: { goals: DEFAULT_GOAL_OPTIONS, interests: DEFAULT_INTEREST_OPTIONS },
      error: NOT_CONFIGURED,
    };
  }

  const [interestsResult, goalsResult] = await Promise.all([
    supabase.from('interest_options').select('id,is_active,label,sort_order').eq('is_active', true).order('sort_order'),
    supabase.from('goal_options').select('id,is_active,label,sort_order').eq('is_active', true).order('sort_order'),
  ]);

  const error = interestsResult.error?.message ?? goalsResult.error?.message ?? null;

  return {
    data: {
      goals: goalsResult.data?.length ? goalsResult.data : DEFAULT_GOAL_OPTIONS,
      interests: interestsResult.data?.length ? interestsResult.data : DEFAULT_INTEREST_OPTIONS,
    },
    error,
  };
}

export async function getCurrentStructuredProfileSelectionIds(profileId: string) {
  if (!supabase) {
    return { data: { goalIds: [], interestIds: [] }, error: NOT_CONFIGURED };
  }

  const [interestsResult, goalsResult] = await Promise.all([
    supabase.from('profile_interests').select('interest_id').eq('profile_id', profileId),
    supabase.from('profile_goals').select('goal_id').eq('profile_id', profileId),
  ]);

  return {
    data: {
      goalIds: (goalsResult.data ?? []).map((row) => row.goal_id),
      interestIds: (interestsResult.data ?? []).map((row) => row.interest_id),
    },
    error: interestsResult.error?.message ?? goalsResult.error?.message ?? null,
  };
}

export async function saveCurrentStructuredProfileSelections(interestIds: string[], goalIds: string[]) {
  if (!supabase) {
    return { error: NOT_CONFIGURED };
  }

  const { error } = await supabase.rpc('save_my_profile_structured_selections', {
    goal_ids: goalIds,
    interest_ids: interestIds,
  });

  return { error: error?.message ?? null };
}

export async function getAdminStructuredProfileStats(limitCount = 8) {
  if (!supabase) {
    return {
      data: {
        geographicTrends: [] as GeographicTrend[],
        goalStats: [] as RankedSelectionStat[],
        interestStats: [] as RankedSelectionStat[],
      },
      error: NOT_CONFIGURED,
    };
  }

  const [interestResult, goalResult, geographicResult] = await Promise.all([
    supabase.rpc('get_admin_profile_interest_stats', { limit_count: limitCount }),
    supabase.rpc('get_admin_profile_goal_stats', { limit_count: limitCount }),
    supabase.rpc('get_admin_profile_geographic_trends', { limit_count: limitCount }),
  ]);

  return {
    data: {
      geographicTrends: geographicResult.data ?? [],
      goalStats: goalResult.data ?? [],
      interestStats: interestResult.data ?? [],
    },
    error: interestResult.error?.message ?? goalResult.error?.message ?? geographicResult.error?.message ?? null,
  };
}
