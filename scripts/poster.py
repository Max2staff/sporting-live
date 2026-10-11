"""Genera il poster A4 (2480x3508, 300 dpi) con QR code verso il sito, da appendere ai campi.

Uso: .venv/bin/python scripts/poster.py
Scrive docs/poster/poster-a4.png e docs/poster/poster-a4.pdf (dallo stesso PNG).
"""
from __future__ import annotations

import sys
from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageFont

RADICE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RADICE))
from scraper import config  # noqa: E402
from scraper.stemma import FONT_BOLD  # noqa: E402

IMG = RADICE / "site" / "img"
USCITA = RADICE / "docs" / "poster"
L, A = 2480, 3508
LANCZOS = getattr(Image, "Resampling", Image).LANCZOS
ARANCIO = (255, 78, 0, 255)
CIELO = (56, 189, 248, 255)
BIANCO = (255, 255, 255, 255)
CHIARO = (226, 232, 244, 255)
NERO = (0, 0, 0, 255)


def font(px: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_BOLD), px)


def centrato(d: ImageDraw.ImageDraw, y: int, testo: str, f, fill, cx: int = L // 2) -> None:
    d.text((cx - d.textlength(testo, font=f) / 2, y), testo, font=f, fill=fill)


def adatta(d: ImageDraw.ImageDraw, testo: str, larghezza: int, px: int) -> ImageFont.FreeTypeFont:
    while d.textlength(testo, font=font(px)) > larghezza:
        px -= 2
    return font(px)


def qr_immagine(url: str, modulo: int = 32) -> Image.Image:
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=modulo, border=4)
    qr.add_data(url)
    qr.make(fit=True)
    return qr.make_image(fill_color="black", back_color="white").convert("RGBA")


def sfondo() -> Image.Image:
    """Foto della premiazione in alto, velata blu notte -> nero, che sfuma nel nero."""
    H = 1250
    im = Image.open(IMG / "foto" / "premiazione.jpg").convert("RGB")
    sc = max(L / im.width, H / im.height)
    im = im.resize((round(im.width * sc), round(im.height * sc)), LANCZOS)
    x0, y0 = (im.width - L) // 2, (im.height - H) // 3
    im = im.crop((x0, y0, x0 + L, y0 + H))
    velo = Image.new("RGBA", (L, H))
    d = ImageDraw.Draw(velo)
    for y in range(H):
        t = y / (H - 1)
        d.line([(0, y), (L, y)], fill=(round(10 * (1 - t)), round(22 * (1 - t)), round(54 * (1 - t)), round(200 + 55 * t ** 1.5)))
    top = Image.alpha_composite(im.convert("RGBA"), velo)
    tela = Image.new("RGBA", (L, A), NERO)
    tela.alpha_composite(top, (0, 0))
    return tela


def logo_chip(tela: Image.Image, src: Path, cx: int, cy: int, lato: int) -> None:
    """Logo su riquadro bianco arrotondato (i loghi non sono pensati per il fondo nero)."""
    chip = lato + 70
    d = ImageDraw.Draw(tela)
    d.rounded_rectangle((cx - chip // 2, cy - chip // 2, cx + chip // 2, cy + chip // 2), radius=56, fill=BIANCO)
    lg = Image.open(src).convert("RGBA")
    lg = lg.crop(lg.getchannel("A").getbbox())  # via il margine trasparente: il logo riempie il riquadro
    k = lato / max(lg.size)
    lg = lg.resize((round(lg.width * k), round(lg.height * k)), LANCZOS)  # thumbnail non ingrandisce
    tela.alpha_composite(lg, (cx - lg.width // 2, cy - lg.height // 2))


def costruisci() -> Image.Image:
    tela = sfondo()
    d = ImageDraw.Draw(tela)

    # intestazione: icona + titolo
    icona = Image.open(RADICE / "site" / "icons" / "icon-512.png").convert("RGBA").resize((340, 340), LANCZOS)
    f_titolo = font(330)
    w_sp = d.textlength("Sporting ", font=f_titolo)
    w_tot = w_sp + d.textlength("Live", font=f_titolo)
    y_t = 330
    tela.alpha_composite(icona, (L // 2 - 170, 110))
    x = (L - w_tot) / 2
    d.text((x, y_t + 80), "Sporting ", font=f_titolo, fill=BIANCO)
    d.text((x + w_sp, y_t + 80), "Live", font=f_titolo, fill=ARANCIO)

    righe = ("Risultati, classifiche e marcatori", "di tutti i campionati, sul telefono")
    f_sotto = adatta(d, righe[1], L - 240, 108)
    for i, riga in enumerate(righe):
        centrato(d, 850 + i * 132, riga, f_sotto, CHIARO)

    # fascia azzurra con l'invito all'azione
    by0, by1 = 1160, 1370
    d.rectangle((0, by0, L, by1), fill=CIELO)
    f_cta = adatta(d, "INQUADRA CON LA FOTOCAMERA", L - 200, 130)
    centrato(d, by0 + (by1 - by0 - f_cta.size) // 2 - 14, "INQUADRA CON LA FOTOCAMERA", f_cta, (6, 14, 34, 255))

    # QR su riquadro bianco arrotondato (zona di rispetto di 4 moduli inclusa nell'immagine QR)
    qr = qr_immagine(config.SITO_URL)
    pad = 40
    tile = qr.width + 2 * pad
    tx, ty = (L - tile) // 2, by1 + 50
    d.rounded_rectangle((tx, ty, tx + tile, ty + tile), radius=90, fill=BIANCO)
    tela.alpha_composite(qr, (tx + pad, ty + pad))

    # URL leggibile
    url_vis = config.SITO_URL.replace("https://", "").rstrip("/")
    y_u = ty + tile + 55
    f_url = adatta(d, url_vis, L - 300, 130)
    centrato(d, y_u, url_vis, f_url, BIANCO)
    centrato(d, y_u + 165, "Gratis  ·  senza registrazione  ·  senza scaricare nulla", font(78), CIELO)

    # loghi in basso
    yl = A - 270
    logo_chip(tela, IMG / "loghi" / "sporting-club-mestre.png", L // 2 - 330, yl, 330)
    logo_chip(tela, IMG / "loghi" / "endas.png", L // 2 + 330, yl, 330)
    return tela


def main() -> int:
    USCITA.mkdir(parents=True, exist_ok=True)
    im = costruisci().convert("RGB")
    png, pdf = USCITA / "poster-a4.png", USCITA / "poster-a4.pdf"
    im.save(png, "PNG", optimize=True, dpi=(300, 300))
    im.save(pdf, "PDF", resolution=300)
    for f in (png, pdf):
        print(f"{f.relative_to(RADICE)}: {f.stat().st_size // 1024} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
