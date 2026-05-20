import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

const NOT_CONFIGURED = 'Supabase is not configured. Add your Expo public Supabase env vars.';

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
