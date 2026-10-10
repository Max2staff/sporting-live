# Sporting Live — fase 1: piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web app pubblica (PWA statica) con partite, classifiche, squadre e statistiche giocatori di tutti i gironi dello Sporting Club Mestre, aggiornata da GitHub Actions e pubblicata su GitHub Pages.

**Architecture:** Uno scraper Python legge le tre pagine PHP del sito ufficiale per ogni girone elencato in `stagioni.json`, con cache dei tabellini e fallback ai dati precedenti; un passo di build calcola statistiche e scrive JSON statici in `site/data/`. Il sito è HTML/CSS/JS vanilla con router su hash, barra inferiore, preferiti in localStorage e service worker. Nessun server, nessun login. La sezione Vantaggi (sponsor) è fuori da questo piano (fase 2).

**Tech Stack:** Python 3.12 su Actions (3.9 compatibile in locale: `from __future__ import annotations`), requests, beautifulsoup4, pytest, Pillow (solo icone); JavaScript ES modules senza bundler, `node --test`; GitHub Actions + GitHub Pages (deploy via `actions/deploy-pages`).

**Spec:** `docs/superpowers/specs/2026-10-10-sporting-live-design.md`

**Codice da riusare:** l'app SOCKS in `/Users/massimilianogriletti/Documents/Socks_Calciotto` (NON modificarla). Da lì si copiano `scraper/parse.py`, le fixture HTML e i test del parser.

## Global Constraints

