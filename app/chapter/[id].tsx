import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Crown,
  KeyRound,
  MapPin,
  ShieldCheck,
  Users,
} from 'lucide-react-native';
import { ComponentType, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { radius, shadows, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import {
  demoChapterMembers,
  demoDirectoryChapters,
  demoJoinRequests,
  demoMemberProfiles,
} from '@/lib/demoData';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type Chapter = Database['public']['Tables']['chapters']['Row'];
type ChapterMember = Database['public']['Tables']['chapter_members']['Row'];
type ChapterEvent = Database['public']['Tables']['chapter_events']['Row'];
type ChapterJoinRequest = Database['public']['Tables']['chapter_join_requests']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type MembershipState = 'none' | 'pending' | 'approved' | 'rejected';

type ChapterDetailState = {
  chapter: Chapter | null;
  events: ChapterEvent[];
  leader: Profile | null;
  members: ChapterMember[];
  membershipState: MembershipState;
  pendingRequest: ChapterJoinRequest | null;
};

const emptyState: ChapterDetailState = {
  chapter: null,
  events: [],
  leader: null,
  members: [],
  membershipState: 'none',
  pendingRequest: null,
};

export default function ChapterDetailScreen() {
  const theme = useTheme();
  const { isDemoMode, session } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [errorMessage, setErrorMessage] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [savedMessage, setSavedMessage] = useState('');
  const [state, setState] = useState<ChapterDetailState>(emptyState);
  const fade = useRef(new Animated.Value(0)).current;

  const chapterId = Array.isArray(id) ? id[0] : id;
  const { chapter, events, leader, members, membershipState, pendingRequest } = state;

  useEffect(() => {
    Animated.timing(fade, {
      duration: 520,
      toValue: isLoading ? 0 : 1,
      useNativeDriver: true,
    }).start();
  }, [fade, isLoading]);

  const loadChapter = useCallback(async () => {
    setErrorMessage('');
    setSavedMessage('');
    setIsLoading(true);

    if (isDemoMode || !supabase) {
      setState(getDemoChapterState(chapterId, session?.user.id));
      setIsLoading(false);
      return;
    }

    try {
      const chapterResult = await supabase.from('chapters').select('*').eq('id', chapterId).maybeSingle();

      if (chapterResult.error) throw chapterResult.error;

      const nextChapter = chapterResult.data;

      if (!nextChapter) {
        setState(emptyState);
        return;
      }

      const [eventsResult, membersResult, membershipResult, requestResult] = await Promise.all([
        supabase
          .from('chapter_events')
          .select('*')
          .eq('chapter_id', chapterId)
          .gte('event_date', new Date().toISOString())
          .order('event_date', { ascending: true })
          .limit(4),
        supabase.from('chapter_members').select('*').eq('chapter_id', chapterId).eq('status', 'active'),
        session
          ? supabase
              .from('chapter_members')
              .select('*')
              .eq('chapter_id', chapterId)
              .or(`profile_id.eq.${session.user.id},user_id.eq.${session.user.id}`)
              .order('joined_at', { ascending: false })
              .limit(1)
          : null,
        session
          ? supabase
              .from('chapter_join_requests')
              .select('*')
              .eq('chapter_id', chapterId)
              .eq('profile_id', session.user.id)
              .order('created_at', { ascending: false })
              .limit(1)
          : null,
      ]);

      if (eventsResult.error) throw eventsResult.error;

      const activeMembers = membersResult.error ? [] : ((membersResult.data ?? []) as ChapterMember[]);
      const myMembership = membershipResult && !membershipResult.error
        ? ((membershipResult.data?.[0] ?? null) as ChapterMember | null)
        : null;
      const myRequest = requestResult && !requestResult.error
        ? ((requestResult.data?.[0] ?? null) as ChapterJoinRequest | null)
        : null;
      const leaderProfile = await fetchLeaderProfile(nextChapter, activeMembers);

      setState({
        chapter: nextChapter,
        events: eventsResult.data ?? [],
        leader: leaderProfile,
        members: activeMembers,
        membershipState: getMembershipState(myMembership, myRequest),
        pendingRequest: myRequest?.status === 'pending' ? myRequest : null,
      });
    } catch (error) {
      setState(getDemoChapterState(chapterId, session?.user.id));
      setErrorMessage(error instanceof Error ? error.message : 'Could not load chapter.');
    } finally {
      setIsLoading(false);
    }
  }, [chapterId, isDemoMode, session]);

  useEffect(() => {
    loadChapter();
  }, [loadChapter]);

  const joinUi = useMemo(() => getJoinUi(chapter, membershipState, pendingRequest), [chapter, membershipState, pendingRequest]);
  const JoinIcon = joinUi.icon;
  const memberCount = Math.max(chapter?.member_count ?? 0, members.length);

  async function handleJoin() {
    if (!chapter || joinUi.disabled || isJoining) return;

    if (isDemoMode) {
      setIsJoining(true);
      setTimeout(() => {
        setState((current) => ({
          ...current,
          membershipState: chapter.join_policy === 'request' ? 'pending' : 'approved',
          pendingRequest: chapter.join_policy === 'request'
            ? {
                chapter_id: chapter.id,
                created_at: new Date().toISOString(),
                id: `demo-request-${Date.now()}`,
                message: null,
                profile_id: session?.user.id ?? 'demo-user',
                reviewed_at: null,
                reviewed_by: null,
                status: 'pending',
              }
            : null,
        }));
        setSavedMessage(chapter.join_policy === 'request' ? 'Request sent. A leader will review it.' : 'You joined this chapter.');
        setIsJoining(false);
      }, 420);
      return;
    }

    if (!supabase || !session) {
      setErrorMessage('Sign in to join or request access to a chapter.');
      return;
    }

    setErrorMessage('');
    setSavedMessage('');
    setIsJoining(true);

    try {
      if (chapter.join_policy === 'open') {
        const { error } = await supabase.rpc('join_public_chapter', {
          target_chapter_id: chapter.id,
        });

        if (error) throw error;
        setSavedMessage('You joined this chapter.');
      } else if (chapter.join_policy === 'request') {
        const { error } = await supabase.rpc('request_chapter_join', {
          request_message: null,
          target_chapter_id: chapter.id,
        });

        if (error) throw error;
        setSavedMessage('Request sent. A leader will review it.');
      }

      await loadChapter();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not complete chapter action.');
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={theme.name === 'dark' ? ['#060504', '#15110D', '#070605'] : ['#F6F1E8', '#EFE3D2', '#F6F1E8']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: theme.glass, borderColor: theme.border }]}>
          <ArrowLeft color={theme.textPrimary} size={22} strokeWidth={2.8} />
        </Pressable>
        <Text style={[styles.topTitle, { color: theme.textPrimary }]}>Chapter Detail</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading chapter signal...</Text>
        </View>
      ) : chapter ? (
        <Animated.View style={[styles.animated, { opacity: fade }]}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={[styles.banner, { backgroundColor: theme.cardInverted, borderColor: theme.accentBorder }, shadows.glow]}>
              <LinearGradient colors={['rgba(209,162,79,0.42)', 'rgba(0,0,0,0.12)', 'rgba(0,0,0,0.72)']} style={StyleSheet.absoluteFill} />
              <View style={styles.bannerTop}>
                <View style={[styles.bannerIcon, { backgroundColor: theme.overlay, borderColor: theme.accentBorder }]}>
                  <MapPin color={theme.accent} size={28} strokeWidth={2.8} />
                </View>
                {chapter.is_verified ? (
                  <View style={[styles.verifiedPill, { backgroundColor: theme.overlay, borderColor: theme.accentBorder }]}>
                    <ShieldCheck color={theme.accent} size={15} strokeWidth={2.8} />
                    <Text style={[styles.verifiedText, { color: theme.textInverse }]}>Verified</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.bannerCopy}>
                <Text style={[styles.eyebrow, { color: theme.accent }]}>Global chapter</Text>
                <Text style={[styles.title, { color: theme.textInverse }]}>{chapter.name}</Text>
                <Text style={[styles.location, { color: theme.textInverseMuted }]}>
                  {[chapter.city, chapter.state].filter(Boolean).join(', ') || chapter.region || chapter.country || 'Location pending'}
                </Text>
              </View>
            </View>

            {errorMessage ? <Notice tone="warning" text="Live Supabase detail was unavailable, so demo detail is showing." /> : null}
            {savedMessage ? <Notice tone="success" text={savedMessage} /> : null}

            <View style={styles.statsGrid}>
              <Stat icon={Users} label="Members" value={`${memberCount}`} />
              <Stat icon={CalendarDays} label="Meets" value={chapter.meeting_day ?? 'TBD'} />
              <Stat icon={ShieldCheck} label="Policy" value={getPolicyLabel(chapter.join_policy)} />
            </View>

            <View style={[styles.card, { backgroundColor: theme.glass, borderColor: theme.border }, shadows.card]}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>About</Text>
              <Text style={[styles.body, { color: theme.textSecondary }]}>
                {chapter.description ?? 'A local chapter for discipline, accountability, and brotherhood.'}
              </Text>
            </View>

            <View style={[styles.card, { backgroundColor: theme.glass, borderColor: theme.border }, shadows.card]}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Chapter leader</Text>
              <View style={styles.leaderRow}>
                <View style={[styles.avatar, { backgroundColor: theme.cardInverted, borderColor: theme.accentBorder }]}>
                  <Crown color={theme.accent} size={22} strokeWidth={2.8} />
                </View>
                <View style={styles.leaderCopy}>
                  <Text style={[styles.leaderName, { color: theme.textPrimary }]}>
                    {leader?.full_name ?? leader?.username ?? 'Leader pending'}
                  </Text>
                  <Text style={[styles.leaderMeta, { color: theme.textSecondary }]}>
                    {leader ? `@${leader.username ?? 'chapter_leader'}` : 'This chapter has not published a leader profile yet.'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: theme.glass, borderColor: theme.border }, shadows.card]}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Upcoming events</Text>
              {events.length > 0 ? (
                <View style={styles.eventList}>
                  {events.map((event) => (
                    <EventCard event={event} key={event.id} />
                  ))}
                </View>
              ) : (
                <Text style={[styles.body, { color: theme.textSecondary }]}>
                  No public events are scheduled yet. Leaders can add upcoming chapter meetups from the facilitator area.
                </Text>
              )}
            </View>

            <View style={[styles.joinCard, { backgroundColor: theme.cardInverted, borderColor: theme.accentBorder }, shadows.glow]}>
              <View style={styles.joinHeader}>
                <View style={[styles.joinIcon, { backgroundColor: theme.overlay, borderColor: theme.accentBorder }]}>
                  <JoinIcon color={theme.accent} size={23} strokeWidth={2.8} />
                </View>
                <View style={styles.joinCopy}>
                  <Text style={[styles.joinTitle, { color: theme.textInverse }]}>{joinUi.title}</Text>
                  <Text style={[styles.joinBody, { color: theme.textInverseMuted }]}>{joinUi.body}</Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={joinUi.disabled || isJoining}
                onPress={handleJoin}
                style={[
                  styles.joinButton,
                  {
                    backgroundColor: joinUi.disabled ? theme.overlay : theme.accent,
                    borderColor: joinUi.disabled ? theme.borderStrong : theme.accent,
                    opacity: isJoining ? 0.72 : 1,
                  },
                ]}>
                {isJoining ? <ActivityIndicator color={theme.accentText} /> : null}
                <Text style={[styles.joinButtonText, { color: joinUi.disabled ? theme.textInverseMuted : theme.accentText }]}>
                  {isJoining ? 'Working...' : joinUi.label}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
          <View style={[styles.floatingJoin, { backgroundColor: theme.glass, borderColor: theme.border }, shadows.lift]}>
            <View style={styles.floatingCopy}>
              <Text style={[styles.floatingLabel, { color: theme.accent }]}>{joinUi.title}</Text>
              <Text style={[styles.floatingMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                {membershipState === 'approved'
                  ? 'Approved member'
                  : membershipState === 'pending'
                    ? 'Awaiting leader review'
                    : getPolicyLabel(chapter.join_policy)}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={joinUi.disabled || isJoining}
              onPress={handleJoin}
              style={[
                styles.floatingButton,
                {
                  backgroundColor: joinUi.disabled ? theme.cardMuted : theme.accent,
                  borderColor: joinUi.disabled ? theme.borderStrong : theme.accent,
                  opacity: isJoining ? 0.72 : 1,
                },
              ]}>
              <Text style={[styles.floatingButtonText, { color: joinUi.disabled ? theme.textSecondary : theme.accentText }]}>
                {isJoining ? 'Working...' : joinUi.label}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : (
        <View style={styles.content}>
          <View style={[styles.card, { backgroundColor: theme.glass, borderColor: theme.border }, shadows.card]}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Chapter not found</Text>
            <Text style={[styles.body, { color: theme.textSecondary }]}>This chapter is not available in the public directory.</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

async function fetchLeaderProfile(chapter: Chapter, members: ChapterMember[]) {
  if (!supabase) return null;

  const leaderId =
    chapter.facilitator_id ??
    members.find((member) => member.role === 'chapter_leader' || member.role === 'facilitator')?.profile_id ??
    null;

  if (!leaderId) return null;

  const { data, error } = await supabase.from('profiles').select('*').eq('id', leaderId).maybeSingle();
  return error ? null : data;
}

function getDemoChapterState(chapterId: string, userId?: string): ChapterDetailState {
  const directoryChapter = demoDirectoryChapters.find((item) => item.id === chapterId) ?? demoDirectoryChapters[0] ?? null;

  if (!directoryChapter) return emptyState;

  const chapter: Chapter = {
    city: directoryChapter.region?.split(',')[0] ?? null,
    country: directoryChapter.country,
    created_at: new Date().toISOString(),
    created_by: demoMemberProfiles[0]?.id ?? null,
    description: directoryChapter.description,
    facilitator_id: demoMemberProfiles[0]?.id ?? null,
    id: directoryChapter.id,
    invite_code: 'DEMO',
    is_public: directoryChapter.is_public,
    is_verified: true,
    join_policy: directoryChapter.join_policy,
    latitude: directoryChapter.latitude,
    longitude: directoryChapter.longitude,
    member_count: directoryChapter.member_count,
    meeting_day: directoryChapter.meeting_day,
    meeting_location: directoryChapter.meeting_location,
    name: directoryChapter.name,
    public_join_enabled: directoryChapter.public_join_enabled,
    region: directoryChapter.region,
    slug: directoryChapter.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    state: directoryChapter.region?.split(',')[1]?.trim() ?? null,
  };
  const members = demoChapterMembers.filter((member) => member.chapter_id === chapter.id);
  const pendingRequest = demoJoinRequests.find((request) => request.chapter_id === chapter.id && request.profile_id === userId) ?? null;
  const currentMember = members.find((member) => member.profile_id === userId || member.user_id === userId) ?? null;

  return {
    chapter,
    events: [
      {
        chapter_id: chapter.id,
        created_at: new Date().toISOString(),
        created_by: chapter.facilitator_id,
        description: 'Weekly accountability, curriculum check-in, and next action commitments.',
        event_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4).toISOString(),
        id: `${chapter.id}-event-1`,
        location: chapter.meeting_location ?? 'Leader confirmed location',
        title: 'Weekly Chapter Circle',
      },
      {
        chapter_id: chapter.id,
        created_at: new Date().toISOString(),
        created_by: chapter.facilitator_id,
        description: 'A focused reset for members who want to tighten their habits before the next week.',
        event_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 11).toISOString(),
        id: `${chapter.id}-event-2`,
        location: chapter.meeting_location ?? 'Local meetup point',
        title: 'Standards Reset',
      },
    ],
    leader: demoMemberProfiles[0] ?? null,
    members,
    membershipState: getMembershipState(currentMember, pendingRequest),
    pendingRequest,
  };
}

function getMembershipState(member: ChapterMember | null, request: ChapterJoinRequest | null): MembershipState {
  if (member?.status === 'active') return 'approved';
  if (member?.status === 'pending' || request?.status === 'pending') return 'pending';
  if (member?.status === 'rejected' || request?.status === 'rejected') return 'rejected';
  return 'none';
}

function getJoinUi(chapter: Chapter | null, membershipState: MembershipState, pendingRequest: ChapterJoinRequest | null) {
  if (!chapter) {
    return {
      body: '',
      disabled: true,
      icon: ShieldCheck,
      label: 'Unavailable',
      title: 'Membership unavailable',
    };
  }

  if (membershipState === 'approved') {
    return {
      body: 'You are approved for this chapter. Show up, keep your word, and help set the tone.',
      disabled: true,
      icon: CheckCircle2,
      label: 'Approved Member',
      title: 'You are in',
    };
  }

  if (membershipState === 'pending' || pendingRequest) {
    return {
      body: 'Your request is waiting on chapter leader approval.',
      disabled: true,
      icon: Clock3,
      label: 'Pending Approval',
      title: 'Request pending',
    };
  }

  if (chapter.join_policy === 'invite_code') {
    return {
      body: 'This chapter requires an invite code from a leader.',
      disabled: true,
      icon: KeyRound,
      label: 'Invite Code Required',
      title: 'Invite-only chapter',
    };
  }

  if (chapter.join_policy === 'request') {
    return {
      body: 'Send a request and a leader can approve your membership.',
      disabled: false,
      icon: ShieldCheck,
      label: 'Request to Join',
      title: 'Request access',
    };
  }

  return {
    body: 'Open chapters can be joined immediately.',
    disabled: false,
    icon: Users,
    label: 'Join Chapter',
    title: 'Join the circle',
  };
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  label: string;
  value: string;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.stat, { backgroundColor: theme.glass, borderColor: theme.border }, shadows.card]}>
      <Icon color={theme.accent} size={20} strokeWidth={2.7} />
      <Text style={[styles.statLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: theme.textPrimary }]}>{value}</Text>
    </View>
  );
}

