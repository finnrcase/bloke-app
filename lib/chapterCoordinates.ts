import { DirectoryChapter } from '@/types/chapters';

type CoordinateValue = DirectoryChapter['latitude'] | string | null | undefined;

export type MapReadyChapter = {
  chapter: DirectoryChapter;
  latitude: number;
  longitude: number;
};

type InvalidCoordinateReason = {
  chapterId: string;
  chapterName: string;
  latitude: CoordinateValue;
  longitude: CoordinateValue;
  reasons: string[];
};

type ChapterCoordinateDiagnostics = {
  invalidCoordinateReasons: InvalidCoordinateReason[];
  totalChapters: number;
  validMapReadyChapters: number;
};

function isMissingCoordinate(value: CoordinateValue) {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

function parseCoordinate(value: CoordinateValue) {
  if (isMissingCoordinate(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(Number(value)) ? parsed : null;
}

function getCoordinateReason(value: CoordinateValue, label: 'latitude' | 'longitude') {
  if (isMissingCoordinate(value)) {
    return `missing ${label}`;
  }

  const parsed = Number(value);

  if (!Number.isFinite(Number(value))) {
    return `invalid ${label}: ${String(value)}`;
  }

  if (label === 'latitude' && (parsed < -90 || parsed > 90)) {
    return `latitude out of range: ${parsed}`;
  }

  if (label === 'longitude' && (parsed < -180 || parsed > 180)) {
    return `longitude out of range: ${parsed}`;
  }

  return null;
}

export function hasValidCoordinates(latitude: CoordinateValue, longitude: CoordinateValue) {
  return !getCoordinateReason(latitude, 'latitude') && !getCoordinateReason(longitude, 'longitude');
}

export function getMapReadyChapters(chapters: DirectoryChapter[]): MapReadyChapter[] {
  return chapters
    .map((chapter) => {
      const latitude = parseCoordinate(chapter.latitude);
      const longitude = parseCoordinate(chapter.longitude);

      return {
        chapter,
        isMapReady: hasValidCoordinates(chapter.latitude, chapter.longitude),
        latitude,
        longitude,
      };
    })
    .filter((row) => row.isMapReady)
    .map((row) => ({
      chapter: row.chapter,
      latitude: row.latitude as number,
      longitude: row.longitude as number,
    }));
}

export function getChapterCoordinateDiagnostics(chapters: DirectoryChapter[]): ChapterCoordinateDiagnostics {
  const invalidCoordinateReasons = chapters
    .map((chapter) => {
      const reasons = [
        getCoordinateReason(chapter.latitude, 'latitude'),
        getCoordinateReason(chapter.longitude, 'longitude'),
      ].filter((reason): reason is string => Boolean(reason));

      return {
        chapterId: chapter.id,
        chapterName: chapter.name,
        latitude: chapter.latitude,
        longitude: chapter.longitude,
        reasons,
      };
    })
    .filter((item) => item.reasons.length > 0);

  return {
    invalidCoordinateReasons,
    totalChapters: chapters.length,
    validMapReadyChapters: getMapReadyChapters(chapters).length,
  };
}

export function logChapterCoordinateDiagnostics(scope: string, chapters: DirectoryChapter[]) {
  const diagnostics = getChapterCoordinateDiagnostics(chapters);

  console.debug(`[chapter-map:${scope}] total chapters`, diagnostics.totalChapters);
  console.debug(`[chapter-map:${scope}] valid map-ready chapters`, diagnostics.validMapReadyChapters);
  console.debug(`[chapter-map:${scope}] invalid coordinate reasons`, diagnostics.invalidCoordinateReasons);
}
