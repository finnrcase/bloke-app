import * as Location from 'expo-location';
import { BlurView } from 'expo-blur';
import { MapPin, Navigation } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Circle, Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';

import { radius, shadows, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { getMapReadyChapters } from '@/lib/chapterCoordinates';
import { DirectoryChapter } from '@/types/chapters';

type PremiumChapterMapProps = {
  chapters: DirectoryChapter[];
  onOpenChapter: (chapter: DirectoryChapter) => void;
  onSelectChapter: (chapter: DirectoryChapter) => void;
  selectedChapter: DirectoryChapter | null;
};

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#090806' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#D6C8B5' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#090806' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#3B3124' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#11100D' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#221B14' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0D0B09' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8E806D' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#050506' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#6E6558' }] },
];

function getChapterRegion(chapters: DirectoryChapter[]): Region {
  const points = getMapReadyChapters(chapters);

  if (points.length === 0) {
    return {
      latitude: 34.4208,
      longitude: -119.6982,
      latitudeDelta: 28,
      longitudeDelta: 28,
    };
  }

  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);

  return {
    latitude: (minLatitude + maxLatitude) / 2,
    longitude: (minLongitude + maxLongitude) / 2,
    latitudeDelta: Math.max(maxLatitude - minLatitude + 1.2, 0.18),
    longitudeDelta: Math.max(maxLongitude - minLongitude + 1.2, 0.18),
  };
}

