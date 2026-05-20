import { Database } from '@/types/database';

export type AppRole = 'user' | 'chapter_member' | 'chapter_leader' | 'global_admin';
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ChapterMember = Database['public']['Tables']['chapter_members']['Row'];

export function normalizeProfileRole(role?: Profile['role'] | null): AppRole {
  if (role === 'global_admin' || role === 'admin') return 'global_admin';
  if (role === 'chapter_leader' || role === 'facilitator') return 'chapter_leader';
  if (role === 'chapter_member') return 'chapter_member';
  return 'user';
}

export function normalizeChapterRole(role?: ChapterMember['role'] | null): AppRole {
  if (role === 'chapter_leader' || role === 'facilitator') return 'chapter_leader';
  if (role === 'chapter_member' || role === 'member') return 'chapter_member';
  return 'user';
}

export function isAdmin(profile?: Pick<Profile, 'role'> | null) {
  return normalizeProfileRole(profile?.role) === 'global_admin';
}

export function isChapterLeader(memberships: ChapterMember[] = [], chapterId?: string | null) {
  return memberships.some((membership) => {
    const isActive = (membership.status ?? 'active') === 'active';
    const matchesChapter = chapterId ? membership.chapter_id === chapterId : true;
    return isActive && matchesChapter && normalizeChapterRole(membership.role) === 'chapter_leader';
  });
}

export function canManageChapter(
  profile?: Pick<Profile, 'id' | 'role'> | null,
  memberships: ChapterMember[] = [],
  chapterId?: string | null,
) {
  return isAdmin(profile) || isChapterLeader(memberships, chapterId);
}

export function canCreateChapter(profile?: Pick<Profile, 'role'> | null) {
  return isAdmin(profile);
}

export function canReviewMembers(
  profile?: Pick<Profile, 'id' | 'role'> | null,
  memberships: ChapterMember[] = [],
  chapterId?: string | null,
) {
  return canManageChapter(profile, memberships, chapterId);
}

export function assertAuthorized(allowed: boolean, message = 'You are not authorized to perform this action.') {
  if (!allowed) {
    throw new Error(message);
  }
}

// Spec-named aliases (TASK 4 names). Same behavior as the canonical exports above.
export const isGlobalAdmin = isAdmin;
export const canGenerateInviteCodes = canManageChapter;
export const canApproveMembers = canReviewMembers;
