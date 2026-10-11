"""Avvisi Telegram per i nuovi risultati. Spento finché mancano i segreti.

Uso: python scripts/telegram.py INDICE_PRIMA.json INDICE_DOPO.json
"""
import html
import json
import os
import sys
import time
from pathlib import Path

import requests

SOGLIA = 5
MAX_CARATTERI = 3800


def nuovi_risultati(indice_prima, indice_dopo):
    """Partite giocate ora che prima non lo erano. Senza indice prima: nessuna."""
    if not indice_prima:
        return []
    giocate_prima = {p["id"] for p in indice_prima.get("partite", []) if p.get("giocata")}
    return [p for p in indice_dopo.get("partite", [])
            if p.get("giocata") and p["id"] not in giocate_prima]


def _esc(t):
    return html.escape(str(t), quote=False)


def messaggi(nuovi, indice_dopo, sito):
    squadre = {s["id"]: s["nome"] for s in indice_dopo.get("squadre", [])}
    nomi_gironi = {g["slug"]: g["nome"]
                   for c in indice_dopo.get("campionati", []) for g in c.get("gironi", [])}
    per_girone = {}
    for p in nuovi:
        per_girone.setdefault(p["girone"], []).append(p)

    def riga(p):
        return (f"{_esc(squadre.get(p['casaId'], '?'))} {p['golCasa']}-{p['golOspite']} "
                f"{_esc(squadre.get(p['ospiteId'], '?'))}")

    out = []
    for slug, partite in per_girone.items():
        nome = _esc(nomi_gironi.get(slug, slug))
        if len(partite) <= SOGLIA:
            for p in partite:
                out.append(f"⚽ <b>{nome}</b> · {riga(p)}\n{sito}s/p/{p['id']}.html")
        else:
            righe = [riga(p) for p in partite]
            testo = f"⚽ <b>{nome}</b> · {len(partite)} nuovi risultati\n" + "\n".join(righe)
            while len(testo) > MAX_CARATTERI and righe:
                righe.pop()
                testo = (f"⚽ <b>{nome}</b> · {len(partite)} nuovi risultati\n"
                         + "\n".join(righe) + "\n…")
            out.append(testo + f"\n{sito}")
    return out


def _leggi(percorso):
    try:
        return json.loads(Path(percorso).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    token = os.environ.get("TELEGRAM_TOKEN", "").strip()
    chat = os.environ.get("TELEGRAM_CHAT", "").strip()
    if not token or not chat:
        print("Telegram non configurato")
        return 0
    try:
        prima = _leggi(argv[0])
        dopo = _leggi(argv[1])
        if not dopo:
            print("::warning::Telegram: indice nuovo non leggibile")
            return 0
        testi = messaggi(nuovi_risultati(prima, dopo), dopo, dopo.get("sito", ""))
        for i, testo in enumerate(testi):
            r = requests.post(
                f"https://api.telegram.org/bot{token}/sendMessage",
                data={"chat_id": chat, "text": testo, "parse_mode": "HTML",
                      "disable_web_page_preview": "false"},
                timeout=20)
            if r.status_code != 200:
                print(f"::warning::Telegram ha risposto {r.status_code}")
            if i < len(testi) - 1:
                time.sleep(1)
        print(f"Telegram: {len(testi)} messaggi")
    except Exception as e:  # mai far fallire il job
        print(f"::warning::Telegram non riuscito: {type(e).__name__}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