export function PremiumChapterMap({
  chapters,
  onOpenChapter,
  onSelectChapter,
  selectedChapter,
}: PremiumChapterMapProps) {
  const theme = useTheme();
  const mapRef = useRef<MapView | null>(null);
  const markerPulse = useRef(new Animated.Value(0)).current;
  const [locationError, setLocationError] = useState('');
  const [userLocation, setUserLocation] = useState<Location.LocationObjectCoords | null>(null);
  const initialRegion = useMemo(() => getChapterRegion(chapters), [chapters]);
  const mapReadyChapters = useMemo(
    () => getMapReadyChapters(chapters),
    [chapters],
  );
  const networkCoordinates = useMemo(
    () =>
      [...mapReadyChapters]
        .sort((a, b) => a.longitude - b.longitude)
        .map((point) => ({ latitude: point.latitude, longitude: point.longitude })),
    [mapReadyChapters],
  );

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(markerPulse, { duration: 1450, toValue: 1, useNativeDriver: true }),
        Animated.timing(markerPulse, { duration: 1450, toValue: 0, useNativeDriver: true }),
      ]),
    ).start();
  }, [markerPulse]);

  useEffect(() => {
    async function locateUser() {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setLocationError('Location is off. Showing global chapters.');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLocation(currentLocation.coords);
    }

    locateUser().catch(() => setLocationError('Could not load your location.'));
  }, []);

  function focusChapter(chapter: DirectoryChapter, latitude: number, longitude: number) {
    onSelectChapter(chapter);
    mapRef.current?.animateToRegion(
      {
        latitude,
        longitude,
        latitudeDelta: 0.18,
        longitudeDelta: 0.18,
      },
      650,
    );
  }

  function focusUser() {
    if (!userLocation) return;
    mapRef.current?.animateToRegion(
      {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.09,
        longitudeDelta: 0.09,
      },
      650,
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        customMapStyle={darkMapStyle}
        initialRegion={initialRegion}
        mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
        mapPadding={{ bottom: selectedChapter ? 230 : 90, left: 18, right: 18, top: 100 }}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        ref={mapRef}
        showsCompass={false}
        showsMyLocationButton={false}
        showsPointsOfInterest={false}
        showsUserLocation
        style={StyleSheet.absoluteFill}
        userInterfaceStyle="dark">
        {networkCoordinates.length > 1 ? (
          <Polyline
            coordinates={networkCoordinates}
            geodesic
            lineCap="round"
            lineJoin="round"
            strokeColor="rgba(209, 162, 79, 0.32)"
            strokeWidth={2}
          />
        ) : null}
        {mapReadyChapters.map(({ chapter, latitude, longitude }) => (
          <Circle
            center={{ latitude, longitude }}
            fillColor={selectedChapter?.id === chapter.id ? 'rgba(209, 162, 79, 0.2)' : 'rgba(209, 162, 79, 0.1)'}
            key={`${chapter.id}-halo`}
            radius={selectedChapter?.id === chapter.id ? 5200 : 3000}
            strokeColor={selectedChapter?.id === chapter.id ? 'rgba(255, 247, 234, 0.58)' : 'rgba(209, 162, 79, 0.28)'}
            strokeWidth={selectedChapter?.id === chapter.id ? 2 : 1}
          />
        ))}
        {mapReadyChapters.map(({ chapter, latitude, longitude }) => (
          <Marker
            anchor={{ x: 0.5, y: 0.5 }}
            coordinate={{ latitude, longitude }}
            key={chapter.id}
            onPress={() => {
              focusChapter(chapter, latitude, longitude);
            }}>
            <ChapterMarker active={selectedChapter?.id === chapter.id} memberCount={chapter.member_count} pulse={markerPulse} />
          </Marker>
        ))}
      </MapView>

      <View pointerEvents="none" style={[styles.vignetteTop, { backgroundColor: theme.cardInverted }]} />
      <View pointerEvents="none" style={[styles.vignetteBottom, { backgroundColor: theme.cardInverted }]} />

      <View style={styles.header}>
        <BlurView intensity={34} tint="dark" style={[styles.glassHeader, { borderColor: theme.accentBorder }]}>
          <Text style={[styles.eyebrow, { color: theme.accent }]}>Chapter map</Text>
          <Text style={[styles.title, { color: theme.textInverse }]}>Find your circle.</Text>
          <Text style={[styles.subtitle, { color: theme.textInverseMuted }]}>
            {mapReadyChapters.length} live chapters on the network
          </Text>
        </BlurView>
      </View>

      <View style={styles.controls}>
        <Pressable
          accessibilityLabel="Focus my location"
          accessibilityRole="button"
          disabled={!userLocation}
          onPress={focusUser}
          style={[styles.locationButton, { backgroundColor: theme.overlay, borderColor: theme.accentBorder, opacity: userLocation ? 1 : 0.62 }]}>
          <Navigation color={theme.accent} size={20} strokeWidth={2.8} />
        </Pressable>
      </View>

      {locationError ? (
        <View style={[styles.locationToast, { backgroundColor: theme.overlay, borderColor: theme.borderStrong }]}>
          <Text style={[styles.locationToastText, { color: theme.textInverseMuted }]}>{locationError}</Text>
        </View>
      ) : null}

      {selectedChapter ? (
        <BlurView intensity={42} tint="dark" style={[styles.sheet, { borderColor: theme.accentBorder }]}>
          <View style={[styles.sheetHandle, { backgroundColor: theme.accentBorder }]} />
          <View style={styles.sheetTop}>
            <View style={[styles.sheetIcon, { backgroundColor: theme.cardInverted, borderColor: theme.accentBorder }]}>
              <MapPin color={theme.accent} size={20} strokeWidth={2.8} />
            </View>
            <View style={styles.sheetCopy}>
              <Text style={[styles.sheetTitle, { color: theme.textInverse }]}>{selectedChapter.name}</Text>
              <Text style={[styles.sheetMeta, { color: theme.textInverseMuted }]}>
                {[selectedChapter.region, selectedChapter.country].filter(Boolean).join(', ') || 'Location pending'}
              </Text>
            </View>
          </View>
          <Text style={[styles.sheetBody, { color: theme.textInverseMuted }]} numberOfLines={2}>
            {selectedChapter.description ?? 'A local chapter for discipline, accountability, and brotherhood.'}
          </Text>
          <View style={styles.sheetStats}>
            <MiniStat label="Members" value={`${selectedChapter.member_count ?? 0}`} />
            <MiniStat label="Meets" value={selectedChapter.meeting_day ?? 'TBD'} />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => onOpenChapter(selectedChapter)}
            style={[styles.actionButton, { backgroundColor: theme.accent, borderColor: theme.accent }]}>
            <Text style={[styles.actionButtonText, { color: theme.accentText }]}>Open Chapter</Text>
          </Pressable>
        </BlurView>
      ) : null}
    </View>
  );
}

