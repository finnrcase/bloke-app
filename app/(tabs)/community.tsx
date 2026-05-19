import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Handshake, Megaphone, MessageSquare, Users } from 'lucide-react-native';

import { AppCard } from '@/components/AppCard';
import { AppPressButton } from '@/components/AppPressButton';
import { AppScreen } from '@/components/AppScreen';
import { FormTextInput } from '@/components/FormTextInput';
import { BadgePill } from '@/components/ui/BadgePill';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type Chapter = Database['public']['Tables']['chapters']['Row'];
type ChapterMember = Database['public']['Tables']['chapter_members']['Row'];
type ChapterPost = Database['public']['Tables']['chapter_posts']['Row'];
type Attendance = Database['public']['Tables']['attendance']['Row'];

type CommunityState = {
  announcement: ChapterPost | null;
  chapter: Chapter | null;
  chapterStreak: number;
  memberCount: number;
  membership: ChapterMember | null;
  prompt: ChapterPost | null;
};

function getWeekKey(dateValue: string) {
  const date = new Date(dateValue);
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDays = Math.floor((date.getTime() - firstDayOfYear.getTime()) / 86400000);
  const weekNumber = Math.ceil((pastDays + firstDayOfYear.getDay() + 1) / 7);

  return `${date.getFullYear()}-${weekNumber}`;
}

function computeChapterStreak(attendanceRows: Attendance[]) {
  return new Set(
    attendanceRows
      .map((attendance) => attendance.attended_at)
      .filter((attendedAt): attendedAt is string => Boolean(attendedAt))
      .map(getWeekKey),
  ).size;
}

function getMilestones(memberCount: number, chapterStreak: number) {
  return [
    { complete: chapterStreak >= 1, label: 'First meeting held' },
    { complete: chapterStreak >= 5, label: '5 weeks active' },
    { complete: chapterStreak >= 10, label: '10 weeks active' },
    { complete: memberCount >= 10, label: '10 members reached' },
    { complete: false, label: 'New leader created' },
  ];
}