- Python: ogni modulo inizia con `from __future__ import annotations`; deve girare su 3.9 e 3.12.
- Nessun framework JS, nessun bundler, nessun web font esterno; moduli ES caricati direttamente.
- Nessun dato personale raccolto dagli utenti; preferiti e tema solo in localStorage, ogni accesso a localStorage dentro try/catch.
- Scraper educato: User-Agent `SportingLive/1.0 (+app risultati Sporting Club Mestre; contatto: massimiliano.griletti@gmail.com)` (indirizzo da confermare con l'utente prima della pubblicazione), pausa 0,5 s tra richieste, 3 tentativi, timeout 20 s.
- Identità visiva: blu notte `#01213b`, azzurro `#00579e`, arancione `#ff4e00`, grigi `#455a64`/`#eceff1`; tema chiaro e scuro.
- Larghezza massima contenuto 640 px; tap target ≥ 44 px; nessuno scroll orizzontale di pagina.
- Testi dell'interfaccia in italiano.
- Ogni commit: messaggio in italiano, prefisso `feat:`/`fix:`/`test:`/`docs:`/`chore:`, chiuso da `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Git: lavorare su `main` del repo `Documents/Sporting_Live` (repo nuovo, nessun remoto finché l'utente non lo crea).

## Review Focus

1. Partita senza data (`data: null`, calendario "da definire"): il selettore giorno non deve rompersi e la partita va in un gruppo "Da definire" in coda. Test in Task 9 (`giorni.test.js`).
2. Tabellino pubblicato prima delle formazioni (risultato presente, formazioni vuote): non va messo in cache, va ritentato al run successivo, ma dopo 7 giorni si accetta così com'è. Test in Task 3.
3. Nome squadra nel tabellino non corrispondente alla classifica (`squadraId: null`): le statistiche non devono sollevare eccezioni e il giocatore va ignorato. Test in Task 4.
4. Girone a inizio stagione senza partite giocate: build e viste devono mostrare classifica a zero e "nessun dato" senza errori. Test in Task 6 e Task 13.
5. localStorage non disponibile (navigazione privata su iPhone): preferiti e tema devono funzionare in memoria senza eccezioni. Test in Task 9 (`preferiti.test.js`).

---

### Task 1: Scaffold del repository e parser riusato

**Files:**
- Create: `README.md`, `.gitignore`, `package.json`, `scraper/requirements.txt`, `pytest.ini`, `scraper/__init__.py`, `scraper/tests/__init__.py`, `scraper/tests/conftest.py`, `stagioni.json`, `alias.json`
- Copy from SOCKS: `scraper/parse.py`, `scraper/tests/test_parse_calendario.py`, `scraper/tests/test_parse_classifica.py`, `scraper/tests/test_parse_tabellino.py`, `scraper/tests/fixtures/*.html`

**Interfaces:**
- Produces: `scraper.parse.parse_classifica(html) -> list[dict]` (chiavi `squadraId, nome, pos, pt, g, v, n, p, gf, gs, dr`), `parse_calendario(html) -> list[dict]` (chiavi `id, giornata, data, ora, casa, ospite, golCasa, golOspite, giocata, tavolino`), `parse_tabellino(html) -> dict` (chiavi `casa, ospite, golCasa, golOspite, marcatori[{squadra,nome,minuto}], formazioni[{squadra,nome,numero,voto,ammonito,espulso}], migliore{nome,squadra}|None`), `ParseError`.
- Produces: `stagioni.json` e `alias.json` con la struttura sotto.

- [ ] **Step 1: Copiare parser, fixture e test dall'app SOCKS**

```bash
cd /Users/massimilianogriletti/Documents/Sporting_Live
S=/Users/massimilianogriletti/Documents/Socks_Calciotto
mkdir -p scraper/tests/fixtures
cp $S/scraper/parse.py scraper/parse.py
cp $S/scraper/tests/conftest.py scraper/tests/conftest.py
cp $S/scraper/tests/test_parse_calendario.py $S/scraper/tests/test_parse_classifica.py $S/scraper/tests/test_parse_tabellino.py scraper/tests/
cp $S/scraper/tests/fixtures/*.html scraper/tests/fixtures/
touch scraper/__init__.py scraper/tests/__init__.py
```

- [ ] **Step 2: Scrivere i file di configurazione del progetto**

`scraper/requirements.txt`:
```
requests==2.32.3
beautifulsoup4==4.12.3
pillow==10.4.0
pytest==8.3.2
```

`pytest.ini`:
```ini
[pytest]
testpaths = scraper/tests
```

`package.json`:
```json
{
  "name": "sporting-live",
  "private": true,
  "type": "module",
  "scripts": { "test": "node --test site/js/tests/*.test.js" }
}
```

`.gitignore`:
```
.venv/
__pycache__/
.pytest_cache/
.DS_Store
node_modules/
```

`stagioni.json`:
```json
{
  "stagione": "2026/27",
  "campionati": [
    {"id": "c8", "nome": "Calcio a 8", "gironi": [
      {"idgirone": 425, "nome": "Serie A", "slug": "serie-a", "attivo": true},
      {"idgirone": 421, "nome": "Serie B", "slug": "serie-b", "attivo": true},
      {"idgirone": 422, "nome": "Serie C", "slug": "serie-c", "attivo": true}
    ]},
    {"id": "c5", "nome": "Calcio a 5", "gironi": [
      {"idgirone": 426, "nome": "Super League", "slug": "super-league", "attivo": true}
    ]}
  ],
  "archivio": []
}
```

`alias.json` (chiave = idgirone come stringa oppure `"*"` per tutti; valore `"***"` = oscurato):
```json
{
  "*": {}
}
```

`README.md`:
```markdown
# Sporting Live

Risultati, classifiche e statistiche dei campionati dello Sporting Club Mestre, dal telefono.
Spec: `docs/superpowers/specs/2026-10-10-sporting-live-design.md`.

## Sviluppo locale

    python3 -m venv .venv && source .venv/bin/activate
    pip install -r scraper/requirements.txt
    python -m pytest -q && npm test
    python -m scraper.fetch && python -m scraper.build
    python3 -m http.server -d site 8080

## File da modificare a mano

- `stagioni.json`: campionati e gironi da leggere (idgirone dal sito ufficiale).
- `alias.json`: varianti di nomi giocatori → nome canonico; `"***"` oscura un nome.
```

- [ ] **Step 3: Creare il venv e lanciare i test del parser**

```bash
cd /Users/massimilianogriletti/Documents/Sporting_Live
python3 -m venv .venv && source .venv/bin/activate && pip install -q -r scraper/requirements.txt
python -m pytest -q
```
Expected: tutti i test del parser passano (circa 12 test), nessun errore di import.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: scaffold del progetto e parser riusato da SOCKS

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: `scraper/config.py` con costruzione URL

**Files:**
- Create: `scraper/config.py`, `scraper/tests/test_config.py`

**Interfaces:**
- Produces: `BASE, USER_AGENT, PAUSA_S, TIMEOUT_S, TENTATIVI, GIORNI_TABELLINO_INCOMPLETO = 7`, `url_classifica(idgirone, tipo=None) -> str`, `url_calendario(idgirone) -> str`, `url_tabellino(idgirone, idpartita) -> str`.

- [ ] **Step 1: Test**

`scraper/tests/test_config.py`:
```python
from scraper import config


def test_url():
    assert config.url_calendario(421) == "https://www.campionatisportingclub.it/campionati0gironigiornatepartite_calendario.php?idgirone=421"
    assert config.url_classifica(421) == "https://www.campionatisportingclub.it/campionati0gironigiornatepartite_classifica.php?idgirone=421"
    assert config.url_classifica(421, tipo="incasa").endswith("?idgirone=421&tipo=incasa")
    assert config.url_tabellino(421, 14083).endswith("tabellini.php?idgirone=421&tipo=partita&idpartita=14083")


def test_user_agent_identificabile():
    assert "SportingLive" in config.USER_AGENT and "contatto" in config.USER_AGENT
```

- [ ] **Step 2: Run** `python -m pytest scraper/tests/test_config.py -q` → FAIL (ModuleNotFoundError).

- [ ] **Step 3: Implementazione** `scraper/config.py`:
```python
"""Costanti del sito ufficiale e costruzione URL."""
from __future__ import annotations

BASE = "https://www.campionatisportingclub.it/"
USER_AGENT = "SportingLive/1.0 (+app risultati Sporting Club Mestre; contatto: massimiliano.griletti@gmail.com)"
PAUSA_S = 0.5
TIMEOUT_S = 20
TENTATIVI = 3
GIORNI_TABELLINO_INCOMPLETO = 7   # dopo tanti giorni un tabellino senza formazioni si accetta com'è

_P = BASE + "campionati0gironigiornatepartite_"


def url_classifica(idgirone: int, tipo: str | None = None) -> str:
    u = f"{_P}classifica.php?idgirone={idgirone}"
    return u + (f"&tipo={tipo}" if tipo else "")      # tipo: "incasa" | "fuoricasa"


def url_calendario(idgirone: int) -> str:
    return f"{_P}calendario.php?idgirone={idgirone}"


def url_tabellino(idgirone: int, idpartita: int) -> str:
    return f"{_P}tabellini.php?idgirone={idgirone}&tipo=partita&idpartita={idpartita}"
```

- [ ] **Step 4: Run** `python -m pytest -q` → PASS.
- [ ] **Step 5: Commit** `git add -A && git commit -m "feat: config scraper con URL del sito ufficiale"` (con riga Co-Authored-By).

---

### Task 3: `scraper/fetch.py` — raccolta di un girone

**Files:**
- Create: `scraper/fetch.py`, `scraper/tests/test_fetch.py`

**Interfaces:**
- Consumes: Task 1 parser, Task 2 config.
- Produces: `Fetcher(get=None, pausa=PAUSA_S)` con `.get(url) -> str`, `.log: list[str]`; `raccogli_girone(fetcher, cache_dir: Path, idgirone: int, precedente: dict | None = None, adesso: datetime | None = None, force: bool = False) -> dict` con chiavi:
  `aggiornato` (ISO), `idgirone`, `squadre [{id,nome}]`, `classifica {totale,casa,trasferta}` (liste di righe del parser), `partite [{id,giornata,data,ora,casaId,ospiteId,golCasa,golOspite,giocata,tavolino}]`, `tabellini {"<id>": {marcatori[{squadraId,nome,minuto}], formazioni[{squadraId,nome,numero,voto,ammonito,espulso}], migliore{squadraId,nome}|None, completo: bool}}`, `stale {sezione: iso}`, `errori [str]`.
- Regola tabellino incompleto: se `formazioni` è vuota e la partita non è a tavolino e la sua data è più recente di `GIORNI_TABELLINO_INCOMPLETO` giorni rispetto ad `adesso`, si solleva `TabellinoIncompleto`, il tabellino non entra né in cache né in `tabellini` e si aggiunge un avviso. Altrimenti si accetta con `completo = bool(formazioni)`.

- [ ] **Step 1: Test** `scraper/tests/test_fetch.py`:
```python
from datetime import datetime
from pathlib import Path
from scraper.fetch import Fetcher, raccogli_girone

G = 390   # girone delle fixture "giocate" (stagione 2025/26)


def fake_get_factory(fixture, mancanti=(), tabellini_extra=None):
    """Mappa URL → fixture. `mancanti`: frammenti di URL che simulano il sito giù.
    `tabellini_extra`: {idpartita: nomefile} per far rispondere partite specifiche con una fixture scelta."""
    tabellini_extra = tabellini_extra or {}

    def fake_get(url):
        if any(m in url for m in mancanti):
            raise RuntimeError("simulo sito giù")
        if "calendario.php" in url:
            return fixture("calendario_2025_giocato.html")
        if "tipo=incasa" in url or "tipo=fuoricasa" in url:
            return fixture("classifica_incasa.html")
        if "classifica.php" in url:
            return fixture("classifica_giornata5.html")
        for idp, nomefile in tabellini_extra.items():
            if f"idpartita={idp}" in url:
                return fixture(nomefile)
        if "idpartita=13529" in url:
            return fixture("tabellino_13529.html")
        if "tabellini.php" in url:
            return fixture("tabellino_tavolino_13597.html")
        raise AssertionError(f"URL inatteso {url}")
    return fake_get


def test_raccoglie_tutto_e_mappa_gli_id(fixture, tmp_path):
    f = Fetcher(get=fake_get_factory(fixture), pausa=0)
    t = raccogli_girone(f, tmp_path, G, adesso=datetime(2026, 3, 10, 6, 0))
    assert t["idgirone"] == G
    assert len(t["squadre"]) == 10
    assert t["classifica"]["totale"][0]["nome"] == "PRINCIPE 1846"
    assert len(t["classifica"]["casa"]) == 10 and len(t["classifica"]["trasferta"]) == 10
    assert len(t["partite"]) == 90
    p = next(x for x in t["partite"] if x["id"] == 13529)
    assert p["casaId"] == next(s["id"] for s in t["squadre"] if s["nome"] == "NOVAK C5")
    assert "casa" not in p
    assert set(t["tabellini"]) == {str(x["id"]) for x in t["partite"] if x["giocata"]}
    tab = t["tabellini"]["13529"]
    assert tab["marcatori"][0]["squadraId"] == p["casaId"]
    assert tab["migliore"]["squadraId"] == p["ospiteId"]
    assert tab["completo"] is True
    assert t["errori"] == [] and t["stale"] == {}
    assert t["aggiornato"].startswith("2026-03-10T06:00")


def test_cache_tabellini_evita_ridownload(fixture, tmp_path):
    f1 = Fetcher(get=fake_get_factory(fixture), pausa=0)
    prima = raccogli_girone(f1, tmp_path, G)
    assert len([u for u in f1.log if "tabellini.php" in u]) == 90
    assert (tmp_path / "tabellini" / "13529.html").exists()
    f2 = Fetcher(get=fake_get_factory(fixture), pausa=0)
    raccogli_girone(f2, tmp_path, G, precedente=prima)
    assert len([u for u in f2.log if "tabellini.php" in u]) == 0


def test_tabellino_senza_formazioni_recente_non_si_cachea(fixture, tmp_path):
    html = fixture("tabellino_13529.html").replace("tabellaformazionetitolari", "tabella-rimossa")
    base = fake_get_factory(fixture)
    f = Fetcher(get=lambda url: html if "idpartita=13535" in url else base(url), pausa=0)
    t = raccogli_girone(f, tmp_path, G, adesso=datetime(2025, 1, 1))   # prima della stagione: ogni partita è "recente"
    assert "13535" not in t["tabellini"]
    assert not (tmp_path / "tabellini" / "13535.html").exists()
    assert any(e.startswith("tabellini.13535") for e in t["errori"])


def test_tabellino_senza_formazioni_vecchio_si_accetta(fixture, tmp_path):
    html = fixture("tabellino_13529.html").replace("tabellaformazionetitolari", "tabella-rimossa")
    base = fake_get_factory(fixture)
    f = Fetcher(get=lambda url: html if "idpartita=13535" in url else base(url), pausa=0)
    t = raccogli_girone(f, tmp_path, G, adesso=datetime(2027, 1, 1))
    assert t["tabellini"]["13535"]["completo"] is False
    assert t["tabellini"]["13535"]["formazioni"] == []


def test_fallback_ai_dati_precedenti_con_stale(fixture, tmp_path):
    f1 = Fetcher(get=fake_get_factory(fixture), pausa=0)
    prima = raccogli_girone(f1, tmp_path, G, adesso=datetime(2026, 3, 9, 6, 0))
    f2 = Fetcher(get=fake_get_factory(fixture, mancanti=["calendario.php", "tipo=incasa"]), pausa=0)
    t = raccogli_girone(f2, tmp_path, G, precedente=prima, adesso=datetime(2026, 3, 10, 6, 0))
    assert len(t["partite"]) == 90
    assert t["stale"]["partite"].startswith("2026-03-09")
    assert t["stale"]["classifica.casa"].startswith("2026-03-09")
    assert any(e.startswith("partite:") for e in t["errori"])


def test_classifica_totale_assente_senza_precedente_fallisce(fixture, tmp_path):
    import pytest
    f = Fetcher(get=fake_get_factory(fixture, mancanti=["classifica.php?idgirone=390"]), pausa=0)
    with pytest.raises(RuntimeError):
        raccogli_girone(f, tmp_path, G)


def test_squadra_non_mappata_da_avviso_e_id_none(fixture, tmp_path):
    cal = fixture("calendario_2025_giocato.html").replace("NOVAK C5", "NOVAK CINQUE")
    base = fake_get_factory(fixture)
    f = Fetcher(get=lambda url: cal if "calendario.php" in url else base(url), pausa=0)
    t = raccogli_girone(f, tmp_path, G)
    p = next(x for x in t["partite"] if x["id"] == 13529)
    assert p["casaId"] is None
    assert any("squadra non mappata" in e for e in t["errori"])
```

- [ ] **Step 2: Run** `python -m pytest scraper/tests/test_fetch.py -q` → FAIL (import).

- [ ] **Step 3: Implementazione** `scraper/fetch.py`:
```python
"""Scarica le pagine di ogni girone attivo e scrive build/raw/<idgirone>.json.

Politica: educato col sito (pausa, UA, retry), cache su disco dei tabellini, fallback per sezione
ai dati precedenti con marcatura `stale`.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests

from . import config
from .parse import parse_calendario, parse_classifica, parse_tabellino

TZ_ROMA = timezone(timedelta(hours=2))  # basta per marcare la data; Actions gira con TZ=Europe/Rome


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
    soglia = (adesso.replace(tzinfo=None) - timedelta(days=config.GIORNI_TABELLINO_INCOMPLETO)).date()
    for p in partite:
        if not p["giocata"] or (str(p["id"]) in tabellini and not force):
            continue
        recente = p["data"] is None or datetime.strptime(p["data"], "%Y-%m-%d").date() > soglia

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
        except Exception as e:
            falliti = True
            errori.append(f"tabellini.{p['id']}: {e}")
    if falliti and prec.get("aggiornato"):
        stale["tabellini"] = prec["aggiornato"]

    return {
        "aggiornato": adesso.isoformat(timespec="seconds"),
        "idgirone": idgirone,
        "squadre": squadre,
        "classifica": {"totale": totale, "casa": casa, "trasferta": trasferta},
        "partite": partite,
        "tabellini": tabellini,
        "stale": stale,
        "errori": errori,
    }


def gironi_attivi(stagioni: dict) -> list[dict]:
    return [g for c in stagioni["campionati"] for g in c["gironi"] if g.get("attivo", True)]


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
        except RuntimeError as e:
            print(f"ERRORE girone {idg}: {e}", file=sys.stderr)
            esito = 1
            continue
        f_out.write_text(json.dumps(raw, ensure_ascii=False, indent=1), encoding="utf-8")
        for e in raw["errori"]:
            print(f"AVVISO girone {idg}: {e}", file=sys.stderr)
        print(f"girone {idg} ({g['nome']}): {len(raw['partite'])} partite, {len(raw['tabellini'])} tabellini, "
              f"{len(raw['errori'])} avvisi")
        if len(raw["errori"]) > 10:
            print(f"ERRORE girone {idg}: troppi avvisi, probabile cambio di struttura del sito", file=sys.stderr)
            esito = 1
    return esito


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Run** `python -m pytest -q` → PASS (se `test_tabellino_senza_formazioni_recente_non_si_cachea` fallisce perché la partita 13535 nella fixture non è "giocata", scegliere un altro id giocato dalla fixture `calendario_2025_giocato.html` diverso da 13529 e usarlo in entrambi i test sulle formazioni).

- [ ] **Step 5: Test del `main` su file temporanei**

Aggiungere in fondo a `scraper/tests/test_fetch.py`:
```python
def test_main_scrive_un_raw_per_girone(fixture, tmp_path, monkeypatch):
    from scraper import fetch
    (tmp_path / "stagioni.json").write_text(json.dumps({"stagione": "x", "campionati": [
        {"id": "c", "nome": "C", "gironi": [{"idgirone": 390, "nome": "G", "slug": "g", "attivo": True},
                                             {"idgirone": 1, "nome": "Off", "slug": "off", "attivo": False}]}]}))
    monkeypatch.setattr(fetch, "Fetcher", lambda: Fetcher(get=fake_get_factory(fixture), pausa=0))
    rc = fetch.main(["--stagioni", str(tmp_path / "stagioni.json"), "--out", str(tmp_path / "raw"),
                     "--cache", str(tmp_path / "cache")])
    assert rc == 0
    assert (tmp_path / "raw" / "390.json").exists() and not (tmp_path / "raw" / "1.json").exists()
```
(aggiungere `import json` in testa al file). Run `python -m pytest -q` → PASS.

- [ ] **Step 6: Commit** `git add -A && git commit -m "feat: raccolta dati di un girone con cache e fallback"` (con Co-Authored-By).

---

### Task 4: `scraper/stats.py` — statistiche pure da un raw di girone

**Files:**
- Create: `scraper/stats.py`, `scraper/tests/test_stats.py`

**Interfaces:**
- Consumes: il dict `raw` prodotto da `raccogli_girone` (Task 3).
- Produces:
  - `slug_giocatore(squadra_id: int, nome: str) -> str` es. `2480-rossi-mario`
  - `partite_squadra(raw, squadra_id) -> list[dict]` ordinate per giornata, chiavi `id, giornata, data, ora, casa (bool), avversarioId, gf, gs, esito ('V'|'N'|'P'|None), giocata, tavolino, tabellino (bool)`
  - `forma(raw, squadra_id, n=5) -> list[str]` ultimi n esiti, dal più vecchio al più recente
  - `stat_squadra(raw, squadra_id) -> dict` chiavi `g,v,n,p,gf,gs,mediaGf,mediaGs,casa{g,v,n,p},fuori{g,v,n,p},serie{tipo,n}`
  - `giocatori(raw) -> list[dict]` uno per `(squadraId, nome)`, chiavi `slug, nome, squadraId, presenze, gol, votoMedio|None, nVoti, ammonizioni, espulsioni, mvp, perPartita [{idPartita, giornata, data, avversarioId, casa, gf, gs, esito, gol, voto, ammonito, espulso, mvp}]`; i giocatori con `squadraId None` sono ignorati
  - `classifiche_giocatori(lista) -> dict` chiavi `marcatori` (gol desc, presenze asc), `voti` (votoMedio desc, solo nVoti ≥ 3), `mvp` (mvp desc, solo > 0), `fairplay` (punti cartellini asc = ammonizioni + 3·espulsioni, presenze desc, solo presenze ≥ 3); ogni voce è il dict del giocatore senza `perPartita`, massimo 50 voci per lista

- [ ] **Step 1: Test** `scraper/tests/test_stats.py` con un raw sintetico:
```python
from scraper.stats import (slug_giocatore, partite_squadra, forma, stat_squadra, giocatori,
                           classifiche_giocatori)


def raw_finto():
    def tab(marc, form, mig):
        return {"marcatori": marc, "formazioni": form, "migliore": mig, "completo": True}
    F = lambda sq, nome, voto=7.0, amm=False, esp=False: {"squadraId": sq, "nome": nome, "numero": 1,
                                                          "voto": voto, "ammonito": amm, "espulso": esp}
    return {
        "idgirone": 1, "aggiornato": "2026-10-01T07:00:00", "stale": {}, "errori": [],
        "squadre": [{"id": 10, "nome": "ALFA"}, {"id": 20, "nome": "BETA"}, {"id": 30, "nome": "GAMMA"}],
        "classifica": {"totale": [], "casa": [], "trasferta": []},
        "partite": [
            {"id": 1, "giornata": 1, "data": "2026-09-16", "ora": "20:30", "casaId": 10, "ospiteId": 20,
             "golCasa": 2, "golOspite": 1, "giocata": True, "tavolino": False},
            {"id": 2, "giornata": 2, "data": "2026-09-23", "ora": "20:30", "casaId": 30, "ospiteId": 10,
             "golCasa": 3, "golOspite": 3, "giocata": True, "tavolino": False},
            {"id": 3, "giornata": 3, "data": "2026-09-30", "ora": "20:30", "casaId": 10, "ospiteId": 30,
             "golCasa": 0, "golOspite": 1, "giocata": True, "tavolino": False},
            {"id": 4, "giornata": 4, "data": None, "ora": None, "casaId": 20, "ospiteId": 10,
             "golCasa": None, "golOspite": None, "giocata": False, "tavolino": False},
        ],
        "tabellini": {
            "1": tab([{"squadraId": 10, "nome": "ROSSI MARIO", "minuto": 5},
                      {"squadraId": 10, "nome": "ROSSI MARIO", "minuto": 40},
                      {"squadraId": 20, "nome": "VERDI LUCA", "minuto": 50},
                      {"squadraId": None, "nome": "IGNOTO", "minuto": 1}],
                     [F(10, "ROSSI MARIO", 8.0), F(10, "BIANCHI PAOLO", 6.5, amm=True), F(20, "VERDI LUCA", 7.0),
                      F(None, "IGNOTO", 7.0)],
                     {"squadraId": 10, "nome": "ROSSI MARIO"}),
            "2": tab([], [F(10, "ROSSI MARIO", 7.0), F(10, "BIANCHI PAOLO", None, esp=True), F(30, "NERI ANNA", 7.5)], None),
            "3": tab([{"squadraId": 30, "nome": "NERI ANNA", "minuto": 12}],
                     [F(10, "ROSSI MARIO", 6.0), F(30, "NERI ANNA", 8.5)], {"squadraId": 30, "nome": "NERI ANNA"}),
        },
    }


def test_slug():
    assert slug_giocatore(2480, "D'ANGELO JOSÈ  MARÍA") == "2480-d-angelo-jose-maria"


def test_partite_squadra_e_forma():
    ps = partite_squadra(raw_finto(), 10)
    assert [p["esito"] for p in ps] == ["V", "N", "P", None]
    assert ps[1]["casa"] is False and ps[1]["avversarioId"] == 30 and (ps[1]["gf"], ps[1]["gs"]) == (3, 3)
    assert ps[3]["data"] is None and ps[3]["tabellino"] is False and ps[0]["tabellino"] is True
    assert forma(raw_finto(), 10) == ["V", "N", "P"]
    assert forma(raw_finto(), 10, n=2) == ["N", "P"]
    assert forma(raw_finto(), 99) == []


def test_stat_squadra():
    s = stat_squadra(raw_finto(), 10)
    assert (s["g"], s["v"], s["n"], s["p"], s["gf"], s["gs"]) == (3, 1, 1, 1, 5, 5)
    assert s["mediaGf"] == 1.67 and s["casa"] == {"g": 2, "v": 1, "n": 0, "p": 1}
    assert s["serie"] == {"tipo": "P", "n": 1}
    assert stat_squadra(raw_finto(), 99)["g"] == 0 and stat_squadra(raw_finto(), 99)["serie"] is None


def test_giocatori_aggregati_e_ignoto_escluso():
    g = {x["slug"]: x for x in giocatori(raw_finto())}
    assert "None-ignoto" not in g and not any(x["nome"] == "IGNOTO" for x in g.values())
    rossi = g["10-rossi-mario"]
    assert (rossi["presenze"], rossi["gol"], rossi["votoMedio"], rossi["nVoti"], rossi["mvp"]) == (3, 2, 7.0, 3, 1)
    assert rossi["perPartita"][0] == {"idPartita": 1, "giornata": 1, "data": "2026-09-16", "avversarioId": 20,
                                      "casa": True, "gf": 2, "gs": 1, "esito": "V", "gol": 2, "voto": 8.0,
                                      "ammonito": False, "espulso": False, "mvp": True}
    bianchi = g["10-bianchi-paolo"]
    assert (bianchi["ammonizioni"], bianchi["espulsioni"], bianchi["nVoti"], bianchi["votoMedio"]) == (1, 1, 1, 6.5)


def test_classifiche_giocatori():
    c = classifiche_giocatori(giocatori(raw_finto()))
    assert [x["nome"] for x in c["marcatori"]] == ["ROSSI MARIO", "VERDI LUCA", "NERI ANNA"]   # a parità di gol, meno presenze prima
    assert [x["nome"] for x in c["voti"]] == ["ROSSI MARIO"]          # unico con almeno 3 voti
    assert [x["nome"] for x in c["mvp"]] == ["NERI ANNA", "ROSSI MARIO"]   # a parità, ordine alfabetico
    assert [x["nome"] for x in c["fairplay"]] == ["ROSSI MARIO"]      # unico con 3 presenze
    assert "perPartita" not in c["marcatori"][0]


def test_girone_senza_partite_giocate():
    r = raw_finto()
    r["tabellini"] = {}
    for p in r["partite"]:
        p.update(giocata=False, golCasa=None, golOspite=None)
    assert giocatori(r) == [] and forma(r, 10) == []
    assert classifiche_giocatori([]) == {"marcatori": [], "voti": [], "mvp": [], "fairplay": []}
```

- [ ] **Step 2: Run** `python -m pytest scraper/tests/test_stats.py -q` → FAIL (import).

- [ ] **Step 3: Implementazione** `scraper/stats.py`:
```python
"""Statistiche di squadra e giocatori. Funzioni pure sul raw di un girone (vedi fetch.raccogli_girone)."""
from __future__ import annotations

import re
import unicodedata

MIN_VOTI = 3
MIN_PRESENZE_FAIRPLAY = 3
MAX_VOCI = 50


def slug_giocatore(squadra_id: int, nome: str) -> str:
    s = unicodedata.normalize("NFKD", nome).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return f"{squadra_id}-{s}"


def _esito(gf, gs):
    if gf is None or gs is None:
        return None
    return "V" if gf > gs else "P" if gf < gs else "N"


def partite_squadra(raw: dict, squadra_id: int) -> list[dict]:
    out = []
    for p in raw["partite"]:
        if squadra_id not in (p["casaId"], p["ospiteId"]):
            continue
        casa = p["casaId"] == squadra_id
        gf, gs = (p["golCasa"], p["golOspite"]) if casa else (p["golOspite"], p["golCasa"])
        out.append({"id": p["id"], "giornata": p["giornata"], "data": p["data"], "ora": p["ora"], "casa": casa,
                    "avversarioId": p["ospiteId"] if casa else p["casaId"], "gf": gf, "gs": gs,
                    "esito": _esito(gf, gs) if p["giocata"] else None, "giocata": p["giocata"],
                    "tavolino": p["tavolino"], "tabellino": str(p["id"]) in raw["tabellini"]})
    return sorted(out, key=lambda x: (x["giornata"], x["id"]))


def forma(raw: dict, squadra_id: int, n: int = 5) -> list[str]:
    esiti = [p["esito"] for p in partite_squadra(raw, squadra_id) if p["esito"]]
    return esiti[-n:]


def _tondo(x: float) -> float:
    return round(x + 1e-9, 2)


def stat_squadra(raw: dict, squadra_id: int) -> dict:
    gs_ = [p for p in partite_squadra(raw, squadra_id) if p["esito"]]

    def conta(ps):
        return {"g": len(ps), "v": sum(p["esito"] == "V" for p in ps), "n": sum(p["esito"] == "N" for p in ps),
                "p": sum(p["esito"] == "P" for p in ps)}

    gf = sum(p["gf"] for p in gs_)
    gsub = sum(p["gs"] for p in gs_)
    serie = None
    if gs_:
        ultimo = gs_[-1]["esito"]
        n = 0
        for p in reversed(gs_):
            if p["esito"] != ultimo:
                break
            n += 1
        serie = {"tipo": ultimo, "n": n}
    return {**conta(gs_), "gf": gf, "gs": gsub,
            "mediaGf": _tondo(gf / len(gs_)) if gs_ else 0, "mediaGs": _tondo(gsub / len(gs_)) if gs_ else 0,
            "casa": conta([p for p in gs_ if p["casa"]]), "fuori": conta([p for p in gs_ if not p["casa"]]),
            "serie": serie}


def giocatori(raw: dict) -> list[dict]:
    per: dict[tuple, dict] = {}
    partite = {p["id"]: p for p in raw["partite"]}

    def get(sq, nome):
        k = (sq, nome)
        if k not in per:
            per[k] = {"slug": slug_giocatore(sq, nome), "nome": nome, "squadraId": sq, "presenze": 0, "gol": 0,
                      "voti": [], "ammonizioni": 0, "espulsioni": 0, "mvp": 0, "perPartita": []}
        return per[k]

    for idp, t in raw["tabellini"].items():
        p = partite.get(int(idp))
        if p is None:
            continue
        mig = t.get("migliore") or {}
        for f in t["formazioni"]:
            sq = f["squadraId"]
            if sq is None:
                continue
            casa = p["casaId"] == sq
            gf, gs = (p["golCasa"], p["golOspite"]) if casa else (p["golOspite"], p["golCasa"])
            g = get(sq, f["nome"])
            gol = sum(1 for m in t["marcatori"] if m["squadraId"] == sq and m["nome"] == f["nome"])
            is_mvp = mig.get("squadraId") == sq and mig.get("nome") == f["nome"]
            g["presenze"] += 1
            g["gol"] += gol
            if f["voto"] is not None:
                g["voti"].append(f["voto"])
            g["ammonizioni"] += int(bool(f["ammonito"]))
            g["espulsioni"] += int(bool(f["espulso"]))
            g["mvp"] += int(is_mvp)
            g["perPartita"].append({"idPartita": p["id"], "giornata": p["giornata"], "data": p["data"],
                                    "avversarioId": p["ospiteId"] if casa else p["casaId"], "casa": casa,
                                    "gf": gf, "gs": gs, "esito": _esito(gf, gs), "gol": gol, "voto": f["voto"],
                                    "ammonito": bool(f["ammonito"]), "espulso": bool(f["espulso"]), "mvp": is_mvp})
    out = []
    for g in per.values():
        g["perPartita"].sort(key=lambda x: (x["giornata"], x["idPartita"]))
        voti = g.pop("voti")
        g["nVoti"] = len(voti)
        g["votoMedio"] = _tondo(sum(voti) / len(voti)) if voti else None
        out.append(g)
    return sorted(out, key=lambda g: (g["squadraId"], g["nome"]))


def _senza_partite(g: dict) -> dict:
    return {k: v for k, v in g.items() if k != "perPartita"}


def classifiche_giocatori(lista: list[dict]) -> dict:
    marcatori = sorted((g for g in lista if g["gol"] > 0), key=lambda g: (-g["gol"], g["presenze"], g["nome"]))
    voti = sorted((g for g in lista if g["nVoti"] >= MIN_VOTI), key=lambda g: (-g["votoMedio"], -g["nVoti"], g["nome"]))
    mvp = sorted((g for g in lista if g["mvp"] > 0), key=lambda g: (-g["mvp"], g["nome"]))
    fairplay = sorted((g for g in lista if g["presenze"] >= MIN_PRESENZE_FAIRPLAY),
                      key=lambda g: (g["ammonizioni"] + 3 * g["espulsioni"], -g["presenze"], g["nome"]))
    return {k: [_senza_partite(g) for g in v[:MAX_VOCI]]
            for k, v in (("marcatori", marcatori), ("voti", voti), ("mvp", mvp), ("fairplay", fairplay))}
```

- [ ] **Step 4: Run** `python -m pytest -q` → PASS.
- [ ] **Step 5: Commit** `git add -A && git commit -m "feat: statistiche squadre e giocatori"` (con Co-Authored-By).

---

### Task 5: Alias e oscuramento nomi

**Files:**
- Create: `scraper/alias.py`, `scraper/tests/test_alias.py`

**Interfaces:**
- Consumes: raw (Task 3).
- Produces: `carica_alias(path: Path) -> dict`, `applica_alias(raw: dict, alias: dict) -> dict` (nuovo raw con i nomi di marcatori, formazioni e migliore sostituiti; mappa = `alias.get("*", {})` aggiornata da `alias.get(str(raw["idgirone"]), {})`; valore `"***"` → `"GIOCATORE OSCURATO"`); costante `NOME_OSCURATO = "GIOCATORE OSCURATO"`.

- [ ] **Step 1: Test** `scraper/tests/test_alias.py`:
```python
import json
from scraper.alias import applica_alias, carica_alias, NOME_OSCURATO
from scraper.tests.test_stats import raw_finto


def test_applica_alias_globali_e_per_girone():
    alias = {"*": {"ROSSI MARIO": "ROSSI MARIO JR"}, "1": {"VERDI LUCA": "***"}, "2": {"NERI ANNA": "NERI ANNALISA"}}
    r = applica_alias(raw_finto(), alias)
    t1 = r["tabellini"]["1"]
    assert t1["marcatori"][0]["nome"] == "ROSSI MARIO JR" and t1["migliore"]["nome"] == "ROSSI MARIO JR"
    assert t1["marcatori"][2]["nome"] == NOME_OSCURATO
    assert any(f["nome"] == NOME_OSCURATO for f in t1["formazioni"])
    assert r["tabellini"]["3"]["formazioni"][1]["nome"] == "NERI ANNA"      # alias del girone 2 non si applica
    assert raw_finto()["tabellini"]["1"]["marcatori"][0]["nome"] == "ROSSI MARIO"   # input non mutato


def test_carica_alias_assente_o_vuoto(tmp_path):
    assert carica_alias(tmp_path / "manca.json") == {"*": {}}
    (tmp_path / "a.json").write_text(json.dumps({"*": {"A B": "A B."}}))
    assert carica_alias(tmp_path / "a.json") == {"*": {"A B": "A B."}}
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implementazione** `scraper/alias.py`:
```python
"""Correzione nomi giocatori (varianti → canonico) e oscuramento su richiesta."""
from __future__ import annotations

import copy
import json
from pathlib import Path

NOME_OSCURATO = "GIOCATORE OSCURATO"


def carica_alias(path: Path) -> dict:
    if not path.exists():
        return {"*": {}}
    dati = json.loads(path.read_text(encoding="utf-8"))
    dati.setdefault("*", {})
    return dati


def applica_alias(raw: dict, alias: dict) -> dict:
    mappa = dict(alias.get("*", {}))
    mappa.update(alias.get(str(raw["idgirone"]), {}))
    if not mappa:
        return raw

    def nome(n: str) -> str:
        v = mappa.get(n, n)
        return NOME_OSCURATO if v == "***" else v

    out = copy.deepcopy(raw)
    for t in out["tabellini"].values():
        for m in t["marcatori"]:
            m["nome"] = nome(m["nome"])
        for f in t["formazioni"]:
            f["nome"] = nome(f["nome"])
        if t.get("migliore"):
            t["migliore"]["nome"] = nome(t["migliore"]["nome"])
    return out
```
- [ ] **Step 4: Run** `python -m pytest -q` → PASS. **Step 5: Commit** `feat: alias e oscuramento nomi giocatori`.

---

### Task 6: `scraper/build.py` — JSON per il sito

**Files:**
- Create: `scraper/build.py`, `scraper/tests/test_build.py`

**Interfaces:**
- Consumes: `stagioni.json` (Task 1), raw per girone (Task 3), `stats` (Task 4), `alias` (Task 5).
- Produces: `BuildError`, `costruisci(stagioni: dict, raws: dict[int, dict], alias: dict, adesso: str) -> dict[str, object]` (mappa percorso relativo → oggetto JSON), `scrivi(files: dict, out_dir: Path)`, `main(argv)`.
- File prodotti (percorsi relativi a `site/data/`):
  - `indice.json`: `{stagione, generato, campionati:[{id,nome,gironi:[{idgirone,slug,nome,aggiornato,stale:bool}]}], squadre:[{id,nome,girone}], partite:[P]}` dove `P = {id,girone,giornata,data,ora,casaId,ospiteId,golCasa,golOspite,giocata,tavolino,tabellino:bool}` e `girone` è lo slug.
  - `girone/<slug>.json`: `{idgirone,slug,nome,campionato:{id,nome},stagione,aggiornato,stale:{...},squadre:[{id,nome,forma:[...]}],classifica:{totale,casa,trasferta},partite:[P],giocatori:{marcatori,voti,mvp,fairplay}}`.
  - `partita/<id>.json`: `{id,girone:{slug,nome},giornata,data,ora,casa:{id,nome},ospite:{id,nome},golCasa,golOspite,giocata,tavolino,tabellino:{marcatori,formazioni,migliore,completo}|null}`.
  - `squadra/<id>.json`: `{id,nome,girone:{slug,nome},pos,riga:{pt,g,v,n,p,gf,gs,dr}|null,stat,forma,partite:[partite_squadra + avversario:str],rosa:[giocatore senza perPartita]}`.
  - `giocatore/<slug>.json`: `{slug,nome,squadraId,squadra,girone:{slug,nome},presenze,gol,votoMedio,nVoti,ammonizioni,espulsioni,mvp,perPartita:[... + avversario:str]}`.
- `costruisci` solleva `BuildError` se nessun girone ha una classifica totale non vuota. `main` in quel caso stampa l'errore, non tocca `site/data` ed esce con 1.

- [ ] **Step 1: Test** `scraper/tests/test_build.py`:
```python
import json
import pytest
from scraper.build import BuildError, costruisci, scrivi, main
from scraper.tests.test_stats import raw_finto

STAGIONI = {"stagione": "2026/27", "campionati": [
    {"id": "c8", "nome": "Calcio a 8", "gironi": [{"idgirone": 1, "nome": "Serie B", "slug": "serie-b", "attivo": True}]}],
    "archivio": []}


def raw_con_classifica():
    r = raw_finto()
    r["classifica"]["totale"] = [
        {"squadraId": 10, "nome": "ALFA", "pos": 1, "pt": 4, "g": 3, "v": 1, "n": 1, "p": 1, "gf": 5, "gs": 5, "dr": 0},
        {"squadraId": 30, "nome": "GAMMA", "pos": 2, "pt": 4, "g": 2, "v": 1, "n": 1, "p": 0, "gf": 4, "gs": 3, "dr": 1},
        {"squadraId": 20, "nome": "BETA", "pos": 3, "pt": 0, "g": 1, "v": 0, "n": 0, "p": 1, "gf": 1, "gs": 2, "dr": -1}]
    return r


def test_costruisci_tutti_i_file():
    f = costruisci(STAGIONI, {1: raw_con_classifica()}, {"*": {}}, adesso="2026-10-01T21:00:00")
    ind = f["indice.json"]
    assert ind["stagione"] == "2026/27" and ind["generato"] == "2026-10-01T21:00:00"
    assert ind["campionati"][0]["gironi"][0] == {"idgirone": 1, "slug": "serie-b", "nome": "Serie B",
                                                 "aggiornato": "2026-10-01T07:00:00", "stale": False}
    assert {s["id"] for s in ind["squadre"]} == {10, 20, 30} and ind["squadre"][0]["girone"] == "serie-b"
    assert len(ind["partite"]) == 4 and ind["partite"][0]["tabellino"] is True and ind["partite"][3]["tabellino"] is False
    g = f["girone/serie-b.json"]
    assert g["campionato"] == {"id": "c8", "nome": "Calcio a 8"}
    assert next(s for s in g["squadre"] if s["id"] == 10)["forma"] == ["V", "N", "P"]
    assert g["giocatori"]["marcatori"][0]["nome"] == "ROSSI MARIO"
    p = f["partita/1.json"]
    assert p["casa"] == {"id": 10, "nome": "ALFA"} and p["tabellino"]["migliore"]["nome"] == "ROSSI MARIO"
    assert f["partita/4.json"]["tabellino"] is None
    s = f["squadra/10.json"]
    assert s["pos"] == 1 and s["riga"]["pt"] == 4 and s["stat"]["g"] == 3
    assert s["partite"][1]["avversario"] == "GAMMA"
    assert any(r["slug"] == "10-rossi-mario" for r in s["rosa"]) and "perPartita" not in s["rosa"][0]
    gi = f["giocatore/10-rossi-mario.json"]
    assert gi["squadra"] == "ALFA" and gi["girone"]["slug"] == "serie-b" and gi["perPartita"][0]["avversario"] == "BETA"
    assert "giocatore/None-ignoto.json" not in f


def test_alias_applicati():
    f = costruisci(STAGIONI, {1: raw_con_classifica()}, {"*": {"ROSSI MARIO": "***"}}, adesso="x")
    assert "giocatore/10-rossi-mario.json" not in f
    assert f["partita/1.json"]["tabellino"]["migliore"]["nome"] == "GIOCATORE OSCURATO"


def test_girone_senza_partite_giocate_ok():
    r = raw_con_classifica()
    r["tabellini"] = {}
    for p in r["partite"]:
        p.update(giocata=False, golCasa=None, golOspite=None)
    f = costruisci(STAGIONI, {1: r}, {"*": {}}, adesso="x")
    assert f["girone/serie-b.json"]["giocatori"] == {"marcatori": [], "voti": [], "mvp": [], "fairplay": []}
    assert f["squadra/10.json"]["rosa"] == [] and f["squadra/10.json"]["forma"] == []
    assert not any(k.startswith("giocatore/") for k in f)


def test_raw_mancante_salta_il_girone_e_stale_vero():
    r = raw_con_classifica()
    r["stale"] = {"partite": "2026-09-30T07:00:00"}
    f = costruisci(STAGIONI, {1: r, 99: None}, {"*": {}}, adesso="x")
    assert f["indice.json"]["campionati"][0]["gironi"][0]["stale"] is True


def test_indice_vuoto_rifiutato():
    r = raw_con_classifica()
    r["classifica"]["totale"] = []
    with pytest.raises(BuildError):
        costruisci(STAGIONI, {1: r}, {"*": {}}, adesso="x")
    with pytest.raises(BuildError):
        costruisci(STAGIONI, {}, {"*": {}}, adesso="x")


def test_scrivi_sostituisce_le_cartelle(tmp_path):
    out = tmp_path / "data"
    (out / "partita").mkdir(parents=True)
    (out / "partita" / "vecchio.json").write_text("{}")
    scrivi({"indice.json": {"a": 1}, "partita/1.json": {"b": 2}}, out)
    assert json.loads((out / "indice.json").read_text()) == {"a": 1}
    assert (out / "partita" / "1.json").exists() and not (out / "partita" / "vecchio.json").exists()


def test_main_non_tocca_out_se_build_fallisce(tmp_path):
    (tmp_path / "stagioni.json").write_text(json.dumps(STAGIONI))
    (tmp_path / "raw").mkdir()
    out = tmp_path / "data"
    out.mkdir()
    (out / "indice.json").write_text('{"vecchio": true}')
    rc = main(["--stagioni", str(tmp_path / "stagioni.json"), "--raw", str(tmp_path / "raw"),
               "--alias", str(tmp_path / "alias.json"), "--out", str(out)])
    assert rc == 1 and json.loads((out / "indice.json").read_text()) == {"vecchio": True}
    (tmp_path / "raw" / "1.json").write_text(json.dumps(raw_con_classifica()))
    rc = main(["--stagioni", str(tmp_path / "stagioni.json"), "--raw", str(tmp_path / "raw"),
               "--alias", str(tmp_path / "alias.json"), "--out", str(out)])
    assert rc == 0 and (out / "girone" / "serie-b.json").exists()
```

- [ ] **Step 2: Run** `python -m pytest scraper/tests/test_build.py -q` → FAIL.

- [ ] **Step 3: Implementazione** `scraper/build.py`:
```python
"""Unisce i raw dei gironi, calcola le statistiche e scrive i JSON per site/data/."""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from datetime import datetime
from pathlib import Path

from .alias import applica_alias, carica_alias
from .fetch import TZ_ROMA
from .stats import classifiche_giocatori, forma, giocatori, partite_squadra, stat_squadra

SOTTOCARTELLE = ("girone", "partita", "squadra", "giocatore")


class BuildError(Exception):
    """Nessun dato pubblicabile: non si sovrascrive l'output precedente."""


def _partita_compatta(p: dict, slug: str, raw: dict) -> dict:
    return {"id": p["id"], "girone": slug, "giornata": p["giornata"], "data": p["data"], "ora": p["ora"],
            "casaId": p["casaId"], "ospiteId": p["ospiteId"], "golCasa": p["golCasa"], "golOspite": p["golOspite"],
            "giocata": p["giocata"], "tavolino": p["tavolino"], "tabellino": str(p["id"]) in raw["tabellini"]}


def costruisci(stagioni: dict, raws: dict[int, dict | None], alias: dict, adesso: str) -> dict[str, object]:
    files: dict[str, object] = {}
    indice = {"stagione": stagioni["stagione"], "generato": adesso, "campionati": [], "squadre": [], "partite": []}
    for c in stagioni["campionati"]:
        camp = {"id": c["id"], "nome": c["nome"], "gironi": []}
        for g in c["gironi"]:
            raw = raws.get(g["idgirone"])
            if not raw or not raw["classifica"]["totale"]:
                continue
            raw = applica_alias(raw, alias)
            slug, ginfo = g["slug"], {"slug": g["slug"], "nome": g["nome"]}
            nome_sq = {s["id"]: s["nome"] for s in raw["squadre"]}
            nome = lambda i: nome_sq.get(i, "?")  # noqa: E731
            camp["gironi"].append({"idgirone": g["idgirone"], "slug": slug, "nome": g["nome"],
                                   "aggiornato": raw["aggiornato"], "stale": bool(raw["stale"])})
            indice["squadre"] += [{"id": s["id"], "nome": s["nome"], "girone": slug} for s in raw["squadre"]]
            compatte = [_partita_compatta(p, slug, raw) for p in raw["partite"]]
            indice["partite"] += compatte
            lista = giocatori(raw)
            files[f"girone/{slug}.json"] = {
                "idgirone": g["idgirone"], "slug": slug, "nome": g["nome"], "campionato": {"id": c["id"], "nome": c["nome"]},
                "stagione": stagioni["stagione"], "aggiornato": raw["aggiornato"], "stale": raw["stale"],
                "squadre": [{"id": s["id"], "nome": s["nome"], "forma": forma(raw, s["id"])} for s in raw["squadre"]],
                "classifica": raw["classifica"], "partite": compatte, "giocatori": classifiche_giocatori(lista)}
            for p in raw["partite"]:
                files[f"partita/{p['id']}.json"] = {
                    "id": p["id"], "girone": ginfo, "giornata": p["giornata"], "data": p["data"], "ora": p["ora"],
                    "casa": {"id": p["casaId"], "nome": nome(p["casaId"])},
                    "ospite": {"id": p["ospiteId"], "nome": nome(p["ospiteId"])},
                    "golCasa": p["golCasa"], "golOspite": p["golOspite"], "giocata": p["giocata"],
                    "tavolino": p["tavolino"], "tabellino": raw["tabellini"].get(str(p["id"]))}
            righe = {r["squadraId"]: r for r in raw["classifica"]["totale"]}
            for s in raw["squadre"]:
                riga = righe.get(s["id"])
                files[f"squadra/{s['id']}.json"] = {
                    "id": s["id"], "nome": s["nome"], "girone": ginfo, "pos": riga["pos"] if riga else None,
                    "riga": {k: riga[k] for k in ("pt", "g", "v", "n", "p", "gf", "gs", "dr")} if riga else None,
                    "stat": stat_squadra(raw, s["id"]), "forma": forma(raw, s["id"]),
                    "partite": [{**p, "avversario": nome(p["avversarioId"])} for p in partite_squadra(raw, s["id"])],
                    "rosa": [{k: v for k, v in gi.items() if k != "perPartita"} for gi in lista if gi["squadraId"] == s["id"]]}
            for gi in lista:
                files[f"giocatore/{gi['slug']}.json"] = {
                    **{k: v for k, v in gi.items() if k != "perPartita"}, "squadra": nome(gi["squadraId"]), "girone": ginfo,
                    "perPartita": [{**pp, "avversario": nome(pp["avversarioId"])} for pp in gi["perPartita"]]}
        if camp["gironi"]:
            indice["campionati"].append(camp)
    if not indice["campionati"]:
        raise BuildError("nessun girone con classifica: indice vuoto, output precedente mantenuto")
    files["indice.json"] = indice
    return files


def scrivi(files: dict[str, object], out_dir: Path) -> None:
    for sc in SOTTOCARTELLE:
        shutil.rmtree(out_dir / sc, ignore_errors=True)
    for rel, obj in files.items():
        path = out_dir / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--stagioni", default="stagioni.json")
    ap.add_argument("--raw", default="build/raw")
    ap.add_argument("--alias", default="alias.json")
    ap.add_argument("--out", default="site/data")
    a = ap.parse_args(argv)
    stagioni = json.loads(Path(a.stagioni).read_text(encoding="utf-8"))
    raws = {}
    for c in stagioni["campionati"]:
        for g in c["gironi"]:
            f = Path(a.raw) / f"{g['idgirone']}.json"
            raws[g["idgirone"]] = json.loads(f.read_text(encoding="utf-8")) if f.exists() else None
    try:
        files = costruisci(stagioni, raws, carica_alias(Path(a.alias)),
                           adesso=datetime.now(TZ_ROMA).isoformat(timespec="seconds"))
    except BuildError as e:
        print("ERRORE:", e, file=sys.stderr)
        return 1
    scrivi(files, Path(a.out))
    print(f"site/data: {len(files)} file, {len(files['indice.json']['partite'])} partite")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Run** `python -m pytest -q` → PASS.
- [ ] **Step 5: Commit** `feat: build dei JSON per il sito`.

---

### Task 7: Workflow GitHub Actions e pubblicazione su Pages

**Files:**
- Create: `.github/workflows/build.yml`, `scraper/cache/.gitkeep`, `build/raw/.gitkeep`, `site/data/.gitkeep`
- Modify: `README.md` (sezione setup GitHub)

**Interfaces:**
- Consumes: `python -m scraper.fetch` (Task 3) e `python -m scraper.build` (Task 6).
- Produces: pubblicazione di `site/` su GitHub Pages; commit automatici di `scraper/cache`, `build/raw`, `site/data` con messaggio `chore: aggiornamento dati [skip ci]`.

- [ ] **Step 1: Scrivere il workflow** `.github/workflows/build.yml`:
```yaml
name: aggiorna-e-pubblica

on:
  schedule:
    - cron: "*/30 18-22 * * 1-5"   # serate feriali: 20:00-00:30 ora di Roma (copre ora legale e solare)
    - cron: "0 5 * * *"            # mattino: 07:00 ora di Roma
  push:
    branches: [main]
    paths: ["stagioni.json", "alias.json", "scraper/**", "site/**", "!site/data/**", ".github/workflows/**"]
  workflow_dispatch:

permissions:
  contents: write
  pages: write
  id-token: write

concurrency:
  group: build
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deploy.outputs.page_url }}
    env:
      TZ: Europe/Rome
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip
          cache-dependency-path: scraper/requirements.txt
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: pip install -r scraper/requirements.txt
      - run: python -m pytest -q
      - run: npm test
      - name: Leggi il sito ufficiale
        run: python -m scraper.fetch
      - name: Costruisci i dati del sito
        run: python -m scraper.build
      - name: Salva cache e dati nel repo
        run: |
          git config user.name sporting-live-bot
          git config user.email sporting-live-bot@users.noreply.github.com
          git add scraper/cache build/raw site/data
          git diff --cached --quiet || (git commit -m "chore: aggiornamento dati [skip ci]" && git push)
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: site
      - id: deploy
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Cartelle committate** — creare i tre `.gitkeep` e aggiungere a `.gitignore` la riga `!site/data/` non serve (non è ignorata); verificare con `git status` che `scraper/cache`, `build/raw`, `site/data` compaiano.