function EventCard({ event }: { event: ChapterEvent }) {
  const theme = useTheme();
  const eventDate = new Date(event.event_date);

  return (
    <View style={[styles.eventCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.eventDate, { backgroundColor: theme.cardInverted, borderColor: theme.accentBorder }]}>
        <Text style={[styles.eventMonth, { color: theme.accent }]}>
          {eventDate.toLocaleString(undefined, { month: 'short' })}
        </Text>
        <Text style={[styles.eventDay, { color: theme.textInverse }]}>{eventDate.getDate()}</Text>
      </View>
      <View style={styles.eventCopy}>
        <Text style={[styles.eventTitle, { color: theme.textPrimary }]}>{event.title}</Text>
        <Text style={[styles.eventMeta, { color: theme.textSecondary }]}>
          {[event.location, eventDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })].filter(Boolean).join(' · ')}
        </Text>
        {event.description ? (
          <Text style={[styles.eventBody, { color: theme.textSecondary }]} numberOfLines={2}>
            {event.description}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function Notice({ text, tone }: { text: string; tone: 'success' | 'warning' }) {
  const theme = useTheme();
  const backgroundColor = tone === 'success' ? theme.successSurface : theme.accentSurface;
  const borderColor = tone === 'success' ? theme.successBorder : theme.accentBorder;
  const color = tone === 'success' ? theme.success : theme.accentText;

  return (
    <View style={[styles.notice, { backgroundColor, borderColor }]}>
      <Text style={[styles.noticeText, { color }]}>{text}</Text>
    </View>
  );
}

function getPolicyLabel(joinPolicy: Chapter['join_policy']) {
  if (joinPolicy === 'invite_code') return 'Invite';
  if (joinPolicy === 'request') return 'Request';
  return 'Open';
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  animated: {
    flex: 1,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  backButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  topTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  loadingWrap: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '900',
  },
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: 150,
  },
  banner: {
    borderRadius: radius.xl,
    borderWidth: 1,
    justifyContent: 'space-between',
    minHeight: 310,
    overflow: 'hidden',
    padding: spacing.lg,
  },
  bannerTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bannerIcon: {
    alignItems: 'center',
    borderRadius: radius.xl,
    borderWidth: 1,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  verifiedPill: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  bannerCopy: {
    gap: spacing.xs,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 40,
    fontWeight: '900',
    lineHeight: 46,
  },
  location: {
    fontSize: 17,
    fontWeight: '800',
  },
  notice: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  noticeText: {
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  stat: {
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    minWidth: 104,
    padding: spacing.md,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 17,
    fontWeight: '900',
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: 23,
    fontWeight: '900',
  },
  body: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 23,
  },
  leaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  leaderCopy: {
    flex: 1,
    gap: 3,
  },
  leaderName: {
    fontSize: 18,
    fontWeight: '900',
  },
  leaderMeta: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  eventList: {
    gap: spacing.sm,
  },
  eventCard: {
    alignItems: 'flex-start',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  eventDate: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    minWidth: 54,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  eventMonth: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  eventDay: {
    fontSize: 23,
    fontWeight: '900',
    lineHeight: 27,
  },
  eventCopy: {
    flex: 1,
    gap: 3,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  eventMeta: {
    fontSize: 13,
    fontWeight: '800',
  },
  eventBody: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  joinCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.lg,
    overflow: 'hidden',
    padding: spacing.lg,
  },
  joinHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  joinIcon: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  joinCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  joinTitle: {
    fontSize: 23,
    fontWeight: '900',
  },
  joinBody: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  joinButton: {
    alignItems: 'center',
    borderRadius: radius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 60,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '900',
  },
  floatingJoin: {
    alignItems: 'center',
    borderRadius: radius.xl,
    borderWidth: 1,
    bottom: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
    left: spacing.lg,
    padding: spacing.md,
    position: 'absolute',
    right: spacing.lg,
  },
  floatingCopy: {
    flex: 1,
    gap: 2,
  },
  floatingLabel: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  floatingMeta: {
    fontSize: 14,
    fontWeight: '800',
  },
  floatingButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 142,
    paddingHorizontal: spacing.md,
  },
  floatingButtonText: {
    fontSize: 14,
    fontWeight: '900',
  },
});
