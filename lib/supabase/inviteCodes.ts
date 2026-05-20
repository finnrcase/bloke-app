import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

export type InviteCode = Database['public']['Tables']['invite_codes']['Row'];
export type InviteCodeInsert = Database['public']['Tables']['invite_codes']['Insert'];

const NOT_CONFIGURED = 'Supabase is not configured. Add your Expo public Supabase env vars.';

export async function fetchChapterInviteCodes(chapterId: string) {
  if (!supabase) {
    return { data: [], error: NOT_CONFIGURED };
  }

  const { data, error } = await supabase
    .from('invite_codes')
    .select('*')
    .eq('chapter_id', chapterId)
    .order('created_at', { ascending: false });

  return { data: data ?? [], error: error?.message ?? null };
}

export async function createInviteCode(inviteCode: InviteCodeInsert) {
  if (!supabase) {
    return { data: null, error: NOT_CONFIGURED };
  }

  const { data, error } = await supabase.from('invite_codes').insert(inviteCode).select('*').single();
  return { data, error: error?.message ?? null };
}

export async function redeemInviteCode(code: string) {
  if (!supabase) {
    return { data: null, error: NOT_CONFIGURED };
  }

  const { data, error } = await supabase.rpc('redeem_invite_code', {
    target_invite_code: code.trim().toUpperCase(),
  });

  return { data, error: error?.message ?? null };
}
