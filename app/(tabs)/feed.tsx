import { LinearGradient } from 'expo-linear-gradient';
import { RefreshCw, Send, Trash2, Users } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppPressButton } from '@/components/AppPressButton';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { borderRadius, shadows, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { demoPublicFeedPosts } from '@/lib/demoData';
import { isAdmin } from '@/lib/permissions';
import { supabase } from '@/lib/supabase';
import {
  CommunityFeedPost,
  createCommunityFeedPost,
  deleteCommunityFeedPost,
  fetchCommunityFeedPosts,
} from '@/lib/supabase/feed';

const MAX_POST_LENGTH = 2000;

export default function FeedScreen() {
  const theme = useTheme();
  const { isDemoMode, profile, session } = useAuth();
  const [posts, setPosts] = useState<CommunityFeedPost[]>([]);
  const [postText, setPostText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const useDemoFeed = isDemoMode || !supabase;

  const loadPosts = useCallback(async () => {
    setErrorMessage('');
    setIsLoading(true);

    if (useDemoFeed) {
      setPosts(demoPublicFeedPosts.map((post) => toCommunityPost(post, session?.user.id, isAdmin(profile))));
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await fetchCommunityFeedPosts();
      if (error) throw new Error(error);
      setPosts(data);
    } catch (error) {
      setPosts([]);
      setErrorMessage(error instanceof Error ? error.message : 'Could not load the community feed.');
    } finally {
      setIsLoading(false);
    }
  }, [profile, session?.user.id, useDemoFeed]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  async function handleCreatePost() {
    const content = postText.trim();

    if (!content) {
      setErrorMessage('Write something before posting.');
      return;
    }

    if (!session) {
      setErrorMessage('Sign in before posting to the community feed.');
      return;
    }

    setErrorMessage('');
    setSavedMessage('');
    setIsPosting(true);

    const now = new Date().toISOString();
    const optimisticPost: CommunityFeedPost = {
      author_avatar_url: profile?.avatar_url ?? null,
      author_id: session.user.id,
      author_name: getDisplayName(profile, session.user.email),
      author_role: profile?.role ?? 'user',
      can_delete: true,
      comment_count: 0,
      content,
      created_at: now,
      id: `optimistic-${Date.now()}`,
      image_url: null,
      like_count: 0,
    };

    setPostText('');
    setPosts((current) => [optimisticPost, ...current]);

    try {
      if (useDemoFeed) {
        setSavedMessage('Post added to the demo feed.');
        return;
      }

      const { error } = await createCommunityFeedPost({
        authorId: session.user.id,
        chapterId: profile?.home_chapter_id ?? null,
        content,
      });

      if (error) {
        throw new Error(error);
      }

      await loadPosts();
      setSavedMessage('Post shared.');
    } catch (error) {
      setPostText(content);
      setPosts((current) => current.filter((post) => post.id !== optimisticPost.id));
      setErrorMessage(error instanceof Error ? error.message : 'Could not create your post.');
    } finally {
      setIsPosting(false);
    }
  }

  async function handleDeletePost(post: CommunityFeedPost) {
    if (!post.can_delete) return;

    const previousPosts = posts;
    setErrorMessage('');
    setSavedMessage('');
    setPosts((current) => current.filter((item) => item.id !== post.id));

    try {
      if (!useDemoFeed) {
        const { error } = await deleteCommunityFeedPost(post.id);
        if (error) throw new Error(error);
      }

      setSavedMessage('Post deleted.');
    } catch (error) {
      setPosts(previousPosts);
      setErrorMessage(error instanceof Error ? error.message : 'Could not delete this post.');
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top']}>
      <LinearGradient
        colors={theme.isDark ? ['#070605', '#15120F', '#070605'] : ['#F6F1E8', '#FFF9EF', '#E9DED0']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadPosts} tintColor={theme.accent} />}>
        <View style={styles.header}>
          <View style={[styles.feedPill, { backgroundColor: theme.accentSurface, borderColor: theme.accentBorder }]}>
            <Users color={theme.accent} size={16} strokeWidth={2.5} />
            <Text style={[styles.feedPillText, { color: theme.accentText }]}>Logged-in community</Text>
          </View>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Community Feed</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Share growth, wins, questions, and accountability with the men inside Bloke.
          </Text>
        </View>

        <View style={[styles.composerCard, { backgroundColor: theme.glass, borderColor: theme.border }, shadows.card]}>
          <View style={styles.composerHeader}>
            <UserAvatar imageUrl={profile?.avatar_url} name={getDisplayName(profile, session?.user.email)} size={44} />
            <View style={styles.composerCopy}>
              <Text style={[styles.composerTitle, { color: theme.textPrimary }]}>Create a post</Text>
              <Text style={[styles.composerMeta, { color: theme.textSecondary }]}>Text posts only for this first version.</Text>
            </View>
          </View>

          <TextInput
            accessibilityLabel="Community post"
            maxLength={MAX_POST_LENGTH}
            multiline
            onChangeText={(value) => {
              setPostText(value);
              setSavedMessage('');
            }}
            placeholder="What are you learning, building, or taking responsibility for?"
            placeholderTextColor={theme.textMuted}
            style={[styles.postInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.textPrimary }]}
            textAlignVertical="top"
            value={postText}
          />

          <View style={styles.composerFooter}>
            <Text style={[styles.characterCount, { color: theme.textMuted }]}>
              {postText.length}/{MAX_POST_LENGTH}
            </Text>
            <View style={styles.postButton}>
              <AppPressButton
                disabled={isPosting}
                icon={Send}
                label={isPosting ? 'Posting...' : 'Post'}
                onPress={handleCreatePost}
                variant="accent"
              />
            </View>
          </View>

          {errorMessage ? <Text style={[styles.formMessage, { color: theme.error }]}>{errorMessage}</Text> : null}
          {savedMessage ? <Text style={[styles.formMessage, { color: theme.success }]}>{savedMessage}</Text> : null}
        </View>

        <View style={styles.feedList}>
          {isLoading && posts.length === 0 ? (
            <View style={[styles.stateCard, { backgroundColor: theme.glass, borderColor: theme.border }]}>
              <ActivityIndicator color={theme.accent} />
              <Text style={[styles.stateText, { color: theme.textSecondary }]}>Loading the community feed...</Text>
            </View>
          ) : null}

          {!isLoading && posts.length === 0 && !errorMessage ? (
            <View style={[styles.stateCard, { backgroundColor: theme.glass, borderColor: theme.border }]}>
              <RefreshCw color={theme.accent} size={26} strokeWidth={2.5} />
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No posts yet</Text>
              <Text style={[styles.stateText, { color: theme.textSecondary }]}>
                Start the first conversation with a win, reflection, or commitment.
              </Text>
            </View>
          ) : null}

          {!isLoading && posts.length === 0 && errorMessage ? (
            <View style={[styles.stateCard, { backgroundColor: theme.glass, borderColor: theme.border }]}>
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Feed unavailable</Text>
              <Text style={[styles.stateText, { color: theme.textSecondary }]}>{errorMessage}</Text>
              <View style={styles.retryButton}>
                <AppPressButton icon={RefreshCw} label="Try again" onPress={loadPosts} variant="secondary" />
              </View>
            </View>
          ) : null}

          {posts.map((post) => (
            <FeedPostCard key={post.id} onDelete={handleDeletePost} post={post} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeedPostCard({
  onDelete,
  post,
}: {
  onDelete: (post: CommunityFeedPost) => void;
  post: CommunityFeedPost;
}) {
  const theme = useTheme();
  const authorName = post.author_name ?? 'Bloke member';

  return (
    <View style={[styles.postCard, { backgroundColor: theme.card, borderColor: theme.border }, shadows.card]}>
      <View style={styles.postHeader}>
        <UserAvatar imageUrl={post.author_avatar_url} name={authorName} size={42} />
        <View style={styles.postHeaderCopy}>
          <Text style={[styles.authorName, { color: theme.textPrimary }]}>{authorName}</Text>
          <Text style={[styles.timestamp, { color: theme.textMuted }]}>{formatPostDate(post.created_at)}</Text>
        </View>
        {post.can_delete ? (
          <Pressable
            accessibilityLabel="Delete post"
            accessibilityRole="button"
            onPress={() => onDelete(post)}
            style={[styles.deleteButton, { backgroundColor: theme.cardMuted, borderColor: theme.border }]}>
            <Trash2 color={theme.textMuted} size={17} strokeWidth={2.5} />
          </Pressable>
        ) : null}
      </View>

      <Text style={[styles.postContent, { color: theme.textSecondary }]}>{post.content}</Text>

      {post.image_url ? <Image accessibilityIgnoresInvertColors source={{ uri: post.image_url }} style={styles.postImage} /> : null}

      <View style={[styles.postStats, { borderTopColor: theme.border }]}>
        <Text style={[styles.statText, { color: theme.textMuted }]}>{post.like_count} likes</Text>
        <Text style={[styles.statText, { color: theme.textMuted }]}>{post.comment_count} comments</Text>
      </View>
    </View>
  );
}

function toCommunityPost(
  post: (typeof demoPublicFeedPosts)[number],
  currentUserId?: string,
  currentUserIsAdmin = false,
): CommunityFeedPost {
  return {
    author_avatar_url: post.author_avatar_url ?? null,
    author_id: post.author_id,
    author_name: post.author_name,
    author_role: post.author_role,
    can_delete: Boolean(currentUserIsAdmin || (currentUserId && post.author_id === currentUserId)),
    comment_count: 0,
    content: post.description ?? '',
    created_at: post.published_at ?? post.created_at,
    id: post.id,
    image_url: post.cover_image_url,
    like_count: 0,
  };
}

function getDisplayName(
  profile?: { full_name?: string | null; username?: string | null } | null,
  email?: string | null,
) {
  return profile?.full_name?.trim() || profile?.username?.trim() || email?.split('@')[0] || 'Bloke member';
}

function formatPostDate(value?: string | null) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  }).format(date);
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    alignSelf: 'center',
    gap: spacing.lg,
    maxWidth: 760,
    padding: spacing.lg,
    paddingBottom: 120,
    width: '100%',
  },
  header: {
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  feedPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  feedPillText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: typography.display,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 68,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 28,
    maxWidth: 640,
  },
  composerCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  composerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  composerCopy: {
    flex: 1,
    gap: 2,
  },
  composerTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  composerMeta: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  postInput: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
    minHeight: 116,
    padding: spacing.md,
  },
  composerFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  characterCount: {
    fontSize: 13,
    fontWeight: '900',
  },
  postButton: {
    minWidth: 150,
  },
  formMessage: {
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 20,
  },
  feedList: {
    gap: spacing.md,
  },
  stateCard: {
    alignItems: 'center',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
  },
  stateText: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 22,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  retryButton: {
    minWidth: 180,
  },
  postCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  postHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  postHeaderCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '900',
  },
  timestamp: {
    fontSize: 12,
    fontWeight: '800',
  },
  deleteButton: {
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  postContent: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 27,
  },
  postImage: {
    aspectRatio: 1.55,
    borderRadius: borderRadius.lg,
    width: '100%',
  },
  postStats: {
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  statText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
});
