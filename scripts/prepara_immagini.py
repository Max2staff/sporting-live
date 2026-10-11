"""Prepara le immagini del sito a partire dai file scaricati dal sito ufficiale.

Uso: python scripts/prepara_immagini.py <cartella_sorgenti>
Le sorgenti sono dati non fidati: vengono solo aperte con Pillow e ricodificate.
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

RADICE = Path(__file__).resolve().parent.parent / "site" / "img"
MAX_LATO = 1600
QUALITA = 80
FONT_BOLD = Path(__file__).resolve().parent / "font" / "Inter-Bold.ttf"
ICONA = Path(__file__).resolve().parent.parent / "site" / "icons" / "icon-512.png"
LANCZOS = getattr(Image, "Resampling", Image).LANCZOS


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


def og(foto_src: Path, dst: Path) -> None:
    """Immagine di anteprima 1200x630: foto velata (blu notte -> nero), icona, titolo e sottotitolo."""
    L, A = 1200, 630
    im = Image.open(foto_src).convert("RGB")
    sc = max(L / im.width, A / im.height)
    im = im.resize((round(im.width * sc), round(im.height * sc)), LANCZOS)
    im = im.crop(((im.width - L) // 2, (im.height - A) // 2, (im.width - L) // 2 + L, (im.height - A) // 2 + A))
    # velo: gradiente verticale blu notte -> nero, opacita' alta per far leggere il testo
    velo = Image.new("RGBA", (L, A))
    d = ImageDraw.Draw(velo)
    for y in range(A):
        t = y / (A - 1)
        d.line([(0, y), (L, y)], fill=(round(10 * (1 - t)), round(22 * (1 - t)), round(54 * (1 - t)), round(205 + 40 * t)))
    tela = Image.alpha_composite(im.convert("RGBA"), velo)
    icona = Image.open(ICONA).convert("RGBA").resize((200, 200), LANCZOS)
    tela.alpha_composite(icona, (90, 115))
    d = ImageDraw.Draw(tela)
    f_titolo = ImageFont.truetype(str(FONT_BOLD), 112)
    f_sotto = ImageFont.truetype(str(FONT_BOLD), 36)
    x, y = 330, 118
    d.text((x, y), "Sporting ", font=f_titolo, fill=(255, 255, 255, 255))
    d.text((x + d.textlength("Sporting ", font=f_titolo), y), "Live", font=f_titolo, fill=(255, 78, 0, 255))
    d.rectangle((x + 4, y + 150, x + 164, y + 156), fill=(255, 78, 0, 255))
    for i, riga in enumerate(("Risultati, classifiche e marcatori", "dei campionati Sporting Club Mestre")):
        d.text((90, 400 + i * 56), riga, font=f_sotto, fill=(226, 232, 244, 255))
    dst.parent.mkdir(parents=True, exist_ok=True)
    tela.convert("RGB").save(dst, "JPEG", quality=82, optimize=True, progressive=True)


def main(argv: list[str]) -> int:
    src = Path(argv[1])
    foto(src / "edile-gavagnin.jpg", RADICE / "foto" / "premiazione.jpg")
    foto(src / "img-20260411-wa0035.jpg", RADICE / "foto" / "campo.jpg")
    og(RADICE / "foto" / "premiazione.jpg", RADICE / "og.jpg")
    logo(src / "endas.png", RADICE / "loghi" / "endas.png")
    # logo Sporting Club Mestre ritagliato dall'angolo in alto a sinistra della locandina 800x1200
    logo(src / "campionato-202526-2.jpg", RADICE / "loghi" / "sporting-club-mestre.png", box=(8, 46, 136, 204))
    for f in sorted(RADICE.rglob("*.*")):
        print(f"{f.relative_to(RADICE)}: {f.stat().st_size // 1024} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