function ChapterMarker({ active, memberCount, pulse }: { active: boolean; memberCount: number; pulse: Animated.Value }) {
  const theme = useTheme();
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, active ? 1.72 : 1.46] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <View style={styles.markerWrap}>
      <Animated.View
        style={[
          styles.markerPulse,
          {
            borderColor: theme.accent,
            opacity: pulseOpacity,
            transform: [{ scale: pulseScale }],
          },
        ]}
      />
      <View
        style={[
          styles.marker,
          {
            backgroundColor: active ? theme.accent : theme.cardInverted,
            borderColor: theme.accent,
          },
          active ? styles.markerActive : null,
        ]}>
        <View style={[styles.markerCore, { backgroundColor: active ? theme.accentText : theme.accent }]} />
      </View>
      {memberCount ? (
        <View style={[styles.markerBadge, { backgroundColor: theme.accent, borderColor: theme.cardInverted }]}>
          <Text style={[styles.markerBadgeText, { color: theme.accentText }]}>{memberCount > 99 ? '99+' : memberCount}</Text>
        </View>
      ) : null}
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  const theme = useTheme();

  return (
    <View style={[styles.miniStat, { backgroundColor: theme.overlay, borderColor: theme.borderStrong }]}>
      <Text style={[styles.miniLabel, { color: theme.accent }]}>{label}</Text>
      <Text style={[styles.miniValue, { color: theme.textInverse }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  vignetteTop: {
    height: 190,
    left: 0,
    opacity: 0.66,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  vignetteBottom: {
    bottom: 0,
    height: 280,
    left: 0,
    opacity: 0.78,
    position: 'absolute',
    right: 0,
  },
  header: {
    left: spacing.lg,
    position: 'absolute',
    right: spacing.lg,
    top: spacing.lg,
  },
  glassHeader: {
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    padding: spacing.lg,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 21,
    marginTop: spacing.xs,
  },
  controls: {
    position: 'absolute',
    right: spacing.lg,
    top: 160,
  },
  locationButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  locationToast: {
    borderRadius: radius.pill,
    borderWidth: 1,
    left: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: 'absolute',
    right: spacing.lg,
    top: 174,
  },
  locationToastText: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  sheet: {
    borderRadius: radius.xl,
    borderWidth: 1,
    bottom: 96,
    gap: spacing.md,
    left: spacing.lg,
    overflow: 'hidden',
    padding: spacing.lg,
    position: 'absolute',
    right: spacing.lg,
    ...shadows.glow,
  },
  sheetHandle: {
    alignSelf: 'center',
    borderRadius: radius.pill,
    height: 4,
    opacity: 0.82,
    width: 54,
  },
  sheetTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  sheetIcon: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  sheetCopy: {
    flex: 1,
    gap: 2,
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 29,
  },
  sheetMeta: {
    fontSize: 14,
    fontWeight: '800',
  },
  sheetBody: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  sheetStats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  miniStat: {
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    padding: spacing.md,
  },
  miniLabel: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  miniValue: {
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  markerWrap: {
    alignItems: 'center',
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  markerPulse: {
    borderRadius: radius.pill,
    borderWidth: 2,
    height: 42,
    position: 'absolute',
    width: 42,
  },
  marker: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 2,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  markerActive: {
    height: 40,
    width: 40,
  },
  markerCore: {
    borderRadius: radius.pill,
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
    right: 1,
    top: 0,
  },
  markerBadgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: radius.xl,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 58,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '900',
  },
});
