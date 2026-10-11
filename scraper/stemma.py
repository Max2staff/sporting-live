"""Stemmi delle squadre in Python: porting fedele di site/js/stemma.js.

Stesso hash FNV-1a, stessi colori, stessa forma dello scudo, stessa divisione e stesse iniziali
dello stemma SVG dell'app, cosi' le immagini di condivisione mostrano gli stessi stemmi.
"""
from __future__ import annotations

import colorsys
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

FONT_BOLD = Path(__file__).resolve().parent.parent / "scripts" / "font" / "Inter-Bold.ttf"

_LANCZOS = getattr(Image, "Resampling", Image).LANCZOS
_PAROLE_IGNORATE = {"REAL", "ASD", "FC", "AC", "SS", "US", "AS", "CALCIO", "C5", "C8"}
_NON_AMMESSI = re.compile("[^A-Z0-9À-Ý&]")
_SS = 4  # supersampling


def iniziali(nome) -> str:
    parole = [p for p in str(nome if nome is not None else "").upper().split() if "." not in p]
    parole = [_NON_AMMESSI.sub("", p) for p in parole]
    parole = [p for p in parole if p and p not in _PAROLE_IGNORATE]
    pulite = [p for p in (p.replace("&", "") for p in parole) if p]
    if not pulite:
        return "?"
    if len(pulite) == 1:
        return pulite[0][:2]
    return pulite[0][0] + pulite[1][0]


def _hash(id_) -> int:
    h = 2166136261
    for ch in str(id_):
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return h


def colori_stemma(id_) -> dict:
    h = _hash(id_)
    tinta = h % 360
    tinta2 = (tinta + 140 + ((h >> 9) % 80)) % 360

    def chiaro(t: int) -> bool:
        return 40 <= t <= 200

    return {
        "primario": f"hsl({tinta} 68% {30 if chiaro(tinta) else 40}%)",
        "secondario": f"hsl({tinta2} 78% {44 if chiaro(tinta2) else 52}%)",
        "motivo": (h >> 17) % 3,
    }


def _rgb(hsl: str) -> tuple[int, int, int]:
    m = re.fullmatch(r"hsl\((\d+) (\d+)% (\d+)%\)", hsl)
    h, s, l = (int(x) for x in m.groups())
    r, g, b = colorsys.hls_to_rgb(h / 360, l / 100, s / 100)
    return round(r * 255), round(g * 255), round(b * 255)


def _bezier(p0, p1, p2, p3, n=24):
    out = []
    for i in range(1, n + 1):
        t = i / n
        u = 1 - t
        out.append((u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
                    u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1]))
    return out


def _scudo() -> list[tuple[float, float]]:
    # M20 1.5 37.5 6.5V22c0 12-7.5 20-17.5 24.5C10 42 2.5 34 2.5 22V6.5Z (viewBox 40x48)
    pts = [(20, 1.5), (37.5, 6.5), (37.5, 22)]
    pts += _bezier((37.5, 22), (37.5, 34), (30, 42), (20, 46.5))
    pts += _bezier((20, 46.5), (10, 42), (2.5, 34), (2.5, 22))
    pts += [(2.5, 6.5)]
    return pts


_SCUDO = _scudo()
_MOTIVI = [
    [(2, 31), (38, 11), (38, 23), (2, 43)],                          # fascia diagonale
    [(20, 0), (40, 0), (40, 48), (20, 48)],                          # meta' verticale
    [(2, 17), (20, 29), (38, 17), (38, 28), (20, 40), (2, 28)],      # chevron
]


def disegna_stemma(squadra: dict, lato_px: int) -> Image.Image:
    """Stemma RGBA lato_px x lato_px (scudo alto lato_px, centrato, 40:48), sfondo trasparente."""
    id_ = squadra.get("id")
    col = colori_stemma(int(id_))
    prim, sec = _rgb(col["primario"]), _rgb(col["secondario"])
    sigla = iniziali(squadra.get("nome"))

    grande = lato_px * _SS
    k = grande / 48                       # unita' del viewBox -> pixel
    ox = (grande - 40 * k) / 2

    def pt(p):
        return (ox + p[0] * k, p[1] * k)

    scudo = [pt(p) for p in _SCUDO]
    maschera = Image.new("L", (grande, grande), 0)
    ImageDraw.Draw(maschera).polygon(scudo, fill=255)

    tela = Image.new("RGBA", (grande, grande), (0, 0, 0, 0))
    tela.paste(Image.new("RGBA", (grande, grande), prim + (255,)), (0, 0), maschera)
    motivo = Image.new("L", (grande, grande), 0)
    ImageDraw.Draw(motivo).polygon([pt(p) for p in _MOTIVI[col["motivo"]]], fill=255)
    motivo = Image.composite(motivo, Image.new("L", motivo.size, 0), maschera)
    tela.paste(Image.new("RGBA", (grande, grande), sec + (255,)), (0, 0), motivo)

    # bordo bianco .9, spessore 1.6 centrato sul contorno
    bordo = Image.new("L", (grande, grande), 0)
    ImageDraw.Draw(bordo).line(scudo + [scudo[0], scudo[1]], fill=round(255 * 0.9),
                               width=max(1, round(1.6 * k)), joint="curve")
    tela.paste(Image.new("RGBA", (grande, grande), (255, 255, 255, 255)), (0, 0), bordo)

    # iniziali: contorno nero .45 largo 2.4 (sotto), riempimento bianco
    corpo = 15 if len(sigla) > 1 else 19
    font = ImageFont.truetype(str(FONT_BOLD), round(corpo * k))
    alt_maiuscole = -font.getbbox("H", anchor="ls")[1]
    x, y = pt((20, 25))
    y += alt_maiuscole / 2
    contorno = Image.new("L", (grande, grande), 0)
    ImageDraw.Draw(contorno).text((x, y), sigla, font=font, anchor="ms", fill=round(255 * 0.45),
                                  stroke_width=round(1.2 * k), stroke_fill=round(255 * 0.45))
    tela.paste(Image.new("RGBA", (grande, grande), (0, 0, 0, 255)), (0, 0), contorno)
    ImageDraw.Draw(tela).text((x, y), sigla, font=font, anchor="ms", fill=(255, 255, 255, 255))

    return tela.resize((lato_px, lato_px), _LANCZOS)
