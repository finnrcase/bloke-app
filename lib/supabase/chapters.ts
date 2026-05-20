import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

export type Chapter = Database['public']['Tables']['chapters']['Row'];
export type ChapterInsert = Database['public']['Tables']['chapters']['Insert'];
export type ChapterUpdate = Database['public']['Tables']['chapters']['Update'];

const NOT_CONFIGURED = 'Supabase is not configured. Add your Expo public Supabase env vars.';

export async function fetchChapters(searchText?: string) {
  if (!supabase) {
    return { data: [], error: NOT_CONFIGURED };
  }

  const query = supabase
    .from('chapters')
    .select('*')
    .eq('is_public', true)
    .order('is_verified', { ascending: false })
    .order('member_count', { ascending: false })
    .order('name');

  if (searchText?.trim()) {
    const term = searchText.trim();
    query.or(`name.ilike.%${term}%,city.ilike.%${term}%,state.ilike.%${term}%,country.ilike.%${term}%`);
  }

  const { data, error } = await query;
  return { data: data ?? [], error: error?.message ?? null };
}

export async function fetchChapterBySlug(slug: string) {
  if (!supabase) {
    return { data: null, error: NOT_CONFIGURED };
  }

  const { data, error } = await supabase.from('chapters').select('*').eq('slug', slug).maybeSingle();
  return { data, error: error?.message ?? null };
}

export async function createChapter(chapter: ChapterInsert) {
  if (!supabase) {
    return { data: null, error: NOT_CONFIGURED };
  }

  const { data, error } = await supabase.from('chapters').insert(chapter).select('*').single();
  return { data, error: error?.message ?? null };
}
