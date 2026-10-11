"""Calendario ICS per squadra (RFC 5545, scritto a mano): eventi in Europe/Rome, righe <= 75 ottetti, CRLF."""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from pathlib import Path

_VTIMEZONE = [
    "BEGIN:VTIMEZONE", "TZID:Europe/Rome",
    "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST",
    "DTSTART:19700329T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT",
    "BEGIN:STANDARD", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:CET",
    "DTSTART:19701025T030000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD",
    "END:VTIMEZONE",
]


def _esc(t: str) -> str:
    return (str(t).replace("\\", "\\\\").replace(";", "\;").replace(",", "\\,")
            .replace("\r\n", "\\n").replace("\n", "\\n"))


def _piega(riga: str) -> list[str]:
    """Spezza a 75 ottetti UTF-8 (continuazioni con uno spazio iniziale) senza tagliare i caratteri multibyte."""
    out, cur, n = [], "", 0
    for ch in riga:
        w = len(ch.encode("utf-8"))
        if n + w > (75 if not out else 74):
            out.append(cur)
            cur, n = "", 0
        cur += ch
        n += w
    out.append(cur)
    return [out[0]] + [" " + r for r in out[1:]]


def _utc(adesso: str) -> str:
    d = datetime.fromisoformat(adesso)
    if d.tzinfo is None:
        d = d.replace(tzinfo=timezone.utc)
    return d.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _evento(p: dict, girone_nome: str, sito: str, stamp: str) -> list[str]:
    casa, osp = p["casa"]["nome"], p["ospite"]["nome"]
    if p.get("giocata") and p.get("golCasa") is not None and p.get("golOspite") is not None:
        titolo = f"{casa} {p['golCasa']}-{p['golOspite']} {osp}"
    else:
        titolo = f"{casa} - {osp}"
    righe = ["BEGIN:VEVENT", f"UID:partita-{int(p['id'])}@sportinglive", f"DTSTAMP:{stamp}"]
    d = date.fromisoformat(p["data"])
    if p.get("ora"):
        inizio = datetime.fromisoformat(f"{p['data']}T{p['ora']}")
        fine = inizio + timedelta(hours=1)
        righe += [f"DTSTART;TZID=Europe/Rome:{inizio:%Y%m%dT%H%M%S}", f"DTEND;TZID=Europe/Rome:{fine:%Y%m%dT%H%M%S}"]
    else:
        righe += [f"DTSTART;VALUE=DATE:{d:%Y%m%d}", f"DTEND;VALUE=DATE:{d + timedelta(days=1):%Y%m%d}"]
    desc = f"{girone_nome} · giornata {p['giornata']}\n{sito}#/partita/{int(p['id'])}"
    righe += [f"SUMMARY:{_esc(titolo)}", f"DESCRIPTION:{_esc(desc)}", f"URL:{sito}#/partita/{int(p['id'])}", "END:VEVENT"]
    return righe


def calendario_squadra(squadra: dict, partite: list[dict], girone: dict, sito: str, adesso: str) -> str:
    stamp = _utc(adesso)
    righe = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Sporting Live//Calendario//IT", "CALSCALE:GREGORIAN",
             "METHOD:PUBLISH", f"X-WR-CALNAME:{_esc(squadra['nome'] + ' · Sporting Live')}", "X-WR-TIMEZONE:Europe/Rome",
             "REFRESH-INTERVAL;VALUE=DURATION:PT6H", "X-PUBLISHED-TTL:PT6H"] + _VTIMEZONE
    for p in sorted((p for p in partite if p.get("data")), key=lambda p: (p["data"], p.get("ora") or "", p["id"])):
        righe += _evento(p, girone["nome"], sito, stamp)
    righe.append("END:VCALENDAR")
    return "".join(f for r in righe for f in (x + "\r\n" for x in _piega(r)))


def _senza_stamp(testo: str) -> str:
    return "".join(r for r in testo.splitlines(keepends=True) if not r.startswith("DTSTAMP:"))


def scrivi_calendari(files: dict, cartella: Path, sito: str, adesso: str) -> int:
    """Scrive <cartella>/<id>.ics per ogni squadra reale (non RIPOSO); riscrive solo se il contenuto
    cambia (DTSTAMP escluso dal confronto); rimuove gli .ics di squadre non piu' presenti. Ritorna i file scritti."""
    cartella.mkdir(parents=True, exist_ok=True)
    attesi, scritti = set(), 0
    for k, s in files.items():
        if not k.startswith("squadra/") or s["nome"].strip().upper() == "RIPOSO":
            continue
        partite = []
        for q in s["partite"]:
            p = files.get(f"partita/{q['id']}.json")
            if p and p["casa"]["nome"].strip().upper() != "RIPOSO" and p["ospite"]["nome"].strip().upper() != "RIPOSO":
                partite.append(p)
        testo = calendario_squadra({"id": s["id"], "nome": s["nome"]}, partite, s["girone"], sito, adesso)
        f = cartella / f"{int(s['id'])}.ics"
        attesi.add(f.name)
        if f.exists() and _senza_stamp(f.read_bytes().decode("utf-8")) == _senza_stamp(testo):
            continue
        f.write_bytes(testo.encode("utf-8"))
        scritti += 1
    for f in cartella.glob("*.ics"):
        if f.name not in attesi:
            f.unlink()
    return scritti
