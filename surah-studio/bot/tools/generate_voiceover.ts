import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { packageDir, requireSurah } from "../lib/playlist.js";

const DEFAULT_MODEL = "eleven_multilingual_v2";

export default defineTool({
  description: prompt`
    Generate an Urdu voiceover with ElevenLabs for a Surah script. Requires
    ELEVENLABS_API_KEY. Optional ELEVENLABS_VOICE_ID selects the narrator voice.
    Saves voiceover.mp3 into the Surah package.
  `,
  inputSchema: z.object({
    surahNumber: z.number().int().min(1).max(114),
    urduScript: z
      .string()
      .min(40)
      .describe("Full Urdu narration script for the 7–8 minute video."),
    voiceId: z
      .string()
      .optional()
      .describe("Override ElevenLabs voice id. Defaults to ELEVENLABS_VOICE_ID."),
  }),
  effect: "idempotent",
  dryRunResult: ({ surahNumber }) => ({
    dryRun: true,
    surahNumber,
    generated: false,
    language: "ur",
  }),
  async execute({ surahNumber, urduScript, voiceId }, ctx) {
    const surah = requireSurah(surahNumber);
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const resolvedVoice =
      voiceId || process.env.ELEVENLABS_VOICE_ID || "";

    if (!apiKey) {
      return {
        generated: false,
        error: "missing_api_key",
        message:
          "Set ELEVENLABS_API_KEY (and preferably ELEVENLABS_VOICE_ID) as a secret, then retry.",
        surahNumber,
        language: "ur",
      };
    }

    if (!resolvedVoice) {
      return {
        generated: false,
        error: "missing_voice_id",
        message:
          "Set ELEVENLABS_VOICE_ID to an Urdu-capable ElevenLabs voice, or pass voiceId.",
        surahNumber,
        language: "ur",
      };
    }

    // ElevenLabs multilingual v2 handles Urdu narration.
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${resolvedVoice}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: urduScript,
        model_id: process.env.ELEVENLABS_MODEL_ID || DEFAULT_MODEL,
        language_code: "ur",
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return {
        generated: false,
        error: "elevenlabs_http_error",
        status: response.status,
        detail: detail.slice(0, 500),
        surahNumber,
        language: "ur",
      };
    }

    const audio = new Uint8Array(await response.arrayBuffer());
    const dir = packageDir(surahNumber);
    const audioPath = `${dir}/voiceover.mp3`;
    const scriptPath = `${dir}/script-urdu.txt`;

    await ctx.host.files.write(scriptPath, urduScript, { scope: "deployment" });
    await ctx.host.files.write(audioPath, audio, { scope: "deployment" });

    const metaPath = `${dir}/meta.json`;
    const existing = await ctx.host.files.read(metaPath, {
      scope: "deployment",
    });
    const now = new Date().toISOString();
    const meta = existing
      ? (JSON.parse(existing) as Record<string, unknown>)
      : {
          surahNumber,
          slug: `surah-${String(surahNumber).padStart(3, "0")}`,
          createdAt: now,
        };
    meta.status = "voiced";
    meta.updatedAt = now;
    meta.voiceoverPath = audioPath;
    meta.hasScript = true;
    meta.voiceLanguage = "ur";
    meta.voiceId = resolvedVoice;
    meta.bytes = audio.byteLength;
    await ctx.host.files.write(metaPath, JSON.stringify(meta, null, 2), {
      scope: "deployment",
    });

    return {
      generated: true,
      surahNumber,
      english: surah.english,
      urduName: surah.urduName,
      language: "ur",
      model: process.env.ELEVENLABS_MODEL_ID || DEFAULT_MODEL,
      voiceId: resolvedVoice,
      audioPath,
      scriptPath,
      bytes: audio.byteLength,
    };
  },
});
