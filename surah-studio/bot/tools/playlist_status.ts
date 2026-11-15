import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import {
  defaultProgress,
  describeSurah,
  nextSurahNumber,
  PLAYLIST_KV_KEY,
  type PlaylistProgress,
} from "../lib/playlist.js";
import { getSurah, SURAHS } from "../lib/surahs.js";

export default defineTool({
  description: prompt`
    Read Quran Surah playlist progress: completed count, in-progress Surah,
    and which Surah is next. Call this before starting work or when the user
    asks where the series stands.
  `,
  inputSchema: z.object({}),
  effect: "read",
  async execute(_input, ctx) {
    const stored = (await ctx.host.kv.get(PLAYLIST_KV_KEY)) as
      | PlaylistProgress
      | undefined;
    const progress = stored ?? defaultProgress();
    const nextNumber = nextSurahNumber(progress);
    const next = nextNumber != null ? getSurah(nextNumber) : undefined;

    return {
      totalSurahs: SURAHS.length,
      completedThrough: progress.completedThrough,
      completedCount: progress.completed.length,
      inProgress: progress.inProgress,
      nextSurah: next ? describeSurah(next) : null,
      updatedAt: progress.updatedAt,
      playlistComplete: nextNumber == null,
    };
  },
});
