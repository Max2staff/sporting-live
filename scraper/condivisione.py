"""Pagine di condivisione (meta Open Graph + redirect) e immagini 1080x1080 dei risultati."""
from __future__ import annotations

import hashlib
import html
import io
import json
import sys
from datetime import date
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from .stemma import FONT_BOLD, disegna_stemma

LATO = 1080
VERSIONE_LAYOUT = "1"          # da cambiare quando cambia il disegno: forza la rigenerazione
MAX_MARCATORI = 6
_GIORNI = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"]   # date.weekday()
ARANCIO, AZZURRO = (255, 78, 0), (56, 189, 248)
_BIANCO, _GRIGIO = (255, 255, 255), (170, 184, 198)


def _data_breve(iso: str | None) -> str:
    if not iso:
        return "data da definire"
    d = date.fromisoformat(iso)
    return f"{_GIORNI[d.weekday()]} {d.day:02d}/{d.month:02d}"


def _titolo(p: dict) -> str:
    return f"{p['casa']['nome']} {p['golCasa']}-{p['golOspite']} {p['ospite']['nome']}"


def _nome_breve(nome: str) -> str:
    """'CABIANCA ANDREA' -> 'Cabianca A.'; con piu' nomi tiene tutto tranne l'ultima parola puntata."""
    parti = str(nome).split()
    if len(parti) < 2:
        return str(nome).title()
    return f"{parti[0].title()} {parti[1][0].upper()}."


def _marcatori(p: dict, squadra_id: int) -> list[tuple[str, list[int]]]:
    """Marcatori di una squadra raggruppati per giocatore, in ordine di primo gol: [(nome, [minuti])]."""
    ordine: dict[str, list[int]] = {}
    for m in ((p.get("tabellino") or {}).get("marcatori") or []):
        if m.get("squadraId") == squadra_id:
            ordine.setdefault(m["nome"], []).append(m.get("minuto"))
    return [(n, sorted(x for x in mins if x is not None)) for n, mins in ordine.items()]


def _riga_marcatore(nome: str, minuti: list[int]) -> str:
    return f"{_nome_breve(nome)} {' '.join(f'{m}’' for m in minuti)}".strip()


def pagina_condivisione(partita: dict, sito: str) -> str:
    pid = int(partita["id"])
    titolo = _titolo(partita)
    desc = [partita["girone"]["nome"], f"giornata {partita['giornata']}", _data_breve(partita.get("data"))]
    nomi = [_nome_breve(n) for n, _ in _marcatori(partita, partita["casa"]["id"]) + _marcatori(partita, partita["ospite"]["id"])]
    if nomi:
        desc.append("marcatori: " + ", ".join(nomi))
    descrizione = " · ".join(desc)
    dest = f"../../#/partita/{pid}"
    e = html.escape
    return (
        '<!doctype html>\n<html lang="it">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
        f'<title>{e(titolo)} · Sporting Live</title>\n'
        f'<meta name="description" content="{e(descrizione)}">\n'
        '<meta property="og:type" content="website">\n'
        '<meta property="og:site_name" content="Sporting Live">\n'
        f'<meta property="og:title" content="{e(titolo)}">\n'
        f'<meta property="og:description" content="{e(descrizione)}">\n'
        f'<meta property="og:url" content="{e(sito)}s/p/{pid}.html">\n'
        f'<meta property="og:image" content="{e(sito)}s/p/{pid}.jpg">\n'
        '<meta property="og:image:width" content="1080">\n<meta property="og:image:height" content="1080">\n'
        '<meta name="twitter:card" content="summary_large_image">\n'
        f'<meta http-equiv="refresh" content="0;url={e(dest)}">\n'
        '<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0a0a0a;color:#fff;'
        'font:18px system-ui,sans-serif;text-align:center}a{color:#38bdf8}</style>\n'
        f'</head>\n<body>\n<p>{e(titolo)}<br><a href="{e(dest)}">Apri la partita su Sporting Live</a></p>\n</body>\n</html>\n'
    )


def _font(corpo: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_BOLD), corpo)


def _larghezza(testo: str, font) -> float:
    return font.getlength(testo)


