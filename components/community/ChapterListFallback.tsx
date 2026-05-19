import { CalendarDays, Flame, LockKeyhole, MapPin, Send, ShieldCheck, Users } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppPressButton } from '@/components/AppPressButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { GlassCard } from '@/components/ui/GlassCard';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { DirectoryChapter } from '@/types/chapters';

type ChapterListFallbackProps = {
  chapters: DirectoryChapter[];
  currentChapterId?: string | null;
  pendingChapterIds: Set<string>;
  onJoinInvite: (chapter: DirectoryChapter) => void;
  onJoinOpen: (chapter: DirectoryChapter) => void;
  onRequestJoin: (chapter: DirectoryChapter) => void;
  onViewChapter: (chapter: DirectoryChapter) => void;
};

export function ChapterListFallback({
  chapters,
  currentChapterId,
  onJoinInvite,
  onJoinOpen,
  onRequestJoin,
  onViewChapter,
  pendingChapterIds,
}: ChapterListFallbackProps) {
  const theme = useTheme();

  if (chapters.length === 0) {
    return (
      <View style={[styles.emptyPanel, { backgroundColor: theme.cardMuted, borderColor: theme.border }]}>
        <View style={[styles.emptyIcon, { backgroundColor: theme.cardInverted, borderColor: theme.accentBorder }]}>
          <MapPin color={theme.accent} size={28} strokeWidth={2.6} />
        </View>
        <EmptyState
          body="Try another country, city, or chapter name. Private chapters still require an invite code."
          icon={MapPin}
          title="No chapters found"
        />
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {chapters.map((chapter) => (
        <View key={chapter.id} style={styles.cardWrap}>
          <ChapterListCard
            chapter={chapter}
            isCurrentChapter={chapter.id === currentChapterId}
            isPending={pendingChapterIds.has(chapter.id)}
            onJoinInvite={() => onJoinInvite(chapter)}
            onJoinOpen={() => onJoinOpen(chapter)}
            onRequestJoin={() => onRequestJoin(chapter)}
            onViewChapter={() => onViewChapter(chapter)}
          />
        </View>
      ))}
    </View>
  );
}

function ChapterListCard({
  chapter,
  isCurrentChapter,
  isPending,
  onJoinInvite,
  onJoinOpen,
  onRequestJoin,
  onViewChapter,
}: {
  chapter: DirectoryChapter;
  isCurrentChapter: boolean;
  isPending: boolean;
  onJoinInvite: () => void;
  onJoinOpen: () => void;
  onRequestJoin: () => void;
  onViewChapter: () => void;
}) {
  const theme = useTheme();
  const location = [chapter.region, chapter.country].filter(Boolean).join(', ') || 'Location pending';
  const policyLabel = isCurrentChapter
    ? 'Current'
    : isPending
      ? 'Pending'
      : chapter.join_policy === 'open' || chapter.public_join_enabled
        ? 'Open'
        : chapter.join_policy === 'request'
          ? 'Request'
          : 'Invite';
  const actionLabel =
    chapter.join_policy === 'open' || chapter.public_join_enabled
      ? 'Join Now'
      : chapter.join_policy === 'request'
        ? isPending
          ? 'Pending'
          : 'Request'
        : 'Invite Code';
  const actionIcon =
    chapter.join_policy === 'request' ? Send : chapter.join_policy === 'invite_code' ? LockKeyhole : ShieldCheck;
  const actionPress =
    chapter.join_policy === 'open' || chapter.public_join_enabled
      ? onJoinOpen
      : chapter.join_policy === 'request'
        ? onRequestJoin
        : onJoinInvite;

  return (
    <GlassCard style={[styles.card, isCurrentChapter ? { borderColor: theme.accentBorder } : null]}>
      <View style={styles.topRow}>
        <Pressable
          accessibilityLabel={`View ${chapter.name}`}
          accessibilityRole="button"
          onPress={onViewChapter}
          style={[styles.locationVisual, { backgroundColor: theme.cardInverted, borderColor: theme.accentBorder }]}>
          <MapPin color={theme.accent} size={20} strokeWidth={2.7} />
          <View style={[styles.visualDot, { backgroundColor: theme.accent }]} />
        </Pressable>
        <View style={styles.copy}>
          <Text style={[styles.name, { color: theme.textPrimary }]}>{chapter.name}</Text>
          <Text style={[styles.meta, { color: theme.textSecondary }]}>{location}</Text>
        </View>
      </View>

      {chapter.description ? (
        <Text style={[styles.description, { color: theme.textSecondary }]}>{chapter.description}</Text>
      ) : null}

      <View style={styles.statsRow}>
        <StatPill icon={Users} label={`${chapter.member_count ?? 0} members`} />
        <StatPill icon={CalendarDays} label={chapter.meeting_day ?? 'Day TBD'} />
        <StatPill icon={Flame} label="Weekly rhythm" />
      </View>

      <View style={styles.metaRow}>
        <View style={[styles.policyBadge, { backgroundColor: theme.accentSurface, borderColor: theme.accentBorder }]}>
          <Text style={[styles.policy, { color: theme.textPrimary }]}>{policyLabel}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <View style={styles.actionButton}>
          <AppPressButton label="View Chapter" onPress={onViewChapter} variant="secondary" />
        </View>
        {!isCurrentChapter ? (
          <View style={styles.actionButton}>
            <AppPressButton
              disabled={isPending}
              icon={actionIcon}
              label={actionLabel}
              onPress={actionPress}
              variant={chapter.join_policy === 'open' || chapter.public_join_enabled ? 'accent' : 'primary'}
            />
          </View>
        ) : null}
      </View>
    </GlassCard>
  );
}

function StatPill({
  icon: Icon,
  label,
}: {
  icon: typeof Users;
  label: string;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.statPill, { backgroundColor: theme.cardMuted, borderColor: theme.border }]}>
      <Icon color={theme.accent} size={15} strokeWidth={2.6} />
      <Text style={[styles.statText, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  cardWrap: {
    flexBasis: 300,
    flexGrow: 1,
    minWidth: 0,
  },
  card: {
    minHeight: 330,
  },
  emptyPanel: {
    alignItems: 'center',
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  emptyIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  topRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  locationVisual: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    width: 56,
  },
  visualDot: {
    borderRadius: radius.pill,
    bottom: 10,
    height: 6,
    position: 'absolute',
    right: 12,
    width: 6,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
  },
  meta: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  description: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
  },
  statsRow: {
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
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  policyBadge: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  policy: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    minWidth: 150,
  },
});
