import { CalendarDays, LockKeyhole, MapPin, Send, Sparkles, Users } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { AppPressButton } from '@/components/AppPressButton';
import { BadgePill } from '@/components/ui/BadgePill';
import { GlassCard } from '@/components/ui/GlassCard';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { DirectoryChapter } from '@/types/chapters';

type ChapterPreviewCardProps = {
  chapter: DirectoryChapter;
  isCurrentChapter?: boolean;
  isPending?: boolean;
  onJoinInvite: () => void;
  onJoinOpen: () => void;
  onRequestJoin: () => void;
};

function getJoinLabel(chapter: DirectoryChapter) {
  if (chapter.join_policy === 'open' || chapter.public_join_enabled) {
    return 'Open join';
  }

  if (chapter.join_policy === 'request') {
    return 'Request required';
  }

  return 'Invite required';
}

export function ChapterPreviewCard({
  chapter,
  isCurrentChapter,
  isPending,
  onJoinInvite,
  onJoinOpen,
  onRequestJoin,
}: ChapterPreviewCardProps) {
  const theme = useTheme();
  const location = [chapter.region, chapter.country].filter(Boolean).join(', ') || 'Location pending';

  return (
    <GlassCard style={styles.card}>
      <View style={styles.sheetHandleWrap}>
        <View style={[styles.sheetHandle, { backgroundColor: theme.borderStrong }]} />
      </View>
      <View style={styles.topRow}>
        <View style={styles.copy}>
          <View style={styles.eyebrowRow}>
            <Sparkles color={theme.accent} size={15} strokeWidth={2.6} />
            <Text style={[styles.eyebrow, { color: theme.accent }]}>{getJoinLabel(chapter)}</Text>
          </View>
          <Text style={[styles.title, { color: theme.textPrimary }]}>{chapter.name}</Text>
          <Text style={[styles.location, { color: theme.textSecondary }]}>{location}</Text>
        </View>
        <View style={[styles.memberPill, { backgroundColor: theme.accentSurface, borderColor: theme.accentBorder }]}>
          <Users color={theme.accent} size={17} strokeWidth={2.7} />
          <Text style={[styles.memberPillText, { color: theme.textPrimary }]}>{chapter.member_count}</Text>
        </View>
      </View>

      {chapter.description ? (
        <Text style={[styles.body, { color: theme.textSecondary }]}>{chapter.description}</Text>
      ) : null}

      <View style={styles.metaGrid}>
        <Meta icon={CalendarDays} label="Meeting day" value={chapter.meeting_day ?? 'TBD'} />
        <Meta icon={MapPin} label="Meeting location" value={chapter.meeting_location ?? 'Shared by facilitator'} />
      </View>

      <View style={styles.badgeRow}>
        {isCurrentChapter ? <BadgePill label="Current chapter" /> : null}
        {isPending ? <BadgePill label="Request pending" locked /> : null}
      </View>

      {!isCurrentChapter ? (
        <View style={styles.actions}>
          {chapter.join_policy === 'open' || chapter.public_join_enabled ? (
            <AppPressButton label="Join Now" onPress={onJoinOpen} variant="accent" />
          ) : null}
          {chapter.join_policy === 'request' ? (
            <AppPressButton disabled={isPending} icon={Send} label={isPending ? 'Request Pending' : 'Request to Join'} onPress={onRequestJoin} />
          ) : null}
          {chapter.join_policy === 'invite_code' || (!chapter.join_policy && !chapter.public_join_enabled) ? (
            <AppPressButton icon={LockKeyhole} label="Enter Invite Code" onPress={onJoinInvite} variant="secondary" />
          ) : null}
        </View>
      ) : null}
    </GlassCard>
  );
}

function Meta({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.meta, { backgroundColor: theme.cardMuted, borderColor: theme.border }]}>
      <Icon color={theme.accent} size={18} strokeWidth={2.6} />
      <View style={styles.metaCopy}>
        <Text style={[styles.metaLabel, { color: theme.textMuted }]}>{label}</Text>
        <Text style={[styles.metaValue, { color: theme.textPrimary }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
    marginTop: -spacing.sm,
  },
  sheetHandleWrap: {
    alignItems: 'center',
    marginTop: -spacing.xs,
  },
  sheetHandle: {
    borderRadius: radius.pill,
    height: 4,
    opacity: 0.72,
    width: 54,
  },
  topRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  eyebrowRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
  },
  location: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  memberPill: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  memberPillText: {
    fontSize: 15,
    fontWeight: '900',
  },
  body: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 26,
  },
  metaGrid: {
    gap: spacing.sm,
  },
  meta: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  metaCopy: {
    flex: 1,
    gap: 2,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actions: {
    gap: spacing.md,
  },
});