def _adatta(testo: str, corpo: int, max_w: int, minimo: int = 24):
    while corpo > minimo and _larghezza(testo, _font(corpo)) > max_w:
        corpo -= 2
    return _font(corpo)


def _a_capo(testo: str, font, max_w: int, max_righe: int = 2) -> list[str]:
    parole, righe, corr = testo.split(), [], ""
    for par in parole:
        prova = f"{corr} {par}".strip()
        if corr and _larghezza(prova, font) > max_w:
            righe.append(corr)
            corr = par
        else:
            corr = prova
    righe.append(corr)
    if len(righe) > max_righe:
        righe = righe[:max_righe - 1] + [" ".join(righe[max_righe - 1:])]
    return righe


def _taglia(testo: str, font, max_w: int) -> str:
    if _larghezza(testo, font) <= max_w:
        return testo
    while testo and _larghezza(testo + "…", font) > max_w:
        testo = testo[:-1]
    return testo.rstrip() + "…"


def _sfondo() -> Image.Image:
    top, bot = (10, 10, 10), (1, 33, 59)
    verticale = Image.linear_gradient("L").resize((LATO, LATO))
    im = Image.composite(Image.new("RGB", (LATO, LATO), bot), Image.new("RGB", (LATO, LATO), top), verticale)
    fascia = Image.linear_gradient("L").rotate(90).resize((LATO, 16))      # nero a destra, bianco a sinistra
    fascia = fascia.transpose(Image.FLIP_LEFT_RIGHT)
    im.paste(Image.composite(Image.new("RGB", (LATO, 16), AZZURRO), Image.new("RGB", (LATO, 16), ARANCIO), fascia), (0, 0))
    return im