export default function CommunityScreen() {
  const { session } = useAuth();
  const [errorMessage, setErrorMessage] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [savedMessage, setSavedMessage] = useState('');
  const [state, setState] = useState<CommunityState>({
    announcement: null,
    chapter: null,
    chapterStreak: 0,
    memberCount: 0,
    membership: null,
    prompt: null,
  });

  const milestones = useMemo(
    () => getMilestones(state.memberCount, state.chapterStreak),
    [state.memberCount, state.chapterStreak],
  );

  const loadCommunity = useCallback(async () => {
    if (!supabase || !session) {
      setIsLoading(false);
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      const membershipResult = await supabase
        .from('chapter_members')
        .select('*')
        .eq('profile_id', session.user.id)
        .limit(1);

      if (membershipResult.error) throw membershipResult.error;

      const membership = (membershipResult.data?.[0] ?? null) as ChapterMember | null;

      if (!membership?.chapter_id) {
        setState({
          announcement: null,
          chapter: null,
          chapterStreak: 0,
          memberCount: 0,
          membership: null,
          prompt: null,
        });
        return;
      }

      const [chapterResult, countResult, postsResult, attendanceResult] = await Promise.all([
        supabase.from('chapters').select('*').eq('id', membership.chapter_id).single(),
        supabase.rpc('get_chapter_member_count', { target_chapter_id: membership.chapter_id }),
        supabase
          .from('chapter_posts')
          .select('*')
          .eq('chapter_id', membership.chapter_id)
          .order('created_at', { ascending: false }),
        supabase
          .from('attendance')
          .select('*')
          .eq('chapter_id', membership.chapter_id)
          .order('attended_at', { ascending: false }),
      ]);

      if (chapterResult.error) throw chapterResult.error;
      if (countResult.error) throw countResult.error;
      if (postsResult.error) throw postsResult.error;
      if (attendanceResult.error) throw attendanceResult.error;

      const posts = postsResult.data ?? [];

      setState({
        announcement:
          posts.find((post) => post.post_type === 'announcement') ??
          posts.find((post) => post.post_type === 'win') ??
          null,
        chapter: chapterResult.data,
        chapterStreak: computeChapterStreak(attendanceResult.data ?? []),
        memberCount: countResult.data ?? 0,
        membership,
        prompt: posts.find((post) => post.post_type === 'weekly_prompt') ?? null,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load community.');
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    loadCommunity();
  }, [loadCommunity]);

  async function handleJoinChapter() {
    if (!supabase) {
      setErrorMessage('Supabase is not configured. Add your Expo public Supabase env vars.');
      return;
    }

    if (!inviteCode.trim()) {
      setErrorMessage('Enter a chapter invite code.');
      return;
    }

    setErrorMessage('');
    setSavedMessage('');
    setIsJoining(true);

    try {
      const { error } = await supabase.rpc('join_chapter_by_invite_code', {
        target_invite_code: inviteCode.trim(),
      });

      if (error) throw error;

      setInviteCode('');
      setSavedMessage('Chapter joined.');
      await loadCommunity();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not join chapter.');
    } finally {
      setIsJoining(false);
    }
  }

  const inChapter = Boolean(state.chapter && state.membership);

  return (
    <AppScreen contentStyle={styles.screenContent}>
      <View style={styles.header}>
        <Text style={styles.heading}>Community</Text>
        <Text style={styles.subheading}>Local accountability. No noise.</Text>
      </View>

      {isLoading ? (
        <AppCard>
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.black} />
            <Text style={styles.loadingText}>Loading community...</Text>
          </View>
        </AppCard>
      ) : null}

      {errorMessage ? (
        <AppCard>
          <Text style={styles.error}>{errorMessage}</Text>
          <View style={styles.cardAction}>
            <AppPressButton label="Try again" onPress={loadCommunity} variant="secondary" />
          </View>
        </AppCard>
      ) : null}

      {savedMessage ? <Text style={styles.saved}>{savedMessage}</Text> : null}

      {!isLoading && !inChapter ? (
        <AppCard>
          <EmptyState
            body="Chapters are local groups for accountability, encouragement, and steady weekly action."
            icon={Handshake}
            title="Join a Chapter"
          />

          <View style={styles.form}>
            <FormTextInput
              autoCapitalize="characters"
              label="Invite code"
              onChangeText={setInviteCode}
              placeholder="Enter invite code"
              value={inviteCode}
            />
          </View>

          <View style={styles.cardAction}>
            <AppPressButton
              disabled={isJoining}
              icon={Users}
              label={isJoining ? 'Joining...' : 'Join'}
              onPress={handleJoinChapter}
            />
          </View>
        </AppCard>
      ) : null}

      {!isLoading && inChapter && state.chapter ? (
        <>
          <AppCard tone="dark" style={styles.chapterHero}>
            <Text style={styles.darkEyebrow}>Your chapter</Text>
            <Text style={styles.darkTitle}>{state.chapter.name}</Text>
            <View style={styles.statsGrid}>
              <Metric label="Members" value={`${state.memberCount}`} />
              <Metric label="Chapter streak" value={`${state.chapterStreak}`} />
            </View>
          </AppCard>

          <PostCard
            emptyText="No facilitator announcement yet."
            label="Latest announcement"
            post={state.announcement}
          />

          <PostCard
            emptyText="No weekly discussion prompt yet."
            label="Weekly discussion prompt"
            post={state.prompt}
          />

          <AppCard>
            <SectionHeader icon={Handshake} title="Chapter milestones" />
            <View style={styles.milestoneList}>
              {milestones.map((milestone) => (
                <BadgePill key={milestone.label} label={milestone.label} locked={!milestone.complete} />
              ))}
            </View>
          </AppCard>
        </>
      ) : null}
    </AppScreen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function PostCard({
  emptyText,
  label,
  post,
}: {
  emptyText: string;
  label: string;
  post: ChapterPost | null;
}) {
  return (
    <AppCard>
      <SectionHeader icon={label.includes('announcement') ? Megaphone : MessageSquare} title={label} />
      <Text style={styles.postTitle}>{post?.title ?? emptyText}</Text>
      {post?.body ? <Text style={styles.body}>{post.body}</Text> : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    justifyContent: 'flex-start',
  },
  header: {
    gap: spacing.sm,
  },
  heading: {
    color: colors.text,
    fontSize: typography.hero,
    fontWeight: '900',
    lineHeight: 54,
  },
  subheading: {
    color: colors.mutedText,
    fontSize: 18,
    fontWeight: '800',
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.mutedText,
    fontSize: 18,
    fontWeight: '700',
  },
  eyebrow: {
    color: colors.mutedText,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 36,
    fontWeight: '900',
    lineHeight: 42,
  },
  chapterHero: {
    gap: spacing.lg,
  },
  darkEyebrow: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  darkTitle: {
    color: colors.inverseText,
    fontSize: 38,
    fontWeight: '900',
    lineHeight: 44,
  },
  body: {
    color: colors.mutedText,
    fontSize: 19,
    lineHeight: 29,
    marginTop: spacing.md,
  },
  form: {
    marginTop: spacing.xl,
  },
  cardAction: {
    marginTop: spacing.xl,
  },
  statsGrid: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  metric: {
    backgroundColor: 'rgba(255, 252, 247, 0.08)',
    borderColor: 'rgba(255, 252, 247, 0.18)',
    borderWidth: 1,
    borderRadius: radius.md,
    gap: spacing.xs,
    padding: spacing.md,
  },
  metricLabel: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metricValue: {
    color: colors.inverseText,
    fontSize: 28,
    fontWeight: '900',
  },
  postTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 31,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
  },
  milestoneList: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  milestoneRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  dot: {
    borderRadius: 999,
    height: 14,
    width: 14,
  },
  dotComplete: {
    backgroundColor: colors.success,
  },
  dotOpen: {
    backgroundColor: colors.border,
  },
  milestoneText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
  },
  milestoneComplete: {
    color: colors.text,
  },
  milestoneOpen: {
    color: colors.mutedText,
  },
  error: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
  },
  saved: {
    color: colors.success,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
});
