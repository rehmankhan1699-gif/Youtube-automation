import { getSurah, packageSlug, SURAHS, type Surah } from "./surahs.js";

export const PLAYLIST_KV_KEY = "playlist/progress";

export type PlaylistProgress = {
  completedThrough: number;
  inProgress: number | null;
  completed: number[];
  updatedAt: string;
};

export type PackageStatus =
  | "started"
  | "scripted"
  | "voiced"
  | "packaged"
  | "complete";

export type SurahPackageMeta = {
  surahNumber: number;
  slug: string;
  status: PackageStatus;
  createdAt: string;
  updatedAt: string;
  voiceoverPath?: string;
  hasScript?: boolean;
  hasMotionBrief?: boolean;
  hasCaptions?: boolean;
  hasClipSchedule?: boolean;
  hasKeywords?: boolean;
  hasBestTimes?: boolean;
};

export function defaultProgress(): PlaylistProgress {
  return {
    completedThrough: 0,
    inProgress: null,
    completed: [],
    updatedAt: new Date().toISOString(),
  };
}

export function nextSurahNumber(progress: PlaylistProgress): number | null {
  if (progress.inProgress != null) return progress.inProgress;
  const next = progress.completedThrough + 1;
  if (next > SURAHS.length) return null;
  return next;
}

export function describeSurah(surah: Surah) {
  return {
    number: surah.number,
    arabic: surah.arabic,
    english: surah.english,
    urduName: surah.urduName,
    ayahs: surah.ayahs,
    revelation: surah.revelation,
    slug: packageSlug(surah.number),
  };
}

export function requireSurah(number: number): Surah {
  const surah = getSurah(number);
  if (!surah) {
    throw new Error(`Unknown Surah number: ${number}`);
  }
  return surah;
}

export function packageDir(number: number): string {
  return `packages/${packageSlug(number)}`;
}
