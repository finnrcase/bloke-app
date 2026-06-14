import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ChevronRight, Compass, Globe2, KeyRound, List, Map, MapPin, MessageCircle, Search, ShieldCheck, Users } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PremiumChapterMap } from '@/components/community/PremiumChapterMap';
import { radius, shadows, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { getChapterCoordinateDiagnostics, logChapterCoordinateDiagnostics } from '@/lib/chapterCoordinates';
import { demoDirectoryChapters } from '@/lib/demoData';
import { canAccessAdmin } from '@/lib/permissions';
import { supabase } from '@/lib/supabase';
import { redeemInviteCodeAction } from '@/lib/supabase/protectedActions';
import { DirectoryChapter } from '@/types/chapters';

type JoinFilter = 'all' | 'open' | 'invite_code' | 'request' | 'near';
type ViewMode = 'map' | 'list';

const filters: { label: string; value: JoinFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'Invite', value: 'invite_code' },
  { label: 'Request', value: 'request' },
  { label: 'Near Me', value: 'near' },
];

export default function CommunityScreen() {
  const theme = useTheme();
  const { isDemoMode, profile } = useAuth();
  const [chapters, setChapters] = useState<DirectoryChapter[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRedeemOpen, setIsRedeemOpen] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [query, setQuery] = useState('');
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemMessage, setRedeemMessage] = useState('');
  const [selectedChapter, setSelectedChapter] = useState<DirectoryChapter | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [joinFilter, setJoinFilter] = useState<JoinFilter>('all');

  const loadChapters = useCallback(async () => {
    setErrorMessage('');
    setIsLoading(true);

    if (isDemoMode || !supabase) {
      setChapters(demoDirectoryChapters);
      setSelectedChapter((current) => current ?? demoDirectoryChapters[0] ?? null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_public_chapter_directory', {
        search_text: null,
      });

      if (error) throw error;

      const nextChapters = data ?? [];
      setChapters(nextChapters);
      setSelectedChapter((current) => {
        if (current && nextChapters.some((chapter) => chapter.id === current.id)) return current;
        return nextChapters[0] ?? null;
      });
    } catch (error) {
      setChapters(demoDirectoryChapters);
      setSelectedChapter((current) => current ?? demoDirectoryChapters[0] ?? null);
      setErrorMessage(error instanceof Error ? error.message : 'Could not load chapters.');
    } finally {
      setIsLoading(false);
    }
  }, [isDemoMode]);

  useEffect(() => {
    loadChapters();
  }, [loadChapters]);

  const visibleChapters = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return chapters.filter((chapter) => {
      const matchesQuery = normalizedQuery
        ? [chapter.name, chapter.region, chapter.country, chapter.description]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(normalizedQuery))
        : true;
      const matchesFilter = joinFilter === 'all' || joinFilter === 'near' ? true : chapter.join_policy === joinFilter;

      return matchesQuery && matchesFilter;
    });
  }, [chapters, joinFilter, query]);
  const coordinateDiagnostics = useMemo(
    () => getChapterCoordinateDiagnostics(visibleChapters),
    [visibleChapters],
  );
  const hasMapReadyChapters = coordinateDiagnostics.validMapReadyChapters > 0;

  useEffect(() => {
    logChapterCoordinateDiagnostics('community-tab', visibleChapters);
  }, [visibleChapters]);

  useEffect(() => {
    if (visibleChapters.length === 0) {
      setSelectedChapter(null);
      return;
    }

    setSelectedChapter((current) => {
      if (current && visibleChapters.some((chapter) => chapter.id === current.id)) return current;
      return visibleChapters[0];
    });
  }, [visibleChapters]);

  function openChapter(chapter: DirectoryChapter) {
    router.push(`/chapter/${chapter.id}` as never);
  }

  async function handleRedeemCode() {
    const normalizedCode = redeemCode.trim().toUpperCase();

    if (!normalizedCode) {
      setRedeemMessage('Enter an invite code.');
      return;
    }

    setRedeemMessage('');
    setIsRedeeming(true);

    try {
      if (isDemoMode) {
        setRedeemMessage('Invite redeemed. Your request is pending approval.');
        setRedeemCode('');
        return;
      }

      await redeemInviteCodeAction(normalizedCode);
      setRedeemCode('');
      setRedeemMessage('Invite redeemed. Your request is pending approval.');
      await loadChapters();
    } catch (error) {
      setRedeemMessage(error instanceof Error ? error.message : 'Invalid invite code.');
    } finally {
      setIsRedeeming(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top']}>
      <LinearGradient
        colors={theme.name === 'dark' ? ['#070605', '#11100D', '#070605'] : ['#F6F1E8', '#EFE3D2', '#F6F1E8']}
        style={styles.background}
      />

      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={[styles.eyebrow, { color: theme.accent }]}>Near you / Global chapters</Text>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Chapter Map</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Discover local circles built around discipline, accountability, and steady weekly action.
          </Text>
        </View>
        {isDemoMode ? (
          <View style={[styles.demoPill, { backgroundColor: theme.accentSurface, borderColor: theme.accentBorder }]}>
            <Text style={[styles.demoPillText, { color: theme.accentText }]}>Demo Mode</Text>
          </View>
        ) : null}
      </View>

      {canAccessAdmin(profile) ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/admin')}
          style={({ pressed }) => [
            {
              alignItems: 'center',
              backgroundColor: theme.glass,
              borderColor: theme.accentBorder,
              borderRadius: radius.xl,
              borderWidth: 1,
              flexDirection: 'row',
              gap: spacing.md,
              marginBottom: spacing.md,
              marginHorizontal: spacing.lg,
              opacity: pressed ? 0.85 : 1,
              padding: spacing.md,
            },
            shadows.card,
          ]}>
          <View
            style={{
              alignItems: 'center',
              backgroundColor: theme.accentSurface,
              borderRadius: radius.md,
              height: 44,
              justifyContent: 'center',
              width: 44,
            }}>
            <ShieldCheck color={theme.accent} size={22} strokeWidth={2.5} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: theme.textPrimary, fontSize: 17, fontWeight: '900' }}>Admin tools</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 14 }}>
              Manage chapters, codes, roles, and stats.
            </Text>
          </View>
          <ChevronRight color={theme.textMuted} size={20} strokeWidth={2.5} />
        </Pressable>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/messages' as never)}
        style={({ pressed }) => [
          {
            alignItems: 'center',
            backgroundColor: theme.glass,
            borderColor: theme.border,
            borderRadius: radius.xl,
            borderWidth: 1,
            flexDirection: 'row',
            gap: spacing.md,
            marginBottom: spacing.md,
            marginHorizontal: spacing.lg,
            opacity: pressed ? 0.85 : 1,
            padding: spacing.md,
          },
          shadows.card,
        ]}>
        <View
          style={{
            alignItems: 'center',
            backgroundColor: theme.accentSurface,
            borderRadius: radius.md,
            height: 44,
            justifyContent: 'center',
            width: 44,
          }}>
          <MessageCircle color={theme.accent} size={22} strokeWidth={2.5} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: theme.textPrimary, fontSize: 17, fontWeight: '900' }}>Chapter messages</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 14 }}>
            Coordinate with members, events, announcements, and accountability partners.
          </Text>
        </View>
        <ChevronRight color={theme.textMuted} size={20} strokeWidth={2.5} />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/feed')}
        style={({ pressed }) => [
          {
            alignItems: 'center',
            backgroundColor: theme.glass,
            borderColor: theme.border,
            borderRadius: radius.xl,
            borderWidth: 1,
            flexDirection: 'row',
            gap: spacing.md,
            marginBottom: spacing.md,
            marginHorizontal: spacing.lg,
            opacity: pressed ? 0.85 : 1,
            padding: spacing.md,
          },
          shadows.card,
        ]}>
        <View
          style={{
            alignItems: 'center',
            backgroundColor: theme.accentSurface,
            borderRadius: radius.md,
            height: 44,
            justifyContent: 'center',
            width: 44,
          }}>
          <Globe2 color={theme.accent} size={22} strokeWidth={2.5} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: theme.textPrimary, fontSize: 17, fontWeight: '900' }}>Community feed</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 14 }}>
            Share wins, reflections, and accountability with logged-in Bloke members.
          </Text>
        </View>
        <ChevronRight color={theme.textMuted} size={20} strokeWidth={2.5} />
      </Pressable>

      <View style={[styles.controlsCard, { backgroundColor: theme.glass, borderColor: theme.border }, shadows.card]}>
        <View style={[styles.searchRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Search color={theme.textMuted} size={19} strokeWidth={2.5} />
          <TextInput
            accessibilityLabel="Search chapters"
            autoCapitalize="none"
            onChangeText={setQuery}
            placeholder="Search chapters"
            placeholderTextColor={theme.textMuted}
            style={[styles.searchInput, { color: theme.textPrimary }]}
            value={query}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {filters.map((filter) => {
            const selected = filter.value === joinFilter;
            const disabled = filter.value === 'near';

            return (
              <Pressable
                accessibilityRole="button"
                disabled={disabled}
                key={filter.value}
                onPress={() => setJoinFilter(filter.value)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: selected ? theme.cardInverted : theme.card,
                    borderColor: selected ? theme.accentBorder : theme.border,
                    opacity: disabled ? 0.55 : 1,
                  },
                ]}>
                <Text style={[styles.filterText, { color: selected ? theme.textInverse : theme.textSecondary }]}>
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={[styles.toggle, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <ToggleButton active={viewMode === 'map'} icon={Map} label="Map" onPress={() => setViewMode('map')} />
          <ToggleButton active={viewMode === 'list'} icon={List} label="List" onPress={() => setViewMode('list')} />
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => setIsRedeemOpen(true)}
          style={[styles.redeemButton, { backgroundColor: theme.cardInverted, borderColor: theme.accentBorder }]}>
          <KeyRound color={theme.accent} size={18} strokeWidth={2.8} />
          <Text style={[styles.redeemButtonText, { color: theme.textInverse }]}>Enter invite code</Text>
        </Pressable>
      </View>

      {errorMessage ? (
        <View style={[styles.messageCard, { backgroundColor: theme.warning, borderColor: theme.accentBorder }]}>
          <Text style={[styles.messageText, { color: theme.accentText }]}>
            Live Supabase chapters were unavailable, so the demo directory is showing.
          </Text>
        </View>
      ) : null}

      <View style={styles.content}>
        {isLoading ? (
          <LoadingState />
        ) : visibleChapters.length === 0 ? (
          <EmptyState query={query} />
        ) : viewMode === 'map' && hasMapReadyChapters ? (
          <View style={[styles.mapCard, { borderColor: theme.accentBorder }, shadows.glow]}>
            <PremiumChapterMap
              chapters={visibleChapters}
              onOpenChapter={openChapter}
              onSelectChapter={setSelectedChapter}
              selectedChapter={selectedChapter}
            />
          </View>
        ) : viewMode === 'map' ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
            <View style={[styles.coordinateFallbackCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.coordinateFallbackTitle, { color: theme.textPrimary }]}>
                No map-ready coordinates
              </Text>
              <Text style={[styles.coordinateFallbackText, { color: theme.textSecondary }]}>
                Showing the chapter directory because none of the matching chapters have valid latitude and longitude.
              </Text>
            </View>
            {visibleChapters.map((chapter) => (
              <ChapterCard
                chapter={chapter}
                key={chapter.id}
                onOpen={() => openChapter(chapter)}
                onPreview={() => setSelectedChapter(chapter)}
                selected={selectedChapter?.id === chapter.id}
              />
            ))}
          </ScrollView>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
            {visibleChapters.map((chapter) => (
              <ChapterCard
                chapter={chapter}
                key={chapter.id}
                onOpen={() => openChapter(chapter)}
                onPreview={() => setSelectedChapter(chapter)}
                selected={selectedChapter?.id === chapter.id}
              />
            ))}
          </ScrollView>
        )}
      </View>
      <RedeemInviteModal
        code={redeemCode}
        isOpen={isRedeemOpen}
        isSaving={isRedeeming}
        message={redeemMessage}
        onCancel={() => {
          setIsRedeemOpen(false);
          setRedeemMessage('');
        }}
        onChangeCode={setRedeemCode}
        onConfirm={handleRedeemCode}
      />
    </SafeAreaView>
  );
}

function RedeemInviteModal({
  code,
  isOpen,
  isSaving,
  message,
  onCancel,
  onChangeCode,
  onConfirm,
}: {
  code: string;
  isOpen: boolean;
  isSaving: boolean;
  message: string;
  onCancel: () => void;
  onChangeCode: (value: string) => void;
  onConfirm: () => void;
}) {
  const theme = useTheme();

  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible={isOpen}>
      <View style={[styles.modalBackdrop, { backgroundColor: theme.overlay }]}>
        <Pressable accessibilityLabel="Close invite code dialog" onPress={onCancel} style={StyleSheet.absoluteFill} />
        <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }, shadows.glow]}>
          <Text style={[styles.eyebrow, { color: theme.accent }]}>Invite access</Text>
          <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Redeem invite code</Text>
          <Text style={[styles.modalBody, { color: theme.textSecondary }]}>
            Enter a leader-generated code. Valid codes create a pending approval request.
          </Text>
          <TextInput
            accessibilityLabel="Invite code"
            autoCapitalize="characters"
            onChangeText={onChangeCode}
            placeholder="BLOKE-XXXX-XXXX"
            placeholderTextColor={theme.textMuted}
            style={[styles.modalInput, { backgroundColor: theme.cardMuted, borderColor: theme.border, color: theme.textPrimary }]}
            value={code}
          />
          {message ? <Text style={[styles.modalMessage, { color: message.includes('pending') ? theme.success : theme.error }]}>{message}</Text> : null}
          <View style={styles.modalActions}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={[styles.modalAction, { backgroundColor: theme.cardMuted, borderColor: theme.border }]}>
              <Text style={[styles.modalActionText, { color: theme.textPrimary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isSaving}
              onPress={onConfirm}
              style={[styles.modalAction, { backgroundColor: theme.accent, borderColor: theme.accent, opacity: isSaving ? 0.7 : 1 }]}>
              <Text style={[styles.modalActionText, { color: theme.accentText }]}>{isSaving ? 'Checking...' : 'Redeem'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ToggleButton({
  active,
  icon: Icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: typeof Map;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.toggleButton,
        {
          backgroundColor: active ? theme.cardInverted : 'transparent',
        },
      ]}>
      <Icon color={active ? theme.accent : theme.textSecondary} size={17} strokeWidth={2.7} />
      <Text style={[styles.toggleText, { color: active ? theme.textInverse : theme.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

function LoadingState() {
  const theme = useTheme();

  return (
    <View style={[styles.loadingCard, { backgroundColor: theme.glass, borderColor: theme.border }]}>
      <View style={styles.loadingTop}>
        <ActivityIndicator color={theme.accent} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading chapter signal...</Text>
      </View>
      {[0, 1, 2].map((item) => (
        <View key={item} style={[styles.skeleton, { backgroundColor: theme.glassMuted }]}>
          <View style={[styles.skeletonIcon, { backgroundColor: theme.border }]} />
          <View style={styles.skeletonCopy}>
            <View style={[styles.skeletonLine, { backgroundColor: theme.border }]} />
            <View style={[styles.skeletonLineShort, { backgroundColor: theme.border }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function EmptyState({ query }: { query: string }) {
  const theme = useTheme();

  return (
    <View style={[styles.emptyCard, { backgroundColor: theme.glass, borderColor: theme.border }, shadows.card]}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.cardInverted, borderColor: theme.accentBorder }]}>
        <Compass color={theme.accent} size={30} strokeWidth={2.8} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No chapters found</Text>
      <Text style={[styles.emptyBody, { color: theme.textSecondary }]}>
        {query ? 'Try a different city, region, or chapter name.' : 'New public chapters will appear here as leaders launch them.'}
      </Text>
    </View>
  );
}

function ChapterCard({
  chapter,
  onOpen,
  onPreview,
  selected,
}: {
  chapter: DirectoryChapter;
  onOpen: () => void;
  onPreview: () => void;
  selected: boolean;
}) {
  const theme = useTheme();
  const joinLabel = getJoinLabel(chapter.join_policy);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPreview}
      style={[
        styles.chapterCard,
        {
          backgroundColor: theme.glass,
          borderColor: selected ? theme.accentBorder : theme.border,
        },
        selected ? shadows.glow : shadows.card,
      ]}>
      <View style={styles.chapterTop}>
        <View style={[styles.chapterIcon, { backgroundColor: theme.cardInverted, borderColor: theme.accentBorder }]}>
          <MapPin color={theme.accent} size={22} strokeWidth={2.8} />
        </View>
        <View style={styles.chapterCopy}>
          <Text style={[styles.chapterTitle, { color: theme.textPrimary }]}>{chapter.name}</Text>
          <Text style={[styles.chapterMeta, { color: theme.textSecondary }]}>
            {[chapter.region, chapter.country].filter(Boolean).join(', ') || 'Location pending'}
          </Text>
        </View>
        {chapter.is_public ? (
          <ShieldCheck color={theme.accent} size={20} strokeWidth={2.5} />
        ) : null}
      </View>

      <Text style={[styles.chapterDescription, { color: theme.textSecondary }]} numberOfLines={2}>
        {chapter.description ?? 'A local chapter for discipline, accountability, and brotherhood.'}
      </Text>

      <View style={styles.chapterFooter}>
        <View style={styles.statPills}>
          <View style={[styles.statPill, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Users color={theme.accent} size={15} strokeWidth={2.6} />
            <Text style={[styles.statText, { color: theme.textSecondary }]}>{chapter.member_count ?? 0}</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.statText, { color: theme.textSecondary }]}>{chapter.meeting_day ?? 'TBD'}</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: theme.accentSurface, borderColor: theme.accentBorder }]}>
            <Text style={[styles.statText, { color: theme.accentText }]}>{joinLabel}</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onOpen}
          style={[styles.cardActionButton, { backgroundColor: theme.accent, borderColor: theme.accent }]}>
          <Text style={[styles.cardActionText, { color: theme.accentText }]}>{getCtaLabel(chapter.join_policy)}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

function getJoinLabel(joinPolicy: DirectoryChapter['join_policy']) {
  if (joinPolicy === 'invite_code') return 'Invite';
  if (joinPolicy === 'request') return 'Request';
  return 'Open';
}

function getCtaLabel(joinPolicy: DirectoryChapter['join_policy']) {
  if (joinPolicy === 'invite_code') return 'Enter Invite';
  if (joinPolicy === 'request') return 'Request';
  return 'Join Now';
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    zIndex: 3,
  },
  titleBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 35,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  demoPill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  demoPillText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  controlsCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.sm,
    zIndex: 3,
  },
  searchRow: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
  },
  filterRow: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  filterChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '900',
  },
  toggle: {
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 4,
  },
  toggleButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 36,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '900',
  },
  redeemButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: spacing.md,
  },
  redeemButtonText: {
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  messageCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    zIndex: 3,
  },
  messageText: {
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: 96,
    paddingTop: spacing.sm,
  },
  mapCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    flex: 1,
    minHeight: 430,
    overflow: 'hidden',
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: 120,
  },
  coordinateFallbackCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  coordinateFallbackTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  coordinateFallbackText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  loadingCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  loadingTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '900',
  },
  skeleton: {
    alignItems: 'center',
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 86,
    padding: spacing.md,
  },
  skeletonIcon: {
    borderRadius: radius.lg,
    height: 48,
    width: 48,
  },
  skeletonCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  skeletonLine: {
    borderRadius: radius.pill,
    height: 14,
    width: '72%',
  },
  skeletonLineShort: {
    borderRadius: radius.pill,
    height: 12,
    width: '48%',
  },
  emptyCard: {
    alignItems: 'center',
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
  },
  emptyIcon: {
    alignItems: 'center',
    borderRadius: radius.xl,
    borderWidth: 1,
    height: 66,
    justifyContent: 'center',
    width: 66,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    textAlign: 'center',
  },
  chapterCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  chapterTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  chapterIcon: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  chapterCopy: {
    flex: 1,
    gap: 2,
  },
  chapterTitle: {
    fontSize: 21,
    fontWeight: '900',
    lineHeight: 26,
  },
  chapterMeta: {
    fontSize: 14,
    fontWeight: '800',
  },
  chapterDescription: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  chapterFooter: {
    gap: spacing.md,
  },
  statPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statPill: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  statText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  cardActionButton: {
    alignItems: 'center',
    borderRadius: radius.xl,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 58,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  cardActionText: {
    fontSize: 16,
    fontWeight: '900',
  },
  modalBackdrop: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.md,
    maxWidth: 540,
    padding: spacing.xl,
    width: '100%',
  },
  modalTitle: {
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
  },
  modalBody: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
  },
  modalInput: {
    borderRadius: radius.lg,
    borderWidth: 1,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
    minHeight: 58,
    paddingHorizontal: spacing.md,
  },
  modalMessage: {
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  modalAction: {
    alignItems: 'center',
    borderRadius: radius.xl,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 56,
    minWidth: 150,
    paddingHorizontal: spacing.md,
  },
  modalActionText: {
    fontSize: 15,
    fontWeight: '900',
  },
});
