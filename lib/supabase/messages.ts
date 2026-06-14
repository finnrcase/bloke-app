import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

export type ChapterChatChannel = Database['public']['Functions']['get_my_chapter_chat_channels']['Returns'][number];
export type ChapterChatMessage = Database['public']['Functions']['get_chapter_chat_messages']['Returns'][number];
export type ChapterChatMessageReport = Database['public']['Functions']['get_chapter_chat_message_reports']['Returns'][number];
export type ChapterChatMessageInsert = Database['public']['Tables']['chapter_chat_messages']['Insert'];
export type ChapterChatMessageType = ChapterChatMessageInsert['message_type'];
export type ChapterChatReportReason = Database['public']['Tables']['chapter_chat_message_reports']['Insert']['reason'];
export type ChapterChatReportStatus = 'reviewing' | 'resolved' | 'dismissed';

const NOT_CONFIGURED = 'Supabase is not configured. Add your Expo public Supabase env vars.';

export const MESSAGE_TYPES: { label: string; value: NonNullable<ChapterChatMessageType> }[] = [
  { label: 'Text', value: 'text' },
  { label: 'Photo', value: 'photo' },
  { label: 'File', value: 'file' },
  { label: 'Location', value: 'location' },
];

export const REPORT_REASONS: { label: string; value: ChapterChatReportReason }[] = [
  { label: 'Harassment', value: 'harassment' },
  { label: 'Unsafe', value: 'unsafe' },
  { label: 'Spam', value: 'spam' },
  { label: 'Privacy', value: 'privacy' },
  { label: 'Other', value: 'other' },
];

export function getChannelTypeLabel(channelType?: string | null) {
  if (channelType === 'announcements') return 'Announcements';
  if (channelType === 'event') return 'Event Discussion';
  if (channelType === 'small_group') return 'Small Group';
  return 'General';
}

export async function fetchMyChapterChatChannels() {
  if (!supabase) {
    return { data: [], error: NOT_CONFIGURED };
  }

  const { data, error } = await supabase.rpc('get_my_chapter_chat_channels');

  return { data: data ?? [], error: error?.message ?? null };
}

export async function fetchChapterChatMessages(channelId: string) {
  if (!supabase) {
    return { data: [], error: NOT_CONFIGURED };
  }

  const { data, error } = await supabase.rpc('get_chapter_chat_messages', {
    target_channel_id: channelId,
  });

  return { data: data ?? [], error: error?.message ?? null };
}

export async function createChapterChatMessage(message: ChapterChatMessageInsert) {
  if (!supabase) {
    return { data: null, error: NOT_CONFIGURED };
  }

  const { data, error } = await supabase.from('chapter_chat_messages').insert(message).select('*').single();

  return { data, error: error?.message ?? null };
}

export async function deleteChapterChatMessage(messageId: string) {
  if (!supabase) {
    return { data: null, error: NOT_CONFIGURED };
  }

  const { data, error } = await supabase.rpc('delete_chapter_chat_message', {
    target_message_id: messageId,
  });

  return { data, error: error?.message ?? null };
}

export async function reportChapterChatMessage(
  messageId: string,
  reason: ChapterChatReportReason,
  details?: string | null,
) {
  if (!supabase) {
    return { data: null, error: NOT_CONFIGURED };
  }

  const { data, error } = await supabase.rpc('report_chapter_chat_message', {
    report_details: details ?? null,
    report_reason: reason,
    target_message_id: messageId,
  });

  return { data, error: error?.message ?? null };
}

export async function fetchChapterChatMessageReports() {
  if (!supabase) {
    return { data: [], error: NOT_CONFIGURED };
  }

  const { data, error } = await supabase.rpc('get_chapter_chat_message_reports');

  return { data: data ?? [], error: error?.message ?? null };
}

export async function reviewChapterChatMessageReport(reportId: string, status: ChapterChatReportStatus) {
  if (!supabase) {
    return { data: null, error: NOT_CONFIGURED };
  }

  const { data, error } = await supabase.rpc('review_chapter_chat_message_report', {
    next_status: status,
    target_report_id: reportId,
  });

  return { data, error: error?.message ?? null };
}
