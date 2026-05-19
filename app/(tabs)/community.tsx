import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Compass,
  Handshake,
  HeartHandshake,
  MapPin,
  Megaphone,
  MessageSquare,
  Send,
  Trophy,
  Users,
} from 'lucide-react-native';

import { AppCard } from '@/components/AppCard';
import { AppPressButton } from '@/components/AppPressButton';
import { AppScreen } from '@/components/AppScreen';
import { ChapterDiscovery } from '@/components/community/ChapterDiscovery';
import { FormTextInput } from '@/components/FormTextInput';
import { BadgePill } from '@/components/ui/BadgePill';
import { EmptyState } from '@/components/ui/EmptyState';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientCard } from '@/components/ui/GradientCard';
import { HeroSection } from '@/components/ui/HeroSection';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { usePreferences } from '@/context/PreferencesContext';
import { useTheme } from '@/hooks/useTheme';
import {
  demoAttendance,
  demoChapter,
  demoChapterMembers,
  demoChapterPosts,
  demoPostReactions,
  demoPromptResponses,
} from '@/lib/demoData';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type Chapter = Database['public']['Tables']['chapters']['Row'];
type ChapterMember = Database['public']['Tables']['chapter_members']['Row'];
type ChapterPost = Database['public']['Tables']['chapter_posts']['Row'];
type ChapterPostReaction = Database['public']['Tables']['chapter_post_reactions']['Row'];
type ChapterPromptResponse = Database['public']['Tables']['chapter_prompt_responses']['Row'];
type Attendance = Database['public']['Tables']['attendance']['Row'];
type CommunitySection = 'my' | 'discover' | 'activity';

