#!/usr/bin/env python3
"""Render a 20s Al-Fatihah motion-graphics test clip (no ElevenLabs)."""

from __future__ import annotations

import math
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT_MP4 = ROOT / "packages" / "surah-001" / "test-20s.mp4"

W, H = 1280, 720
FPS = 30
DURATION = 20
FRAMES = FPS * DURATION

FONT_UR = "/usr/share/fonts/truetype/noto/NotoNastaliqUrdu-Regular.ttf"
FONT_AR = "/usr/share/fonts/truetype/noto/NotoNaskhArabic-Bold.ttf"
FONT_EN = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

SCENES = [
    (0.0, 3.5, [
        ("ar", "سورة الفاتحة"),
        ("ur", "سورۃ الفاتحہ"),
        ("en", "20s motion test"),
    ]),
    (3.5, 7.0, [
        ("ar", "بسم الله الرحمن الرحيم"),
        ("ur", "شروع اللہ کے نام سے"),
    ]),
    (7.0, 12.0, [
        ("ur", "یہ سورت اللہ کی حمد"),
        ("ur", "اور سیدھے راستے کی دعا ہے"),
        ("en", "Praise · Guidance · Mercy"),
    ]),
    (12.0, 16.5, [
        ("ur", "ہر نماز میں یہ دعا دہرائیں"),
        ("ur", "اور دل سے ہدایت مانگیں"),
    ]),
    (16.5, 20.0, [
        ("ur", "اگلی قسط جلد آ رہی ہے"),
        ("en", "Surah Series · Test Cut"),
    ]),
]


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def ease(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def bg_for(frame_i: int) -> Image.Image:
    t = frame_i / FRAMES
    img = Image.new("RGB", (W, H))
    px = img.load()
    for y in range(H):
        gy = y / H
        r = int(8 + 18 * gy + 10 * math.sin(t * 6 + gy * 3))
        g = int(28 + 40 * (1 - gy) + 12 * math.cos(t * 4 + gy))
        b = int(24 + 36 * gy + 8 * math.sin(t * 5))
        for x in range(0, W, 4):
            nx = (x / W) - 0.5
            ny = gy - 0.45
            glow = math.exp(-(nx * nx * 4 + ny * ny * 5)) * (
                0.35 + 0.15 * math.sin(t * 8)
            )
            rr = min(255, int(r + 90 * glow))
            gg = min(255, int(g + 70 * glow))
            bb = min(255, int(b + 20 * glow))
            for dx in range(4):
                if x + dx < W:
                    px[x + dx, y] = (rr, gg, bb)
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    cx, cy = W // 2, int(H * 0.42)
    for i, rad in enumerate(range(120, 420, 55)):
        a = int(18 + 10 * math.sin(t * 5 + i))
        d.ellipse(
            [cx - rad, cy - rad // 2, cx + rad, cy + rad // 2],
            outline=(212, 175, 55, a),
            width=2,
        )
    return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")


def text_width(draw: ImageDraw.ImageDraw, text: str, fnt, language: str | None) -> int:
    kwargs = {"language": language, "direction": "rtl"} if language else {}
    bbox = draw.textbbox((0, 0), text, font=fnt, **kwargs)
    return bbox[2] - bbox[0]


def draw_centered(
    draw: ImageDraw.ImageDraw,
    text: str,
    y: int,
    fnt,
    fill: tuple[int, int, int],
    opacity: int,
    language: str | None,
) -> None:
    kwargs = {"language": language, "direction": "rtl"} if language else {}
    tw = text_width(draw, text, fnt, language)
    x = (W - tw) // 2
    draw.text((x + 2, y + 2), text, font=fnt, fill=(0, 0, 0, min(140, opacity)), **kwargs)
    draw.text((x, y), text, font=fnt, fill=(*fill, opacity), **kwargs)


def active_scene(sec: float):
    for s0, s1, lines in SCENES:
        if s0 <= sec < s1:
            return lines, s0, s1
    return SCENES[-1][2], SCENES[-1][0], SCENES[-1][1]


def main() -> None:
    OUT_MP4.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="surah-test-") as tmp:
        out = Path(tmp)
        for i in range(FRAMES):
            sec = i / FPS
            base = bg_for(i)
            layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            draw = ImageDraw.Draw(layer)
            lines, s0, s1 = active_scene(sec)
            fade_in = ease(min(1.0, (sec - s0) / 0.6))
            fade_out = ease(min(1.0, (s1 - sec) / 0.5))
            opacity = int(255 * fade_in * fade_out)
            rise = int((1 - fade_in) * 24)

            brand = "SURAH STUDIO  ·  TEST"
            bf = font(FONT_EN, 18)
            bb = draw.textbbox((0, 0), brand, font=bf)
            bx = (W - (bb[2] - bb[0])) // 2
            draw.text(
                (bx, 36),
                brand,
                font=bf,
                fill=(212, 175, 55, min(180, opacity + 40)),
            )

            y = 210 + rise
            for typ, raw in lines:
                if typ == "ar":
                    fnt = font(FONT_AR, 64 if "بسم" in raw else 72)
                    fill = (245, 230, 180)
                    lang = "ar"
                elif typ == "ur":
                    fnt = font(FONT_UR, 48)
                    fill = (236, 240, 230)
                    lang = "ur"
                else:
                    fnt = font(FONT_EN, 28)
                    fill = (180, 200, 170)
                    lang = None
                draw_centered(draw, raw, y, fnt, fill, opacity, language=lang)
                y += 90 if typ == "ur" else (78 if typ == "ar" else 56)

            progress = (i + 1) / FRAMES
            bar_w = int((W - 160) * progress)
            draw.rounded_rectangle(
                [80, H - 48, W - 80, H - 40], radius=4, fill=(40, 60, 50, 160)
            )
            draw.rounded_rectangle(
                [80, H - 48, 80 + bar_w, H - 40], radius=4, fill=(212, 175, 55, 220)
            )
            frame = Image.alpha_composite(base.convert("RGBA"), layer).convert("RGB")
            frame.save(out / f"frame_{i:04d}.png")

        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-framerate",
                str(FPS),
                "-i",
                str(out / "frame_%04d.png"),
                "-f",
                "lavfi",
                "-i",
                "sine=frequency=220:duration=20,volume=0.04",
                "-f",
                "lavfi",
                "-i",
                "sine=frequency=330:duration=20,volume=0.025",
                "-filter_complex",
                "[1][2]amix=inputs=2:duration=first:dropout_transition=0,"
                "afade=t=in:st=0:d=1.5,afade=t=out:st=18:d=2[a]",
                "-map",
                "0:v",
                "-map",
                "[a]",
                "-c:v",
                "libx264",
                "-pix_fmt",
                "yuv420p",
                "-crf",
                "18",
                "-preset",
                "medium",
                "-c:a",
                "aac",
                "-b:a",
                "128k",
                "-shortest",
                str(OUT_MP4),
            ],
            check=True,
        )
    print(f"Wrote {OUT_MP4}")


if __name__ == "__main__":
    main()
