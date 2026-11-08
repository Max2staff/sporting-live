"""Genera site/icons/icon-192.png, icon-512.png, icon-maskable-512.png da site/icons/icon.svg.

Disegna l'SVG con Chrome headless (macOS), così PNG e SVG restano identici.
"""
from __future__ import annotations
import subprocess, tempfile
from pathlib import Path

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
FONDO = "#16181d"
icone = Path(__file__).resolve().parent.parent / "site" / "icons"
svg = (icone / "icon.svg").read_text()


def disegna(nome: str, dim: int, maskable: bool) -> None:
    # maskable: fondo pieno e logo al 80% (zona sicura del ritaglio Android)
    lato = int(dim * (0.8 if maskable else 1))
    html = (f'<body style="margin:0;width:{dim}px;height:{dim}px;display:flex;align-items:center;justify-content:center;'
            f'background:{FONDO if maskable else "transparent"}"><div style="width:{lato}px;height:{lato}px">{svg}</div></body>')
    with tempfile.TemporaryDirectory() as tmp:
        pagina = Path(tmp) / "i.html"
        pagina.write_text(html.replace("<svg ", f'<svg width="{lato}" height="{lato}" ', 1))
        subprocess.run([CHROME, "--headless=new", f"--user-data-dir={tmp}/p", "--hide-scrollbars", "--default-background-color=00000000",
                        f"--window-size={dim},{dim}", f"--screenshot={icone / nome}", pagina.as_uri()], check=True, capture_output=True)


disegna("icon-192.png", 192, False)
disegna("icon-512.png", 512, False)
disegna("icon-maskable-512.png", 512, True)
print("icone scritte in", icone)
