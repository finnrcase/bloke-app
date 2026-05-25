import 'maplibre-gl/dist/maplibre-gl.css';

import { Navigation } from 'lucide-react-native';
import maplibregl, { GeoJSONSource, MapLayerMouseEvent } from 'maplibre-gl';
import { useEffect, useMemo, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';

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

type ChapterFeatureProperties = {
  chapterId: string;
  memberCount: number;
  title: string;
};

const rasterTileUrl = 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

function getFeatureCollection(chapters: DirectoryChapter[]) {
  const points = getMapReadyChapters(chapters);

  return {
    features: points.map(({ chapter, latitude, longitude }) => ({
      geometry: {
        coordinates: [longitude, latitude],
        type: 'Point' as const,
      },
      properties: {
        chapterId: chapter.id,
        memberCount: chapter.member_count ?? 0,
        title: chapter.name,
      },
      type: 'Feature' as const,
    })),
    type: 'FeatureCollection' as const,
  };
}

function getConnectionCollection(chapters: DirectoryChapter[]) {
  const points = getMapReadyChapters(chapters);

  if (points.length < 2) {
    return { features: [], type: 'FeatureCollection' as const };
  }

  const orderedPoints = [...points].sort((a, b) => a.longitude - b.longitude);

  return {
    features: [
      {
        geometry: {
          coordinates: orderedPoints.map((point) => [point.longitude, point.latitude]),
          type: 'LineString' as const,
        },
        properties: {},
        type: 'Feature' as const,
      },
    ],
    type: 'FeatureCollection' as const,
  };
}

function getBounds(chapters: DirectoryChapter[]) {
  const points = getMapReadyChapters(chapters);
  if (points.length === 0) return null;

  const bounds = new maplibregl.LngLatBounds();
  points.forEach((point) => bounds.extend([point.longitude, point.latitude]));
  return bounds;
}

export function PremiumChapterMap({
  chapters,
  onOpenChapter,
  onSelectChapter,
  selectedChapter,
}: PremiumChapterMapProps) {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const chaptersRef = useRef(chapters);
  const selectedChapterRef = useRef(selectedChapter);
  const features = useMemo(() => getFeatureCollection(chapters), [chapters]);
  const connections = useMemo(() => getConnectionCollection(chapters), [chapters]);
  const mapReadyCount = features.features.length;

  useEffect(() => {
    chaptersRef.current = chapters;
  }, [chapters]);

  useEffect(() => {
    selectedChapterRef.current = selectedChapter;
  }, [selectedChapter]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialBounds = getBounds(chaptersRef.current);
    const map = new maplibregl.Map({
      attributionControl: false,
      center: initialBounds ? initialBounds.getCenter().toArray() : [-98.5795, 39.8283],
      container: containerRef.current,
      dragRotate: false,
      maxPitch: 62,
      minZoom: 1.4,
      pitch: 44,
      style: {
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        layers: [
          {
            id: 'carto-dark-geography',
            source: 'carto-dark',
            type: 'raster',
          },
        ],
        sources: {
          'carto-dark': {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
            tiles: [rasterTileUrl],
            tileSize: 256,
            type: 'raster',
          },
        },
        version: 8,
      },
      zoom: initialBounds ? 4 : 3,
    });

    mapRef.current = map;

    map.addControl(
      new maplibregl.NavigationControl({
        showCompass: false,
        visualizePitch: true,
      }),
      'bottom-right',
    );

    map.on('load', () => {
      map.addSource('chapter-connections', {
        data: connections,
        type: 'geojson',
      });

      map.addSource('chapters', {
        cluster: true,
        clusterMaxZoom: 7,
        clusterRadius: 52,
        data: features,
        type: 'geojson',
      });

      map.addLayer({
        id: 'connection-glow',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-blur': 2,
          'line-color': '#D1A24F',
          'line-opacity': 0.2,
          'line-width': 2,
        },
        source: 'chapter-connections',
        type: 'line',
      });

      map.addLayer({
        filter: ['has', 'point_count'],
        id: 'chapter-cluster-glow',
        paint: {
          'circle-blur': 1,
          'circle-color': '#D1A24F',
          'circle-opacity': 0.28,
          'circle-radius': ['step', ['get', 'point_count'], 38, 4, 48, 10, 60],
        },
        source: 'chapters',
        type: 'circle',
      });

      map.addLayer({
        filter: ['has', 'point_count'],
        id: 'chapter-clusters',
        paint: {
          'circle-color': '#11100E',
          'circle-opacity': 0.94,
          'circle-radius': ['step', ['get', 'point_count'], 20, 4, 26, 10, 34],
          'circle-stroke-color': '#D1A24F',
          'circle-stroke-width': 2,
        },
        source: 'chapters',
        type: 'circle',
      });

      map.addLayer({
        filter: ['has', 'point_count'],
        id: 'chapter-cluster-count',
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 12,
        },
        paint: {
          'text-color': '#FFF7EA',
          'text-halo-color': '#050505',
          'text-halo-width': 1,
        },
        source: 'chapters',
        type: 'symbol',
      });

      map.addLayer({
        filter: ['!', ['has', 'point_count']],
        id: 'chapter-node-glow',
        paint: {
          'circle-blur': 1,
          'circle-color': '#D1A24F',
          'circle-opacity': 0.35,
          'circle-radius': 30,
        },
        source: 'chapters',
        type: 'circle',
      });

      map.addLayer({
        filter: ['!', ['has', 'point_count']],
        id: 'chapter-nodes',
        paint: {
          'circle-color': '#0F0D0A',
          'circle-radius': 12,
          'circle-stroke-color': '#D1A24F',
          'circle-stroke-width': 2.5,
        },
        source: 'chapters',
        type: 'circle',
      });

      map.addLayer({
        filter: ['!', ['has', 'point_count']],
        id: 'chapter-node-core',
        paint: {
          'circle-color': '#D1A24F',
          'circle-radius': 4,
          'circle-stroke-color': '#100D09',
          'circle-stroke-width': 1,
        },
        source: 'chapters',
        type: 'circle',
      });

      map.addLayer({
        filter: ['==', ['get', 'chapterId'], selectedChapterRef.current?.id ?? ''],
        id: 'selected-chapter-halo',
        paint: {
          'circle-blur': 0.25,
          'circle-color': 'rgba(255, 247, 234, 0)',
          'circle-radius': 24,
          'circle-stroke-color': '#FFF7EA',
          'circle-stroke-opacity': 0.85,
          'circle-stroke-width': 2,
        },
        source: 'chapters',
        type: 'circle',
      });

      map.addLayer({
        filter: ['!', ['has', 'point_count']],
        id: 'chapter-member-count',
        layout: {
          'text-field': ['to-string', ['get', 'memberCount']],
          'text-font': ['Noto Sans Bold'],
          'text-offset': [1.35, -1.15],
          'text-size': 10,
        },
        paint: {
          'text-color': '#100D09',
          'text-halo-color': '#D1A24F',
          'text-halo-width': 5,
        },
        source: 'chapters',
        type: 'symbol',
      });

      if (initialBounds) {
        map.fitBounds(initialBounds, {
          duration: 850,
          maxZoom: 9,
          padding: { bottom: 220, left: 48, right: 48, top: 145 },
        });
      }
    });

    const selectFeature = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const properties = feature?.properties as Partial<ChapterFeatureProperties> | undefined;
      const chapter = chaptersRef.current.find((item) => item.id === properties?.chapterId);

      if (!feature || !chapter || feature.geometry.type !== 'Point') return;
      const coordinates = feature.geometry.coordinates as [number, number];
      onSelectChapter(chapter);
      map.easeTo({ center: coordinates, duration: 650, padding: { bottom: 180, top: 80 }, zoom: Math.max(map.getZoom(), 8.5) });
    };

    map.on('click', 'chapter-nodes', selectFeature);
    map.on('click', 'chapter-node-core', selectFeature);
    map.on('click', 'chapter-clusters', async (event) => {
      const feature = event.features?.[0];
      const clusterId = feature?.properties?.cluster_id;
      const source = map.getSource('chapters') as GeoJSONSource | undefined;

      if (!feature || !source || typeof clusterId !== 'number' || feature.geometry.type !== 'Point') return;

      const zoom = await source.getClusterExpansionZoom(clusterId);
      map.easeTo({ center: feature.geometry.coordinates as [number, number], duration: 620, zoom });
    });

    ['chapter-nodes', 'chapter-node-core', 'chapter-clusters'].forEach((layerId) => {
      map.on('mouseenter', layerId, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = '';
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [connections, features, onSelectChapter]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const chapterSource = map.getSource('chapters') as GeoJSONSource | undefined;
    const connectionSource = map.getSource('chapter-connections') as GeoJSONSource | undefined;

    chapterSource?.setData(features);
    connectionSource?.setData(connections);

    const bounds = getBounds(chapters);
    if (bounds) {
      map.fitBounds(bounds, {
        duration: 720,
        maxZoom: 9,
        padding: { bottom: selectedChapter ? 245 : 170, left: 44, right: 44, top: 132 },
      });
    }
  }, [chapters, connections, features, selectedChapter]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer('selected-chapter-halo')) return;

    map.setFilter('selected-chapter-halo', ['==', ['get', 'chapterId'], selectedChapter?.id ?? '']);
  }, [selectedChapter]);

  return (
    <View style={{ backgroundColor: theme.cardInverted, flex: 1, minHeight: 720, overflow: 'hidden', position: 'relative' }}>
      <div ref={containerRef} style={{ bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 }} />

      <div
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(209, 162, 79, 0.08), transparent 32%), linear-gradient(180deg, rgba(7,6,5,0.76), transparent 27%, transparent 58%, rgba(7,6,5,0.88))',
          inset: 0,
          pointerEvents: 'none',
          position: 'absolute',
        }}
      />

      <div aria-hidden="true" className="bloke-map-scanlines" />

      <style>{`
        .maplibregl-ctrl-bottom-right {
          bottom: 88px;
          right: 18px;
        }

        .maplibregl-ctrl-group {
          background: rgba(0, 0, 0, 0.62);
          border: 1px solid rgba(209, 162, 79, 0.36);
          border-radius: 999px;
          overflow: hidden;
        }

        .maplibregl-ctrl button {
          height: 36px;
          width: 36px;
        }

        .bloke-map-scanlines {
          background-image:
            linear-gradient(rgba(209, 162, 79, 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 247, 234, 0.04) 1px, transparent 1px);
          background-size: 118px 118px, 118px 118px;
          inset: 0;
          opacity: 0.28;
          pointer-events: none;
          position: absolute;
        }

        @media (max-width: 720px) {
          .maplibregl-ctrl-bottom-right {
            bottom: 242px;
          }
        }
      `}</style>

      <View
        pointerEvents="none"
        style={{
          left: spacing.lg,
          position: 'absolute',
          right: spacing.lg,
          top: spacing.lg,
        }}>
        <View
          style={{
            backgroundColor: theme.overlay,
            borderColor: theme.accentBorder,
            borderRadius: radius.xl,
            borderWidth: 1,
            padding: spacing.lg,
            ...shadows.card,
          }}>
          <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' }}>
            Live geographic map
          </Text>
          <Text style={{ color: theme.textInverse, fontSize: 34, fontWeight: '900', lineHeight: 40 }}>
            Bloke chapters nearby.
          </Text>
          <Text style={{ color: theme.textInverseMuted, fontSize: 15, fontWeight: '800', lineHeight: 21, marginTop: spacing.xs }}>
            {mapReadyCount} real locations rendered over roads, coastlines, cities, and terrain.
          </Text>
        </View>
      </View>

      <View
        style={{
          position: 'absolute',
          right: spacing.lg,
          top: 164,
        }}>
        <View
          style={{
            alignItems: 'center',
            backgroundColor: theme.overlay,
            borderColor: theme.accentBorder,
            borderRadius: radius.pill,
            borderWidth: 1,
            height: 52,
            justifyContent: 'center',
            width: 52,
          }}>
          <Navigation color={theme.accent} size={20} strokeWidth={2.8} />
        </View>
      </View>

      {selectedChapter ? (
        <View
          style={{
            backgroundColor: theme.overlay,
            borderColor: theme.accentBorder,
            borderRadius: radius.xl,
            borderWidth: 1,
            bottom: 96,
            gap: spacing.md,
            left: spacing.lg,
            padding: spacing.lg,
            position: 'absolute',
            right: spacing.lg,
            ...shadows.glow,
          }}>
          <View
            style={{
              alignSelf: 'center',
              backgroundColor: theme.accentBorder,
              borderRadius: radius.pill,
              height: 4,
              opacity: 0.82,
              width: 54,
            }}
          />
          <Text style={{ color: theme.textInverse, fontSize: 24, fontWeight: '900', lineHeight: 29 }}>
            {selectedChapter.name}
          </Text>
          <Text style={{ color: theme.textInverseMuted, fontSize: 14, fontWeight: '800' }}>
            {[selectedChapter.region, selectedChapter.country].filter(Boolean).join(', ') || 'Location pending'} ·{' '}
            {selectedChapter.member_count ?? 0} members · {selectedChapter.meeting_day ?? 'Meets TBD'}
          </Text>
          <Text style={{ color: theme.textInverseMuted, fontSize: 15, fontWeight: '700', lineHeight: 22 }} numberOfLines={2}>
            {selectedChapter.description ?? 'A local chapter for discipline, accountability, and brotherhood.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => onOpenChapter(selectedChapter)}
            style={{
              alignItems: 'center',
              backgroundColor: theme.accent,
              borderColor: theme.accent,
              borderRadius: radius.xl,
              borderWidth: 1,
              justifyContent: 'center',
              minHeight: 58,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
            }}>
            <Text style={{ color: theme.accentText, fontSize: 16, fontWeight: '900' }}>Open Chapter</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
