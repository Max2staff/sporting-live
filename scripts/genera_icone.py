"""Genera site/icons/icon-192.png, icon-512.png, icon-maskable-512.png con Pillow (niente renderer SVG)."""
from __future__ import annotations
from pathlib import Path
from PIL import Image, ImageDraw

BLU, ARA, BIANCO = "#01213b", "#ff4e00", "#ffffff"


def disegna(dim: int, maskable: bool) -> Image.Image:
    img = Image.new("RGBA", (dim, dim), BLU if maskable else (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if not maskable:
        d.rounded_rectangle((0, 0, dim - 1, dim - 1), radius=dim * 28 // 128, fill=BLU)
    k = dim / 128 * (0.8 if maskable else 1)
    off = (dim - 128 * k) / 2
    P = lambda x, y: (off + x * k, off + y * k)  # noqa: E731
    d.ellipse((*P(22, 30), *P(90, 98)), fill=BIANCO)
    d.polygon([P(56, 34), P(65, 46), P(62, 60), P(50, 60), P(47, 46)], fill=BLU)
    d.polygon([P(34, 54), P(47, 58), P(52, 71), P(43, 82), P(30, 76)], fill=BLU)
    d.polygon([P(78, 54), P(65, 58), P(60, 71), P(69, 82), P(82, 76)], fill=BLU)
    fulmine = [P(92, 28), P(78, 62), P(90, 62), P(84, 100), P(108, 54), P(94, 54)]
    d.polygon(fulmine, fill=ARA, outline=BLU, width=max(2, int(4 * k)))
    return img


out = Path(__file__).resolve().parent.parent / "site" / "icons"
disegna(192, False).save(out / "icon-192.png")
disegna(512, False).save(out / "icon-512.png")
disegna(512, True).convert("RGB").save(out / "icon-maskable-512.png")
print("icone scritte in", out)
