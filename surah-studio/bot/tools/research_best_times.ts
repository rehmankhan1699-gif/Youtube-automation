import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import {
  buildBestPostingTimes,
  nextSlotsFromWindows,
  type AudienceTimezone,
} from "../lib/audience.js";
import { packageDir } from "../lib/playlist.js";

export default defineTool({
  description: prompt`
    Research best posting windows for Urdu Islamic YouTube long-form and
    Instagram Reels, then propose concrete schedule slots. Persist under the
    Surah package when surahNumber is set.
  `,
  inputSchema: z.object({
    surahNumber: z.number().int().min(1).max(114).optional(),
    timezone: z
      .enum(["Asia/Karachi", "Asia/Dubai", "Asia/Riyadh"])
      .optional()
      .describe("Audience timezone. Default Asia/Karachi."),
    clipCount: z
      .number()
      .int()
      .min(1)
      .max(10)
      .optional()
      .describe("How many clip slots to propose. Default 5."),
    persist: z.boolean().optional(),
  }),
  effect: "idempotent",
  dryRunResult: ({ surahNumber }) => ({
    dryRun: true,
    surahNumber: surahNumber ?? null,
    persisted: false,
  }),
  async execute(
    {
      surahNumber,
      timezone = "Asia/Karachi",
      clipCount = 5,
      persist = true,
    },
    ctx,
  ) {
    const research = buildBestPostingTimes({
      timezone: timezone as AudienceTimezone,
    });
    const longFormSlots = nextSlotsFromWindows(
      research.youtubeWindows,
      2,
      timezone,
    );
    const clipSlots = nextSlotsFromWindows(
      research.instagramWindows,
      clipCount,
      timezone,
    );

    const payload = {
      surahNumber: surahNumber ?? null,
      ...research,
      proposedLongFormSlots: longFormSlots,
      proposedClipSlots: clipSlots,
    };

    let path: string | undefined;
    if (persist && surahNumber != null) {
      path = `${packageDir(surahNumber)}/best-times.json`;
      await ctx.host.files.write(path, JSON.stringify(payload, null, 2), {
        scope: "deployment",
      });
    }

    return { ...payload, persisted: Boolean(path), path };
  },
});
