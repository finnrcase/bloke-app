import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

export type ChapterMember = Database['public']['Tables']['chapter_members']['Row'];
export type ChapterMemberInsert = Database['public']['Tables']['chapter_members']['Insert'];

const NOT_CONFIGURED = 'Supabase is not configured. Add your Expo public Supabase env vars.';

export async function fetchMyMemberships(userId: string) {
  if (!supabase) {
    return { data: [], error: NOT_CONFIGURED };
  }

  const { data, error } = await supabase
    .from('chapter_members')
    .select('*, chapters(*)')
    .or(`profile_id.eq.${userId},user_id.eq.${userId}`)
    .order('joined_at', { ascending: false });

  return { data: data ?? [], error: error?.message ?? null };
}

export async function createMembershipRequest(chapterId: string, userId: string) {
  if (!supabase) {
    return { data: null, error: NOT_CONFIGURED };
  }

  const membership: ChapterMemberInsert = {
    chapter_id: chapterId,
    profile_id: userId,
    user_id: userId,
    role: 'chapter_member',
    status: 'pending',
  };

  const { data, error } = await supabase.from('chapter_members').insert(membership).select('*').single();
  return { data, error: error?.message ?? null };
}
