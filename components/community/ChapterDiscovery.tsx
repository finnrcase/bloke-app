import { Globe2, List, LocateFixed, Map, Shield, SlidersHorizontal } from 'lucide-react-native';
import { ComponentType } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { AppPressButton } from '@/components/AppPressButton';
import { ChapterListFallback } from '@/components/community/ChapterListFallback';
import { ChapterMap } from '@/components/community/ChapterMap';
import { ChapterPreviewCard } from '@/components/community/ChapterPreviewCard';
import { ChapterJoinAction, JoinChapterModal } from '@/components/community/JoinChapterModal';
import { FormTextInput } from '@/components/FormTextInput';
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { demoChapter, demoChapterMembers, demoDirectoryChapters, demoJoinRequests } from '@/lib/demoData';
import { supabase } from '@/lib/supabase';
import { DirectoryChapter } from '@/types/chapters';
import { Database } from '@/types/database';

type Chapter = Database['public']['Tables']['chapters']['Row'];
type ChapterMember = Database['public']['Tables']['chapter_members']['Row'];
type ChapterJoinRequest = Database['public']['Tables']['chapter_join_requests']['Row'];

type DiscoveryFilter = 'all' | 'open' | 'invite_code' | 'request' | 'near_me';
type DiscoveryView = 'map' | 'list';

type ChapterDiscoveryProps = {
  currentChapter?: Chapter | null;
  currentMembership?: ChapterMember | null;
  onMembershipChanged?: () => Promise<void> | void;
};

const filters: { disabled?: boolean; label: string; value: DiscoveryFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'Invite', value: 'invite_code' },
  { label: 'Request', value: 'request' },
  { disabled: true, label: 'Near Me', value: 'near_me' },
];

const privateInviteChapter: DirectoryChapter = {
  country: null,
  description: 'Private chapter invite.',
  id: 'private-invite',
  is_public: false,
  join_policy: 'invite_code',
  latitude: null,
  longitude: null,
  meeting_day: null,
  meeting_location: null,
  member_count: 0,
  name: 'Private chapter',
  public_join_enabled: false,
  region: null,
};

function matchesSearch(chapter: DirectoryChapter, query: string) {
  if (!query) return true;

  const normalizedQuery = query.toLowerCase();

  return [chapter.name, chapter.country, chapter.region]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(normalizedQuery));
}

function matchesFilter(chapter: DirectoryChapter, filter: DiscoveryFilter) {
  if (filter === 'all') return true;
  if (filter === 'open') return chapter.join_policy === 'open' || chapter.public_join_enabled;
  if (filter === 'near_me') return true;

  return chapter.join_policy === filter;
}

