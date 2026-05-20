import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

export type ChapterEvent = Database['public']['Tables']['chapter_events']['Row'];
export type ChapterEventInsert = Database['public']['Tables']['chapter_events']['Insert'];

const NOT_CONFIGURED = 'Supabase is not configured. Add your Expo public Supabase env vars.';

export async function fetchChapterEvents(chapterId: string) {
  if (!supabase) {
    return { data: [], error: NOT_CONFIGURED };
  }

  const { data, error } = await supabase
    .from('chapter_events')
    .select('*')
    .eq('chapter_id', chapterId)
    .order('event_date', { ascending: true });

  return { data: data ?? [], error: error?.message ?? null };
}

export async function createChapterEvent(event: ChapterEventInsert) {
  if (!supabase) {
    return { data: null, error: NOT_CONFIGURED };
  }

  const { data, error } = await supabase.from('chapter_events').insert(event).select('*').single();
  return { data, error: error?.message ?? null };
}