- [ ] **Step 3: README, sezione "Setup su GitHub"** (aggiungere dopo "Sviluppo locale"):
```markdown
## Setup su GitHub (una tantum)

1. Crea il repo pubblico `sporting-live` su github.com e fai il push di `main`.
2. Settings → Pages → Source: **GitHub Actions**.
3. Settings → Actions → General → Workflow permissions: **Read and write**.
4. Actions → aggiorna-e-pubblica → Run workflow. Al termine il sito è su `https://<utente>.github.io/sporting-live/`.

## Operatività

- Il workflow gira ogni mezz'ora nelle serate feriali (20:00–00:30) e alle 07:00; i risultati di una
  serata compaiono entro mezz'ora dalla pubblicazione sul sito ufficiale.
- Ogni run che trova dati nuovi fa un commit `chore: aggiornamento dati [skip ci]`.
- Le schedulazioni si spengono dopo 60 giorni senza commit: in pausa estiva lancia un run manuale ogni due mesi.
- Nuova stagione: aggiorna `stagioni.json` (sposta i gironi vecchi in `archivio`), svuota `scraper/cache/` e `build/raw/`.
- Un nome giocatore scritto in due modi: aggiungi la variante in `alias.json`; per oscurare un nome usa `"***"`.
- Se il sito ufficiale cambia HTML: il run mostra righe `AVVISO` e la pagina segnala "dati parziali";
  fallisce (mail da GitHub) solo con più di 10 avvisi per girone o senza classifica e senza dati precedenti.
