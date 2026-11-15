import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import {
  defaultProgress,
  describeSurah,
  nextSurahNumber,
  packageDir,
  PLAYLIST_KV_KEY,
  requireSurah,
  type PlaylistProgress,
  type SurahPackageMeta,
} from "../lib/playlist.js";

export default defineTool({
  description: prompt`
    Start production for the next Surah in the 1–114 playlist (or resume the
    Surah already in progress). Creates package metadata under packages/.
    Call this when the user says "next" or asks to produce the next video.
  `,
  inputSchema: z.object({
    surahNumber: z
      .number()
      .int()
      .min(1)
      .max(114)
      .optional()
      .describe("Override which Surah to start; default is playlist next."),
  }),
  effect: "write",
  dryRunResult: ({ surahNumber }) => ({
    dryRun: true,
    started: false,
    surahNumber: surahNumber ?? null,
  }),
  async execute({ surahNumber }, ctx) {
    const stored = (await ctx.host.kv.get(PLAYLIST_KV_KEY)) as
      | PlaylistProgress
      | undefined;
    const progress = stored ?? defaultProgress();
    const target = surahNumber ?? nextSurahNumber(progress);

    if (target == null) {
      return {
        started: false,
        playlistComplete: true,
        message: "All 114 Surahs are already completed.",
      };
    }

    const surah = requireSurah(target);
    const now = new Date().toISOString();
    const dir = packageDir(target);
    const metaPath = `${dir}/meta.json`;

    const existingRaw = await ctx.host.files.read(metaPath, {
      scope: "deployment",
    });
    let meta: SurahPackageMeta;
    if (existingRaw) {
      meta = JSON.parse(existingRaw) as SurahPackageMeta;
      meta.updatedAt = now;
    } else {
      meta = {
        surahNumber: target,
        slug: describeSurah(surah).slug,
        status: "started",
        createdAt: now,
        updatedAt: now,
      };
      await ctx.host.files.write(metaPath, JSON.stringify(meta, null, 2), {
        scope: "deployment",
      });
    }

    progress.inProgress = target;
    progress.updatedAt = now;
    await ctx.host.kv.put(PLAYLIST_KV_KEY, progress);

    return {
      started: true,
      resumed: Boolean(existingRaw),
      surah: describeSurah(surah),
      packageDir: dir,
      meta,
      nextSteps: [
        "Write a 7–8 minute Urdu crux script (skill: urdu-surah-script).",
        "Call generate_voiceover with the Urdu script.",
        "Call research_keywords and research_best_times.",
        "Draft motion brief, captions, and clip schedule; call save_package.",
      ],
    };
  },
});
