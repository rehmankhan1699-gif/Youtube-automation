import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import {
  defaultProgress,
  describeSurah,
  packageDir,
  PLAYLIST_KV_KEY,
  requireSurah,
  type PlaylistProgress,
  type SurahPackageMeta,
} from "../lib/playlist.js";

export default defineTool({
  description: prompt`
    Save the full Surah deliverable package: Urdu script summary fields,
    motion-graphics brief, YouTube + Instagram captions, clip cut list, and
    schedule. Marks the Surah complete and advances the playlist when
    markComplete is true.
  `,
  inputSchema: z.object({
    surahNumber: z.number().int().min(1).max(114),
    urduScript: z.string().min(40).describe("Final Urdu narration script."),
    motionBrief: z
      .string()
      .min(40)
      .describe("Scene-by-scene motion graphics brief synced to narration."),
    youtube: z.object({
      title: z.string().min(5),
      description: z.string().min(20),
      tags: z.array(z.string()).min(3),
    }),
    instagram: z.object({
      caption: z.string().min(20),
      hashtags: z.array(z.string()).min(3),
    }),
    clips: z
      .array(
        z.object({
          title: z.string(),
          startSec: z.number().nonnegative(),
          endSec: z.number().positive(),
          hook: z.string(),
          platform: z.enum(["youtube_shorts", "instagram_reels"]),
          scheduledForLocal: z.string().optional(),
        }),
      )
      .min(1),
    longFormSchedule: z
      .object({
        platform: z.literal("youtube"),
        scheduledForLocal: z.string(),
        timezone: z.string(),
      })
      .optional(),
    markComplete: z
      .boolean()
      .optional()
      .describe("Advance playlist after save. Default true."),
  }),
  effect: "write",
  dryRunResult: ({ surahNumber }) => ({
    dryRun: true,
    surahNumber,
    saved: false,
  }),
  async execute(input, ctx) {
    const surah = requireSurah(input.surahNumber);
    const dir = packageDir(input.surahNumber);
    const now = new Date().toISOString();
    const markComplete = input.markComplete ?? true;

    const files: Record<string, string> = {
      "script-urdu.txt": input.urduScript,
      "motion-brief.md": input.motionBrief,
      "youtube.json": JSON.stringify(input.youtube, null, 2),
      "instagram.json": JSON.stringify(input.instagram, null, 2),
      "clips.json": JSON.stringify(
        {
          clips: input.clips,
          longFormSchedule: input.longFormSchedule ?? null,
          savedAt: now,
        },
        null,
        2,
      ),
    };

    for (const [name, body] of Object.entries(files)) {
      await ctx.host.files.write(`${dir}/${name}`, body, {
        scope: "deployment",
      });
    }

    const metaPath = `${dir}/meta.json`;
    const existing = await ctx.host.files.read(metaPath, {
      scope: "deployment",
    });
    const meta: SurahPackageMeta = existing
      ? (JSON.parse(existing) as SurahPackageMeta)
      : {
          surahNumber: input.surahNumber,
          slug: describeSurah(surah).slug,
          status: "started",
          createdAt: now,
          updatedAt: now,
        };

    meta.updatedAt = now;
    meta.hasScript = true;
    meta.hasMotionBrief = true;
    meta.hasCaptions = true;
    meta.hasClipSchedule = true;
    meta.status = markComplete ? "complete" : "packaged";
    await ctx.host.files.write(metaPath, JSON.stringify(meta, null, 2), {
      scope: "deployment",
    });

    const stored = (await ctx.host.kv.get(PLAYLIST_KV_KEY)) as
      | PlaylistProgress
      | undefined;
    const progress = stored ?? defaultProgress();

    if (markComplete) {
      if (!progress.completed.includes(input.surahNumber)) {
        progress.completed.push(input.surahNumber);
      }
      progress.completedThrough = Math.max(
        progress.completedThrough,
        input.surahNumber,
      );
      if (progress.inProgress === input.surahNumber) {
        progress.inProgress = null;
      }
      progress.updatedAt = now;
      await ctx.host.kv.put(PLAYLIST_KV_KEY, progress);
    }

    const nextNumber =
      progress.inProgress ??
      (progress.completedThrough < 114 ? progress.completedThrough + 1 : null);

    return {
      saved: true,
      surah: describeSurah(surah),
      packageDir: dir,
      files: Object.keys(files).map((name) => `${dir}/${name}`),
      meta,
      playlist: {
        completedThrough: progress.completedThrough,
        inProgress: progress.inProgress,
        nextSurahNumber: nextNumber,
      },
      postingNote:
        "Package is ready. Connect YouTube/Instagram APIs later for live upload; schedule fields are stored in clips.json.",
    };
  },
});