```

- [ ] **Step 4: Verifica locale della sintassi YAML** `python3 -c "import yaml" 2>/dev/null || pip install -q pyyaml; python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/build.yml')); print('yaml ok')"` → `yaml ok`.
- [ ] **Step 5: Commit** `chore: workflow di aggiornamento e pubblicazione su Pages`.

---

### Task 8: Shell del sito — index.html, CSS, router, caricamento dati, tema

**Files:**
- Create: `site/index.html`, `site/css/app.css`, `site/js/app.js`, `site/js/router.js`, `site/js/data.js`, `site/js/util.js`, `site/js/tema.js`, `site/js/tests/router.test.js`, `site/js/tests/util.test.js`

**Interfaces:**
- Produces:
  - `router.js`: `analizza(hash: string) -> {vista: string, params: string[]}`; viste note `partite, partita, classifiche, squadra, giocatori, giocatore, info`; hash vuoto o ignoto → `{vista:'partite', params:[]}`.
  - `data.js`: `caricaIndice() -> Promise<indice>`, `caricaJSON(rel) -> Promise<obj>` con cache in memoria (Map) e `{cache:'no-store'}` disattivato (lascia lavorare il service worker); errore → `throw new Error('DATI_NON_DISPONIBILI')`.
  - `util.js`: `esc(s)`, `oggiISO()`, `formattaData(iso)` ("mer 16/09"), `formattaDataLunga(iso)` ("mercoledì 16 settembre"), `formattaOra(iso)` ("21:30" da timestamp ISO), `pallinoForma(esito)` → HTML `<span class="forma V">V</span>`.
  - `tema.js`: `leggiTema() -> 'auto'|'chiaro'|'scuro'`, `impostaTema(t)` (salva in localStorage con try/catch e imposta `data-theme` su `<html>`), `applicaTema()`.
  - `app.js`: `render()` globale che disegna testata, `<main>` con la vista corrente e barra inferiore; ogni vista è un modulo con `render(ctx) -> Promise<string>` e `dopo(ctx, root)` opzionale; `ctx = {indice, rotta, oggi, naviga(h), carica: caricaJSON}`.
  - Barra inferiore: 4 voci `partite` ("Partite"), `classifiche` ("Classifiche"), `giocatori` ("Giocatori"), `info` ("Info"). (La voce "Vantaggi" arriva in fase 2 al posto di Info, che passa nella testata.)

- [ ] **Step 1: Test** `site/js/tests/router.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analizza } from '../router.js';

test('rotte', () => {
  assert.deepEqual(analizza(''), { vista: 'partite', params: [] });
  assert.deepEqual(analizza('#/partite'), { vista: 'partite', params: [] });
  assert.deepEqual(analizza('#/partita/14083'), { vista: 'partita', params: ['14083'] });
  assert.deepEqual(analizza('#/squadra/2480'), { vista: 'squadra', params: ['2480'] });
  assert.deepEqual(analizza('#/giocatore/2480-rossi-mario'), { vista: 'giocatore', params: ['2480-rossi-mario'] });
  assert.deepEqual(analizza('#/classifiche/serie-b'), { vista: 'classifiche', params: ['serie-b'] });
  assert.deepEqual(analizza('#/boh/x'), { vista: 'partite', params: [] });
  assert.deepEqual(analizza('#/partite/2026-09-16'), { vista: 'partite', params: ['2026-09-16'] });
});
```
`site/js/tests/util.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esc, formattaData, formattaDataLunga, pallinoForma } from '../util.js';

test('esc', () => assert.equal(esc('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;'));
test('date', () => {
  assert.equal(formattaData('2026-09-16'), 'mer 16/09');
  assert.equal(formattaData(null), 'da definire');
  assert.equal(formattaDataLunga('2026-09-16'), 'mercoledì 16 settembre');
});
test('forma', () => assert.equal(pallinoForma('V'), '<span class="forma V" title="vittoria">V</span>'));
```

- [ ] **Step 2: Run** `npm test` → FAIL (moduli mancanti).

- [ ] **Step 3: Implementazione**

`site/js/router.js`:
```js
export const VISTE = ['partite', 'partita', 'classifiche', 'squadra', 'giocatori', 'giocatore', 'info'];

export function analizza(hash) {
  const parti = String(hash || '').replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (!parti.length || !VISTE.includes(parti[0])) return { vista: 'partite', params: [] };
  return { vista: parti[0], params: parti.slice(1) };
}
```