export function ChapterDiscovery({
  currentChapter,
  currentMembership,
  onMembershipChanged,
}: ChapterDiscoveryProps) {
  const { isDemoMode, session } = useAuth();
  const theme = useTheme();
  const [chapters, setChapters] = useState<DirectoryChapter[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [filter, setFilter] = useState<DiscoveryFilter>('all');
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [joinAction, setJoinAction] = useState<ChapterJoinAction | null>(null);
  const [localChapter, setLocalChapter] = useState<Chapter | null>(null);
  const [localMembership, setLocalMembership] = useState<ChapterMember | null>(null);
  const [modalError, setModalError] = useState('');
  const [pendingRequests, setPendingRequests] = useState<ChapterJoinRequest[]>([]);
  const [requestMessage, setRequestMessage] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChapter, setSelectedChapter] = useState<DirectoryChapter | null>(null);
  const [viewMode, setViewMode] = useState<DiscoveryView>('map');

  const activeMembership = currentMembership ?? localMembership;
  const activeChapter = currentChapter ?? localChapter;
  const currentChapterId = activeMembership?.chapter_id ?? activeChapter?.id ?? null;
  const pendingChapterIds = useMemo(
    () => new Set(pendingRequests.filter((request) => request.status === 'pending').map((request) => request.chapter_id)),
    [pendingRequests],
  );

  const visibleChapters = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return chapters.filter((chapter) => matchesSearch(chapter, query) && matchesFilter(chapter, filter));
  }, [chapters, filter, searchQuery]);

  const loadDiscovery = useCallback(async () => {
    if (isDemoMode) {
      const query = searchQuery.trim().toLowerCase();
      setChapters(demoDirectoryChapters.filter((chapter) => matchesSearch(chapter, query)));
      setPendingRequests(
        demoJoinRequests.filter((request) => request.profile_id === session?.user.id && request.status === 'pending'),
      );

      if (currentMembership === undefined) {
        setLocalMembership(demoChapterMembers.find((member) => member.profile_id === session?.user.id) ?? null);
        setLocalChapter(demoChapter);
      }

      setErrorMessage('');
      setIsLoading(false);
      return;
    }

    if (!supabase || !session) {
      setErrorMessage('Supabase is not configured. Add your Expo public Supabase env vars.');
      setIsLoading(false);
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      const [directoryResult, requestsResult] = await Promise.all([
        supabase.rpc('get_public_chapter_directory', {
          search_text: searchQuery.trim() || null,
        }),
        supabase
          .from('chapter_join_requests')
          .select('*')
          .eq('profile_id', session.user.id)
          .eq('status', 'pending'),
      ]);

      if (directoryResult.error) throw directoryResult.error;
      if (requestsResult.error) throw requestsResult.error;

      setChapters(directoryResult.data ?? []);
      setPendingRequests((requestsResult.data ?? []) as ChapterJoinRequest[]);

      if (currentMembership === undefined) {
        const membershipResult = await supabase
          .from('chapter_members')
          .select('*')
          .eq('profile_id', session.user.id)
          .order('joined_at', { ascending: false })
          .limit(1);

        if (membershipResult.error) throw membershipResult.error;

        const nextMembership = (membershipResult.data?.[0] ?? null) as ChapterMember | null;
        setLocalMembership(nextMembership);

        if (nextMembership?.chapter_id) {
          const chapterResult = await supabase
            .from('chapters')
            .select('*')
            .eq('id', nextMembership.chapter_id)
            .single();

          if (chapterResult.error) throw chapterResult.error;
          setLocalChapter(chapterResult.data);
        } else {
          setLocalChapter(null);
        }
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load chapter discovery.');
    } finally {
      setIsLoading(false);
    }
  }, [currentMembership, isDemoMode, searchQuery, session]);

  useEffect(() => {
    loadDiscovery();
  }, [loadDiscovery]);

  useEffect(() => {
    if (selectedChapter && !visibleChapters.some((chapter) => chapter.id === selectedChapter.id)) {
      setSelectedChapter(null);
    }
  }, [selectedChapter, visibleChapters]);

  function openJoinAction(action: ChapterJoinAction) {
    setJoinAction(action);
    setInviteCode(action.type === 'invite' ? action.inviteCode ?? '' : '');
    setRequestMessage(action.type === 'request' ? action.message ?? '' : '');
    setModalError('');
  }

  function closeJoinAction() {
    setJoinAction(null);
    setInviteCode('');
    setRequestMessage('');
    setModalError('');
  }

  function isAlreadyInDifferentChapter(action: ChapterJoinAction | null) {
    return Boolean(action && currentChapterId && currentChapterId !== action.chapter.id);
  }

  async function afterMembershipChange(message: string) {
    setSavedMessage(message);
    await loadDiscovery();
    await onMembershipChanged?.();
  }

  async function confirmJoinAction() {
    if (!joinAction || !session) return;

    setModalError('');
    setErrorMessage('');
    setSavedMessage('');

    if (joinAction.type === 'invite' && !inviteCode.trim()) {
      setModalError('Enter an invite code.');
      return;
    }

    setIsJoining(true);

    try {
      if (isDemoMode) {
        if (joinAction.type === 'request') {
          setPendingRequests((current) => [
            {
              chapter_id: joinAction.chapter.id,
              created_at: new Date().toISOString(),
              id: `demo-request-${Date.now()}`,
              message: requestMessage.trim() || null,
              profile_id: session.user.id,
              reviewed_at: null,
              reviewed_by: null,
              status: 'pending',
            },
            ...current,
          ]);
          closeJoinAction();
          setSelectedChapter(joinAction.chapter);
          setSavedMessage(`Request sent to ${joinAction.chapter.name} in demo mode.`);
          return;
        }

        setLocalMembership({
          chapter_id: joinAction.chapter.id,
          id: `demo-membership-${Date.now()}`,
          joined_at: new Date().toISOString(),
          profile_id: session.user.id,
          role: 'chapter_member',
          status: 'active',
          user_id: session.user.id,
        });
        setLocalChapter({
          city: joinAction.chapter.region,
          country: joinAction.chapter.country,
          created_at: new Date().toISOString(),
          created_by: null,
          description: joinAction.chapter.description,
          facilitator_id: null,
          id: joinAction.chapter.id,
          invite_code: inviteCode.trim() || 'BLOKE-DEMO',
          is_public: joinAction.chapter.is_public,
          is_verified: false,
          join_policy: joinAction.chapter.join_policy,
          latitude: joinAction.chapter.latitude,
          longitude: joinAction.chapter.longitude,
          member_count: joinAction.chapter.member_count,
          meeting_day: joinAction.chapter.meeting_day,
          meeting_location: joinAction.chapter.meeting_location,
          name: joinAction.chapter.name,
          public_join_enabled: joinAction.chapter.public_join_enabled,
          region: joinAction.chapter.region,
          slug: joinAction.chapter.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
          state: null,
        });
        closeJoinAction();
        setSelectedChapter(joinAction.chapter);
        setSavedMessage(`Joined ${joinAction.chapter.name} in demo mode.`);
        await onMembershipChanged?.();
        return;
      }

      if (!supabase) {
        throw new Error('Supabase is not configured. Add your Expo public Supabase env vars.');
      }

      if (joinAction.type === 'open') {
        const { error } = await supabase.rpc('join_public_chapter', {
          target_chapter_id: joinAction.chapter.id,
        });

        if (error) throw error;
        closeJoinAction();
        setSelectedChapter(joinAction.chapter);
        await afterMembershipChange(`Joined ${joinAction.chapter.name}.`);
        return;
      }

      if (joinAction.type === 'invite') {
        const { error } = await supabase.rpc('redeem_invite_code', {
          target_invite_code: inviteCode.trim(),
        });

        if (error) throw error;
        closeJoinAction();
        setSelectedChapter(joinAction.chapter);
        await loadDiscovery();
        setSavedMessage('Invite redeemed. Your request is pending approval.');
        return;
      }

      const { error } = await supabase.rpc('request_chapter_join', {
        request_message: requestMessage.trim() || null,
        target_chapter_id: joinAction.chapter.id,
      });

      if (error) throw error;

      closeJoinAction();
      setSelectedChapter(joinAction.chapter);
      await loadDiscovery();
      setSavedMessage(`Request sent to ${joinAction.chapter.name}.`);
    } catch (error) {
      setModalError(error instanceof Error ? error.message : 'Could not complete chapter action.');
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <View style={styles.container}>
      <GlassCard>
        <View style={styles.discoveryHeader}>
          <View style={styles.discoveryTitle}>
            <Text style={[styles.discoveryEyebrow, { color: theme.accent }]}>Chapter discovery</Text>
            <Text style={[styles.discoveryHeadline, { color: theme.textPrimary }]}>Find your next local circle.</Text>
            <Text style={[styles.discoverySubtitle, { color: theme.textSecondary }]}>
              Public chapters, invite-only crews, and request-based communities in one place.
            </Text>
          </View>
          <View style={[styles.discoveryStat, { backgroundColor: theme.cardMuted, borderColor: theme.border }]}>
            <Globe2 color={theme.accent} size={18} strokeWidth={2.6} />
            <Text style={[styles.discoveryStatNumber, { color: theme.textPrimary }]}>{visibleChapters.length}</Text>
            <Text style={[styles.discoveryStatLabel, { color: theme.textMuted }]}>matching</Text>
          </View>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchField}>
            <FormTextInput
              autoCapitalize="words"
              label="Search chapters"
              onChangeText={setSearchQuery}
              placeholder="Country, city, or chapter name"
              value={searchQuery}
            />
          </View>
          <View style={styles.viewToggle}>
            <ToggleButton active={viewMode === 'map'} icon={Map} label="Map" onPress={() => setViewMode('map')} />
            <ToggleButton active={viewMode === 'list'} icon={List} label="List" onPress={() => setViewMode('list')} />
          </View>
        </View>

        <View style={styles.filters}>
          {filters.map((item) => (
            <FilterChip
              active={filter === item.value}
              disabled={item.disabled}
              key={item.value}
              label={item.label}
              onPress={() => {
                if (!item.disabled) setFilter(item.value);
              }}
            />
          ))}
        </View>
        <Text style={[styles.nearMeNote, { color: theme.textMuted }]}>
          Near Me is reserved for a future region-based flow. No live location tracking is requested.
        </Text>
      </GlassCard>

      {activeChapter ? (
        <AppCard tone="accent">
          <Text style={[styles.currentEyebrow, { color: theme.warning }]}>Current chapter</Text>
          <Text style={[styles.currentTitle, { color: theme.textPrimary }]}>{activeChapter.name}</Text>
          <Text style={[styles.currentMeta, { color: theme.textSecondary }]}>
            {[activeChapter.region, activeChapter.country].filter(Boolean).join(', ') || 'Location pending'}
          </Text>
        </AppCard>
      ) : null}

      {isLoading ? (
        <DiscoverySkeleton />
      ) : null}

      {errorMessage ? (
        <AppCard>
          <Text style={[styles.error, { color: theme.error }]}>{errorMessage}</Text>
          <View style={styles.cardAction}>
            <AppPressButton label="Try again" onPress={loadDiscovery} variant="secondary" />
          </View>
        </AppCard>
      ) : null}

      {savedMessage ? <Text style={[styles.saved, { color: theme.success }]}>{savedMessage}</Text> : null}

      {!isLoading ? (
        <>
          <View style={styles.sectionHeading}>
            <Text style={[styles.sectionEyebrow, { color: theme.accent }]}>
              {filter === 'near_me' ? 'Near you' : 'Global chapters'}
            </Text>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              {viewMode === 'map' ? 'Map-style discovery' : 'Directory view'}
            </Text>
          </View>

          {viewMode === 'map' ? (
            <>
              <ChapterMap
                chapters={visibleChapters}
                currentChapterId={currentChapterId}
                onSelectChapter={setSelectedChapter}
                selectedChapterId={selectedChapter?.id}
              />
            </>
          ) : null}

          {selectedChapter ? (
            <ChapterPreviewCard
              chapter={selectedChapter}
              isCurrentChapter={selectedChapter.id === currentChapterId}
              isPending={pendingChapterIds.has(selectedChapter.id)}
              onJoinInvite={() => openJoinAction({ chapter: selectedChapter, type: 'invite' })}
              onJoinOpen={() => openJoinAction({ chapter: selectedChapter, type: 'open' })}
              onRequestJoin={() => openJoinAction({ chapter: selectedChapter, type: 'request' })}
            />
          ) : null}

          <GlassCard muted={viewMode === 'map'}>
            <SectionHeader
              icon={SlidersHorizontal}
              title={viewMode === 'map' ? 'Fallback directory' : 'Global chapters'}
              subtitle={viewMode === 'map' ? 'Always available if map coordinates are missing.' : 'Searchable cards with join options.'}
            />
            <ChapterListFallback
              chapters={visibleChapters}
              currentChapterId={currentChapterId}
              onJoinInvite={(chapter) => openJoinAction({ chapter, type: 'invite' })}
              onJoinOpen={(chapter) => openJoinAction({ chapter, type: 'open' })}
              onRequestJoin={(chapter) => openJoinAction({ chapter, type: 'request' })}
              onViewChapter={setSelectedChapter}
              pendingChapterIds={pendingChapterIds}
            />
          </GlassCard>

          <GlassCard>
            <SectionHeader icon={Shield} title="Have a private invite?" subtitle="Private chapters are not shown on the map." />
            <AppPressButton
              label="Join with Invite Code"
              onPress={() => openJoinAction({ chapter: privateInviteChapter, type: 'invite' })}
              variant="secondary"
            />
          </GlassCard>
        </>
      ) : null}

      <JoinChapterModal
        action={joinAction}
        alreadyInDifferentChapter={isAlreadyInDifferentChapter(joinAction)}
        errorMessage={modalError}
        inviteCode={inviteCode}
        isSaving={isJoining}
        message={requestMessage}
        onCancel={closeJoinAction}
        onChangeInviteCode={setInviteCode}
        onChangeMessage={setRequestMessage}
        onConfirm={confirmJoinAction}
      />
    </View>
  );
}