def _stemma(squadra: dict, px: int, stemmi_dir: Path | None) -> Image.Image:
    if stemmi_dir is not None:
        f = stemmi_dir / f"{int(squadra['id'])}.png"
        if f.is_file():
            try:
                with Image.open(f) as src:
                    src = src.convert("RGBA")
                    src.thumbnail((px, px), Image.LANCZOS)
                    tela = Image.new("RGBA", (px, px), (0, 0, 0, 0))
                    tela.paste(src, ((px - src.width) // 2, (px - src.height) // 2), src)
                    return tela
            except OSError:
                pass
    return disegna_stemma(squadra, px)


def immagine_risultato(partita: dict, stemmi_dir: Path | None = None) -> bytes:
    im = _sfondo()
    d = ImageDraw.Draw(im)
    cx = LATO // 2
    casa, osp = partita["casa"], partita["ospite"]
    c_casa, c_osp = 250, 830

    # intestazione
    testa = f"{partita['girone']['nome']} · Giornata {partita['giornata']} · {_data_breve(partita.get('data'))}".upper()
    d.text((cx, 80), testa, font=_adatta(testa, 40, 980), fill=_GRIGIO, anchor="mm")

    # stemmi
    for sq, c in ((casa, c_casa), (osp, c_osp)):
        st = _stemma(sq, 260, stemmi_dir)
        im.paste(st, (c - 130, 150), st)

    # risultato
    gol = f"{partita['golCasa']}-{partita['golOspite']}"
    d.text((cx, 290), gol, font=_adatta(gol, 240, 340), fill=_BIANCO, anchor="mm")
    if partita.get("tavolino"):
        d.text((cx, 400), "A TAVOLINO", font=_font(32), fill=ARANCIO, anchor="mm")

    # nomi squadre
    for sq, c in ((casa, c_casa), (osp, c_osp)):
        nome = str(sq["nome"]).upper()
        f = _font(52)
        righe = _a_capo(nome, f, 460)
        if len(righe) > 1 or _larghezza(nome, f) > 460:
            f = _font(46)
            righe = _a_capo(nome, f, 460)
        if any(_larghezza(r, f) > 460 for r in righe):
            f = _font(38)
            righe = _a_capo(nome, f, 460)
        righe = [_taglia(r, f, 460) for r in righe]
        y0 = 462 + (0 if len(righe) > 1 else 28)
        for i, r in enumerate(righe):
            d.text((c, y0 + 28 + i * 58), r, font=f, fill=_BIANCO, anchor="mm")

    # marcatori
    f_m = _font(38)
    for sq, c in ((casa, c_casa), (osp, c_osp)):
        elenco = _marcatori(partita, sq["id"])
        visibili, resto = elenco[:MAX_MARCATORI], elenco[MAX_MARCATORI:]
        y = 640
        for nome, minuti in visibili:
            riga = _riga_marcatore(nome, minuti)
            d.text((c, y), riga, font=_adatta(riga, 38, 470, 28), fill=(226, 232, 240), anchor="mm")
            y += 48
        if resto:
            n = sum(max(1, len(m)) for _, m in resto)
            d.text((c, y), f"+{n}", font=f_m, fill=AZZURRO, anchor="mm")

    # MVP
    mig = ((partita.get("tabellino") or {}).get("migliore") or {}).get("nome")
    if mig:
        testo = f"★ MVP {_nome_breve(mig)}"
        d.text((cx, 955), testo, font=_adatta(testo, 42, 980), fill=ARANCIO, anchor="mm")

    # logo
    f_logo = _font(40)
    a, b = "Sporting ", "Live"
    w = _larghezza(a + b, f_logo)
    d.text((cx - w / 2, 1030), a, font=f_logo, fill=_BIANCO, anchor="lm")
    d.text((cx - w / 2 + _larghezza(a, f_logo), 1030), b, font=f_logo, fill=ARANCIO, anchor="lm")

    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=82, optimize=True)
    return buf.getvalue()


def _hash(partita: dict, stemmi_dir: Path | None) -> str:
    vero = [int(s["id"]) for s in (partita["casa"], partita["ospite"])
            if stemmi_dir is not None and (stemmi_dir / f"{int(s['id'])}.png").is_file()]
    # `precedenti` non compare nell'immagine: ignorarlo evita di rigenerare tutte le immagini quando cambia
    base = {k: v for k, v in partita.items() if k != "precedenti"}
    blob = json.dumps([VERSIONE_LAYOUT, base, vero], sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()[:16]


def _scrivi_se_cambia(path: Path, dati: bytes) -> None:
    if path.is_file() and path.read_bytes() == dati:
        return
    path.write_bytes(dati)


def scrivi_condivisione(partite: list[dict], out_dir: Path, sito: str, stemmi_dir: Path | None = None) -> int:
    """Scrive pagine e immagini in out_dir (site/s/p). Ritorna il numero di immagini riscritte."""
    out_dir.mkdir(parents=True, exist_ok=True)
    mf = out_dir / "manifest.json"
    try:
        vecchio = json.loads(mf.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        vecchio = {}
    giocate = [p for p in partite if p.get("giocata")]
    nuovo, riscritte = {}, 0
    for p in giocate:
        pid = str(p.get("id"))
        try:
            pid = str(int(p["id"]))
            if not all(isinstance(p.get(k), int) for k in ("golCasa", "golOspite")):
                raise ValueError("risultato mancante")
            h = _hash(p, stemmi_dir)
            jpg = out_dir / f"{pid}.jpg"
            img = pagina = None
            if vecchio.get(pid) != h or not jpg.is_file():
                img = immagine_risultato(p, stemmi_dir)
            pagina = pagina_condivisione(p, sito).encode("utf-8")
            if img is not None:
                jpg.write_bytes(img)
                riscritte += 1
            _scrivi_se_cambia(out_dir / f"{pid}.html", pagina)
            nuovo[pid] = h
        except Exception as e:  # una partita malformata non deve bloccare il build
            print(f"AVVISO: condivisione partita {pid}: {e}", file=sys.stderr)
            if pid in vecchio:           # tiene file e voce di manifest precedenti
                nuovo[pid] = vecchio[pid]
            else:
                nuovo.setdefault(pid, None)
    for f in out_dir.iterdir():
        if f.suffix in (".html", ".jpg") and f.stem not in nuovo:
            f.unlink()
    nuovo = {k: v for k, v in nuovo.items() if v is not None}
    _scrivi_se_cambia(mf, json.dumps(nuovo, sort_keys=True, separators=(",", ":")).encode("utf-8"))
    return riscritte