`site/js/util.js`:
```js
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
const GIORNI = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
const GIORNI_LUNGHI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const pad = (n) => String(n).padStart(2, '0');
export function daISO(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); }
export function formattaData(iso) { if (!iso) return 'da definire'; const d = daISO(iso); return `${GIORNI[d.getDay()]} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; }
export function formattaDataLunga(iso) { if (!iso) return 'da definire'; const d = daISO(iso); return `${GIORNI_LUNGHI[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]}`; }
export function formattaOra(isoTs) { const d = new Date(isoTs); return isNaN(d) ? '' : `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
export function oggiISO() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
const TITOLO_FORMA = { V: 'vittoria', N: 'pareggio', P: 'sconfitta' };
export function pallinoForma(e) { return `<span class="forma ${e}" title="${TITOLO_FORMA[e] || ''}">${e}</span>`; }
export const formaHTML = (lista) => `<span class="forma-lista">${(lista || []).map(pallinoForma).join('')}</span>`;
export const segnoDR = (dr) => (dr > 0 ? '+' : '') + dr;
```

`site/js/data.js`:
```js
const cache = new Map();
export async function caricaJSON(rel) {
  if (cache.has(rel)) return cache.get(rel);
  const r = await fetch(`data/${rel}`);
  if (!r.ok) throw new Error('DATI_NON_DISPONIBILI');
  const obj = await r.json();
  cache.set(rel, obj);
  return obj;
}
export const caricaIndice = () => caricaJSON('indice.json');
export function svuotaCache() { cache.clear(); }
```

`site/js/tema.js`:
```js
const CHIAVE = 'sl.tema';
export function leggiTema() { try { return localStorage.getItem(CHIAVE) || 'auto'; } catch { return 'auto'; } }
export function impostaTema(t) {
  try { localStorage.setItem(CHIAVE, t); } catch { /* storage non disponibile */ }
  applicaTema(t);
}
export function applicaTema(t = leggiTema()) {
  const root = document.documentElement;
  if (t === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', t === 'scuro' ? 'dark' : 'light');
}
```

`site/js/app.js`:
```js
import { analizza } from './router.js';
import { caricaIndice, caricaJSON, svuotaCache } from './data.js';
import { esc, oggiISO, formattaOra } from './util.js';
import { applicaTema } from './tema.js';
import * as partite from './views/partite.js';
import * as partita from './views/partita.js';
import * as classifiche from './views/classifiche.js';
import * as squadra from './views/squadra.js';
import * as giocatori from './views/giocatori.js';
import * as giocatore from './views/giocatore.js';
import * as info from './views/info.js';

const VISTE = { partite, partita, classifiche, squadra, giocatori, giocatore, info };
const TAB = [['partite', 'Partite', 'M4 4h16v16H4z M4 9h16 M9 4v16'], ['classifiche', 'Classifiche', 'M5 20h14 M8 20V10 M12 20V4 M16 20v-7'],
  ['giocatori', 'Giocatori', 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 20a8 8 0 0 1 16 0'], ['info', 'Info', 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 16v-5 M12 8h.01']];
const SEZIONE = { partita: 'partite', squadra: 'classifiche', giocatore: 'giocatori' };
const icona = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const app = document.getElementById('app');
let indice = null;

function testata() {
  const stale = indice.campionati.some(c => c.gironi.some(g => g.stale));
  return `<header class="testa">
    <a href="#/partite" class="marchio"><img src="icons/icon.svg" alt="" width="32" height="32"><span>Sporting <b>Live</b></span></a>
    <div class="agg">${esc(indice.stagione)} · agg. ${formattaOra(indice.generato)}${stale ? '<br><span class="stale">dati parziali</span>' : ''}</div>
  </header>`;
}

export async function render() {
  const rotta = analizza(location.hash);
  const ctx = { indice, rotta, oggi: oggiISO(), naviga: (h) => { location.hash = h; }, carica: caricaJSON };
  const vista = VISTE[rotta.vista];
  const attiva = SEZIONE[rotta.vista] || rotta.vista;
  app.innerHTML = `${testata()}<main><div class="scheletro"></div></main>
    <nav class="tabbar">${TAB.map(([id, nome, d]) => `<a href="#/${id}" class="${id === attiva ? 'attivo' : ''}">${icona(d)}<span>${nome}</span></a>`).join('')}</nav>`;
  const main = app.querySelector('main');
  try {
    main.innerHTML = await vista.render(ctx);
    if (vista.dopo) vista.dopo(ctx, main);
  } catch (e) {
    main.innerHTML = `<p class="vuoto">Dati non disponibili${navigator.onLine ? '' : ' (sei offline)'}. <a href="#/partite">Torna alle partite</a></p>`;
    console.error(e);
  }
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', () => { if (indice) render(); });
window.addEventListener('online', () => { svuotaCache(); avvia(); });

async function avvia() {
  applicaTema();
  try {
    indice = await caricaIndice();
    await render();
  } catch (e) {
    app.innerHTML = '<p class="vuoto">Dati non disponibili, riprova più tardi.</p>';
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}
avvia();
```

`site/index.html`:
```html
<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#01213b">
<meta name="description" content="Risultati, classifiche e statistiche dei campionati dello Sporting Club Mestre.">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Sporting Live">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; manifest-src 'self'; connect-src 'self'; worker-src 'self'; base-uri 'none'; form-action 'self'">
<title>Sporting Live</title>
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icons/icon-192.png">
<link rel="stylesheet" href="css/app.css">
</head>
<body>
<div id="app"><p class="vuoto">Caricamento…</p></div>
<script type="module" src="js/app.js"></script>
</body>
</html>
```

`site/css/app.css` (completo; i componenti delle viste successive si aggiungono in fondo a questo file nei rispettivi task):
```css
/* Sporting Live — tre livelli: primitivi → semantici → componenti. Nei componenti solo var(). */
:root {
  --blu-950: #01213b; --blu-900: #052a4a; --blu-800: #0b3a63; --blu-600: #00579e; --blu-500: #1b74c2; --blu-100: #d6e7f7; --blu-50: #eef5fc;
  --ara-600: #d64200; --ara-500: #ff4e00; --ara-100: #ffe3d6;
  --n-0: #ffffff; --n-50: #f4f6f8; --n-100: #eceff1; --n-200: #dfe4e8; --n-300: #c5ced6; --n-400: #93a1ac; --n-500: #455a64; --n-700: #263238; --n-900: #101a22; --n-950: #0b1620;
  --verde: #0f8a4d; --giallo: #e0a800; --rosso: #c62828;
  --r-sm: 8px; --r-md: 12px; --r-full: 999px;
  --s-1: .25rem; --s-2: .5rem; --s-3: .75rem; --s-4: 1rem; --s-6: 1.5rem;
  --font: -apple-system, system-ui, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  --tab-h: 60px; --max-w: 640px;
}
:root {
  color-scheme: light dark;
  --brand: var(--blu-600); --brand-tint: var(--blu-50); --brand-border: var(--blu-100);
  --accento: var(--ara-500); --accento-forte: var(--ara-600); --accento-tint: var(--ara-100);
  --ink: var(--blu-950); --on-ink: var(--n-0); --on-ink-muto: #9fb6ca;
  --sfondo: var(--n-50); --carta: var(--n-0); --carta-alt: var(--n-100); --testo: var(--n-900); --muto: var(--n-500); --bordo: var(--n-200);
  --ok: var(--verde); --neutro: var(--n-400); --ko: var(--rosso); --giallo-c: var(--giallo);
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --brand: var(--blu-500); --brand-tint: rgba(27,116,194,.14); --brand-border: rgba(27,116,194,.35);
  --ink: var(--blu-950); --sfondo: var(--n-950); --carta: var(--n-900); --carta-alt: #16232d; --testo: var(--n-100); --muto: var(--n-400); --bordo: #22313c;
  --accento-tint: rgba(255,78,0,.16);
} }
:root[data-theme="dark"] {
  --brand: var(--blu-500); --brand-tint: rgba(27,116,194,.14); --brand-border: rgba(27,116,194,.35);
  --ink: var(--blu-950); --sfondo: var(--n-950); --carta: var(--n-900); --carta-alt: #16232d; --testo: var(--n-100); --muto: var(--n-400); --bordo: #22313c;
  --accento-tint: rgba(255,78,0,.16);
}

* { box-sizing: border-box; }
html, body { margin: 0; background: var(--sfondo); color: var(--testo); font: 16px/1.45 var(--font); -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%; }
a { color: inherit; text-decoration: none; }
button, select, input { font: inherit; }
button { cursor: pointer; }
main { max-width: var(--max-w); margin: 0 auto; padding: var(--s-3) var(--s-4) calc(var(--tab-h) + var(--s-6)); }
h2 { font-size: 1.1rem; margin: var(--s-4) 0 var(--s-2); }
.vuoto { text-align: center; padding: 2rem 1rem; color: var(--muto); }
.vuoto a { color: var(--brand); text-decoration: underline; }
.scheletro { height: 180px; border-radius: var(--r-md); background: linear-gradient(90deg, var(--carta-alt), var(--carta), var(--carta-alt)); background-size: 200% 100%; animation: sk 1.2s infinite; }
@keyframes sk { to { background-position: -200% 0; } }

/* testata */
header.testa { position: sticky; top: 0; z-index: 5; background: var(--ink); color: var(--on-ink); border-bottom: 3px solid var(--accento); padding: var(--s-2) var(--s-4); padding-top: max(var(--s-2), env(safe-area-inset-top)); display: flex; align-items: center; justify-content: space-between; gap: var(--s-3); }
.marchio { display: flex; align-items: center; gap: var(--s-2); font-size: 1.15rem; letter-spacing: .2px; }
.marchio b { color: var(--accento); }
.agg { font-size: .72rem; color: var(--on-ink-muto); text-align: right; line-height: 1.25; }
.stale { color: var(--accento); font-weight: 600; }

/* barra inferiore */
.tabbar { position: fixed; bottom: 0; left: 0; right: 0; height: calc(var(--tab-h) + env(safe-area-inset-bottom)); padding-bottom: env(safe-area-inset-bottom); background: var(--carta); border-top: 1px solid var(--bordo); display: flex; z-index: 5; }
.tabbar a { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; font-size: .7rem; color: var(--muto); min-height: 44px; }
.tabbar a svg { width: 22px; height: 22px; }
.tabbar a.attivo { color: var(--brand); font-weight: 600; }

/* card, segmenti, tab */
.card { background: var(--carta); border: 1px solid var(--bordo); border-radius: var(--r-md); padding: var(--s-3) var(--s-4); margin-bottom: var(--s-3); }
.card.piena { padding: 0; overflow: hidden; }
.segmenti { display: flex; gap: var(--s-1); background: var(--carta-alt); border-radius: var(--r-full); padding: 3px; margin: var(--s-2) 0 var(--s-3); }
.segmenti button { flex: 1; border: 0; background: transparent; color: var(--muto); border-radius: var(--r-full); min-height: 36px; padding: 0 var(--s-2); }
.segmenti button.attivo { background: var(--carta); color: var(--testo); font-weight: 600; box-shadow: 0 1px 2px rgba(0,0,0,.12); }
.tabs { display: flex; gap: var(--s-4); overflow-x: auto; border-bottom: 1px solid var(--bordo); margin: 0 0 var(--s-3); scrollbar-width: none; }
.tabs::-webkit-scrollbar { display: none; }
.tabs button { border: 0; background: none; color: var(--muto); padding: var(--s-2) 0; min-height: 44px; white-space: nowrap; border-bottom: 3px solid transparent; margin-bottom: -1px; }
.tabs button.attivo { color: var(--testo); font-weight: 600; border-color: var(--accento); }

/* tabelle */
.scroll-x { overflow-x: auto; }
table.tab { width: 100%; border-collapse: collapse; font-size: .9rem; }
.tab th, .tab td { padding: 9px 6px; text-align: center; border-bottom: 1px solid var(--bordo); white-space: nowrap; }
.tab th { color: var(--muto); font-weight: 600; font-size: .72rem; text-transform: uppercase; letter-spacing: .4px; }
.tab tr:last-child td { border-bottom: 0; }
.tab .sx { text-align: left; }
.tab .nome { max-width: 46vw; overflow: hidden; text-overflow: ellipsis; }
.tab tr.evid td { background: var(--accento-tint); }
.tab tr.cliccabile { cursor: pointer; }

/* forma e badge */
.forma-lista { display: inline-flex; gap: 3px; }
.forma { display: inline-flex; width: 18px; height: 18px; border-radius: var(--r-full); font-size: .66rem; font-weight: 700; color: #fff; align-items: center; justify-content: center; }
.forma.V { background: var(--ok); } .forma.N { background: var(--neutro); } .forma.P { background: var(--ko); }
.badge { display: inline-block; font-size: .68rem; font-weight: 600; padding: 2px 8px; border-radius: var(--r-full); background: var(--carta-alt); color: var(--muto); }
.badge.accento { background: var(--accento-tint); color: var(--accento-forte); }
.cart { display: inline-block; width: 9px; height: 13px; border-radius: 2px; vertical-align: -2px; margin-left: 4px; }
.cart.giallo { background: var(--giallo-c); } .cart.rosso { background: var(--ko); }

/* stellina preferiti */
.stella { border: 0; background: none; color: var(--n-400); min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; padding: 0; }
.stella svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 2; }
.stella.attiva { color: var(--accento); } .stella.attiva svg { fill: currentColor; }
```

- [ ] **Step 4: Viste segnaposto** — perché `app.js` importi senza errori, creare in `site/js/views/` i file `partite.js, partita.js, classifiche.js, squadra.js, giocatori.js, giocatore.js, info.js` con il contenuto:
```js
export async function render() { return '<p class="vuoto">In costruzione</p>'; }
```
(ogni task successivo sostituisce il proprio file.)

- [ ] **Step 5: Run** `npm test` → PASS. Poi `python3 -m http.server -d site 8080` e aprire `http://localhost:8080`: senza `site/data/indice.json` si vede "Dati non disponibili". Creare dati finti eseguendo da Python:
```bash
python - <<'PY'
import json; from pathlib import Path
from scraper.build import costruisci, scrivi
from scraper.tests.test_build import STAGIONI, raw_con_classifica
scrivi(costruisci(STAGIONI, {1: raw_con_classifica()}, {"*": {}}, adesso="2026-10-01T21:00:00"), Path("site/data"))
PY
```
Ricaricare: testata blu con "Sporting Live", "In costruzione", barra inferiore con 4 voci. Poi `rm -rf site/data/*.json site/data/girone site/data/partita site/data/squadra site/data/giocatore` (non committare i dati finti).

- [ ] **Step 6: Commit** `feat: shell del sito con router, tema e barra inferiore`.

---

### Task 9: Logica pura della home — giorni, raggruppamento, preferiti

**Files:**
- Create: `site/js/giorni.js`, `site/js/preferiti.js`, `site/js/tests/giorni.test.js`, `site/js/tests/preferiti.test.js`

**Interfaces:**
- Consumes: `indice.partite` (Task 6).
- Produces:
  - `giorni.js`: `giorniConPartite(partite) -> string[]` (date ISO uniche ordinate, senza null); `giornoIniziale(giorni, oggi) -> string|null` (oggi se presente, altrimenti il primo giorno futuro, altrimenti l'ultimo passato, `null` se lista vuota); `partiteDelGiorno(partite, giorno) -> partite` (giorno `'da-definire'` → quelle con `data` null); `raggruppaPerGirone(partite, indice) -> [{campionato, girone:{slug,nome}, partite}]` nell'ordine di `indice.campionati`; `partitePreferite(partite, preferiti, oggi) -> [{squadraId, ultima, prossima}]` per ogni squadra preferita (ultima giocata e prossima non giocata con data ≥ oggi o senza data).
  - `preferiti.js`: `leggiPreferiti() -> number[]`, `togglePreferito(id) -> number[]`, `èPreferita(id) -> boolean`; storage in localStorage chiave `sl.preferiti`, fallback in memoria se localStorage lancia.

- [ ] **Step 1: Test** `site/js/tests/giorni.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { giorniConPartite, giornoIniziale, partiteDelGiorno, raggruppaPerGirone, partitePreferite } from '../giorni.js';

const P = (id, girone, data, casaId, ospiteId, giocata = false) => ({ id, girone, giornata: 1, data, ora: '20:30', casaId, ospiteId, golCasa: giocata ? 1 : null, golOspite: giocata ? 0 : null, giocata, tavolino: false, tabellino: giocata });
const partite = [P(1, 'serie-b', '2026-09-16', 10, 20, true), P(2, 'serie-a', '2026-09-16', 30, 40, true), P(3, 'serie-b', '2026-09-23', 20, 10), P(4, 'serie-b', null, 10, 30)];
const indice = { campionati: [{ id: 'c8', nome: 'Calcio a 8', gironi: [{ slug: 'serie-a', nome: 'Serie A' }, { slug: 'serie-b', nome: 'Serie B' }] }] };

test('giorni e giorno iniziale', () => {
  assert.deepEqual(giorniConPartite(partite), ['2026-09-16', '2026-09-23']);
  assert.equal(giornoIniziale(['2026-09-16', '2026-09-23'], '2026-09-16'), '2026-09-16');
  assert.equal(giornoIniziale(['2026-09-16', '2026-09-23'], '2026-09-20'), '2026-09-23');
  assert.equal(giornoIniziale(['2026-09-16', '2026-09-23'], '2026-10-01'), '2026-09-23');
  assert.equal(giornoIniziale([], '2026-10-01'), null);
});
test('partite del giorno, anche da definire', () => {
  assert.deepEqual(partiteDelGiorno(partite, '2026-09-16').map(p => p.id), [1, 2]);
  assert.deepEqual(partiteDelGiorno(partite, 'da-definire').map(p => p.id), [4]);
  assert.deepEqual(partiteDelGiorno(partite, '2030-01-01'), []);
});
test('raggruppa per girone nell ordine dell indice', () => {
  const g = raggruppaPerGirone(partiteDelGiorno(partite, '2026-09-16'), indice);
  assert.deepEqual(g.map(x => [x.campionato, x.girone.slug, x.partite.map(p => p.id)]), [['Calcio a 8', 'serie-a', [2]], ['Calcio a 8', 'serie-b', [1]]]);
});
test('partite preferite: ultima e prossima', () => {
  const r = partitePreferite(partite, [10, 99], '2026-09-20');
  assert.equal(r.length, 1);
  assert.equal(r[0].squadraId, 10);
  assert.equal(r[0].ultima.id, 1);
  assert.equal(r[0].prossima.id, 3);
  assert.equal(partitePreferite(partite, [10], '2026-09-30')[0].prossima.id, 4);   // resta solo quella da definire
});
```
`site/js/tests/preferiti.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leggiPreferiti, togglePreferito, èPreferita, _reset } from '../preferiti.js';

test('senza localStorage funziona in memoria', () => {
  _reset();
  assert.deepEqual(leggiPreferiti(), []);
  assert.deepEqual(togglePreferito(2480), [2480]);
  assert.equal(èPreferita(2480), true);
  assert.deepEqual(togglePreferito(2480), []);
});
test('con localStorage che lancia non esplode', () => {
  globalThis.localStorage = { getItem() { throw new Error('bloccato'); }, setItem() { throw new Error('bloccato'); } };
  _reset();
  assert.deepEqual(togglePreferito(1), [1]);
  assert.deepEqual(leggiPreferiti(), [1]);
  delete globalThis.localStorage;
});
test('con localStorage vero persiste', () => {
  const mem = {};
  globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); } };
  _reset();
  togglePreferito(7);
  _reset();
  assert.deepEqual(leggiPreferiti(), [7]);
  delete globalThis.localStorage;
});
```

- [ ] **Step 2: Run** `npm test` → FAIL.

- [ ] **Step 3: Implementazione**

`site/js/giorni.js`:
```js
export const DA_DEFINIRE = 'da-definire';

export function giorniConPartite(partite) {
  return [...new Set(partite.map(p => p.data).filter(Boolean))].sort();
}

export function giornoIniziale(giorni, oggi) {
  if (!giorni.length) return null;
  if (giorni.includes(oggi)) return oggi;
  return giorni.find(g => g > oggi) || giorni[giorni.length - 1];
}

export function partiteDelGiorno(partite, giorno) {
  const sel = giorno === DA_DEFINIRE ? partite.filter(p => !p.data) : partite.filter(p => p.data === giorno);
  return sel.sort((a, b) => (a.ora || '').localeCompare(b.ora || '') || a.id - b.id);
}

export function raggruppaPerGirone(partite, indice) {
  const out = [];
  for (const c of indice.campionati) for (const g of c.gironi) {
    const mie = partite.filter(p => p.girone === g.slug);
    if (mie.length) out.push({ campionato: c.nome, girone: { slug: g.slug, nome: g.nome }, partite: mie });
  }
  return out;
}

export function partitePreferite(partite, preferiti, oggi) {
  const out = [];
  for (const id of preferiti) {
    const mie = partite.filter(p => p.casaId === id || p.ospiteId === id);
    if (!mie.length) continue;
    const giocate = mie.filter(p => p.giocata).sort((a, b) => (a.data || '').localeCompare(b.data || '') || a.giornata - b.giornata);
    const future = mie.filter(p => !p.giocata);
    const prossima = future.filter(p => p.data && p.data >= oggi).sort((a, b) => a.data.localeCompare(b.data))[0] || future.find(p => !p.data) || null;
    out.push({ squadraId: id, ultima: giocate[giocate.length - 1] || null, prossima });
  }
  return out;
}
```

`site/js/preferiti.js`:
```js
const CHIAVE = 'sl.preferiti';
let memoria = null;

function leggi() {
  if (memoria) return memoria;
  try { memoria = JSON.parse(globalThis.localStorage?.getItem(CHIAVE) || '[]'); } catch { memoria = []; }
  if (!Array.isArray(memoria)) memoria = [];
  return memoria;
}
function salva(lista) {
  memoria = lista;
  try { globalThis.localStorage?.setItem(CHIAVE, JSON.stringify(lista)); } catch { /* solo in memoria */ }
}
export const leggiPreferiti = () => [...leggi()];
export const èPreferita = (id) => leggi().includes(Number(id));
export function togglePreferito(id) {
  id = Number(id);
  const l = leggi();
  salva(l.includes(id) ? l.filter(x => x !== id) : [...l, id]);
  return leggiPreferiti();
}
export function _reset() { memoria = null; }
```

- [ ] **Step 4: Run** `npm test` → PASS. **Step 5: Commit** `feat: logica giorni, raggruppamento e preferiti`.

---

### Task 10: Vista Partite (home)

**Files:**
- Create: `site/js/views/partite.js` (sostituisce il segnaposto), `site/js/views/comuni.js`
- Modify: `site/css/app.css` (aggiungere in fondo i componenti sotto)

**Interfaces:**
- Consumes: `giorni.js`, `preferiti.js` (Task 9), `util.js` (Task 8), `indice` (Task 6).
- Produces: `comuni.js`: `rigaPartita(p, nomi, {evidenzia}) -> html` (riga cliccabile verso `#/partita/<id>`, con ora o risultato, nomi, stellina per ciascuna squadra), `stellaHTML(id, attiva) -> html` (bottone `.stella[data-squadra]`), `collegaStelle(root, onToggle)` (aggancia i click: toggle e ridisegno), `nomeSquadra(indice, id)`, `card(titolo, corpo)`, `vuoto(msg)`, `iconaStella`.
- Rotta: `#/partite` e `#/partite/<giorno>` (giorno ISO o `da-definire`); il cambio giorno naviga sulla rotta, così il tasto indietro funziona.

- [ ] **Step 1: `site/js/views/comuni.js`**
```js
import { esc } from '../util.js';
import { èPreferita, togglePreferito } from '../preferiti.js';

export const iconaStella = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.7 5.9 21.1l1.4-6.8L2.2 9.6l6.9-.8z"/></svg>';
export const stellaHTML = (id, attiva = èPreferita(id)) => `<button class="stella ${attiva ? 'attiva' : ''}" data-squadra="${id}" aria-label="${attiva ? 'Togli dai preferiti' : 'Aggiungi ai preferiti'}" aria-pressed="${attiva}">${iconaStella}</button>`;
export function collegaStelle(root, onToggle) {
  root.querySelectorAll('.stella[data-squadra]').forEach(b => {
    b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); togglePreferito(b.dataset.squadra); onToggle(); };
  });
}
export const nomeSquadra = (indice, id) => (indice.squadre.find(s => s.id === id) || { nome: '?' }).nome;
export const card = (titolo, corpo, cls = '') => `<section class="card ${cls}">${titolo ? `<h3>${esc(titolo)}</h3>` : ''}${corpo}</section>`;
export const vuoto = (msg) => `<p class="vuoto">${esc(msg)}</p>`;
export const linkSquadra = (indice, id) => `<a href="#/squadra/${id}" class="sq">${esc(nomeSquadra(indice, id))}</a>`;

export function rigaPartita(p, indice, { evidenzia = false, mostraData = false } = {}) {
  const risultato = p.giocata ? `<span class="ris ${evidenzia ? 'evid' : ''}">${p.golCasa}<i>-</i>${p.golOspite}</span>` : `<span class="ora">${esc(p.ora || '--:--')}</span>`;
  const casaPref = èPreferita(p.casaId), ospPref = èPreferita(p.ospiteId);
  return `<a class="partita ${p.tavolino ? 'tavolino' : ''}" href="#/partita/${p.id}">
    <div class="quando">${mostraData ? `<small>${esc(p.data ? p.data.slice(8, 10) + '/' + p.data.slice(5, 7) : 'n.d.')}</small>` : ''}${risultato}</div>
    <div class="squadre">
      <div class="riga ${casaPref ? 'pref' : ''}"><span>${esc(nomeSquadra(indice, p.casaId))}</span>${stellaHTML(p.casaId, casaPref)}</div>
      <div class="riga ${ospPref ? 'pref' : ''}"><span>${esc(nomeSquadra(indice, p.ospiteId))}</span>${stellaHTML(p.ospiteId, ospPref)}</div>
    </div>
    <div class="extra">${p.tavolino ? '<span class="badge">tav.</span>' : ''}${p.tabellino ? '<span class="badge accento">tabellino</span>' : ''}</div>
  </a>`;
}
```

- [ ] **Step 2: `site/js/views/partite.js`**
```js
import { esc, formattaData, formattaDataLunga } from '../util.js';
import { DA_DEFINIRE, giorniConPartite, giornoIniziale, partiteDelGiorno, raggruppaPerGirone, partitePreferite } from '../giorni.js';
import { leggiPreferiti } from '../preferiti.js';
import { rigaPartita, collegaStelle, nomeSquadra, card, vuoto } from './comuni.js';

function selettoreGiorno(giorni, giorno, oggi, haDaDefinire) {
  const i = giorni.indexOf(giorno);
  const prev = i > 0 ? giorni[i - 1] : null, next = i >= 0 && i < giorni.length - 1 ? giorni[i + 1] : null;
  const titolo = giorno === DA_DEFINIRE ? 'Da definire' : (giorno === oggi ? 'Oggi' : formattaDataLunga(giorno));
  return `<div class="giorno">
    <a class="freccia ${prev ? '' : 'off'}" href="#/partite/${prev || ''}" aria-label="giorno precedente">‹</a>
    <label class="titolo"><span>${esc(titolo)}</span>${giorno !== DA_DEFINIRE ? `<small>${esc(formattaData(giorno))}</small>` : ''}
      <select aria-label="Scegli il giorno">${giorni.map(g => `<option value="${g}" ${g === giorno ? 'selected' : ''}>${formattaData(g)}${g === oggi ? ' (oggi)' : ''}</option>`).join('')}${haDaDefinire ? `<option value="${DA_DEFINIRE}" ${giorno === DA_DEFINIRE ? 'selected' : ''}>da definire</option>` : ''}</select>
    </label>
    <a class="freccia ${next ? '' : 'off'}" href="#/partite/${next || ''}" aria-label="giorno successivo">›</a>
  </div>`;
}

function blocchoPreferite(indice, oggi) {
  const pref = leggiPreferiti();
  if (!pref.length) return card('Le mie squadre', '<p class="muto">Tocca la stellina accanto a una squadra per vederla qui.</p>');
  const r = partitePreferite(indice.partite, pref, oggi);
  if (!r.length) return '';
  return card('Le mie squadre', r.map(x => `<div class="mia">
      <a href="#/squadra/${x.squadraId}" class="mia-nome">${esc(nomeSquadra(indice, x.squadraId))}</a>
      ${x.ultima ? `<div class="mia-riga"><small>ultima</small>${rigaPartita(x.ultima, indice, { mostraData: true })}</div>` : ''}
      ${x.prossima ? `<div class="mia-riga"><small>prossima</small>${rigaPartita(x.prossima, indice, { mostraData: true })}</div>` : ''}
    </div>`).join(''));
}

export async function render({ indice, rotta, oggi }) {
  const giorni = giorniConPartite(indice.partite);
  const haDaDefinire = indice.partite.some(p => !p.data);
  const giorno = rotta.params[0] || giornoIniziale(giorni, oggi) || (haDaDefinire ? DA_DEFINIRE : null);
  if (!giorno) return vuoto('Nessuna partita in calendario.');
  const gruppi = raggruppaPerGirone(partiteDelGiorno(indice.partite, giorno), indice);
  return `${selettoreGiorno(giorni, giorno, oggi, haDaDefinire)}
    ${blocchoPreferite(indice, oggi)}
    ${gruppi.length ? gruppi.map(g => `<section class="card piena">
      <a class="intest-girone" href="#/classifiche/${g.girone.slug}"><span>${esc(g.campionato)} · <b>${esc(g.girone.nome)}</b></span><span class="freccia-piccola">classifica ›</span></a>
      ${g.partite.map(p => rigaPartita(p, indice, { evidenzia: giorno === oggi })).join('')}
    </section>`).join('') : vuoto('Nessuna partita in questo giorno.')}`;
}

export function dopo(ctx, root) {
  const sel = root.querySelector('.giorno select');
  if (sel) sel.onchange = () => ctx.naviga(`#/partite/${sel.value}`);
  collegaStelle(root, async () => { root.innerHTML = await render(ctx); dopo(ctx, root); });
}
```

- [ ] **Step 3: CSS da aggiungere in fondo a `site/css/app.css`**
```css
/* home: selettore giorno */
.giorno { display: flex; align-items: center; justify-content: space-between; gap: var(--s-2); margin: var(--s-2) 0 var(--s-3); }
.giorno .freccia { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: var(--r-full); background: var(--carta); border: 1px solid var(--bordo); font-size: 1.4rem; }
.giorno .freccia.off { opacity: .3; pointer-events: none; }
.giorno .titolo { flex: 1; position: relative; text-align: center; font-weight: 600; line-height: 1.2; }
.giorno .titolo small { display: block; color: var(--muto); font-weight: 400; }
.giorno .titolo select { position: absolute; inset: 0; opacity: 0; width: 100%; }
.intest-girone { display: flex; justify-content: space-between; padding: var(--s-2) var(--s-4); background: var(--carta-alt); font-size: .82rem; color: var(--muto); }
.intest-girone b { color: var(--testo); }
.freccia-piccola { color: var(--brand); font-weight: 600; }

/* riga partita */
.partita { display: grid; grid-template-columns: 56px 1fr auto; align-items: center; gap: var(--s-2); padding: var(--s-2) var(--s-3); border-top: 1px solid var(--bordo); min-height: 64px; }
.partita.tavolino .ris { color: var(--muto); }
.quando { text-align: center; line-height: 1.1; }
.quando small { display: block; color: var(--muto); font-size: .68rem; }
.ris { font-weight: 700; font-size: 1.05rem; }
.ris i { font-style: normal; color: var(--muto); padding: 0 2px; }
.ris.evid { color: var(--accento-forte); }
.ora { color: var(--muto); font-size: .9rem; }
.squadre .riga { display: flex; align-items: center; justify-content: space-between; gap: var(--s-2); min-width: 0; }
.squadre .riga span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.squadre .riga.pref span { font-weight: 600; }
.extra { display: flex; flex-direction: column; gap: 3px; align-items: flex-end; }
.muto { color: var(--muto); font-size: .9rem; margin: 0; }
.mia { padding: var(--s-2) 0; border-top: 1px solid var(--bordo); }
.mia:first-of-type { border-top: 0; }
.mia-nome { font-weight: 700; display: block; margin-bottom: var(--s-1); }
.mia-riga small { color: var(--muto); font-size: .7rem; text-transform: uppercase; letter-spacing: .4px; }
.mia-riga .partita { border-top: 0; padding-left: 0; padding-right: 0; min-height: 52px; }
.card h3 { margin: 0 0 var(--s-2); font-size: .8rem; text-transform: uppercase; letter-spacing: .5px; color: var(--muto); }
```

- [ ] **Step 4: Verifica manuale** con i dati finti di Task 8 Step 5 (rigenerarli, poi cancellarli): la home mostra il selettore giorno con "mer 16/09", i gruppi per girone, la stellina che resta attiva dopo il ricaricamento, "Le mie squadre" con ultima/prossima; la partita 4 (senza data) compare scegliendo "da definire" dal menu. `npm test` → PASS.

- [ ] **Step 5: Commit** `feat: vista Partite con selettore giorno e preferiti`.

---

### Task 11: Vista dettaglio partita

**Files:**
- Create: `site/js/views/partita.js` (sostituisce il segnaposto), `site/js/tabellino.js`, `site/js/tests/tabellino.test.js`
- Modify: `site/css/app.css` (in fondo)

**Interfaces:**
- Consumes: `partita/<id>.json` (Task 6) via `ctx.carica`, `girone/<slug>.json` per la tab Classifica.
- Produces: `tabellino.js` puro: `timelineMarcatori(tabellino, casaId) -> [{minuto, nome, lato:'casa'|'ospite'}]` ordinata per minuto; `formazioniAffiancate(tabellino, casaId, ospiteId) -> [{casa: giocatore|null, ospite: giocatore|null}]` (righe affiancate per indice, ordinate per numero di maglia con null in coda); `slugGiocatore(squadraId, nome)` identico a Python (`unicodedata` NFKD → ascii, minuscolo, non alfanumerici → `-`).

- [ ] **Step 1: Test** `site/js/tests/tabellino.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { timelineMarcatori, formazioniAffiancate, slugGiocatore } from '../tabellino.js';

const tab = {
  marcatori: [{ squadraId: 20, nome: 'B', minuto: 30 }, { squadraId: 10, nome: 'A', minuto: 5 }, { squadraId: null, nome: 'X', minuto: 1 }],
  formazioni: [{ squadraId: 10, nome: 'A', numero: 7, voto: 7 }, { squadraId: 10, nome: 'C', numero: null, voto: null }, { squadraId: 20, nome: 'B', numero: 1, voto: 6 }],
  migliore: null, completo: true,
};
test('timeline ordinata, ignoti esclusi', () => {
  assert.deepEqual(timelineMarcatori(tab, 10), [{ minuto: 5, nome: 'A', lato: 'casa' }, { minuto: 30, nome: 'B', lato: 'ospite' }]);
});
test('formazioni affiancate', () => {
  const r = formazioniAffiancate(tab, 10, 20);
  assert.equal(r.length, 2);
  assert.equal(r[0].casa.nome, 'A'); assert.equal(r[0].ospite.nome, 'B');
  assert.equal(r[1].casa.nome, 'C'); assert.equal(r[1].ospite, null);
});
test('slug uguale a python', () => {
  assert.equal(slugGiocatore(2480, "D'ANGELO JOSÈ  MARÍA"), '2480-d-angelo-jose-maria');
});
```

- [ ] **Step 2: Run** `npm test` → FAIL. **Step 3: Implementazione**

`site/js/tabellino.js`:
```js
export function slugGiocatore(squadraId, nome) {
  const s = String(nome).normalize('NFKD').replace(/[^\x00-\x7F]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `${squadraId}-${s}`;
}
export function timelineMarcatori(tab, casaId) {
  return tab.marcatori.filter(m => m.squadraId != null)
    .map(m => ({ minuto: m.minuto, nome: m.nome, lato: m.squadraId === casaId ? 'casa' : 'ospite' }))
    .sort((a, b) => a.minuto - b.minuto);
}
const perNumero = (a, b) => (a.numero ?? 999) - (b.numero ?? 999) || a.nome.localeCompare(b.nome);
export function formazioniAffiancate(tab, casaId, ospiteId) {
  const casa = tab.formazioni.filter(f => f.squadraId === casaId).sort(perNumero);
  const ospite = tab.formazioni.filter(f => f.squadraId === ospiteId).sort(perNumero);
  const n = Math.max(casa.length, ospite.length);
  return Array.from({ length: n }, (_, i) => ({ casa: casa[i] || null, ospite: ospite[i] || null }));
}
```

`site/js/views/partita.js`:
```js
import { esc, formattaDataLunga, segnoDR } from '../util.js';
import { timelineMarcatori, formazioniAffiancate, slugGiocatore } from '../tabellino.js';
import { stellaHTML, collegaStelle, vuoto } from './comuni.js';

let tab = 'riepilogo';

const cellaGiocatore = (g, sq, lato) => g ? `<td class="${lato}"><a href="#/giocatore/${slugGiocatore(sq, g.nome)}">${esc(g.nome)}</a>${g.ammonito ? '<i class="cart giallo"></i>' : ''}${g.espulso ? '<i class="cart rosso"></i>' : ''}${g.voto != null ? `<b class="voto">${g.voto}</b>` : ''}</td>` : '<td></td>';
const numero = (g) => g && g.numero != null ? g.numero : '';

function riepilogo(p) {
  const t = p.tabellino;
  if (!t) return vuoto(p.giocata ? 'Tabellino non ancora pubblicato.' : 'La partita non è ancora stata giocata.');
  const tl = timelineMarcatori(t, p.casa.id);
  return `<section class="card">
    ${tl.length ? `<ul class="timeline">${tl.map(m => `<li class="${m.lato}"><span class="min">${m.minuto}'</span><a href="#/giocatore/${slugGiocatore(m.lato === 'casa' ? p.casa.id : p.ospite.id, m.nome)}">${esc(m.nome)}</a></li>`).join('')}</ul>` : '<p class="muto">Nessun marcatore registrato.</p>'}
    ${t.migliore && t.migliore.squadraId != null ? `<p class="mvp">⭐ Migliore in campo: <a href="#/giocatore/${slugGiocatore(t.migliore.squadraId, t.migliore.nome)}">${esc(t.migliore.nome)}</a></p>` : ''}
  </section>`;
}

function formazioni(p) {
  const t = p.tabellino;
  if (!t || !t.completo) return vuoto('Formazioni non ancora pubblicate.');
  const righe = formazioniAffiancate(t, p.casa.id, p.ospite.id);
  return `<section class="card piena"><table class="tab form"><thead><tr><th class="casa">${esc(p.casa.nome)}</th><th>#</th><th class="ospite">${esc(p.ospite.nome)}</th></tr></thead>
    <tbody>${righe.map(r => `<tr>${cellaGiocatore(r.casa, p.casa.id, 'casa')}<td class="num">${numero(r.casa)}${r.ospite && numero(r.ospite) !== numero(r.casa) ? `/${numero(r.ospite)}` : ''}</td>${cellaGiocatore(r.ospite, p.ospite.id, 'ospite')}</tr>`).join('')}</tbody></table></section>`;
}

async function classifica(p, carica) {
  const g = await carica(`girone/${p.girone.slug}.json`);
  const righe = g.classifica.totale;
  return `<section class="card piena"><table class="tab"><thead><tr><th>#</th><th class="sx">Squadra</th><th>PT</th><th>G</th><th>DR</th></tr></thead>
    <tbody>${righe.map(r => `<tr class="${[p.casa.id, p.ospite.id].includes(r.squadraId) ? 'evid' : ''}"><td>${r.pos}</td><td class="sx nome"><a href="#/squadra/${r.squadraId}">${esc(r.nome)}</a></td><td><b>${r.pt}</b></td><td>${r.g}</td><td>${segnoDR(r.dr)}</td></tr>`).join('')}</tbody></table></section>
    <p class="muto centro"><a href="#/classifiche/${p.girone.slug}">Classifica completa ›</a></p>`;
}

export async function render({ rotta, carica }) {
  const p = await carica(`partita/${rotta.params[0]}.json`);
  const corpo = tab === 'formazioni' ? formazioni(p) : tab === 'classifica' ? await classifica(p, carica) : riepilogo(p);
  return `<section class="testa-partita">
      <div class="meta">${esc(p.girone.nome)} · giornata ${p.giornata} · ${esc(formattaDataLunga(p.data))}${p.ora ? ` ore ${esc(p.ora)}` : ''}${p.tavolino ? ' · <span class="badge">a tavolino</span>' : ''}</div>
      <div class="scontro">
        <div class="lato"><a href="#/squadra/${p.casa.id}">${esc(p.casa.nome)}</a>${stellaHTML(p.casa.id)}</div>
        <div class="punteggio">${p.giocata ? `${p.golCasa}<i>-</i>${p.golOspite}` : `<small>${esc(p.ora || '--:--')}</small>`}</div>
        <div class="lato"><a href="#/squadra/${p.ospite.id}">${esc(p.ospite.nome)}</a>${stellaHTML(p.ospite.id)}</div>
      </div>
    </section>
    <div class="tabs">${[['riepilogo', 'Riepilogo'], ['formazioni', 'Formazioni'], ['classifica', 'Classifica']].map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? 'attivo' : ''}">${l}</button>`).join('')}</div>
    ${corpo}`;
}

export function dopo(ctx, root) {
  root.querySelectorAll('.tabs button').forEach(b => { b.onclick = async () => { tab = b.dataset.tab; root.innerHTML = await render(ctx); dopo(ctx, root); }; });
  collegaStelle(root, async () => { root.innerHTML = await render(ctx); dopo(ctx, root); });
}
```

- [ ] **Step 4: CSS in fondo a `app.css`**
```css
/* dettaglio partita */
.testa-partita { background: var(--ink); color: var(--on-ink); margin: calc(-1 * var(--s-3)) calc(-1 * var(--s-4)) var(--s-3); padding: var(--s-3) var(--s-4) var(--s-4); }
.testa-partita .meta { font-size: .75rem; color: var(--on-ink-muto); text-align: center; margin-bottom: var(--s-3); }
.scontro { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: var(--s-2); }
.scontro .lato { display: flex; flex-direction: column; align-items: center; text-align: center; font-weight: 600; gap: 2px; }
.scontro .lato .stella { color: var(--on-ink-muto); }
.scontro .lato .stella.attiva { color: var(--accento); }
.punteggio { font-size: 2.2rem; font-weight: 800; letter-spacing: 1px; }
.punteggio i { font-style: normal; color: var(--on-ink-muto); padding: 0 4px; }
.punteggio small { font-size: 1.1rem; color: var(--on-ink-muto); }
.timeline { list-style: none; margin: 0; padding: 0; }
.timeline li { display: flex; gap: var(--s-2); padding: 6px 0; border-bottom: 1px solid var(--bordo); }
.timeline li:last-child { border-bottom: 0; }
.timeline li.ospite { flex-direction: row-reverse; text-align: right; }
.timeline .min { color: var(--muto); min-width: 34px; }
.mvp { margin: var(--s-3) 0 0; font-weight: 600; }
.tab.form td.casa { text-align: left; } .tab.form td.ospite { text-align: right; }
.tab.form th.casa { text-align: left; } .tab.form th.ospite { text-align: right; }
.tab.form td.num { color: var(--muto); font-size: .75rem; }
.voto { margin-left: 6px; font-size: .8rem; color: var(--brand); }
.centro { text-align: center; } .centro a { color: var(--brand); font-weight: 600; }
```

- [ ] **Step 5: Verifica manuale** con i dati finti (Task 8 Step 5): `#/partita/1` mostra 2-1, timeline con ROSSI MARIO 5' e 40', VERDI LUCA 50', "Migliore in campo"; tab Formazioni con voti e cartellino giallo; tab Classifica con le due squadre evidenziate; `#/partita/4` mostra "non è ancora stata giocata". Cancellare i dati finti. `npm test` → PASS.
- [ ] **Step 6: Commit** `feat: dettaglio partita con tabellino, formazioni e classifica`.

---

### Task 12: Viste Classifiche e Squadra

**Files:**
- Create: `site/js/views/classifiche.js`, `site/js/views/squadra.js` (sostituiscono i segnaposto)
- Modify: `site/css/app.css`

**Interfaces:**
- Consumes: `indice` (gironi), `girone/<slug>.json`, `squadra/<id>.json` (Task 6), `comuni.js` (Task 10), `util.formaHTML`.
- Rotte: `#/classifiche` (primo girone), `#/classifiche/<slug>`; `#/squadra/<id>`.

- [ ] **Step 1: `site/js/views/classifiche.js`**
```js
import { esc, formaHTML, segnoDR } from '../util.js';
import { èPreferita } from '../preferiti.js';
import { vuoto } from './comuni.js';

let tipo = 'totale';
const gironi = (indice) => indice.campionati.flatMap(c => c.gironi.map(g => ({ ...g, campionato: c.nome })));

export async function render({ indice, rotta, carica }) {
  const lista = gironi(indice);
  if (!lista.length) return vuoto('Nessun campionato in corso.');
  const slug = rotta.params[0] && lista.some(g => g.slug === rotta.params[0]) ? rotta.params[0] : lista[0].slug;
  const g = await carica(`girone/${slug}.json`);
  const forma = new Map(g.squadre.map(s => [s.id, s.forma]));
  const righe = g.classifica[tipo] || [];
  return `<div class="tabs">${lista.map(x => `<button data-slug="${x.slug}" class="${x.slug === slug ? 'attivo' : ''}">${esc(x.nome)}</button>`).join('')}</div>
    <h2>${esc(g.campionato.nome)} · ${esc(g.nome)}${g.stale && Object.keys(g.stale).length ? ' <span class="badge">dati parziali</span>' : ''}</h2>
    <div class="segmenti">${[['totale', 'Totale'], ['casa', 'Casa'], ['trasferta', 'Trasferta']].map(([k, l]) => `<button data-tipo="${k}" class="${tipo === k ? 'attivo' : ''}">${l}</button>`).join('')}</div>
    ${righe.length ? `<section class="card piena"><div class="scroll-x"><table class="tab">
      <thead><tr><th>#</th><th class="sx">Squadra</th><th>PT</th><th>G</th><th>V</th><th>N</th><th>P</th><th>GF</th><th>GS</th><th>DR</th>${tipo === 'totale' ? '<th>Forma</th>' : ''}</tr></thead>
      <tbody>${righe.map(r => `<tr class="cliccabile ${èPreferita(r.squadraId) ? 'evid' : ''}" data-squadra="${r.squadraId}"><td>${r.pos}</td><td class="sx nome">${esc(r.nome)}</td><td><b>${r.pt}</b></td><td>${r.g}</td><td>${r.v}</td><td>${r.n}</td><td>${r.p}</td><td>${r.gf}</td><td>${r.gs}</td><td>${segnoDR(r.dr)}</td>${tipo === 'totale' ? `<td>${formaHTML(forma.get(r.squadraId))}</td>` : ''}</tr>`).join('')}</tbody>
    </table></div></section>` : vuoto('Classifica non disponibile.')}`;
}

export function dopo(ctx, root) {
  root.querySelectorAll('.tabs button').forEach(b => { b.onclick = () => ctx.naviga(`#/classifiche/${b.dataset.slug}`); });
  root.querySelectorAll('.segmenti button').forEach(b => { b.onclick = async () => { tipo = b.dataset.tipo; root.innerHTML = await render(ctx); dopo(ctx, root); }; });
  root.querySelectorAll('tr[data-squadra]').forEach(tr => { tr.onclick = () => ctx.naviga(`#/squadra/${tr.dataset.squadra}`); });
}
```

- [ ] **Step 2: `site/js/views/squadra.js`**
```js
import { esc, formaHTML, formattaData, pallinoForma } from '../util.js';
import { stellaHTML, collegaStelle, card, vuoto } from './comuni.js';

