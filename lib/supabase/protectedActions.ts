import { assertAuthorized, canCreateChapter, canManageChapter, canReviewMembers, Profile, ChapterMember } from '@/lib/permissions';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type ChapterInsert = Database['public']['Tables']['chapters']['Insert'];
type ChapterUpdate = Database['public']['Tables']['chapters']['Update'];
type InviteCodeInsert = Database['public']['Tables']['invite_codes']['Insert'];

const NOT_CONFIGURED = 'Supabase is not configured. Add your Expo public Supabase env vars.';

export async function createChapterAction(profile: Profile | null, chapter: ChapterInsert) {
  assertAuthorized(canCreateChapter(profile), 'Only global admins can create chapters.');
  if (!supabase) throw new Error(NOT_CONFIGURED);

  const { data, error } = await supabase.from('chapters').insert(chapter).select('*').single();
  if (error) throw error;
  return data;
}

export async function editChapterAction(
  profile: Profile | null,
  memberships: ChapterMember[],
  chapterId: string,
  updates: ChapterUpdate,
) {
  assertAuthorized(canManageChapter(profile, memberships, chapterId), 'Only chapter leaders or global admins can edit this chapter.');
  if (!supabase) throw new Error(NOT_CONFIGURED);

  const { data, error } = await supabase.from('chapters').update(updates).eq('id', chapterId).select('*').single();
  if (error) throw error;
  return data;
}

export async function reviewMemberAction(
  profile: Profile | null,
  memberships: ChapterMember[],
  chapterId: string,
  requestId: string,
  nextStatus: 'approved' | 'rejected',
) {
  assertAuthorized(canReviewMembers(profile, memberships, chapterId), 'Only chapter leaders or global admins can review members.');
  if (!supabase) throw new Error(NOT_CONFIGURED);

  const { data, error } = await supabase.rpc('review_chapter_join_request', {
    next_status: nextStatus,
    target_request_id: requestId,
  });
  if (error) throw error;
  return data;
}

export async function generateInviteCodeAction(
  profile: Profile | null,
  memberships: ChapterMember[],
  inviteCode: InviteCodeInsert,
) {
  assertAuthorized(canManageChapter(profile, memberships, inviteCode.chapter_id), 'Only chapter leaders or global admins can generate invite codes.');
  if (!supabase) throw new Error(NOT_CONFIGURED);

  const { data, error } = await supabase.from('invite_codes').insert(inviteCode).select('*').single();
  if (error) throw error;
  return data;
}

export async function redeemInviteCodeAction(code: string) {
  if (!supabase) throw new Error(NOT_CONFIGURED);

  const normalizedCode = code.trim().toUpperCase();

  if (!normalizedCode) {
    throw new Error('Enter an invite code.');
  }

  const { data, error } = await supabase.rpc('redeem_invite_code', {
    target_invite_code: normalizedCode,
  });

  if (error) throw error;
  return data;
}
