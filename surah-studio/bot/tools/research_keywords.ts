import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { buildKeywordPack } from "../lib/audience.js";
import { packageDir, requireSurah } from "../lib/playlist.js";

export default defineTool({
  description: prompt`
    Build a high-intent keyword and title pack for a Surah video aimed at
    Urdu Islamic YouTube and Instagram audiences. Persist under the Surah
    package when surahNumber is provided.
  `,
  inputSchema: z.object({
    surahNumber: z.number().int().min(1).max(114),
    persist: z
      .boolean()
      .optional()
      .describe("Write keywords.json into the package. Default true."),
  }),
  effect: "idempotent",
  dryRunResult: ({ surahNumber }) => ({
    dryRun: true,
    surahNumber,
    persisted: false,
  }),
  async execute({ surahNumber, persist = true }, ctx) {
    const surah = requireSurah(surahNumber);
    const pack = buildKeywordPack(surah);
    const payload = {
      surahNumber,
      english: surah.english,
      urduName: surah.urduName,
      ...pack,
      generatedAt: new Date().toISOString(),
    };

    let path: string | undefined;
    if (persist) {
      path = `${packageDir(surahNumber)}/keywords.json`;
      await ctx.host.files.write(path, JSON.stringify(payload, null, 2), {
        scope: "deployment",
      });
    }

    return { ...payload, persisted: persist, path };
  },
});
