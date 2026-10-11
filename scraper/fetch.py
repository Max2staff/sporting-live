"""Scarica le pagine di ogni girone attivo e scrive build/raw/<idgirone>.json.

Politica: educato col sito (pausa, UA, retry), cache su disco dei tabellini, fallback per sezione
ai dati precedenti con marcatura `stale`.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import tempfile
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import requests

from . import config
from .parse import parse_calendario, parse_classifica, parse_tabellino

try:
    TZ_ROMA = ZoneInfo("Europe/Rome")
except Exception:  # noqa: BLE001 — database dei fusi mancante
    TZ_ROMA = timezone(timedelta(hours=1))


def _norm(nome: str) -> str:
    return re.sub(r"\s+", " ", nome).strip().upper()


class Fetcher:
    def __init__(self, get=None, pausa: float = config.PAUSA_S):
        self._get = get or self._get_http
        self.pausa = pausa
        self.log: list[str] = []

    @staticmethod
    def _get_http(url: str) -> str:
        r = requests.get(url, headers={"User-Agent": config.USER_AGENT}, timeout=config.TIMEOUT_S)
        r.raise_for_status()
        r.encoding = "utf-8"
        return r.text

    def get(self, url: str) -> str:
        ultimo = None
        for tentativo in range(1, config.TENTATIVI + 1):
            try:
                self.log.append(url)
                html = self._get(url)
                if self.pausa:
                    time.sleep(self.pausa)
                return html
            except Exception as e:  # noqa: BLE001 — qualsiasi errore di rete/HTTP → retry
                ultimo = e
                if self.pausa:
                    time.sleep(self.pausa * tentativo)
        raise RuntimeError(f"GET fallita dopo {config.TENTATIVI} tentativi: {url}: {ultimo}")


class TabellinoIncompleto(Exception):
    """Risultato pubblicato ma formazioni non ancora inserite: riprovare al run successivo."""


def _cached(fetcher: Fetcher, path: Path, url: str, parse, force: bool = False):
    """Legge da cache se presente, altrimenti scarica. Scrive la cache solo se `parse` non solleva."""
    if path.exists() and not force:
        return parse(path.read_text(encoding="utf-8"))
    html = fetcher.get(url)
    risultato = parse(html)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(html, encoding="utf-8")
    return risultato


_ESCLUSE = ("aggiornato", "errori", "incompleti", "stale")


def _contenuto(raw: dict) -> dict:
    return {k: v for k, v in raw.items() if k not in _ESCLUSE}


def raccogli_girone(fetcher: Fetcher, cache_dir: Path, idgirone: int, precedente: dict | None = None,
                    adesso: datetime | None = None, force: bool = False) -> dict:
    adesso = adesso or datetime.now(TZ_ROMA)
    prec = precedente or {}
    errori: list[str] = []
    stale: dict[str, str] = {}

    def fallback(sezione: str, errore: Exception):
        errori.append(f"{sezione}: {errore}")
        valore = prec
        for p in sezione.split("."):
            valore = valore.get(p) if isinstance(valore, dict) else None
        if valore is None:
            return None
        stale[sezione] = prec.get("stale", {}).get(sezione, prec.get("aggiornato", ""))
        return valore

    try:
        totale = parse_classifica(fetcher.get(config.url_classifica(idgirone)))
    except Exception as e:
        totale = fallback("classifica.totale", e)
        if totale is None:
            raise RuntimeError(f"girone {idgirone}: classifica totale non disponibile e nessun dato precedente: {e}") from e
    squadre = [{"id": r["squadraId"], "nome": r["nome"]} for r in totale]
    id_per_nome = {_norm(s["nome"]): s["id"] for s in squadre}
    nomi_ignoti: set[str] = set()

    def sid(nome: str) -> int | None:
        idn = id_per_nome.get(_norm(nome))
        if idn is None and nome and nome not in nomi_ignoti:
            nomi_ignoti.add(nome)
            errori.append(f"squadra non mappata: {nome!r}")
        return idn

    def classifica_variante(tipo: str, chiave: str):
        try:
            return parse_classifica(fetcher.get(config.url_classifica(idgirone, tipo=tipo)))
        except Exception as e:
            return fallback(chiave, e) or []

    casa = classifica_variante("incasa", "classifica.casa")
    trasferta = classifica_variante("fuoricasa", "classifica.trasferta")

    try:
        partite = [{
            "id": p["id"], "giornata": p["giornata"], "data": p["data"], "ora": p["ora"],
            "casaId": sid(p["casa"]), "ospiteId": sid(p["ospite"]),
            "golCasa": p["golCasa"], "golOspite": p["golOspite"],
            "giocata": p["giocata"], "tavolino": p["tavolino"],
        } for p in parse_calendario(fetcher.get(config.url_calendario(idgirone)))]
    except Exception as e:
        partite = fallback("partite", e) or []

    tabellini: dict[str, dict] = dict(prec.get("tabellini") or {})
    falliti = False
    incompleti: list[int] = []
    soglia = (adesso.replace(tzinfo=None) - timedelta(days=config.GIORNI_TABELLINO_INCOMPLETO)).date()
    for p in partite:
        if not p["giocata"] or (str(p["id"]) in tabellini and not force):
            continue
        try:
            recente = p["data"] is None or datetime.strptime(p["data"], "%Y-%m-%d").date() > soglia
        except (ValueError, TypeError):
            recente = True

        def _parse(html: str, p=p, recente=recente) -> dict:
            t = parse_tabellino(html)
            formazioni = [{"squadraId": sid(f["squadra"]), "nome": f["nome"], "numero": f["numero"],
                           "voto": f["voto"], "ammonito": f["ammonito"], "espulso": f["espulso"]}
                          for f in t["formazioni"]]
            if not formazioni and not p["tavolino"] and recente:
                raise TabellinoIncompleto("formazioni non ancora pubblicate")
            return {
                "marcatori": [{"squadraId": sid(m["squadra"]), "nome": m["nome"], "minuto": m["minuto"]}
                              for m in t["marcatori"]],
                "formazioni": formazioni,
                "migliore": ({"squadraId": sid(t["migliore"]["squadra"]), "nome": t["migliore"]["nome"]}
                             if t["migliore"] else None),
                "completo": bool(formazioni),
            }

        try:
            tabellini[str(p["id"])] = _cached(fetcher, cache_dir / "tabellini" / f"{p['id']}.html",
                                              config.url_tabellino(idgirone, p["id"]), _parse, force=force)
        except TabellinoIncompleto:
            incompleti.append(p["id"])
        except Exception as e:
            falliti = True
            errori.append(f"tabellini.{p['id']}: {e}")
    if falliti and prec.get("aggiornato"):
        stale["tabellini"] = prec["aggiornato"]

    risultato = {
        "aggiornato": adesso.isoformat(timespec="seconds"),
        "idgirone": idgirone,
        "squadre": squadre,
        "classifica": {"totale": totale, "casa": casa, "trasferta": trasferta},
        "partite": partite,
        "tabellini": tabellini,
        "incompleti": incompleti,
        "stale": stale,
        "errori": errori,
    }
    if prec.get("aggiornato") and _contenuto(risultato) == _contenuto(prec):
        risultato["aggiornato"] = prec["aggiornato"]
    return risultato


def gironi_attivi(stagioni: dict) -> list[dict]:
    return [g for c in stagioni["campionati"] for g in c["gironi"] if g.get("attivo", True)]


def _archivio_raw(out: Path, slug: str, idg: int) -> Path:
    return out / "a" / slug / f"{idg}.json"


def fetch_archivio(stagioni: dict, out: Path, fetcher: Fetcher, cache_base: Path, force: bool = False) -> int:
    """Edizioni chiuse: un girone si legge solo se il suo raw manca. Un girone che non si legge
    o non si interpreta viene saltato con avviso (non fa fallire il run né blocca gli altri)."""
    letti = 0
    for ed in stagioni.get("archivio", []):
        for c in ed["campionati"]:
            for g in c["gironi"]:
                idg = g["idgirone"]
                f_out = _archivio_raw(out, ed["slug"], idg)
                if f_out.exists() and not force:
                    continue
                try:
                    raw = raccogli_girone(fetcher, cache_base / ed["slug"] / str(idg), idg, force=force)
                except Exception as e:  # noqa: BLE001 — salto con avviso
                    print(f"AVVISO archivio {ed['slug']} girone {idg} ({g['nome']}) saltato: {e}", file=sys.stderr)
                    continue
                f_out.parent.mkdir(parents=True, exist_ok=True)
                f_out.write_text(json.dumps(raw, ensure_ascii=False, indent=1), encoding="utf-8")
                letti += 1
                for e in raw["errori"]:
                    print(f"AVVISO archivio {ed['slug']} girone {idg}: {e}", file=sys.stderr)
                print(f"archivio {ed['slug']} girone {idg} ({g['nome']}): {len(raw['squadre'])} squadre, "
                      f"{len(raw['partite'])} partite, {len(raw['tabellini'])} tabellini, {len(raw['errori'])} avvisi")
    return letti


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--stagioni", default="stagioni.json")
    ap.add_argument("--out", default="build/raw")
    ap.add_argument("--cache", default="scraper/cache")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args(argv)
    stagioni = json.loads(Path(a.stagioni).read_text(encoding="utf-8"))
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    fetcher = Fetcher()
    esito = 0
    for g in gironi_attivi(stagioni):
        idg = g["idgirone"]
        f_out = out / f"{idg}.json"
        prec = json.loads(f_out.read_text(encoding="utf-8")) if f_out.exists() else None
        try:
            raw = raccogli_girone(fetcher, Path(a.cache) / str(idg), idg, precedente=prec, force=a.force)
        except Exception as e:  # noqa: BLE001 — un girone rotto non ferma gli altri
            print(f"ERRORE girone {idg}: {e}", file=sys.stderr)
            esito = 1
            continue
        f_out.write_text(json.dumps(raw, ensure_ascii=False, indent=1), encoding="utf-8")
        for e in raw["errori"]:
            print(f"AVVISO girone {idg}: {e}", file=sys.stderr)
        print(f"girone {idg} ({g['nome']}): {len(raw['partite'])} partite, {len(raw['tabellini'])} tabellini, "
              f"{len(raw['errori'])} avvisi")
        if raw["incompleti"]:
            print(f"INFO girone {idg}: {len(raw['incompleti'])} tabellini senza formazioni (riprovo al prossimo run)")
        if len(raw["errori"]) > 10:
            print(f"ERRORE girone {idg}: troppi avvisi, probabile cambio di struttura del sito", file=sys.stderr)
            esito = 1
    # i tabellini d'archivio non entrano nel repo: il raw contiene già tutto, la cache HTML è temporanea
    with tempfile.TemporaryDirectory(prefix="sl-archivio-") as tmp:
        fetch_archivio(stagioni, out, fetcher, Path(tmp), force=a.force)
    return esito


if __name__ == "__main__":
    sys.exit(main())
