import { Compass, MapPin, RadioTower } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { radius, shadows, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { DirectoryChapter } from '@/types/chapters';

type ChapterMapProps = {
  chapters: DirectoryChapter[];
  currentChapterId?: string | null;
  onSelectChapter: (chapter: DirectoryChapter) => void;
  selectedChapterId?: string | null;
};

type PositionedChapter = DirectoryChapter & {
  left: number;
  top: number;
};

function getCoordinate(value: number | null) {
  if (value === null) return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getPositionedChapters(chapters: DirectoryChapter[]): PositionedChapter[] {
  const withCoordinates = chapters
    .map((chapter) => ({
      ...chapter,
      latitude: getCoordinate(chapter.latitude),
      longitude: getCoordinate(chapter.longitude),
    }))
    .filter((chapter): chapter is DirectoryChapter & { latitude: number; longitude: number } => {
      return chapter.latitude !== null && chapter.longitude !== null;
    });

  if (withCoordinates.length === 0) return [];

  const latitudes = withCoordinates.map((chapter) => chapter.latitude);
  const longitudes = withCoordinates.map((chapter) => chapter.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const latitudeRange = Math.max(maxLatitude - minLatitude, 0.1);
  const longitudeRange = Math.max(maxLongitude - minLongitude, 0.1);

  return withCoordinates.map((chapter) => ({
    ...chapter,
    left: 10 + ((chapter.longitude - minLongitude) / longitudeRange) * 80,
    top: 12 + (1 - (chapter.latitude - minLatitude) / latitudeRange) * 76,
  }));
}

export function ChapterMapSurface({
  chapters,
  currentChapterId,
  onSelectChapter,
  selectedChapterId,
}: ChapterMapProps) {
  const theme = useTheme();
  const positionedChapters = useMemo(() => getPositionedChapters(chapters), [chapters]);
  const missingCoordinatesCount = chapters.length - positionedChapters.length;

  return (
    <GlassCard style={styles.shell}>
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: theme.cardInverted, borderColor: theme.accentBorder }]}>
          <MapPin color={theme.accent} size={22} strokeWidth={2.8} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: theme.accent }]}>Premium fallback map</Text>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Chapter atlas</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Visual directory using chapter coordinates. No live location permissions.
          </Text>
        </View>
      </View>

      <View style={[styles.mapFrame, { backgroundColor: theme.mapSurface, borderColor: theme.borderStrong }, shadows.lift]}>
        <View pointerEvents="none" style={styles.mapTexture}>
          <View style={[styles.routeLine, styles.routeLineOne, { backgroundColor: theme.accentBorder }]} />
          <View style={[styles.routeLine, styles.routeLineTwo, { backgroundColor: theme.textInverseMuted }]} />
          <View style={[styles.routeLine, styles.routeLineThree, { backgroundColor: theme.accent }]} />
          <View style={[styles.gridLine, styles.gridOne, { backgroundColor: theme.textInverseMuted }]} />
          <View style={[styles.gridLine, styles.gridTwo, { backgroundColor: theme.textInverseMuted }]} />
          <View style={[styles.gridLineVertical, styles.gridThree, { backgroundColor: theme.textInverseMuted }]} />
          <View style={[styles.gridLineVertical, styles.gridFour, { backgroundColor: theme.textInverseMuted }]} />
        </View>

        <View style={[styles.topControl, { backgroundColor: theme.overlay, borderColor: theme.borderStrong }]}>
          <Compass color={theme.accent} size={16} strokeWidth={2.6} />
          <Text style={[styles.controlText, { color: theme.textInverse }]}>Discovery</Text>
        </View>

        {positionedChapters.length === 0 ? (
          <View style={styles.emptyMap}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.overlay, borderColor: theme.accentBorder }]}>
              <RadioTower color={theme.accent} size={28} strokeWidth={2.4} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.textInverse }]}>No map-ready chapters yet</Text>
            <Text style={[styles.emptyBody, { color: theme.textInverseMuted }]}>
              Chapters without coordinates still appear in the fallback directory below.
            </Text>
          </View>
        ) : (
          positionedChapters.map((chapter) => {
            const isSelected = chapter.id === selectedChapterId;
            const isCurrent = chapter.id === currentChapterId;

            return (
              <Pressable
                accessibilityLabel={`Preview ${chapter.name}`}
                accessibilityRole="button"
                key={chapter.id}
                onPress={() => onSelectChapter(chapter)}
                style={[
                  styles.marker,
                  {
                    backgroundColor: isCurrent
                      ? theme.success
                      : isSelected
                        ? theme.accent
                        : theme.cardInverted,
                    borderColor: isCurrent ? theme.successBorder : theme.accent,
                    left: `${chapter.left}%`,
                    top: `${chapter.top}%`,
                  },
                  isSelected ? styles.markerActive : null,
                ]}>
                <View style={[styles.markerHalo, { borderColor: isSelected ? theme.accent : theme.accentBorder }]} />
                <View style={[styles.markerCore, { backgroundColor: isCurrent ? theme.textInverse : theme.accent }]} />
                {chapter.member_count ? (
                  <View style={[styles.markerBadge, { backgroundColor: theme.accent, borderColor: theme.cardInverted }]}>
                    <Text style={[styles.markerBadgeText, { color: theme.accentText }]}>
                      {chapter.member_count > 99 ? '99+' : chapter.member_count}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })
        )}

        <View style={[styles.legend, { backgroundColor: theme.overlay, borderColor: theme.borderStrong }]}>
          <Text style={[styles.legendText, { color: theme.textInverse }]}>{positionedChapters.length} map-ready</Text>
          {missingCoordinatesCount > 0 ? (
            <Text style={[styles.legendMeta, { color: theme.textInverseMuted }]}>
              {missingCoordinatesCount} list-only
            </Text>
          ) : null}
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: spacing.lg,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  headerIcon: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  mapFrame: {
    borderRadius: radius.xl,
    borderWidth: 1,
    height: 390,
    overflow: 'hidden',
    position: 'relative',
  },
  mapTexture: {
    ...StyleSheet.absoluteFillObject,
  },
  routeLine: {
    height: 1,
    opacity: 0.42,
    position: 'absolute',
    transform: [{ rotate: '-18deg' }],
  },
  routeLineOne: {
    left: 0,
    right: 0,
    top: '38%',
  },
  routeLineTwo: {
    left: -30,
    opacity: 0.22,
    right: -60,
    top: '62%',
    transform: [{ rotate: '12deg' }],
  },
  routeLineThree: {
    left: '14%',
    opacity: 0.2,
    right: '18%',
    top: '24%',
    transform: [{ rotate: '36deg' }],
  },
  gridLine: {
    height: 1,
    opacity: 0.12,
    position: 'absolute',
  },
  gridLineVertical: {
    opacity: 0.12,
    position: 'absolute',
    width: 1,
  },
  gridOne: {
    left: 0,
    right: 0,
    top: '28%',
  },
  gridTwo: {
    bottom: '24%',
    left: 0,
    right: 0,
  },
  gridThree: {
    bottom: 0,
    left: '32%',
    top: 0,
  },
  gridFour: {
    bottom: 0,
    right: '24%',
    top: 0,
  },
  topControl: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
  },
  controlText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  emptyMap: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  emptyIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 62,
    justifyContent: 'center',
    width: 62,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 23,
    maxWidth: 320,
    textAlign: 'center',
  },
  marker: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 2,
    height: 38,
    justifyContent: 'center',
    marginLeft: -19,
    marginTop: -19,
    position: 'absolute',
    width: 38,
  },
  markerActive: {
    transform: [{ scale: 1.2 }],
  },
  markerHalo: {
    borderRadius: 999,
    borderWidth: 1,
    height: 54,
    opacity: 0.74,
    position: 'absolute',
    width: 54,
  },
  markerCore: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  markerBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 2,
    minWidth: 26,
    paddingHorizontal: 5,
    paddingVertical: 2,
    position: 'absolute',
    right: -14,
    top: -12,
  },
  markerBadgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  legend: {
    borderWidth: 1,
    borderRadius: radius.lg,
    bottom: spacing.md,
    gap: 2,
    left: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: 'absolute',
  },
  legendText: {
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  legendMeta: {
    fontSize: 12,
    fontWeight: '800',
  },
});
