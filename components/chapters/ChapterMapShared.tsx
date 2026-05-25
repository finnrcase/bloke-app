import { MapPin, Send, Users } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppPressButton } from '@/components/AppPressButton';
import { FormTextInput } from '@/components/FormTextInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { getMapReadyChapters } from '@/lib/chapterCoordinates';
import { DirectoryChapter } from '@/types/chapters';

type ChapterMapProps = {
  chapters: DirectoryChapter[];
  onJoinOpenChapter: (chapter: DirectoryChapter) => void;
  onJoinWithInvite: (chapter: DirectoryChapter, inviteCode: string) => void;
  onRequestToJoin: (chapter: DirectoryChapter) => void;
  selectedChapter: DirectoryChapter | null;
  setSelectedChapter: (chapter: DirectoryChapter | null) => void;
};

type ChapterWithPosition = DirectoryChapter & {
  left: number;
  top: number;
};

function getPositionedChapters(chapters: DirectoryChapter[]): ChapterWithPosition[] {
  const chaptersWithCoordinates = getMapReadyChapters(chapters);

  if (chaptersWithCoordinates.length === 0) {
    return [];
  }

  const latitudes = chaptersWithCoordinates.map((item) => item.latitude);
  const longitudes = chaptersWithCoordinates.map((item) => item.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const latitudeRange = Math.max(maxLatitude - minLatitude, 0.1);
  const longitudeRange = Math.max(maxLongitude - minLongitude, 0.1);

  return chaptersWithCoordinates.map(({ chapter, latitude, longitude }) => ({
    ...chapter,
    latitude,
    left: 10 + ((longitude - minLongitude) / longitudeRange) * 80,
    longitude,
    top: 12 + (1 - (latitude - minLatitude) / latitudeRange) * 76,
  }));
}

export function ChapterMapShared({
  chapters,
  onJoinOpenChapter,
  onJoinWithInvite,
  onRequestToJoin,
  selectedChapter,
  setSelectedChapter,
}: ChapterMapProps) {
  const positionedChapters = useMemo(() => getPositionedChapters(chapters), [chapters]);
  const theme = useTheme();

  return (
    <GlassCard>
      <SectionHeader
        icon={MapPin}
        title="Chapter map"
        subtitle="Default view shows public chapters. Precise location is not required."
      />

      <View style={[styles.mapFrame, { backgroundColor: theme.mapSurface, borderColor: theme.border }]}>
        <View pointerEvents="none" style={[styles.gridLineOne, { backgroundColor: theme.border }]} />
        <View pointerEvents="none" style={[styles.gridLineTwo, { backgroundColor: theme.border }]} />
        <View pointerEvents="none" style={[styles.glow, { backgroundColor: theme.subtleGlow }]} />

        {positionedChapters.length === 0 ? (
          <View style={styles.emptyMap}>
            <EmptyState
              body="Public chapters without coordinates still appear in the list below."
              icon={MapPin}
              title="No map-ready chapters yet."
            />
          </View>
        ) : (
          positionedChapters.map((chapter) => (
            <Pressable
              accessibilityLabel={`View ${chapter.name}`}
              accessibilityRole="button"
              key={chapter.id}
              onPress={() => setSelectedChapter(chapter)}
              style={[
                styles.marker,
                {
                  left: `${chapter.left}%`,
                  top: `${chapter.top}%`,
                },
                {
                  backgroundColor:
                    selectedChapter?.id === chapter.id ? 'rgba(200, 155, 74, 0.42)' : 'rgba(200, 155, 74, 0.2)',
                  borderColor: selectedChapter?.id === chapter.id ? theme.accent : theme.textSecondary,
                },
                selectedChapter?.id === chapter.id ? styles.markerActive : null,
              ]}>
              <View style={[styles.markerCore, { backgroundColor: theme.accent }]} />
            </Pressable>
          ))
        )}
      </View>

      {selectedChapter ? (
        <ChapterPreview
          chapter={selectedChapter}
          onJoinOpenChapter={() => onJoinOpenChapter(selectedChapter)}
          onJoinWithInvite={(inviteCode) => onJoinWithInvite(selectedChapter, inviteCode)}
          onRequestToJoin={() => onRequestToJoin(selectedChapter)}
        />
      ) : null}
    </GlassCard>
  );
}

function ChapterPreview({
  chapter,
  onJoinOpenChapter,
  onJoinWithInvite,
  onRequestToJoin,
}: {
  chapter: DirectoryChapter;
  onJoinOpenChapter: () => void;
  onJoinWithInvite: (inviteCode: string) => void;
  onRequestToJoin: () => void;
}) {
  const [inviteCode, setInviteCode] = useState('');
  const location = [chapter.region, chapter.country].filter(Boolean).join(', ') || 'Location pending';
  const theme = useTheme();

  return (
    <View style={[styles.preview, { backgroundColor: theme.glass, borderColor: theme.border }]}>
      <View style={styles.previewTopRow}>
        <View style={styles.previewCopy}>
          <Text style={[styles.previewTitle, { color: theme.textPrimary }]}>{chapter.name}</Text>
          <Text style={[styles.previewMeta, { color: theme.textSecondary }]}>{location}</Text>
        </View>
        <View
          style={[styles.memberPill, { backgroundColor: theme.accentSurface, borderColor: theme.accentBorder }]}>
          <Users color={theme.accent} size={16} strokeWidth={2.6} />
          <Text style={[styles.memberPillText, { color: theme.textPrimary }]}>{chapter.member_count}</Text>
        </View>
      </View>

      {chapter.meeting_day ? (
        <Text style={[styles.previewBody, { color: theme.textPrimary }]}>Meets {chapter.meeting_day}</Text>
      ) : null}

      {chapter.public_join_enabled ? (
        <AppPressButton label="Join Chapter" onPress={onJoinOpenChapter} variant="accent" />
      ) : (
        <View style={styles.inviteBlock}>
          <FormTextInput
            autoCapitalize="characters"
            label="Invite code"
            onChangeText={setInviteCode}
            placeholder="Required for direct join"
            value={inviteCode}
          />
          <AppPressButton
            icon={Send}
            label="Join with Invite Code"
            onPress={() => onJoinWithInvite(inviteCode)}
            variant="secondary"
          />
          <AppPressButton label="Request to Join" onPress={onRequestToJoin} variant="ghost" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mapFrame: {
    borderRadius: radius.xl,
    borderWidth: 1,
    height: 320,
    marginTop: spacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  gridLineOne: {
    height: 1,
    left: 0,
    position: 'absolute',
    right: 0,
    top: '42%',
  },
  gridLineTwo: {
    bottom: 0,
    left: '48%',
    position: 'absolute',
    top: 0,
    width: 1,
  },
  glow: {
    borderRadius: 999,
    height: 240,
    position: 'absolute',
    right: -90,
    top: -90,
    width: 240,
  },
  emptyMap: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  marker: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 2,
    height: 34,
    justifyContent: 'center',
    marginLeft: -17,
    marginTop: -17,
    position: 'absolute',
    width: 34,
  },
  markerActive: {
    transform: [{ scale: 1.12 }],
  },
  markerCore: {
    borderRadius: 999,
    height: 12,
    width: 12,
  },
  preview: {
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  previewTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  previewCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  previewTitle: {
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
  },
  previewMeta: {
    fontSize: 16,
    fontWeight: '800',
  },
  previewBody: {
    fontSize: 16,
    fontWeight: '800',
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
  inviteBlock: {
    gap: spacing.md,
  },
});