let tab = 'risultati';

const rigaRis = (p) => `<a class="ris-riga" href="#/partita/${p.id}"><span class="data">${esc(formattaData(p.data))}</span><span class="avv">${p.casa ? '' : '@ '}${esc(p.avversario)}</span><span class="punti">${p.esito ? `${pallinoForma(p.esito)} <b>${p.gf}-${p.gs}</b>` : `<small>${esc(p.ora || '')}</small>`}</span></a>`;

function risultati(s) {
  const prossima = s.partite.find(p => !p.giocata);
  return `${prossima ? card('Prossima partita', rigaRis(prossima)) : ''}
    ${card('Tutte le partite', s.partite.length ? s.partite.map(rigaRis).join('') : '<p class="muto">Nessuna partita.</p>')}`;
}

function rosa(s) {
  if (!s.rosa.length) return vuoto('La rosa compare dopo la prima partita con tabellino.');
  const r = [...s.rosa].sort((a, b) => b.presenze - a.presenze || b.gol - a.gol || a.nome.localeCompare(b.nome));
  return `<section class="card piena"><table class="tab"><thead><tr><th class="sx">Giocatore</th><th>Pres.</th><th>Gol</th><th>Voto</th><th>Cart.</th></tr></thead>
    <tbody>${r.map(g => `<tr class="cliccabile" data-slug="${g.slug}"><td class="sx nome">${esc(g.nome)}${g.mvp ? ` <span class="badge accento">${g.mvp}★</span>` : ''}</td><td>${g.presenze}</td><td>${g.gol}</td><td>${g.votoMedio ?? '–'}</td><td>${g.ammonizioni ? `${g.ammonizioni}<i class="cart giallo"></i>` : ''}${g.espulsioni ? `${g.espulsioni}<i class="cart rosso"></i>` : ''}</td></tr>`).join('')}</tbody></table></section>`;
}