type CommunityState = {
  announcement: ChapterPost | null;
  chapter: Chapter | null;
  chapterStreak: number;
  memberCount: number;
  membership: ChapterMember | null;
  participationCount: number;
  prompt: ChapterPost | null;
  promptResponses: ChapterPromptResponse[];
  reactions: ChapterPostReaction[];
  wins: ChapterPost[];
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

const emptyState: CommunityState = {
  announcement: null,
  chapter: null,
  chapterStreak: 0,
  memberCount: 0,
  membership: null,
  participationCount: 0,
  prompt: null,
  promptResponses: [],
  reactions: [],
  wins: [],
};

export default function CommunityScreen() {
  const { isDemoMode, session } = useAuth();
  const { t } = usePreferences();
  const theme = useTheme();
  const [activeSection, setActiveSection] = useState<CommunitySection>('my');
  const [errorMessage, setErrorMessage] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [promptResponse, setPromptResponse] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [state, setState] = useState<CommunityState>(emptyState);
  const [winBody, setWinBody] = useState('');

  const milestones = useMemo(
    () => getMilestones(state.memberCount, state.chapterStreak),
    [state.memberCount, state.chapterStreak],
  );

  const loadCommunity = useCallback(async () => {
    if (isDemoMode && session) {
      const wins = demoChapterPosts.filter((post) => post.post_type === 'win');

      setState({
        announcement: demoChapterPosts.find((post) => post.post_type === 'announcement') ?? null,
        chapter: demoChapter,
        chapterStreak: computeChapterStreak(demoAttendance),
        memberCount: demoChapterMembers.length,
        membership: demoChapterMembers.find((member) => member.profile_id === session.user.id) ?? null,
        participationCount: demoPromptResponses.length + wins.length,
        prompt: demoChapterPosts.find((post) => post.post_type === 'weekly_prompt') ?? null,
        promptResponses: demoPromptResponses,
        reactions: demoPostReactions,
        wins,
      });
      setErrorMessage('');
      setIsLoading(false);
      return;
    }

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
        .order('joined_at', { ascending: false })
        .limit(1);

      if (membershipResult.error) throw membershipResult.error;

      const membership = (membershipResult.data?.[0] ?? null) as ChapterMember | null;

      if (!membership?.chapter_id) {
        setState(emptyState);
        return;
      }

      const [chapterResult, countResult, postsResult, attendanceResult, responsesResult] = await Promise.all([
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
        supabase
          .from('chapter_prompt_responses')
          .select('*')
          .eq('chapter_id', membership.chapter_id)
          .order('created_at', { ascending: false }),
      ]);

      if (chapterResult.error) throw chapterResult.error;
      if (countResult.error) throw countResult.error;
      if (postsResult.error) throw postsResult.error;
      if (attendanceResult.error) throw attendanceResult.error;
      if (responsesResult.error) throw responsesResult.error;

      const posts = postsResult.data ?? [];
      const wins = posts.filter((post) => post.post_type === 'win');
      let reactions: ChapterPostReaction[] = [];

      if (wins.length > 0) {
        const reactionsResult = await supabase
          .from('chapter_post_reactions')
          .select('*')
          .in('post_id', wins.map((win) => win.id));

        if (reactionsResult.error) throw reactionsResult.error;
        reactions = reactionsResult.data ?? [];
      }

      setState({
        announcement: posts.find((post) => post.post_type === 'announcement') ?? null,
        chapter: chapterResult.data,
        chapterStreak: computeChapterStreak(attendanceResult.data ?? []),
        memberCount: countResult.data ?? 0,
        membership,
        participationCount: (responsesResult.data ?? []).length + wins.length,
        prompt: posts.find((post) => post.post_type === 'weekly_prompt') ?? null,
        promptResponses: responsesResult.data ?? [],
        reactions,
        wins,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load community.');
    } finally {
      setIsLoading(false);
    }
  }, [isDemoMode, session]);

  useEffect(() => {
    loadCommunity();
  }, [loadCommunity]);

  async function handleJoinChapter() {
    if (isDemoMode) {
      setInviteCode('');
      setSavedMessage('Demo chapter is already joined.');
      setErrorMessage('');
      return;
    }

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

  async function submitPromptResponse() {
    if (!state.chapter || !state.prompt || !session) return;

    if (!promptResponse.trim()) {
      setErrorMessage('Write a short response before submitting.');
      return;
    }

    if (isDemoMode) {
      setState((current) => ({
        ...current,
        participationCount: current.participationCount + 1,
        promptResponses: [
          {
            author_id: session.user.id,
            body: promptResponse.trim(),
            chapter_id: state.chapter!.id,
            created_at: new Date().toISOString(),
            id: `demo-response-${Date.now()}`,
            prompt_post_id: state.prompt!.id,
          },
          ...current.promptResponses,
        ],
      }));
      setPromptResponse('');
      setSavedMessage('Prompt response saved in demo mode.');
      return;
    }

    if (!supabase) return;

    setErrorMessage('');
    setSavedMessage('');

    try {
      const { error } = await supabase.from('chapter_prompt_responses').upsert(
        {
          author_id: session.user.id,
          body: promptResponse.trim(),
          chapter_id: state.chapter.id,
          prompt_post_id: state.prompt.id,
        },
        { onConflict: 'prompt_post_id,author_id' },
      );

      if (error) throw error;

      setPromptResponse('');
      setSavedMessage('Prompt response saved.');
      await loadCommunity();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not save response.');
    }
  }

  async function postWin() {
    if (!state.chapter || !session) return;

    const trimmedWin = winBody.trim();

    if (!trimmedWin) {
      setErrorMessage('Write a short win before posting.');
      return;
    }

    if (trimmedWin.length > 280) {
      setErrorMessage('Wins must be 280 characters or fewer.');
      return;
    }

    if (isDemoMode) {
      const nextWin: ChapterPost = {
        author_id: session.user.id,
        body: trimmedWin,
        chapter_id: state.chapter.id,
        created_at: new Date().toISOString(),
        id: `demo-win-${Date.now()}`,
        post_type: 'win',
        title: null,
      };

      setState((current) => ({
        ...current,
        participationCount: current.participationCount + 1,
        wins: [nextWin, ...current.wins],
      }));
      setWinBody('');
      setSavedMessage('Win posted in demo mode.');
      return;
    }

    if (!supabase) return;

    setErrorMessage('');
    setSavedMessage('');

    try {
      const { error } = await supabase.from('chapter_posts').insert({
        author_id: session.user.id,
        body: trimmedWin,
        chapter_id: state.chapter.id,
        post_type: 'win',
        title: null,
      });

      if (error) throw error;

      setWinBody('');
      setSavedMessage('Win posted.');
      await loadCommunity();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not post win.');
    }
  }

  async function reactRespect(win: ChapterPost) {
    if (!session) return;

    if (win.author_id === session.user.id) {
      setErrorMessage('Respect is for wins from other members.');
      return;
    }

    if (isDemoMode) {
      if (state.reactions.some((reaction) => reaction.post_id === win.id && reaction.profile_id === session.user.id)) {
        return;
      }

      setState((current) => ({
        ...current,
        reactions: [
          {
            created_at: new Date().toISOString(),
            id: `demo-reaction-${Date.now()}`,
            post_id: win.id,
            profile_id: session.user.id,
            reaction_type: 'respect',
          },
          ...current.reactions,
        ],
      }));
      return;
    }

    if (!supabase) return;

    setErrorMessage('');

    try {
      const { error } = await supabase.from('chapter_post_reactions').upsert(
        {
          post_id: win.id,
          profile_id: session.user.id,
          reaction_type: 'respect',
        },
        { onConflict: 'post_id,profile_id,reaction_type' },
      );

      if (error) throw error;

      await loadCommunity();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not react to win.');
    }
  }

  const inChapter = Boolean(state.chapter && state.membership);

  return (
    <AppScreen contentStyle={styles.screenContent}>
      <HeroSection
        eyebrow="Brotherhood"
        icon={Handshake}
        subtitle="Local accountability without DMs or a public feed."
        title={t('community')}
      />

      {isLoading ? (
        <AppCard>
          <View style={styles.loadingRow}>
            <ActivityIndicator color={theme.accent} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading community...</Text>
          </View>
        </AppCard>
      ) : null}

      {errorMessage ? (
        <AppCard>
          <Text style={[styles.error, { color: theme.error }]}>{errorMessage}</Text>
          <View style={styles.cardAction}>
            <AppPressButton label={t('tryAgain')} onPress={loadCommunity} variant="secondary" />
          </View>
        </AppCard>
      ) : null}

      {savedMessage ? <Text style={[styles.saved, { color: theme.success }]}>{savedMessage}</Text> : null}

      {!isLoading ? (
        <CommunityTabs activeSection={activeSection} onChange={setActiveSection} />
      ) : null}

      {!isLoading && activeSection === 'my' ? (
        inChapter && state.chapter ? (
          <>
            <GradientCard glow style={styles.chapterHero} variant="dark">
              <Text style={[styles.darkEyebrow, { color: theme.accent }]}>Your chapter</Text>
              <Text style={[styles.darkTitle, { color: theme.textInverse }]}>{state.chapter.name}</Text>
              <Text style={[styles.chapterLocation, { color: theme.textInverseMuted }]}>
                {[state.chapter.region, state.chapter.country].filter(Boolean).join(', ') || 'Location pending'}
              </Text>
              <Text style={[styles.chapterLocation, { color: theme.textInverseMuted }]}>
                {state.chapter.meeting_day ?? 'Meeting day TBD'} · {state.chapter.meeting_location ?? 'Location TBD'}
              </Text>
              <View style={styles.avatarRow}>
                {Array.from({ length: Math.min(state.memberCount, 4) }).map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.avatar,
                      {
                        backgroundColor: theme.accent,
                        borderColor: theme.cardInverted,
                        marginLeft: index === 0 ? 0 : -10,
                      },
                    ]}>
                    <Text style={[styles.avatarText, { color: theme.accentText }]}>{index + 1}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.statsGrid}>
                <Metric label="Members" value={`${state.memberCount}`} />
                <Metric label="Chapter streak" value={`${state.chapterStreak}`} />
                <Metric label="Participation" value={`${state.participationCount}`} />
              </View>
            </GradientCard>

            <PostCard emptyText="No facilitator announcement yet." label="Latest announcement" post={state.announcement} />

            <GlassCard>
              <SectionHeader icon={Handshake} title="Chapter milestones" />
              <View style={styles.milestoneList}>
                {milestones.map((milestone) => (
                  <BadgePill key={milestone.label} label={milestone.label} locked={!milestone.complete} />
                ))}
              </View>
            </GlassCard>
          </>
        ) : (
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
              <AppPressButton disabled={isJoining} icon={Users} label={isJoining ? 'Joining...' : 'Join'} onPress={handleJoinChapter} />
            </View>
            <View style={styles.secondaryAction}>
              <AppPressButton icon={MapPin} label="Discover Chapters" onPress={() => setActiveSection('discover')} variant="secondary" />
            </View>
          </AppCard>
        )
      ) : null}

      {!isLoading && activeSection === 'discover' ? (
        <ChapterDiscovery
          currentChapter={state.chapter}
          currentMembership={state.membership}
          onMembershipChanged={loadCommunity}
        />
      ) : null}

      {!isLoading && activeSection === 'activity' ? (
        inChapter && state.chapter ? (
          <>
            <PostCard emptyText="No weekly discussion prompt yet." label="Weekly discussion prompt" post={state.prompt} />

            <GlassCard>
              <SectionHeader icon={MessageSquare} title="Weekly response" subtitle="Keep it short, honest, and useful to the group." />
              {state.prompt ? (
                <>
                  <FormTextInput
                    label="Your response"
                    multiline
                    onChangeText={setPromptResponse}
                    placeholder="What are you taking action on this week?"
                    style={styles.multiline}
                    textAlignVertical="top"
                    value={promptResponse}
                  />
                  <View style={styles.cardAction}>
                    <AppPressButton icon={Send} label="Submit response" onPress={submitPromptResponse} />
                  </View>
                </>
              ) : (
                <Text style={[styles.body, { color: theme.textSecondary }]}>
                  A facilitator has not posted this week's prompt yet.
                </Text>
              )}
              <Text style={[styles.participationNote, { color: theme.textMuted }]}>
                {state.promptResponses.length} member responses
              </Text>
            </GlassCard>

            <GlassCard>
              <SectionHeader icon={Trophy} title="Chapter wins" subtitle="Wins are capped at 280 characters." />
              <FormTextInput
                label={`Share a win (${winBody.length}/280)`}
                multiline
                onChangeText={setWinBody}
                placeholder="What went right this week?"
                style={styles.multiline}
                textAlignVertical="top"
                value={winBody}
              />
              <View style={styles.cardAction}>
                <AppPressButton icon={Trophy} label="Post win" onPress={postWin} variant="accent" />
              </View>

              <View style={styles.winList}>
                {state.wins.length === 0 ? (
                  <Text style={[styles.body, { color: theme.textSecondary }]}>No wins posted yet.</Text>
                ) : (
                  state.wins.map((win) => (
                    <WinCard
                      key={win.id}
                      disabled={win.author_id === session?.user.id}
                      respectCount={state.reactions.filter((reaction) => reaction.post_id === win.id).length}
                      win={win}
                      onRespect={() => reactRespect(win)}
                    />
                  ))
                )}
              </View>
            </GlassCard>
          </>
        ) : (
          <AppCard>
            <EmptyState
              body="Join a chapter before posting wins or responding to weekly prompts."
              icon={Compass}
              title="No chapter activity yet"
            />
            <View style={styles.cardAction}>
              <AppPressButton label="Discover Chapters" onPress={() => setActiveSection('discover')} variant="accent" />
            </View>
          </AppCard>
        )
      ) : null}
    </AppScreen>
  );
}

function CommunityTabs({
  activeSection,
  onChange,
}: {
  activeSection: CommunitySection;
  onChange: (section: CommunitySection) => void;
}) {
  return (
    <View style={styles.tabBar}>
      {[
        { label: 'My Chapter', value: 'my' as const },
        { label: 'Discover', value: 'discover' as const },
        { label: 'Activity', value: 'activity' as const },
      ].map((tab) => (
        <CommunityTab
          active={activeSection === tab.value}
          key={tab.value}
          label={tab.label}
          onPress={() => onChange(tab.value)}
        />
      ))}
    </View>
  );
}

function CommunityTab({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.tab,
        {
          backgroundColor: active ? theme.accent : theme.card,
          borderColor: active ? theme.accent : theme.border,
        },
      ]}>
      <Text style={[styles.tabText, { color: active ? theme.accentText : theme.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const theme = useTheme();

  return (
    <View style={[styles.metric, { backgroundColor: 'rgba(255, 252, 247, 0.08)', borderColor: theme.border }]}>
      <Text style={[styles.metricLabel, { color: theme.accent }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: theme.textInverse }]}>{value}</Text>
    </View>
  );
}

function PostCard({ emptyText, label, post }: { emptyText: string; label: string; post: ChapterPost | null }) {
  const theme = useTheme();

  return (
    <GlassCard>
      <SectionHeader icon={label.includes('announcement') ? Megaphone : MessageSquare} title={label} />
      <Text style={[styles.postTitle, { color: theme.textPrimary }]}>{post?.title ?? emptyText}</Text>
      {post?.body ? <Text style={[styles.body, { color: theme.textSecondary }]}>{post.body}</Text> : null}
    </GlassCard>
  );
}

function WinCard({
  disabled,
  onRespect,
  respectCount,
  win,
}: {
  disabled: boolean;
  onRespect: () => void;
  respectCount: number;
  win: ChapterPost;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.winCard, { backgroundColor: theme.cardMuted, borderColor: theme.border }]}>
      <Text style={[styles.winBody, { color: theme.textPrimary }]}>{win.body}</Text>
      <View style={styles.winFooter}>
        <Text style={[styles.respectCount, { color: theme.textMuted }]}>{respectCount} Respect</Text>
        <AppPressButton disabled={disabled} icon={HeartHandshake} label="Respect" onPress={onRespect} variant="secondary" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    justifyContent: 'flex-start',
  },
  tabBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tab: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flex: 1,
    minHeight: 48,
    minWidth: 110,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '700',
  },
  chapterHero: {
    gap: spacing.lg,
  },
  chapterLocation: {
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 24,
  },
  darkEyebrow: {
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  darkTitle: {
    fontSize: 38,
    fontWeight: '900',
    lineHeight: 44,
  },
  body: {
    fontSize: 19,
    lineHeight: 29,
    marginTop: spacing.md,
  },
  form: {
    marginTop: spacing.xl,
  },
  multiline: {
    minHeight: 112,
  },
  cardAction: {
    marginTop: spacing.xl,
  },
  secondaryAction: {
    marginTop: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  avatarRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 3,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '900',
  },
  metric: {
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xs,
    minWidth: 140,
    padding: spacing.md,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '900',
  },
  postTitle: {
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 31,
  },
  milestoneList: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  error: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
  },
  saved: {
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  participationNote: {
    fontSize: 15,
    fontWeight: '900',
    marginTop: spacing.lg,
    textTransform: 'uppercase',
  },
  winList: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  winCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  winBody: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 26,
  },
  winFooter: {
    gap: spacing.md,
  },
  respectCount: {
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
});