function FilterChip({
  active,
  disabled,
  label,
  onPress,
}: {
  active: boolean;
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityLabel={`Filter ${label}`}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.filterChip,
        {
          backgroundColor: active ? theme.accent : disabled ? theme.glassMuted : theme.cardMuted,
          borderColor: active ? theme.accent : theme.border,
          opacity: disabled ? 0.58 : 1,
        },
      ]}>
      <Text style={[styles.filterText, { color: active ? theme.accentText : theme.textPrimary }]}>{label}</Text>
      {disabled ? <LocateFixed color={theme.textMuted} size={14} strokeWidth={2.6} /> : null}
    </Pressable>
  );
}

function ToggleButton({
  active,
  icon: Icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityLabel={`Show ${label}`}
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.toggleButton,
        {
          backgroundColor: active ? theme.cardInverted : 'transparent',
          borderColor: active ? theme.cardInverted : theme.border,
        },
      ]}>
      <Icon color={active ? theme.textInverse : theme.textPrimary} size={17} strokeWidth={2.6} />
      <Text style={[styles.toggleText, { color: active ? theme.textInverse : theme.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

function DiscoverySkeleton() {
  const theme = useTheme();

  return (
    <GlassCard>
      <View style={styles.loadingRow}>
        <ActivityIndicator color={theme.accent} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading public chapters...</Text>
      </View>
      <View style={[styles.skeletonMap, { backgroundColor: theme.cardMuted, borderColor: theme.border }]}>
        <SkeletonLine width="44%" />
        <SkeletonLine width="68%" />
        <View style={styles.skeletonMarkerRow}>
          <SkeletonDot />
          <SkeletonDot />
          <SkeletonDot />
        </View>
      </View>
      <View style={styles.skeletonCards}>
        <SkeletonCard />
        <SkeletonCard />
      </View>
    </GlassCard>
  );
}

function SkeletonCard() {
  const theme = useTheme();

  return (
    <View style={[styles.skeletonCard, { backgroundColor: theme.cardMuted, borderColor: theme.border }]}>
      <SkeletonLine width="56%" />
      <SkeletonLine width="36%" />
      <SkeletonLine width="78%" />
    </View>
  );
}

function SkeletonLine({ width }: { width: `${number}%` }) {
  const theme = useTheme();

  return <View style={[styles.skeletonLine, { backgroundColor: theme.progressTrack, width }]} />;
}

function SkeletonDot() {
  const theme = useTheme();

  return <View style={[styles.skeletonDot, { backgroundColor: theme.accentSurface, borderColor: theme.accentBorder }]} />;
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  discoveryHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  discoveryTitle: {
    flex: 1,
    gap: spacing.xs,
  },
  discoveryEyebrow: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  discoveryHeadline: {
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 38,
  },
  discoverySubtitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
  },
  discoveryStat: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    minWidth: 84,
    padding: spacing.md,
  },
  discoveryStatNumber: {
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 30,
  },
  discoveryStatLabel: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  searchRow: {
    gap: spacing.md,
  },
  searchField: {
    flex: 1,
  },
  viewToggle: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  toggleButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  nearMeNote: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  sectionHeading: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  sectionEyebrow: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
  },
  currentEyebrow: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  currentTitle: {
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
  },
  currentMeta: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '800',
  },
  skeletonMap: {
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.md,
    minHeight: 210,
    overflow: 'hidden',
    padding: spacing.lg,
  },
  skeletonCards: {
    gap: spacing.md,
  },
  skeletonCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  skeletonLine: {
    borderRadius: radius.pill,
    height: 14,
  },
  skeletonMarkerRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.lg,
  },
  skeletonDot: {
    borderRadius: radius.pill,
    borderWidth: 2,
    height: 42,
    width: 42,
  },
  error: {
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 25,
  },
  cardAction: {
    marginTop: spacing.lg,
  },
  saved: {
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
});