function statistiche(s) {
  const st = s.stat;
  if (!st.g) return vuoto('Le statistiche compaiono dopo la prima partita.');
  const blocco = (t, x) => `<div class="stat"><small>${t}</small><b>${x}</b></div>`;
  return `${card('Rendimento', `<div class="stat-griglia">
      ${blocco('Giocate', st.g)}${blocco('Vinte', st.v)}${blocco('Pari', st.n)}${blocco('Perse', st.p)}
      ${blocco('Gol fatti', `${st.gf} <small>(${st.mediaGf}/partita)</small>`)}${blocco('Gol subiti', `${st.gs} <small>(${st.mediaGs}/partita)</small>`)}
      ${blocco('In casa', `${st.casa.v}V ${st.casa.n}N ${st.casa.p}P`)}${blocco('Fuori', `${st.fuori.v}V ${st.fuori.n}N ${st.fuori.p}P`)}
    </div>`)}
    ${card('Forma e serie', `<p>Ultime partite: ${formaHTML(s.forma)}</p>${st.serie ? `<p class="muto">Serie in corso: ${st.serie.n} ${({ V: 'vittorie', N: 'pareggi', P: 'sconfitte' })[st.serie.tipo]} di fila</p>` : ''}`)}`;
}

export async function render({ rotta, carica }) {
  const s = await carica(`squadra/${rotta.params[0]}.json`);
  const corpo = tab === 'rosa' ? rosa(s) : tab === 'statistiche' ? statistiche(s) : risultati(s);
  return `<section class="testa-squadra">
      <div><h2>${esc(s.nome)}</h2><div class="meta"><a href="#/classifiche/${s.girone.slug}">${esc(s.girone.nome)}</a>${s.pos ? ` · ${s.pos}º posto · ${s.riga.pt} pt` : ''}</div></div>
      ${stellaHTML(s.id)}
    </section>
    <div class="tabs">${[['risultati', 'Risultati'], ['rosa', 'Rosa'], ['statistiche', 'Statistiche']].map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? 'attivo' : ''}">${l}</button>`).join('')}</div>
    ${corpo}`;
}

export function dopo(ctx, root) {
  root.querySelectorAll('.tabs button').forEach(b => { b.onclick = async () => { tab = b.dataset.tab; root.innerHTML = await render(ctx); dopo(ctx, root); }; });
  root.querySelectorAll('tr[data-slug]').forEach(tr => { tr.onclick = () => ctx.naviga(`#/giocatore/${tr.dataset.slug}`); });
  collegaStelle(root, async () => { root.innerHTML = await render(ctx); dopo(ctx, root); });
}
```

- [ ] **Step 3: CSS in fondo a `app.css`**
```css
/* squadra */
.testa-squadra { display: flex; align-items: center; justify-content: space-between; gap: var(--s-2); }
.testa-squadra h2 { margin: var(--s-2) 0 0; }
.testa-squadra .meta { color: var(--muto); font-size: .85rem; }
.testa-squadra .meta a { color: var(--brand); }
.ris-riga { display: grid; grid-template-columns: 64px 1fr auto; align-items: center; gap: var(--s-2); padding: 8px 0; border-top: 1px solid var(--bordo); min-height: 44px; }
.ris-riga:first-child { border-top: 0; }
.ris-riga .data { color: var(--muto); font-size: .8rem; }
.ris-riga .avv { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ris-riga .punti { display: inline-flex; align-items: center; gap: 6px; }
.stat-griglia { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--s-2) var(--s-4); }
.stat small { display: block; color: var(--muto); font-size: .72rem; text-transform: uppercase; letter-spacing: .4px; }
.stat b { font-size: 1.1rem; }
```

- [ ] **Step 4: Verifica manuale** con i dati finti: `#/classifiche` mostra Serie B con forma; toggle Casa/Trasferta (vuoti nei dati finti → "Classifica non disponibile"); tocco su ALFA apre `#/squadra/10` con risultati, rosa (ROSSI MARIO 3 pres., 2 gol, 7.0) e statistiche. `npm test` → PASS. Cancellare i dati finti.
- [ ] **Step 5: Commit** `feat: viste classifiche e squadra`.

---

### Task 13: Viste Giocatori e Giocatore

**Files:**
- Create: `site/js/views/giocatori.js`, `site/js/views/giocatore.js` (sostituiscono i segnaposto)
- Modify: `site/css/app.css`

**Interfaces:**
- Consumes: `girone/<slug>.json.giocatori` (`marcatori, voti, mvp, fairplay`), `giocatore/<slug>.json` (Task 6), `nomeSquadra` (Task 10).
- Rotte: `#/giocatori`, `#/giocatori/<slug-girone>`; `#/giocatore/<slug>`.

