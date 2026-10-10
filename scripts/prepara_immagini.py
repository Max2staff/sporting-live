"""Prepara le immagini del sito a partire dai file scaricati dal sito ufficiale.

Uso: python scripts/prepara_immagini.py <cartella_sorgenti>
Le sorgenti sono dati non fidati: vengono solo aperte con Pillow e ricodificate.
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

RADICE = Path(__file__).resolve().parent.parent / "site" / "img"
MAX_LATO = 1600
QUALITA = 80


def foto(src: Path, dst: Path) -> None:
    im = Image.open(src).convert("RGB")
    im.thumbnail((MAX_LATO, MAX_LATO), Image.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst, "JPEG", quality=QUALITA, optimize=True, progressive=True)


def logo(src: Path, dst: Path, box: tuple[int, int, int, int] | None = None, lato: int = 256) -> None:
    im = Image.open(src).convert("RGBA")
    if box:
        im = im.crop(box)
    im.thumbnail((lato, lato), Image.LANCZOS)
    tela = Image.new("RGBA", (lato, lato), (0, 0, 0, 0))
    tela.paste(im, ((lato - im.width) // 2, (lato - im.height) // 2), im)
    dst.parent.mkdir(parents=True, exist_ok=True)
    tela.save(dst, "PNG", optimize=True)


def main(argv: list[str]) -> int:
    src = Path(argv[1])
    foto(src / "edile-gavagnin.jpg", RADICE / "foto" / "premiazione.jpg")
    foto(src / "img-20260411-wa0035.jpg", RADICE / "foto" / "campo.jpg")
    logo(src / "endas.png", RADICE / "loghi" / "endas.png")
    # logo Sporting Club Mestre ritagliato dall'angolo in alto a sinistra della locandina 800x1200
    logo(src / "campionato-202526-2.jpg", RADICE / "loghi" / "sporting-club-mestre.png", box=(8, 46, 136, 204))
    for f in sorted(RADICE.rglob("*.*")):
        print(f"{f.relative_to(RADICE)}: {f.stat().st_size // 1024} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
