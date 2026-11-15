import type { Surah } from "./surahs.js";

/** Seed keyword research for Urdu Islamic YouTube / Instagram niches. */
export function buildKeywordPack(surah: Surah) {
  const en = surah.english;
  const ur = surah.urduName;
  const n = surah.number;

  const primary = [
    `${ur} خلاصہ`,
    `${en} summary Urdu`,
    `سورۃ ${en} crux`,
    `${ur} تفسیر مختصر`,
    `Surah ${en} explained in Urdu`,
  ];

  const secondary = [
    `قرآن خلاصہ سیریز`,
    `islamic motion graphics urdu`,
    `surah ${n} meaning`,
    `${en} lessons`,
    `quran short explanation urdu`,
    `رمضان قرآن ویڈیو`,
  ];

  const hashtags = [
    "#قرآن",
    "#اسلام",
    `#سورۃ_${en.replace(/[^A-Za-z]/g, "")}`,
    "#IslamicShorts",
    "#Quran",
    "#Urdu",
    "#یوٹیوب_اسلامی",
  ];

  return {
    primary,
    secondary,
    hashtags,
    titleFormulas: [
      `${ur} کا خلاصہ | Surah ${en} Explained in Urdu`,
      `Surah ${en} (${ur}) — 7 منٹ میں پورا مطلب`,
      `${en} کی اصل تعلیم کیا ہے؟ | ${ur}`,
    ],
    notes:
      "Seed pack for Urdu Islamic content. Rank by search volume in YouTube Studio / Keyword tools before final titles.",
  };
}

export type AudienceTimezone = "Asia/Karachi" | "Asia/Dubai" | "Asia/Riyadh";

/** Best-window heuristics for Urdu Islamic audiences (PK/IN + Gulf viewers). */
export function buildBestPostingTimes(options?: {
  timezone?: AudienceTimezone;
  asOfIso?: string;
}) {
  const timezone = options?.timezone ?? "Asia/Karachi";
  const asOf = options?.asOfIso ? new Date(options.asOfIso) : new Date();

  const youtubeWindows = [
    {
      platform: "youtube" as const,
      label: "Weeknight prime",
      localDays: ["Thu", "Fri", "Sat"],
      localTime: "20:00",
      reason: "After Maghrib/Isha family viewing; high watch-time for 7–8 min explainers.",
    },
    {
      platform: "youtube" as const,
      label: "Friday after Jumu'ah",
      localDays: ["Fri"],
      localTime: "14:30",
      reason: "Post-Jumu'ah discovery spike for Islamic long-form.",
    },
    {
      platform: "youtube" as const,
      label: "Sunday morning reflection",
      localDays: ["Sun"],
      localTime: "10:00",
      reason: "Weekend reflection audience; good for playlist binge.",
    },
  ];

  const instagramWindows = [
    {
      platform: "instagram" as const,
      label: "Evening Reels scroll",
      localDays: ["Wed", "Thu", "Fri", "Sat"],
      localTime: "21:00",
      reason: "Peak Reels session for Urdu Islamic clips.",
    },
    {
      platform: "instagram" as const,
      label: "Fajr reminder window",
      localDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      localTime: "06:30",
      reason: "Morning spiritual content performs for Stories/Reels hooks.",
    },
    {
      platform: "instagram" as const,
      label: "Lunch break shorts",
      localDays: ["Mon", "Tue", "Wed", "Thu"],
      localTime: "13:00",
      reason: "Midday scroll; good for 30–60s clip drops.",
    },
  ];

  return {
    timezone,
    researchedAt: asOf.toISOString(),
    method:
      "Niche heuristics for Urdu Islamic YouTube/Instagram (Pakistan primary, Gulf secondary). Replace with channel analytics once available.",
    youtubeWindows,
    instagramWindows,
    recommendation:
      "Schedule the long video on Thu/Fri 20:00 Asia/Karachi, then drip 3–5 Reels across the next 48h at 21:00 and 06:30.",
  };
}

export function nextSlotsFromWindows(
  windows: Array<{
    platform: "youtube" | "instagram";
    label: string;
    localDays: string[];
    localTime: string;
  }>,
  count: number,
  timezone: string,
  fromIso?: string,
) {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const start = fromIso ? new Date(fromIso) : new Date();
  const slots: Array<{
    platform: "youtube" | "instagram";
    label: string;
    scheduledForLocal: string;
    timezone: string;
  }> = [];

  for (let dayOffset = 0; dayOffset < 21 && slots.length < count; dayOffset++) {
    const d = new Date(start.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    const localDay = dayNames[d.getUTCDay()];
    for (const w of windows) {
      if (!w.localDays.includes(localDay)) continue;
      if (slots.length >= count) break;
      const [hh, mm] = w.localTime.split(":").map(Number);
      const scheduled = new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hh, mm),
      );
      if (scheduled <= start) continue;
      slots.push({
        platform: w.platform,
        label: w.label,
        scheduledForLocal: `${scheduled.toISOString().slice(0, 10)} ${w.localTime}`,
        timezone,
      });
    }
  }

  return slots;
}