- [ ] **Step 1: `site/js/views/giocatori.js`**
```js
import { esc } from '../util.js';
import { nomeSquadra, vuoto } from './comuni.js';

let tab = 'marcatori';
const COLONNE = {
  marcatori: ['Gol', (g) => g.gol], voti: ['Media', (g) => g.votoMedio],
  mvp: ['★', (g) => g.mvp], fairplay: ['Cart.', (g) => `${g.ammonizioni}<i class="cart giallo"></i>${g.espulsioni ? ` ${g.espulsioni}<i class="cart rosso"></i>` : ''}`],
};
const NOTE = { voti: 'Almeno 3 voti.', fairplay: 'Almeno 3 presenze; meno cartellini prima.', marcatori: '', mvp: 'Premi "migliore in campo".' };

export async function render({ indice, rotta, carica }) {
  const lista = indice.campionati.flatMap(c => c.gironi);
  if (!lista.length) return vuoto('Nessun campionato in corso.');
  const slug = rotta.params[0] && lista.some(g => g.slug === rotta.params[0]) ? rotta.params[0] : lista[0].slug;
  const g = await carica(`girone/${slug}.json`);
  const righe = g.giocatori[tab] || [];
  const [intest, valore] = COLONNE[tab];
  return `<div class="tabs">${lista.map(x => `<button data-slug="${x.slug}" class="${x.slug === slug ? 'attivo' : ''}">${esc(x.nome)}</button>`).join('')}</div>
    <div class="segmenti">${[['marcatori', 'Marcatori'], ['voti', 'Voti'], ['mvp', 'Migliori'], ['fairplay', 'Fair play']].map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? 'attivo' : ''}">${l}</button>`).join('')}</div>
    ${righe.length ? `<section class="card piena"><table class="tab"><thead><tr><th>#</th><th class="sx">Giocatore</th><th>Pres.</th><th>${intest}</th></tr></thead>
      <tbody>${righe.map((r, i) => `<tr class="cliccabile" data-slug="${r.slug}"><td>${i + 1}</td><td class="sx nome">${esc(r.nome)}<small class="sq-sotto">${esc(nomeSquadra(indice, r.squadraId))}</small></td><td>${r.presenze}</td><td><b>${valore(r)}</b></td></tr>`).join('')}</tbody></table></section>
      ${NOTE[tab] ? `<p class="muto centro">${NOTE[tab]}</p>` : ''}` : vuoto('Nessun dato: le statistiche compaiono dopo le prime partite con tabellino.')}`;
}

export function dopo(ctx, root) {
  root.querySelectorAll('.tabs button').forEach(b => { b.onclick = () => ctx.naviga(`#/giocatori/${b.dataset.slug}`); });
  root.querySelectorAll('.segmenti button').forEach(b => { b.onclick = async () => { tab = b.dataset.tab; root.innerHTML = await render(ctx); dopo(ctx, root); }; });
  root.querySelectorAll('tr[data-slug]').forEach(tr => { tr.onclick = () => ctx.naviga(`#/giocatore/${tr.dataset.slug}`); });
}
```

- [ ] **Step 2: `site/js/views/giocatore.js`**
```js
import { esc, formattaData, pallinoForma } from '../util.js';
import { card } from './comuni.js';

export async function render({ rotta, carica }) {
  const g = await carica(`giocatore/${rotta.params[0]}.json`);
  const blocco = (t, x) => `<div class="stat"><small>${t}</small><b>${x}</b></div>`;
  return `<section class="testa-squadra"><div><h2>${esc(g.nome)}</h2><div class="meta"><a href="#/squadra/${g.squadraId}">${esc(g.squadra)}</a> · <a href="#/classifiche/${g.girone.slug}">${esc(g.girone.nome)}</a></div></div></section>
    ${card('Stagione', `<div class="stat-griglia">${blocco('Presenze', g.presenze)}${blocco('Gol', g.gol)}${blocco('Media voto', g.votoMedio ?? '–')}${blocco('Migliore in campo', g.mvp)}${blocco('Ammonizioni', g.ammonizioni)}${blocco('Espulsioni', g.espulsioni)}</div>`)}
    ${card('Partita per partita', g.perPartita.length ? `<div class="scroll-x"><table class="tab"><thead><tr><th class="sx">Data</th><th class="sx">Avversario</th><th>Ris.</th><th>Gol</th><th>Voto</th><th></th></tr></thead>
      <tbody>${[...g.perPartita].reverse().map(p => `<tr class="cliccabile" data-id="${p.idPartita}"><td class="sx">${esc(formattaData(p.data))}</td><td class="sx nome">${p.casa ? '' : '@ '}${esc(p.avversario)}</td><td>${pallinoForma(p.esito)} ${p.gf}-${p.gs}</td><td>${p.gol || ''}</td><td>${p.voto ?? '–'}</td><td>${p.mvp ? '★' : ''}${p.ammonito ? '<i class="cart giallo"></i>' : ''}${p.espulso ? '<i class="cart rosso"></i>' : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muto">Nessuna partita.</p>')}`;
}

export function dopo(ctx, root) {
  root.querySelectorAll('tr[data-id]').forEach(tr => { tr.onclick = () => ctx.naviga(`#/partita/${tr.dataset.id}`); });
}
```

- [ ] **Step 3: CSS** in fondo a `app.css`:
```css
.sq-sotto { display: block; color: var(--muto); font-size: .72rem; }
```

- [ ] **Step 4: Verifica manuale** con i dati finti: `#/giocatori` mostra Marcatori (ROSSI MARIO 2, VERDI LUCA 1, NERI ANNA 1), Voti (solo ROSSI), Fair play (solo ROSSI); tocco apre `#/giocatore/10-rossi-mario` con 3 presenze e la tabella partita per partita. Con dati finti senza partite giocate (modificare `giocata: False` nel raw) la vista mostra "Nessun dato" senza errori in console. `npm test` → PASS. Cancellare i dati finti.
- [ ] **Step 5: Commit** `feat: classifiche giocatori e pagina giocatore`.

---

### Task 14: Vista Info, PWA (manifest, service worker, icone)

**Files:**
- Create: `site/js/views/info.js` (sostituisce il segnaposto), `site/manifest.webmanifest`, `site/sw.js`, `site/icons/icon.svg`, `site/icons/icon-192.png`, `site/icons/icon-512.png`, `site/icons/icon-maskable-512.png`, `scripts/genera_icone.py`, `site/.nojekyll`
- Modify: `site/css/app.css`

**Interfaces:**
- Consumes: `tema.js` (Task 8).
- Produces: pagina Info con fonte dati, privacy, email oscuramento, selettore tema, versione; service worker con `VERSIONE` da incrementare a ogni rilascio di codice.

- [ ] **Step 1: `site/js/views/info.js`**
```js
import { esc, formattaOra, formattaData } from '../util.js';
import { leggiTema, impostaTema } from '../tema.js';
import { card } from './comuni.js';

export const VERSIONE = '1.0.0';
const EMAIL = 'massimiliano.griletti@gmail.com';   // da confermare con l'utente prima della pubblicazione

export async function render({ indice }) {
  const t = leggiTema();
  return `<h2>Sporting Live</h2>
    ${card('Cos\'è', `<p>Risultati, classifiche e statistiche dei campionati organizzati dallo <b>Sporting Club Mestre</b> (Endas Venezia), pensati per il telefono. Aggiungi l'app alla schermata Home per averla sempre a portata di mano.</p>`)}
    ${card('Fonte dei dati', `<p>I dati sono letti dal sito ufficiale <a href="https://www.campionatisportingclub.it/" rel="noopener">campionatisportingclub.it</a> con il consenso dell'organizzazione. Ultimo aggiornamento: ${esc(formattaData(indice.generato.slice(0, 10)))} alle ${esc(formattaOra(indice.generato))}. Fa fede il sito ufficiale.</p>`)}
    ${card('Aspetto', `<div class="segmenti">${[['auto', 'Automatico'], ['chiaro', 'Chiaro'], ['scuro', 'Scuro']].map(([k, l]) => `<button data-tema="${k}" class="${t === k ? 'attivo' : ''}">${l}</button>`).join('')}</div>`)}
    ${card('Privacy', `<p>L'app non raccoglie dati personali e non usa cookie. Le squadre preferite e il tema restano solo sul tuo dispositivo. I nomi dei giocatori sono quelli pubblicati dall'organizzazione nei tabellini ufficiali.</p>
      <p>Se sei un giocatore e non vuoi comparire, scrivi a <a href="mailto:${EMAIL}">${EMAIL}</a>: il nome viene oscurato al primo aggiornamento utile.</p>`)}
    <p class="muto centro">Sporting Live v${VERSIONE} · fatta a Mestre</p>`;
}

export function dopo(ctx, root) {
  root.querySelectorAll('[data-tema]').forEach(b => { b.onclick = async () => { impostaTema(b.dataset.tema); root.innerHTML = await render(ctx); dopo(ctx, root); }; });
}
```

- [ ] **Step 2: `site/manifest.webmanifest`**
```json
{
  "name": "Sporting Live",
  "short_name": "Sporting Live",
  "description": "Risultati, classifiche e statistiche dei campionati dello Sporting Club Mestre.",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "background_color": "#01213b",
  "theme_color": "#01213b",
  "lang": "it",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" },
    { "src": "icons/icon.svg", "sizes": "any", "type": "image/svg+xml" }
  ]
}
```

- [ ] **Step 3: `site/icons/icon.svg`** (blu notte, pallone stilizzato, fulmine arancione: "live")
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="#01213b"/><circle cx="56" cy="64" r="34" fill="#ffffff"/><path d="M56 34l9 12-3 14H50l-3-14zM34 54l13 4 5 13-9 11-13-6zM78 54l-13 4-5 13 9 11 13-6z" fill="#01213b"/><path d="M92 28l-14 34h12l-6 38 24-46H94z" fill="#ff4e00" stroke="#01213b" stroke-width="4" stroke-linejoin="round"/></svg>
```

- [ ] **Step 4: `scripts/genera_icone.py`** (PNG per Android/iOS; eseguire una volta e committare i PNG)
```python
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
```
Run: `python scripts/genera_icone.py` → tre PNG in `site/icons/`. Aprirli (Read) e controllare che si vedano pallone e fulmine.

- [ ] **Step 5: `site/sw.js`**
```js
const VERSIONE = 'sl-1';   // incrementare a ogni rilascio di codice (non di dati)
const SHELL = ['./', 'index.html', 'css/app.css', 'manifest.webmanifest', 'icons/icon.svg',
  'js/app.js', 'js/router.js', 'js/data.js', 'js/util.js', 'js/tema.js', 'js/giorni.js', 'js/preferiti.js', 'js/tabellino.js',
  'js/views/comuni.js', 'js/views/partite.js', 'js/views/partita.js', 'js/views/classifiche.js', 'js/views/squadra.js',
  'js/views/giocatori.js', 'js/views/giocatore.js', 'js/views/info.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSIONE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSIONE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.includes('/data/')) {
    // dati: rete prima, cache se offline
    e.respondWith(fetch(e.request).then(r => { const copia = r.clone(); caches.open(VERSIONE).then(c => c.put(e.request, copia)); return r; })
      .catch(() => caches.match(e.request)));
  } else {
    // shell: cache prima, aggiornamento in sottofondo
    e.respondWith(caches.match(e.request).then(hit => {
      const rete = fetch(e.request).then(r => { if (r.ok) caches.open(VERSIONE).then(c => c.put(e.request, r.clone())); return r; }).catch(() => hit);
      return hit || rete;
    }));
  }
});
```

- [ ] **Step 6: `site/.nojekyll`** vuoto (evita che Pages ignori cartelle con underscore).

- [ ] **Step 7: Verifica manuale** su `http://localhost:8080` con i dati finti: Info mostra le card e il cambio tema funziona subito e persiste al ricaricamento; in DevTools → Application: manifest valido, service worker attivo; mettere "Offline" e ricaricare: la home si vede ancora. Cancellare i dati finti. `npm test` → PASS.
- [ ] **Step 8: Commit** `feat: pagina info, manifest, service worker e icone`.

---

### Task 15: Fixture reali degli altri gironi e prima esecuzione con dati veri

**Files:**
- Create: `scraper/tests/fixtures/classifica_425_serie_a.html`, `scraper/tests/fixtures/calendario_426_c5.html`, `scraper/tests/fixtures/tabellino_426_<id>.html`, `scraper/tests/test_parse_altri_gironi.py`
- Produce: `scraper/cache/**`, `build/raw/*.json`, `site/data/**` (committati)

**Interfaces:**
- Consumes: tutto.

- [ ] **Step 1: Scaricare le fixture dei gironi non ancora coperti** (HTML reale, dati non fidati: solo file di test, mai eseguiti)
```bash
cd /Users/massimilianogriletti/Documents/Sporting_Live
UA="SportingLive/1.0 (+app risultati Sporting Club Mestre; contatto: massimiliano.griletti@gmail.com)"
B=https://www.campionatisportingclub.it/campionati0gironigiornatepartite_
curl -sL -A "$UA" "${B}classifica.php?idgirone=425" -o scraper/tests/fixtures/classifica_425_serie_a.html; sleep 1
curl -sL -A "$UA" "${B}calendario.php?idgirone=426" -o scraper/tests/fixtures/calendario_426_c5.html; sleep 1
ID=$(grep -o 'idpartita=[0-9]*' scraper/tests/fixtures/calendario_426_c5.html | head -1 | cut -d= -f2)
curl -sL -A "$UA" "${B}tabellini.php?idgirone=426&tipo=partita&idpartita=$ID" -o "scraper/tests/fixtures/tabellino_426_$ID.html"
echo "tabellino scaricato: $ID"
```
Se il primo `idpartita` del calendario C5 non è una partita giocata, scegliere con `grep -n "partitainfo" scraper/tests/fixtures/calendario_426_c5.html | head` un id con risultato e riscaricare.

- [ ] **Step 2: Test** `scraper/tests/test_parse_altri_gironi.py` (sostituire `<ID>` con l'id scaricato e i numeri attesi con quelli letti sulle pagine del sito):
```python
from scraper.parse import parse_calendario, parse_classifica, parse_tabellino


def test_classifica_serie_a(fixture):
    righe = parse_classifica(fixture("classifica_425_serie_a.html"))
    assert len(righe) == 14
    assert righe[0]["pos"] == 1 and all(r["squadraId"] for r in righe)


def test_calendario_c5(fixture):
    partite = parse_calendario(fixture("calendario_426_c5.html"))
    assert len({p["giornata"] for p in partite}) >= 9       # 10 squadre → 18 giornate a stagione piena
    assert all(p["id"] for p in partite)


def test_tabellino_c5(fixture):
    t = parse_tabellino(fixture("tabellino_426_<ID>.html"))
    assert t["casa"] and t["ospite"]
    assert isinstance(t["golCasa"], int) and isinstance(t["golOspite"], int)
    assert t["formazioni"], "la fixture scelta deve avere le formazioni pubblicate"
```
Run `python -m pytest -q` → PASS. Se il parser fallisce su una di queste pagine, correggere `parse.py` mantenendo verdi i test SOCKS originali, e aggiungere l'asserzione che ha fallito.

- [ ] **Step 3: Prima esecuzione reale**
```bash
python -m scraper.fetch && python -m scraper.build
ls site/data site/data/girone && python3 -c "import json;d=json.load(open('site/data/indice.json'));print(len(d['squadre']),'squadre',len(d['partite']),'partite')"
```
Expected: 4 gironi, 52 squadre, ~450 partite, nessuna riga `ERRORE`; eventuali `AVVISO` vanno letti: "squadra non mappata" indica un nome diverso tra calendario e classifica (aggiungere la normalizzazione in `_norm` se è solo spazi/maiuscole; altrimenti segnalarlo all'utente).

- [ ] **Step 4: Verifica visiva con dati reali** `python3 -m http.server -d site 8080`: home con le partite di oggi o del prossimo turno; stellina su SOCKS (id 2480) → compare in "Le mie squadre"; classifica Serie B con 14 squadre e forma; Giocatori → Marcatori con nomi reali; una pagina giocatore; Info. Controllare la console del browser: nessun errore. Fare uno screenshot (Playwright se disponibile, altrimenti manuale) e allegarlo al messaggio finale.

- [ ] **Step 5: Commit dei dati** `git add scraper/cache build/raw site/data scraper/tests && git commit -m "chore: fixture reali e primi dati della stagione 2026/27"`.

- [ ] **Step 6: Consegna** — `npm test` e `python -m pytest -q` entrambi verdi; elencare all'utente i passi manuali rimasti: creare il repo GitHub `sporting-live`, push, Pages → Source "GitHub Actions", primo run; confermare l'indirizzo email di contatto in `config.py` e `info.js`.

---

## Note per l'esecuzione

- I dati finti per la verifica manuale si generano con lo snippet di Task 8 Step 5 e vanno cancellati prima di ogni commit; i dati reali arrivano solo in Task 15.
- Ogni task del sito termina con `npm test` verde; ogni task dello scraper con `python -m pytest -q` verde.
- La sezione Vantaggi (sponsor), il dominio e le analytics sono la fase 2 e avranno un piano separato.
