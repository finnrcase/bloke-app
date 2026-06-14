import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

export type PublicFeedPost = Database['public']['Functions']['get_public_feed_posts']['Returns'][number];
export type CommunityFeedPost = Database['public']['Functions']['get_community_feed_posts']['Returns'][number];
export type PublicFeedPostInsert = Database['public']['Tables']['chapter_posts']['Insert'];
export type PublicFeedPostType = NonNullable<PublicFeedPostInsert['post_type']>;

const NOT_CONFIGURED = 'Supabase is not configured. Add your Expo public Supabase env vars.';

type PublicFeedTypeOption = {
  corporateOnly?: boolean;
  label: string;
  value: PublicFeedPostType;
};

export const PUBLIC_FEED_TYPES: PublicFeedTypeOption[] = [
  { label: 'Event', value: 'chapter_event' },
  { label: 'Success', value: 'success_story' },
  { label: 'Highlight', value: 'member_highlight' },
  { label: 'Volunteer', value: 'volunteer_opportunity' },
  { label: 'Challenge', value: 'challenge' },
  { label: 'Inspiration', value: 'inspiration' },
  { corporateOnly: true, label: 'Announcement', value: 'corporate_announcement' },
  { corporateOnly: true, label: 'Spotlight', value: 'chapter_spotlight' },
  { corporateOnly: true, label: 'Activity', value: 'promoted_activity' },
  { corporateOnly: true, label: 'Curriculum', value: 'curriculum_update' },
  { corporateOnly: true, label: 'Featured Challenge', value: 'featured_challenge' },
  { corporateOnly: true, label: 'Reflection', value: 'weekly_reflection' },
  { corporateOnly: true, label: 'National', value: 'national_announcement' },
];

export function getPublicFeedTypeLabel(postType?: string | null) {
  return PUBLIC_FEED_TYPES.find((type) => type.value === postType)?.label ?? 'Update';
}

export async function fetchPublicFeedPosts() {
  if (!supabase) {
    return { data: [], error: NOT_CONFIGURED };
  }

  const { data, error } = await supabase.rpc('get_public_feed_posts');

  return { data: data ?? [], error: error?.message ?? null };
}

export async function createPublicFeedPost(post: PublicFeedPostInsert) {
  if (!supabase) {
    return { data: null, error: NOT_CONFIGURED };
  }

  const { data, error } = await supabase.from('chapter_posts').insert(post).select('*').single();

  return { data, error: error?.message ?? null };
}

export async function fetchCommunityFeedPosts() {
  if (!supabase) {
    return { data: [], error: NOT_CONFIGURED };
  }

  const { data, error } = await supabase.rpc('get_community_feed_posts');

  return { data: data ?? [], error: error?.message ?? null };
}

export async function createCommunityFeedPost({
  authorId,
  chapterId,
  content,
  imageUrl,
}: {
  authorId: string;
  chapterId?: string | null;
  content: string;
  imageUrl?: string | null;
}) {
  if (!supabase) {
    return { data: null, error: NOT_CONFIGURED };
  }

  const { data, error } = await supabase
    .from('chapter_posts')
    .insert({
      author_id: authorId,
      body: content,
      chapter_id: chapterId ?? null,
      cover_image_url: imageUrl ?? null,
      is_public: true,
      moderation_status: 'approved',
      post_type: 'win',
      published_at: new Date().toISOString(),
      status: 'published',
      title: null,
    })
    .select('id')
    .single();

  return { data, error: error?.message ?? null };
}

export async function deleteCommunityFeedPost(postId: string) {
  if (!supabase) {
    return { data: null, error: NOT_CONFIGURED };
  }

  const { data, error } = await supabase.from('chapter_posts').delete().eq('id', postId).select('id').single();

  return { data, error: error?.message ?? null };
}
