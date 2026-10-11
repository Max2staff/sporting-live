# Calendario, tasto indietro e grafici — piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** aggiungere a Sporting Live il calendario per giornate, un tasto indietro e grafici animati su classifica, squadra, giocatore e partita.

**Architecture:** il generatore Python (`scraper/build.py`) aggiunge ai JSON pubblicati i dati che servono ai grafici. Il sito, in JS vanilla con moduli ES e senza bundler, legge quei JSON. Ogni grafico è una funzione pura che restituisce una stringa SVG o HTML, sta in `site/js/grafici/` ed è testata con `node --test`. Il tasto indietro si basa su `history.state`: ogni voce della cronologia ha un numero di passo e il contesto girone/categoria in vigore.

**Tech Stack:** Python 3 + pytest (generatore), JavaScript ES modules + `node --test` (sito), SVG scritto a mano, CSS con variabili di tema. Nessuna dipendenza nuova.

**Spec:** `docs/superpowers/specs/2026-10-11-calendario-indietro-grafici-design.md`

## Global Constraints

- Niente librerie esterne né CDN: la CSP è `script-src 'self'`; gli stili inline sono permessi (`style-src 'self' 'unsafe-inline'`).
- Tema chiaro e tema scuro: solo variabili CSS (`--accento`, `--ok`, `--neutro`, `--ko`, `--muto`, `--bordo`, `--carta`, `--testo`, `--oro`, `--argento`, `--bronzo`, `--azzurro`, `--giallo-c`); mai colori fissi per il testo.
- Tutto deve funzionare anche in archivio (`#/a/<edizione>/...`): i link interni passano da `ctx.naviga` / `ctx.prefissa`, oppure sono `href="#/..."` riscritti in automatico da `prefissaLink`.
- "RIPOSO" non è mai una squadra (`norm(nome) == "RIPOSO"` in Python, `squadraReale` in JS).
- Etichette dei grafici mai sotto 11 unità SVG (`font-size: 11px` in un viewBox largo circa 340).
- Animazioni solo CSS, circa 0,8 s, spente con `@media (prefers-reduced-motion: reduce)`.
- Se i dati sono troppo pochi la funzione grafico restituisce `''` e la card non compare.
- Ogni file JS nuovo va aggiunto a `SHELL` in `site/sw.js`; `VERSIONE` passa da `sl-5` a `sl-6`.
- Testi dell'interfaccia in italiano.
- Messaggi di commit in italiano, con la riga `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Test: `python3 -m pytest -q` e `npm test` dalla radice del repository.

## Review Focus

1. **Girone non ancora iniziato**, come la Super League prima del 13/10: zero partite giocate. Il calendario deve aprirsi sulla 1ª giornata e Statistiche deve mostrare un messaggio, non grafici vuoti. Lo coprono i test di Task 2 (`giornataIniziale` senza giocate) e di Task 5 (`serieTitolo` con andamento vuoto restituisce `xs` lunghi 0, quindi SVG `''`).
2. **Link aperto da WhatsApp** (prima pagina della sessione): la ‹ non deve far uscire dall'app ma portare alla pagina madre, mantenendo il prefisso d'archivio. Lo coprono i test di Task 4 (`madre` e `prefissaHash` in archivio).
3. **Valori mancanti** (`gf`/`gs`/`voto` a `null`, partite a tavolino, giornata `null`): nessun `NaN` deve finire negli attributi SVG. Ogni test dei grafici controlla `!/NaN/.test(svg)`.
4. **Nomi lunghi o con caratteri speciali** (`D'ANGELO`, `M&M`): vanno sempre passati da `esc` dentro SVG e HTML. Lo coprono i test di Task 5 e 6 con il nome `EASY M&M`.
5. **File JS nuovo dimenticato nel service worker**: offline l'app si romperebbe. Lo copre il test di Task 7, che confronta i file in `site/js` con `SHELL`.

---

## Mappa dei file

| File | Ruolo |
|---|---|
| `scraper/grafici.py` (nuovo) | `corsa_marcatori`, `media_girone`, `confronto`: dati per i grafici |
| `scraper/build.py` | aggiunge `andamento`, `corsaMarcatori`, `mediaGirone`, `confronto` ai JSON |
| `site/js/calendario.js` (nuovo) | logica pura del calendario per giornate |
| `site/js/views/calendario.js` (nuovo) | HTML della scheda Calendario |
| `site/js/views/classifiche.js` | pagina girone a tre schede |
| `site/js/views/partite.js` | link "Calendario completo", cambio girone come passo della cronologia |
| `site/js/indietro.js` (nuovo) | logica pura del tasto indietro (passo, pagina madre) |
| `site/js/contesto.js` | `fotografiaContesto` e `ripristinaContesto` |
| `site/js/app.js` | testata con la ‹, passi in `history.state`, `ctx.madre`, `ctx.nuovoPasso` |
| `site/js/grafici/base.js` (nuovo) | utilità comuni (numeri sicuri, scale, tacche) |
| `site/js/grafici/corsa.js` (nuovo) | grafico a più linee (corsa al titolo, corsa marcatori) e legenda |
| `site/js/grafici/barre.js` (nuovo) | gol per giornata (squadra), gol e voti (giocatore) |
| `site/js/grafici/ciambella.js` (nuovo) | ciambella V/N/P |
| `site/js/grafici/confronto.js` (nuovo) | barre contrapposte A contro B |
| `site/js/views/squadra.js`, `giocatore.js`, `partita.js` | inseriscono i grafici e chiamano `ctx.madre` |
| `site/css/app.css` | schede-link, calendario, tasto indietro, grafici, animazioni |
| `site/sw.js` | SHELL e VERSIONE |

---

### Task 1: dati per i grafici nel generatore

**Files:**
- Create: `scraper/grafici.py`
- Create: `scraper/tests/test_grafici.py`
- Modify: `scraper/build.py` (ciclo dei gironi, circa righe 60–100)
- Modify: `scraper/tests/test_build.py` (nuovo test in fondo)

**Interfaces:**
- Produces (JSON):
  - `girone/<slug>.json.andamento`: `{ "<squadraId>": [{giornata, pos, pt}] }`;
  - `girone/<slug>.json.corsaMarcatori`: `{giornate: [int], marcatori: [{slug, nome, squadraId, gol: [int cumulati]}]}` oppure `null`;
  - `squadra/<id>.json.mediaGirone`: `{gf, gs, pt}` (float per partita) oppure `null`;
  - `partita/<id>.json.confronto`: `{casa: {pos, pt, g, gf, gs, forma}, ospite: {...}}` oppure `null`.

- [ ] **Step 1: scrivere i test che falliscono**

`scraper/tests/test_grafici.py`:

```python
from __future__ import annotations

from scraper.grafici import confronto, corsa_marcatori, media_girone
from scraper.stats import giocatori
from scraper.tests.test_stats import raw_finto


def test_corsa_marcatori_cumulati_e_ordine():
    raw = raw_finto()
    c = corsa_marcatori(giocatori(raw), raw["partite"])
    assert c["giornate"] == [1, 2, 3]
    assert [m["nome"] for m in c["marcatori"]] == ["ROSSI MARIO", "NERI ANNA", "VERDI LUCA"]
    assert c["marcatori"][0]["gol"] == [2, 2, 2]
    assert c["marcatori"][1]["gol"] == [0, 0, 1]
    assert set(c["marcatori"][0]) == {"slug", "nome", "squadraId", "gol"}


def test_corsa_marcatori_limite_e_nessun_gol():
    raw = raw_finto()
    assert len(corsa_marcatori(giocatori(raw), raw["partite"], n=1)["marcatori"]) == 1
    for t in raw["tabellini"].values():
        t["marcatori"] = []
    assert corsa_marcatori(giocatori(raw), raw["partite"]) is None


def test_media_girone():
    tot = [{"pos": 1, "pt": 6, "g": 2, "gf": 5, "gs": 1}, {"pos": 2, "pt": 0, "g": 2, "gf": 1, "gs": 5},
           {"pos": 3, "pt": 0, "g": 0, "gf": 0, "gs": 0}]
    assert media_girone(tot) == {"gf": 1.5, "gs": 1.5, "pt": 1.5}
    assert media_girone([]) is None
    assert media_girone([{"pos": 1, "pt": 0, "g": 0, "gf": 0, "gs": 0}]) is None


def test_confronto():
    rc = {"pos": 1, "pt": 6, "g": 2, "gf": 5, "gs": 1, "v": 2}
    ro = {"pos": 3, "pt": 1, "g": 2, "gf": 2, "gs": 4}
    c = confronto(rc, ro, ["V", "V"], ["N", "P"])
    assert c == {"casa": {"pos": 1, "pt": 6, "g": 2, "gf": 5, "gs": 1, "forma": ["V", "V"]},
                 "ospite": {"pos": 3, "pt": 1, "g": 2, "gf": 2, "gs": 4, "forma": ["N", "P"]}}
    assert confronto(None, ro, [], []) is None
    assert confronto(rc, None, [], []) is None
```

In `scraper/tests/test_build.py`, in fondo:

```python
def test_dati_grafici_nei_json():
    r = raw_con_classifica()
    r["squadre"].append({"id": 99, "nome": "RIPOSO"})
    f = costruisci(STAGIONI, {1: r}, {"*": {}}, adesso="2026-10-01T21:00:00")
    g = f["girone/serie-b.json"]
    assert set(g["andamento"]) == {"10", "20", "30"}
    assert g["andamento"]["10"][0] == {"giornata": 1, "pos": 1, "pt": 3}
    assert g["corsaMarcatori"]["marcatori"][0]["nome"] == "ROSSI MARIO"
    assert f["squadra/10.json"]["mediaGirone"] == {"gf": 1.67, "gs": 1.67, "pt": 1.33}
    c = f["partita/1.json"]["confronto"]
    assert c["casa"]["pos"] == 1 and c["ospite"]["pos"] == 3 and c["casa"]["forma"] == ["V", "N", "P"]
```

Calcolo atteso per `mediaGirone` in `raw_con_classifica`: g = 3+2+1 = 6; gf = 5+4+1 = 10, quindi 10/6 = 1.67; gs = 5+3+2 = 10, quindi 1.67; pt = 4+4+0 = 8, quindi 8/6 = 1.33.

- [ ] **Step 2: eseguire i test e verificare che falliscano**

Run: `python3 -m pytest -q scraper/tests/test_grafici.py scraper/tests/test_build.py -k "grafici or corsa or media or confronto"`
Expected: FAIL con `ModuleNotFoundError: No module named 'scraper.grafici'`.

- [ ] **Step 3: scrivere `scraper/grafici.py`**

```python
"""Dati per i grafici del sito: corsa marcatori, media del girone, confronto tra due squadre."""
from __future__ import annotations


def _tondo(x: float) -> float:
    return round(x + 1e-9, 2)


def corsa_marcatori(lista: list[dict], partite: list[dict], n: int = 5) -> dict | None:
    """Gol cumulati giornata per giornata dei primi `n` marcatori (almeno 1 gol).

    `lista`: output di stats.giocatori (con `perPartita`). Le giornate sono quelle con almeno
    una partita giocata, in ordine. None se nessuno ha segnato.
    """
    giornate = sorted({p["giornata"] for p in partite if p.get("giocata") and isinstance(p.get("giornata"), int)})
    top = sorted((g for g in lista if g["gol"] > 0), key=lambda g: (-g["gol"], g["nome"]))[:n]
    if not top:
        return None
    out = []
    for g in top:
        per_g: dict[int, int] = {}
        for pp in g["perPartita"]:
            per_g[pp["giornata"]] = per_g.get(pp["giornata"], 0) + (pp["gol"] or 0)
        tot, cum = 0, []
        for gg in giornate:
            tot += per_g.get(gg, 0)
            cum.append(tot)
        out.append({"slug": g["slug"], "nome": g["nome"], "squadraId": g["squadraId"], "gol": cum})
    return {"giornate": giornate, "marcatori": out}


def media_girone(totale: list[dict]) -> dict | None:
    """Media per partita di gol fatti, gol subiti e punti di una squadra del girone."""
    g = sum(r["g"] for r in totale)
    if not g:
        return None
    return {k: _tondo(sum(r[k] for r in totale) / g) for k in ("gf", "gs", "pt")}


def confronto(riga_casa: dict | None, riga_ospite: dict | None, forma_casa: list, forma_ospite: list) -> dict | None:
    """Righe di classifica e forma delle due squadre di una partita; None se manca una riga."""
    if not riga_casa or not riga_ospite:
        return None
    lato = lambda r, f: {**{k: r[k] for k in ("pos", "pt", "g", "gf", "gs")}, "forma": list(f)}  # noqa: E731
    return {"casa": lato(riga_casa, forma_casa), "ospite": lato(riga_ospite, forma_ospite)}
```

- [ ] **Step 4: collegarlo a `scraper/build.py`**

Aggiungere l'import:

```python
from .grafici import confronto, corsa_marcatori, media_girone
```

Nel ciclo dei gironi, subito dopo `lista = giocatori(raw)`, aggiungere:

```python
            serie = andamento(raw["partite"], raw["squadre"])
            righe = {r["squadraId"]: r for r in raw["classifica"]["totale"]}
            media = media_girone(raw["classifica"]["totale"])
```

Nel dizionario `files[f"girone/{slug}.json"]`, dopo `"giocatori": classifiche_giocatori(lista)`, aggiungere:

```python
                "andamento": {str(k): v for k, v in serie.items()},
                "corsaMarcatori": corsa_marcatori(lista, raw["partite"]),
```

Nel dizionario `files[f"partita/{p['id']}.json"]`, dopo `"tabellino": ...`, aggiungere:

```python
                    "confronto": confronto(righe.get(p["casaId"]), righe.get(p["ospiteId"]),
                                           forma(raw, p["casaId"]), forma(raw, p["ospiteId"])),
```

Più in basso, togliere le due righe ormai duplicate `serie = andamento(...)` e `righe = {...}`. In `files[f"squadra/{s['id']}.json"]` aggiungere `"mediaGirone": media,` dopo `"forma": ...`.

- [ ] **Step 5: eseguire tutti i test Python**

Run: `python3 -m pytest -q`
Expected: tutti PASS (99 di prima più 5 nuovi).

- [ ] **Step 6: commit**

```bash
git add scraper/grafici.py scraper/tests/test_grafici.py scraper/build.py scraper/tests/test_build.py
git commit -m "feat: dati per i grafici (andamento del girone, corsa marcatori, media, confronto)"
```

---

### Task 2: logica del calendario per giornate

**Files:**
- Create: `site/js/calendario.js`
- Create: `site/js/tests/calendario.test.js`

**Interfaces:**
- Produces:
  - `giornate(partite) -> number[]`: giornate intere distinte, in ordine crescente;
  - `giornataIniziale(partite) -> number|null`;
  - `partiteGiornata(partite, n) -> partita[]`, ordinate per data (`null` in fondo), ora, id;
  - `senzaGiornata(partite) -> partita[]`;
  - costante `DA_DEFINIRE_G = 'dd'`.

- [ ] **Step 1: test che falliscono** (`site/js/tests/calendario.test.js`)

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { giornate, giornataIniziale, partiteGiornata, senzaGiornata } from '../calendario.js';

const P = (id, giornata, giocata, data = '2026-10-0' + (giornata || 9), ora = '20:00') => ({ id, giornata, giocata, data, ora });

test('giornate distinte e ordinate, senza null', () => {
  assert.deepEqual(giornate([P(1, 2, true), P(2, 1, true), P(3, 2, false), P(4, null, false)]), [1, 2]);
  assert.deepEqual(giornate([]), []);
  assert.deepEqual(giornate(undefined), []);
});

test('giornata iniziale: la prima con partite da giocare', () => {
  assert.equal(giornataIniziale([P(1, 1, true), P(2, 2, true), P(3, 2, false), P(4, 3, false)]), 2);
});

test('giornata iniziale: girone finito -> ultima; mai iniziato -> prima; vuoto -> null', () => {
  assert.equal(giornataIniziale([P(1, 1, true), P(2, 2, true)]), 2);
  assert.equal(giornataIniziale([P(1, 1, false), P(2, 2, false)]), 1);
  assert.equal(giornataIniziale([]), null);
});

test('partite della giornata ordinate per data, ora, id; data mancante in fondo', () => {
  const l = [P(3, 1, false, null, null), P(2, 1, true, '2026-10-02', '21:00'), P(1, 1, true, '2026-10-02', '20:00'), P(9, 2, true)];
  assert.deepEqual(partiteGiornata(l, 1).map(p => p.id), [1, 2, 3]);
  assert.deepEqual(partiteGiornata(l, 5), []);
});

test('partite senza giornata', () => {
  assert.deepEqual(senzaGiornata([P(1, 1, true), P(2, null, false), P(3, undefined, false)]).map(p => p.id), [2, 3]);
});
```

- [ ] **Step 2: eseguire e verificare che fallisca**

Run: `node --test site/js/tests/calendario.test.js`
Expected: FAIL con `Cannot find module '../calendario.js'`.

- [ ] **Step 3: implementazione** (`site/js/calendario.js`)

```js
// Calendario di un girone per giornate (logica pura).
export const DA_DEFINIRE_G = 'dd';
const intera = (g) => Number.isInteger(g);

export const giornate = (partite) => [...new Set((partite || []).map(p => p.giornata).filter(intera))].sort((a, b) => a - b);

// Prima giornata con almeno una partita da giocare; se sono tutte giocate, l'ultima.
export function giornataIniziale(partite) {
  const gg = giornate(partite);
  if (!gg.length) return null;
  return gg.find(g => partite.some(p => p.giornata === g && !p.giocata)) ?? gg[gg.length - 1];
}

const chiave = (p) => `${p.data || '9999-99-99'} ${p.ora || '99:99'}`;
const ordina = (l) => [...l].sort((a, b) => chiave(a).localeCompare(chiave(b)) || a.id - b.id);

export const partiteGiornata = (partite, n) => ordina((partite || []).filter(p => p.giornata === n));
export const senzaGiornata = (partite) => ordina((partite || []).filter(p => !intera(p.giornata)));
```

- [ ] **Step 4: eseguire i test**

Run: `npm test`
Expected: tutti PASS.

- [ ] **Step 5: commit**

```bash
git add site/js/calendario.js site/js/tests/calendario.test.js
git commit -m "feat: logica del calendario per giornate"
```

---

### Task 3: Classifiche a tre schede e scheda Calendario

**Files:**
- Create: `site/js/views/calendario.js`
- Modify: `site/js/views/classifiche.js` (tutto il file)
- Modify: `site/js/views/partite.js` (`render`)
- Modify: `site/css/app.css` (in fondo)

**Interfaces:**
- Consumes: `giornate`, `giornataIniziale`, `partiteGiornata`, `senzaGiornata`, `DA_DEFINIRE_G` (Task 2); `rigaPartita`, `card`, `vuoto` da `views/comuni.js`.
- Produces:
  - rotte `#/classifiche/<slug>`, `#/classifiche/<slug>/calendario[/<n>|/dd]`, `#/classifiche/<slug>/statistiche`;
  - in `views/classifiche.js` la funzione `schedeHTML(slug, scheda)`;
  - `calendarioHTML(g, indice, param) -> string` e `collegaCalendario(root, ctx, slug)` in `views/calendario.js`.
  - In questo task la scheda Statistiche mostra solo un segnaposto: i grafici arrivano in Task 5.

- [ ] **Step 1: scrivere `site/js/views/calendario.js`**

```js
import { esc, formattaDataLunga } from '../util.js';
import { giornate, giornataIniziale, partiteGiornata, senzaGiornata, DA_DEFINIRE_G } from '../calendario.js';
import { rigaPartita, vuoto } from './comuni.js';

// Scheda "Calendario" del girone: una giornata alla volta, frecce e menu a tendina.
export function calendarioHTML(g, indice, param) {
  const gg = giornate(g.partite);
  const extra = senzaGiornata(g.partite);
  const voci = [...gg.map(String), ...(extra.length ? [DA_DEFINIRE_G] : [])];
  if (!voci.length) return vuoto('Calendario non ancora pubblicato.');
  const scelto = voci.includes(String(param)) ? String(param) : String(giornataIniziale(g.partite) ?? voci[0]);
  const i = voci.indexOf(scelto);
  const base = `#/classifiche/${esc(g.slug)}/calendario/`;
  const nome = (v) => (v === DA_DEFINIRE_G ? 'Da definire' : `${v}ª giornata`);
  const partite = scelto === DA_DEFINIRE_G ? extra : partiteGiornata(g.partite, Number(scelto));
  const date = [...new Set(partite.map(p => p.data).filter(Boolean))];
  const sotto = date.length === 1 ? formattaDataLunga(date[0]) : date.length ? `dal ${formattaDataLunga(date[0])} al ${formattaDataLunga(date[date.length - 1])}` : '';
  const freccia = (j, s, et) => (j >= 0 && j < voci.length ? `<a class="freccia" href="${base}${voci[j]}" aria-label="${et}">${s}</a>` : `<span class="freccia off" aria-hidden="true">${s}</span>`);
  return `<div class="giorno cal-giornata">
      ${freccia(i - 1, '‹', 'giornata precedente')}
      <label class="titolo"><span>${esc(nome(scelto))}</span>${sotto ? `<small>${esc(sotto)}</small>` : ''}
        <select aria-label="Scegli la giornata">${voci.map(v => `<option value="${v}" ${v === scelto ? 'selected' : ''}>${esc(nome(v))}</option>`).join('')}</select>
      </label>
      ${freccia(i + 1, '›', 'giornata successiva')}
    </div>
    <section class="card piena">${partite.length ? partite.map(p => rigaPartita(p, indice, { mostraData: true })).join('') : '<p class="muto">Nessuna partita.</p>'}</section>`;
}

export function collegaCalendario(root, ctx, slug) {
  const sel = root.querySelector('.cal-giornata select');
  if (sel) sel.onchange = () => ctx.naviga(`#/classifiche/${slug}/calendario/${sel.value}`);
}
```

- [ ] **Step 2: riscrivere `render` e `dopo` in `site/js/views/classifiche.js`**

Le funzioni `podioHTML` e `classeZona` restano come sono. Il corpo della vecchia `render` dopo il caricamento del girone diventa la funzione `tabellaHTML(g, indice)`.

```js
import { calendarioHTML, collegaCalendario } from './calendario.js';
import { collegaStelle } from './comuni.js';

const SCHEDE = [['classifica', 'Classifica'], ['calendario', 'Calendario'], ['statistiche', 'Statistiche']];
const schedaDa = (p) => (SCHEDE.some(([k]) => k === p) ? p : 'classifica');
export const schedeHTML = (slug, scheda) => `<nav class="tabs" aria-label="Sezioni del girone">${SCHEDE.map(([k, l]) =>
  `<a href="#/classifiche/${esc(slug)}${k === 'classifica' ? '' : `/${k}`}" class="${k === scheda ? 'attivo' : ''}"${k === scheda ? ' aria-current="page"' : ''}>${l}</a>`).join('')}</nav>`;

function tabellaHTML(g, indice) {
  const forma = new Map(g.squadre.map(s => [s.id, s.forma]));
  const righe = g.classifica.totale || [];
  const inizio = inizioGirone(g.partite);
  return `${inizio.iniziato ? '' : `<p class="avviso-inizio">Il campionato inizia ${inizio.data ? esc(formattaDataLunga(inizio.data)) : 'a breve'}: la classifica si aggiorna dopo la prima giornata.</p>`}
    ${podioHTML(indice, righe)}
    ${righe.length ? `<section class="card piena"><div class="scroll-x"><table class="tab">
      <thead><tr><th>#</th><th class="sx">Squadra</th><th>PT</th><th>G</th><th>V</th><th>N</th><th>P</th><th>GF</th><th>GS</th><th>DR</th><th>Forma</th></tr></thead>
      <tbody>${righe.map(r => `<tr class="cliccabile ${èPreferita(r.squadraId) ? 'evid' : ''} ${classeZona(g.zone, r.pos, righe.length)}" data-squadra="${Number(r.squadraId)}"><td>${r.pos}</td><td class="sx nome">${stemmaHTML(squadraDa(indice, r.squadraId), 24)}${esc(r.nome)}</td><td><b>${r.pt}</b></td><td>${r.g}</td><td>${r.v}</td><td>${r.n}</td><td>${r.p}</td><td>${r.gf}</td><td>${r.gs}</td><td>${segnoDR(r.dr)}</td><td>${formaHTML(forma.get(r.squadraId))}</td></tr>`).join('')}</tbody>
    </table></div></section>
    ${g.zone ? '<p class="muto centro">Bordo verde: zona promozione · bordo rosso: zona retrocessione</p>' : ''}` : vuoto('Classifica non disponibile.')}`;
}

// Riempita in Task 5.
async function statisticheHTML() { return vuoto('Statistiche in arrivo.'); }

export async function render({ indice, rotta, carica }) {
  const lista = gironi(indice);
  if (!lista.length) return vuoto('Nessun campionato in corso.');
  const { mostrato: slug, salva } = risolviGirone(indice, rotta.params[0]);
  if (salva) impostaGirone(slug, indice);
  const scheda = schedaDa(rotta.params[1]);
  const g = await carica(`girone/${slug}.json`);
  dati = datiCondivisione('classifica', { nome: g.nome }, indice.sito, location.href, inArchivio());
  const parziali = g.stale && Object.keys(g.stale).length ? ' <span class="badge">dati parziali</span>' : '';
  const titolo = { classifica: 'Classifica', calendario: 'Calendario', statistiche: 'Statistiche' }[scheda];
  const corpo = scheda === 'calendario' ? calendarioHTML(g, indice, rotta.params[2])
    : scheda === 'statistiche' ? await statisticheHTML(g, indice) : tabellaHTML(g, indice);
  return `${heroHTML({ foto: 'campo', classe: 'hero-classifica', contenuto: `
      <div class="contesto-riga">${barraContesto(indice, { mostrato: slug })}</div>
      <div class="hero-titolo"><h1>${titolo}${parziali}</h1>${scheda === 'classifica' ? condividiHTML() : ''}</div><p class="sotto">${esc(g.campionato.nome)} · ${esc(g.nome)} · stagione ${esc(g.stagione)}</p>` })}
    ${schedeHTML(slug, scheda)}
    ${corpo}`;
}

export function dopo(ctx, root) {
  const slug = risolviGirone(ctx.indice, ctx.rotta.params[0]).mostrato;
  const scheda = schedaDa(ctx.rotta.params[1]);
  root.querySelectorAll('tr[data-squadra]').forEach(tr => { tr.onclick = () => ctx.naviga(`#/squadra/${tr.dataset.squadra}`); });
  collegaCondividi(root, dati);
  collegaCalendario(root, ctx, slug);
  collegaStelle(root, async () => { root.innerHTML = await render(ctx); dopo(ctx, root); });
  collegaContesto(root, ctx.indice, { mostrato: slug, onCambio: (s) => ctx.naviga(`#/classifiche/${s}${scheda === 'classifica' ? '' : `/${scheda}`}`) });
}
```

Aggiornare gli import in cima al file con `collegaStelle` (da `./comuni.js`) e `calendarioHTML`, `collegaCalendario` (da `./calendario.js`).

- [ ] **Step 3: link "Calendario completo" in `site/js/views/partite.js`**

Nella `render`, dentro `heroHTML`, subito dopo il selettore del giorno (in tutti e due i rami), aggiungere:

```js
    ${scelto !== TUTTI ? `<a class="link-calendario" href="#/classifiche/${esc(scelto)}/calendario">Calendario completo ›</a>` : ''}
```

Va inserito nella stringa `contenuto` dopo `${giorno ? selettoreGiorno(...) : '<h1>...</h1>'}`.

- [ ] **Step 4: CSS** (in fondo a `site/css/app.css`)

```css
/* Schede-link (pagina del girone) e calendario per giornate */
.tabs a { color: var(--muto); padding: var(--s-2) 0; min-height: 44px; display: inline-flex; align-items: center; white-space: nowrap; border-bottom: 3px solid transparent; margin-bottom: -1px; font-weight: 600; text-decoration: none; }
.tabs a.attivo { color: var(--testo); border-color: var(--accento); }
.cal-giornata { margin: 0 0 var(--s-3); }
.link-calendario { display: inline-flex; align-items: center; min-height: 44px; color: var(--on-hero); font-weight: 600; text-decoration: none; }
```

`.cal-giornata` riusa gli stili di `.giorno`, che è pensato per l'hero. Nello step 6 si controlla a vista che frecce e titolo si leggano anche su sfondo carta, sia in tema chiaro sia in scuro. Se non si leggono, aggiungere `.cal-giornata .titolo, .cal-giornata .freccia { color: var(--testo); }` e `.cal-giornata .freccia { border-color: var(--bordo); }`.

- [ ] **Step 5: test**

Run: `npm test && python3 -m pytest -q`
Expected: tutti PASS.

- [ ] **Step 6: controllo a vista**

Run: `python3 -m scraper.build` (rigenera `site/data` dai dati in `build/raw`), poi:
- `scripts/screenshot.sh /tmp/sl classifiche/serie-a/calendario serie-a scuro`
- `scripts/screenshot.sh /tmp/sl classifiche/super-league/calendario super-league chiaro`

Expected:
- Serie A si apre sulla 5ª giornata, cioè la prima con partite da giocare;
- Super League si apre sulla 1ª;
- le frecce funzionano e la riga RIPOSO non compare.

Se `build` ha modificato `site/data`, ripristinarlo prima del commit con `git checkout site/data site/s site/cal`: i dati li rigenera il workflow.

- [ ] **Step 7: commit**

```bash
git add site/js/views/calendario.js site/js/views/classifiche.js site/js/views/partite.js site/css/app.css
git commit -m "feat: calendario per giornate nella pagina del girone (schede Classifica, Calendario, Statistiche)"
```

---

### Task 4: tasto indietro e cambio girone nella cronologia

**Files:**
- Create: `site/js/indietro.js`
- Create: `site/js/tests/indietro.test.js`
- Modify: `site/js/contesto.js` (in fondo)
- Modify: `site/js/tests/contesto.test.js` (in fondo)
- Modify: `site/js/app.js` (`testata`, `render`, listener)
- Modify: `site/js/views/partite.js` (`dopo`), `site/js/views/partita.js`, `site/js/views/squadra.js`, `site/js/views/giocatore.js` (`render`)
- Modify: `site/css/app.css`

**Interfaces:**
- Produces:
  - `passoDa(stato, ultimo) -> number`;
  - `madre(vista, dati) -> string|null`;
  - `mostraIndietro(vista, passo) -> boolean`;
  - `fotografiaContesto(indice) -> {girone, categoria}`;
  - `ripristinaContesto(f, indice)`;
  - nel `ctx` delle viste: `ctx.madre(dati)` e `ctx.nuovoPasso()`.

- [ ] **Step 1: test che falliscono**

`site/js/tests/indietro.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { passoDa, madre, mostraIndietro } from '../indietro.js';
import { prefissaHash } from '../router.js';

test('passo: prima pagina 0, nuove voci +1, voci già viste tengono il loro', () => {
  assert.equal(passoDa(null, null), 0);
  assert.equal(passoDa(null, 0), 1);
  assert.equal(passoDa({}, 4), 5);
  assert.equal(passoDa({ sl: 2 }, 7), 2);
});

test('pagina madre per ogni dettaglio, con e senza dati', () => {
  assert.equal(madre('partita', { data: '2026-10-13' }), '#/partite/2026-10-13');
  assert.equal(madre('partita', { data: null }), '#/partite');
  assert.equal(madre('squadra', { girone: { slug: 'serie-a' } }), '#/classifiche/serie-a');
  assert.equal(madre('squadra', null), '#/classifiche');
  assert.equal(madre('giocatore', { squadraId: 2480 }), '#/squadra/2480');
  assert.equal(madre('giocatore', {}), '#/giocatori');
  assert.equal(madre('partite', {}), null);
});

test('madre in archivio mantiene il prefisso', () => {
  assert.equal(prefissaHash(madre('squadra', { girone: { slug: 'serie-a' } }), '2025-26'), '#/a/2025-26/classifiche/serie-a');
});

test('tasto visibile nei dettagli sempre, altrove solo se c\'è cronologia', () => {
  assert.equal(mostraIndietro('partita', 0), true);
  assert.equal(mostraIndietro('partite', 0), false);
  assert.equal(mostraIndietro('partite', 3), true);
  assert.equal(mostraIndietro('intro', 3), false);
});
```

In fondo a `site/js/tests/contesto.test.js` (aggiungere `fotografiaContesto, ripristinaContesto, impostaCategoria, leggiCategoria` agli import):

```js
test('fotografia e ripristino del contesto', () => {
  _reset();
  impostaGirone('serie-b', indice);
  const a = fotografiaContesto(indice);
  impostaCategoria('c5');
  const b = fotografiaContesto(indice);
  assert.deepEqual(a, { girone: 'serie-b', categoria: 'c8' });
  assert.deepEqual(b, { girone: TUTTI, categoria: 'c5' });
  ripristinaContesto(a, indice);
  assert.equal(leggiGirone(indice), 'serie-b');
  ripristinaContesto(b, indice);
  assert.equal(leggiGirone(indice), TUTTI);
  assert.equal(leggiCategoria(indice), 'c5');
  ripristinaContesto(null, indice);
  assert.equal(leggiCategoria(indice), 'c5');
});
```

- [ ] **Step 2: eseguire e verificare che fallisca**

Run: `npm test`
Expected: FAIL (`Cannot find module '../indietro.js'` e `fotografiaContesto` non esportata).

- [ ] **Step 3: scrivere `site/js/indietro.js`**

```js
// Tasto indietro: numero di passo in history.state e pagina "madre" per chi arriva da un link esterno.
const DETTAGLI = ['partita', 'squadra', 'giocatore'];

// Voce già vista: il suo passo. Voce nuova: uno in più dell'ultima mostrata (0 se è la prima della sessione).
export function passoDa(stato, ultimo) {
  if (stato && Number.isInteger(stato.sl)) return stato.sl;
  return Number.isInteger(ultimo) ? ultimo + 1 : 0;
}

export function madre(vista, dati) {
  const d = dati || {};
  if (vista === 'partita') return d.data ? `#/partite/${d.data}` : '#/partite';
  if (vista === 'squadra') return d.girone && d.girone.slug ? `#/classifiche/${encodeURIComponent(d.girone.slug)}` : '#/classifiche';
  if (vista === 'giocatore') return d.squadraId != null ? `#/squadra/${Number(d.squadraId)}` : '#/giocatori';
  return null;
}

export const mostraIndietro = (vista, passo) => vista !== 'intro' && (DETTAGLI.includes(vista) || passo > 0);
```

- [ ] **Step 4: aggiungere in fondo a `site/js/contesto.js`**

```js
// Contesto in vigore (girone + categoria), salvato in ogni voce della cronologia per il tasto indietro.
export const fotografiaContesto = (indice) => ({ girone: leggiGirone(indice), categoria: leggiCategoria(indice) });
export function ripristinaContesto(f, indice) {
  if (!f || typeof f.girone !== 'string') return;
  if (f.girone !== TUTTI) impostaGirone(f.girone, indice);
  else impostaCategoria(typeof f.categoria === 'string' ? f.categoria : TUTTI);
}
```

- [ ] **Step 5: test**

Run: `npm test`
Expected: tutti PASS.

- [ ] **Step 6: collegare tutto in `site/js/app.js`**

Import:

```js
import { passoDa, madre, mostraIndietro } from './indietro.js';
import { introDaMostrare, azzeraSceltaArchivio, fotografiaContesto, ripristinaContesto } from './contesto.js';
```

Stato del modulo, vicino a `let renderId = 0;`:

```js
let ultimoPasso = null;
let datiMadre = null;
let ultimoHash = null;
```

`testata(idx, ed)` riceve un terzo parametro `conIndietro` e, quando è vero, mette il pulsante prima del marchio:

```js
function testata(idx, ed, conIndietro = false) {
  // ...righe esistenti invariate...
  return `<header class="testa${conIndietro ? ' con-indietro' : ''}">
    ${conIndietro ? `<button class="btn-indietro" data-indietro aria-label="Indietro">${icona('M15 18l-6-6 6-6')}</button>` : ''}
    <a href="${prefissaHash('#/partite', ed)}" class="marchio">...invariato...</a>
    ...resto invariato...`;
}
```

In `render()`, subito dopo `impostaArchivio(ed); if (ed !== ultimaEdizione) {...}`, aggiungere:

```js
  const stato = history.state && typeof history.state === 'object' ? history.state : {};
  const passo = passoDa(stato, ultimoPasso);
  ultimoPasso = passo;
  ultimoHash = location.hash;
  datiMadre = null;
  if (stato.contesto) ripristinaContesto(stato.contesto, idxPerContesto());
```

`idxPerContesto` non esiste. Il ripristino va fatto dopo il caricamento dell'indice d'archivio, quindi spostare l'ultima riga subito prima di `const base = baseEdizione(ed);` e scriverla così:

```js
  if (stato.contesto) ripristinaContesto(stato.contesto, idx);
```

Aggiungere al `ctx`:

```js
    madre: (d) => { datiMadre = d; },
    nuovoPasso: () => { history.pushState(null, '', location.hash); render(); },
```

Nella costruzione di `app.innerHTML` per le viste normali, usare `${testata(idx, ed, mostraIndietro(rotta.vista, passo))}`.

Dopo `if (vista.dopo) vista.dopo(ctx, main);`, nel ramo di successo, salvare passo e contesto nella voce corrente:

```js
    history.replaceState({ ...stato, sl: passo, contesto: fotografiaContesto(idx) }, '');
```

Anche nel ramo `catch` va salvato almeno `{ ...stato, sl: passo }`, altrimenti la voce resta senza passo.

Subito dopo aver scritto `app.innerHTML` (prima di `const main = ...`), collegare il pulsante:

```js
  const btnIndietro = app.querySelector('[data-indietro]');
  if (btnIndietro) btnIndietro.onclick = () => {
    if (passo > 0) { history.back(); return; }
    const m = madre(rotta.vista, datiMadre) || '#/partite';
    location.replace(prefissaHash(m, ed));
  };
```

Listener: tornare indietro tra voci con lo stesso hash (cambio di girone in Partite) fa scattare solo `popstate`, non `hashchange`:

```js
window.addEventListener('popstate', () => { if (indice && location.hash === ultimoHash) render(); });
```

- [ ] **Step 7: le viste di dettaglio comunicano la pagina madre**

- `site/js/views/partita.js`, in `render(ctx)`: la firma diventa `render({ indice, indiceCorrente, rotta, carica, madre })`; dopo `const p = await carica(...)` aggiungere `madre?.({ data: p.data });`.
- `site/js/views/squadra.js`: la firma diventa `render({ indice, rotta, carica, madre })`; dopo il caricamento aggiungere `madre?.({ girone: s.girone });`.
- `site/js/views/giocatore.js`: la firma diventa `render({ indice, rotta, carica, madre })`; dopo il caricamento aggiungere `madre?.({ squadraId: g.squadraId });`.

Le tre viste si ridisegnano da sole anche con `render(ctx)` (schede, stelline). `ctx` ha sempre `madre`, quindi la chiamata in più è innocua.

- [ ] **Step 8: il cambio di girone e di categoria in Partite diventa un passo della cronologia**

In `site/js/views/partite.js`, dentro `dopo`, sostituire:

```js
  const cambio = () => { if (ctx.rotta.params.length) ctx.naviga('#/partite'); else ridisegna(); };
```

con:

```js
  const cambio = () => { if (ctx.rotta.params.length) ctx.naviga('#/partite'); else ctx.nuovoPasso(); };
```

Classifiche e Giocatori cambiano già l'hash quando si sceglie un girone, quindi non serve altro.

- [ ] **Step 9: CSS**

```css
/* Tasto indietro nella testata */
.btn-indietro { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; margin-left: calc(-1 * var(--s-2)); border: 0; background: none; color: var(--testo); border-radius: 50%; flex: none; }
.btn-indietro svg { width: 24px; height: 24px; }
.testa.con-indietro .marchio { margin-right: auto; }
@media (max-width: 380px) { .testa.con-indietro .agg { display: none; } }
```

- [ ] **Step 10: test e prova a mano**

Run: `npm test`
Expected: tutti PASS.

Prova con puppeteer, script nello scratchpad, su `python3 -m http.server 8089 -d site`:
1. apre `#/partite`, sceglie la Serie A dal foglio, controlla che il chip mostri "Serie A", poi `history.back()` e controlla che il chip torni a "Tutti i gironi";
2. apre direttamente `#/squadra/2530` in una scheda nuova, clicca `[data-indietro]` e controlla che l'hash sia `#/classifiche/serie-a`;
3. da `#/classifiche/serie-a` clicca una squadra, poi `[data-indietro]`, e controlla che si torni a `#/classifiche/serie-a`.

- [ ] **Step 11: commit**

```bash
git add site/js/indietro.js site/js/tests/indietro.test.js site/js/contesto.js site/js/tests/contesto.test.js site/js/app.js site/js/views/partite.js site/js/views/partita.js site/js/views/squadra.js site/js/views/giocatore.js site/css/app.css
git commit -m "feat: tasto indietro nelle pagine di dettaglio e cambio girone nella cronologia"
```

---

### Task 5: corsa al titolo e corsa marcatori (scheda Statistiche)

**Files:**
- Create: `site/js/grafici/base.js`
- Create: `site/js/grafici/corsa.js`
- Create: `site/js/tests/grafici-corsa.test.js`
- Modify: `site/js/views/classifiche.js` (`statisticheHTML`, `dopo`)
- Modify: `site/css/app.css`

**Interfaces:**
- Consumes: `girone.andamento`, `girone.corsaMarcatori`, `girone.classifica.totale` (Task 1); `leggiPreferiti()` da `site/js/preferiti.js`, che restituisce un array di id numerici.
- Produces:
  - `num`, `f1`, `scala`, `tacche` in `grafici/base.js`;
  - `graficoCorsaSVG(xs, serie, {gradini, titolo}) -> string`;
  - `legendaHTML(serie) -> string`;
  - `collegaLegenda(root)`;
  - `serieTitolo(g, preferiti) -> {xs, serie}`;
  - `serieMarcatori(g) -> {xs, serie}`.

- [ ] **Step 1: test che falliscono** (`site/js/tests/grafici-corsa.test.js`)

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tacche, scala, num } from '../grafici/base.js';
import { graficoCorsaSVG, legendaHTML, serieTitolo, serieMarcatori } from '../grafici/corsa.js';

const g = {
  classifica: { totale: [
    { squadraId: 1, nome: 'ALFA', pos: 1 }, { squadraId: 2, nome: 'EASY M&M', pos: 2 },
    { squadraId: 3, nome: 'GAMMA', pos: 3 }, { squadraId: 4, nome: 'DELTA', pos: 4 }, { squadraId: 5, nome: 'EPS', pos: 5 }] },
  andamento: {
    1: [{ giornata: 1, pt: 3 }, { giornata: 2, pt: 6 }], 2: [{ giornata: 1, pt: 1 }, { giornata: 2, pt: 4 }],
    3: [{ giornata: 1, pt: 1 }, { giornata: 2, pt: 2 }], 4: [{ giornata: 1, pt: 0 }, { giornata: 2, pt: 1 }],
    5: [{ giornata: 1, pt: 0 }, { giornata: 2, pt: 0 }] },
  corsaMarcatori: { giornate: [1, 2], marcatori: [{ slug: '1-rossi', nome: 'ROSSI', squadraId: 1, gol: [2, 3] }, { slug: '2-verdi', nome: 'VERDI', squadraId: 2, gol: [0, 2] }] },
};

test('base: numeri, scala, tacche', () => {
  assert.equal(num('3'), 3); assert.equal(num(null), null); assert.equal(num('x'), null);
  assert.equal(scala(0, 10, 0, 100)(5), 50);
  assert.equal(scala(2, 2, 0, 100)(2), 0);
  assert.deepEqual(tacche(0), [0]);
  assert.deepEqual(tacche(6), [0, 2, 4, 6]);
  assert.deepEqual(tacche(7), [0, 2, 4, 6, 8]);
});

test('serie titolo: classi, ordine di disegno (podio sopra), preferite', () => {
  const { xs, serie } = serieTitolo(g, [4]);
  assert.deepEqual(xs, [1, 2]);
  assert.deepEqual(serie.map(s => [s.id, s.classe]), [[5, 'c-altro'], [4, 'c-pref'], [3, 'c-p3'], [2, 'c-p2'], [1, 'c-p1']]);
  assert.deepEqual(serie.find(s => s.id === 1).valori, [3, 6]);
});

test('svg corsa: una linea per serie, accessibile, nomi con escape, niente NaN', () => {
  const { xs, serie } = serieTitolo(g, []);
  const svg = graficoCorsaSVG(xs, serie, { titolo: 'Corsa al titolo' });
  assert.equal((svg.match(/class="gr-linea"/g) || []).length, 5);
  assert.match(svg, /role="img"/);
  assert.match(svg, /aria-label="Corsa al titolo"/);
  assert.match(svg, /EASY M&amp;M/);
  assert.ok(!/NaN/.test(svg));
  assert.match(legendaHTML(serie), /data-serie="1"/);
});

test('svg corsa: vuoto con meno di 2 giornate o senza dati', () => {
  assert.equal(graficoCorsaSVG([1], [{ id: 1, nome: 'A', valori: [3] }]), '');
  assert.equal(graficoCorsaSVG([1, 2], []), '');
  assert.equal(graficoCorsaSVG(serieTitolo({ classifica: { totale: [] }, andamento: {} }, []).xs, []), '');
  assert.deepEqual(serieTitolo({ classifica: { totale: [] } }, []).xs, []);
});

test('marcatori: gradini e classi c-m1..', () => {
  const { xs, serie } = serieMarcatori(g);
  assert.deepEqual(xs, [1, 2]);
  assert.deepEqual(serie.map(s => s.classe), ['c-m2', 'c-m1']);
  const svg = graficoCorsaSVG(xs, serie, { gradini: true, titolo: 'Marcatori' });
  assert.match(svg, /H[\d.]+V[\d.]+/);
  assert.deepEqual(serieMarcatori({}).serie, []);
});
```

- [ ] **Step 2: eseguire e verificare che fallisca**

Run: `node --test site/js/tests/grafici-corsa.test.js`
Expected: FAIL con `Cannot find module '../grafici/base.js'`.

- [ ] **Step 3: `site/js/grafici/base.js`**

```js
// Utilità comuni ai grafici SVG.
export const num = (v) => { if (v === null || v === undefined || v === '') return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
export const f1 = (n) => String(Math.round(n * 10) / 10);
export function scala(d0, d1, r0, r1) {
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return (v) => r0 + (v - d0) * k;
}
// Tacche intere da 0 ad almeno max, con circa n intervalli.
export function tacche(max, n = 4) {
  if (!(max > 0)) return [0];
  const passo = Math.max(1, Math.ceil(max / n));
  const out = [];
  for (let v = 0; v < max + passo; v += passo) { out.push(v); if (v >= max) break; }
  return out;
}
```

Verifica di `tacche(7)`: passo = ceil(7/4) = 2, quindi 0, 2, 4, 6, 8 (8 ≥ 7, stop). `tacche(6)`: passo 2, quindi 0, 2, 4, 6 (6 ≥ 6, stop). Corretto.

- [ ] **Step 4: `site/js/grafici/corsa.js`**

```js
// Grafico a più linee: corsa al titolo (punti) e corsa marcatori (gol cumulati, a gradini).
import { esc } from '../util.js';
import { num, f1, scala, tacche } from './base.js';

const W = 340, H = 210, SX = 28, DX = 10, SU = 10, GIU = 24;

export function graficoCorsaSVG(xs, serie, { gradini = false, titolo = '' } = {}) {
  const X = (xs || []).map(num);
  const S = (serie || []).filter(s => s && Array.isArray(s.valori) && s.valori.some(v => num(v) !== null));
  if (X.length < 2 || X.some(v => v === null) || !S.length) return '';
  const max = Math.max(1, ...S.flatMap(s => s.valori.map(num).filter(v => v !== null)));
  const tk = tacche(max);
  const x = scala(0, X.length - 1, SX, W - DX), y = scala(0, tk[tk.length - 1], H - GIU, SU);
  const griglia = tk.map(v => `<line class="gr-griglia" x1="${SX}" x2="${W - DX}" y1="${f1(y(v))}" y2="${f1(y(v))}"/><text class="gr-et" x="${SX - 6}" y="${f1(y(v) + 4)}" text-anchor="end">${v}</text>`).join('');
  const passoX = Math.max(1, Math.ceil(X.length / 8));
  const asse = X.map((gg, i) => (i % passoX === 0 || i === X.length - 1 ? `<text class="gr-et" x="${f1(x(i))}" y="${H - 6}" text-anchor="middle">${gg}</text>` : '')).join('');
  const linee = S.map(s => {
    const pti = s.valori.map((v, i) => [i, num(v)]).filter(([, v]) => v !== null);
    const d = pti.map(([i, v], k) => (k === 0 ? `M${f1(x(i))} ${f1(y(v))}` : gradini ? `H${f1(x(i))}V${f1(y(v))}` : `L${f1(x(i))} ${f1(y(v))}`)).join('');
    const [ui, uv] = pti[pti.length - 1];
    return `<g class="gr-serie ${esc(s.classe || '')}" data-serie="${esc(String(s.id))}"><title>${esc(s.nome)}: ${uv}</title><path class="gr-linea" d="${d}" pathLength="1" fill="none"/><circle class="gr-punto" cx="${f1(x(ui))}" cy="${f1(y(uv))}" r="3.5"/></g>`;
  }).join('');
  return `<svg class="grafico grafico-corsa anima" viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(titolo)}"><title>${esc(titolo)}</title>${griglia}${asse}${linee}</svg>`;
}

// Legenda nell'ordine della classifica (al contrario dell'ordine di disegno).
export const legendaHTML = (serie) => `<div class="legenda">${[...(serie || [])].reverse().map(s =>
  `<button type="button" class="leg ${esc(s.classe || '')}" data-serie="${esc(String(s.id))}" aria-pressed="false"><i aria-hidden="true"></i>${esc(s.nome)}</button>`).join('')}</div>`;

// Toccando un nome la sua linea si accende e le altre si spengono; un secondo tocco torna normale.
export function collegaLegenda(root) {
  root.querySelectorAll('.corsa').forEach(box => {
    const svg = box.querySelector('svg');
    if (!svg) return;
    box.querySelectorAll('.legenda button[data-serie]').forEach(b => {
      b.onclick = () => {
        const on = b.getAttribute('aria-pressed') !== 'true';
        box.querySelectorAll('.legenda button').forEach(x => x.setAttribute('aria-pressed', 'false'));
        svg.querySelectorAll('.gr-serie.acceso').forEach(gg => gg.classList.remove('acceso'));
        svg.classList.toggle('con-focus', on);
        if (!on) return;
        b.setAttribute('aria-pressed', 'true');
        const gg = [...svg.querySelectorAll('.gr-serie')].find(e => e.dataset.serie === b.dataset.serie);
        if (gg) { gg.classList.add('acceso'); gg.parentNode.appendChild(gg); }
      };
    });
  });
}

// Punti per giornata di ogni squadra. Classi: c-p1..c-p3 (podio attuale), c-pref (preferite), c-altro.
// Ordine di disegno: prima le grigie, poi le preferite, poi il podio (1º per ultimo, quindi sopra).
export function serieTitolo(g, preferiti = []) {
  const and = (g && g.andamento) || {};
  const righe = ((g && g.classifica && g.classifica.totale) || []).filter(r => Array.isArray(and[r.squadraId]) && and[r.squadraId].length);
  const xs = [...new Set(righe.flatMap(r => and[r.squadraId].map(e => e.giornata)))].sort((a, b) => a - b);
  const pref = new Set((preferiti || []).map(Number));
  const serie = righe.map(r => {
    const per = new Map(and[r.squadraId].map(e => [e.giornata, e.pt]));
    const classe = r.pos <= 3 ? `c-p${r.pos}` : pref.has(Number(r.squadraId)) ? 'c-pref' : 'c-altro';
    return { id: r.squadraId, nome: r.nome, classe, pos: r.pos, valori: xs.map(x => (per.has(x) ? per.get(x) : null)) };
  });
  const peso = (s) => (s.classe === 'c-altro' ? 0 : s.classe === 'c-pref' ? 1 : 2);
  serie.sort((a, b) => peso(a) - peso(b) || b.pos - a.pos);
  return { xs, serie: serie.map(({ pos, ...s }) => s) };
}

export function serieMarcatori(g) {
  const c = g && g.corsaMarcatori;
  if (!c || !Array.isArray(c.marcatori)) return { xs: [], serie: [] };
  const serie = c.marcatori.map((m, i) => ({ id: m.slug, nome: m.nome, classe: `c-m${i + 1}`, valori: m.gol }));
  return { xs: c.giornate || [], serie: serie.reverse() };
}
```

- [ ] **Step 5: test**

Run: `npm test`
Expected: tutti PASS.

- [ ] **Step 6: scheda Statistiche in `site/js/views/classifiche.js`**

Import:

```js
import { graficoCorsaSVG, legendaHTML, collegaLegenda, serieTitolo, serieMarcatori } from '../grafici/corsa.js';
import { leggiPreferiti } from '../preferiti.js';
import { card } from './comuni.js';
```

Sostituire il segnaposto `statisticheHTML`:

```js
async function statisticheHTML(g) {
  const t = serieTitolo(g, inArchivio() ? [] : leggiPreferiti());
  const svgT = graficoCorsaSVG(t.xs, t.serie, { titolo: 'Corsa al titolo: punti giornata per giornata' });
  const m = serieMarcatori(g);
  const svgM = graficoCorsaSVG(m.xs, m.serie, { gradini: true, titolo: 'Corsa marcatori: gol giornata per giornata' });
  if (!svgT && !svgM) return vuoto('I grafici compaiono dopo la seconda giornata giocata.');
  return `${svgT ? card('Corsa al titolo', `<div class="corsa">${svgT}${legendaHTML(t.serie)}</div><p class="muto grafico-nota">Punti dopo ogni giornata · tocca un nome per evidenziarlo</p>`) : ''}
    ${svgM ? card('Corsa marcatori', `<div class="corsa">${svgM}${legendaHTML(m.serie)}</div><p class="muto grafico-nota">Gol segnati, giornata per giornata</p>`) : ''}`;
}
```

In `dopo`, aggiungere `collegaLegenda(root);`.

- [ ] **Step 7: CSS dei grafici e delle animazioni**

```css
/* Grafici: corsa, legenda, animazioni */
.grafico-corsa { height: auto; aspect-ratio: 340 / 210; }
.grafico .gr-et { font-size: 11px; }
.gr-serie .gr-linea { stroke-width: 2.5; stroke-linejoin: round; stroke-linecap: round; transition: opacity .2s; }
.gr-serie .gr-punto { stroke: var(--carta); stroke-width: 1.5; }
.gr-serie.c-altro .gr-linea { stroke: var(--neutro); stroke-width: 1.2; opacity: .45; } .gr-serie.c-altro .gr-punto { fill: var(--neutro); opacity: .45; }
.gr-serie.c-p1 .gr-linea { stroke: var(--oro); } .gr-serie.c-p1 .gr-punto { fill: var(--oro); }
.gr-serie.c-p2 .gr-linea { stroke: var(--argento); } .gr-serie.c-p2 .gr-punto { fill: var(--argento); }
.gr-serie.c-p3 .gr-linea { stroke: var(--bronzo); } .gr-serie.c-p3 .gr-punto { fill: var(--bronzo); }
.gr-serie.c-pref .gr-linea { stroke: var(--accento); } .gr-serie.c-pref .gr-punto { fill: var(--accento); }
.gr-serie.c-m1 .gr-linea { stroke: var(--accento); } .gr-serie.c-m1 .gr-punto { fill: var(--accento); }
.gr-serie.c-m2 .gr-linea { stroke: var(--link); } .gr-serie.c-m2 .gr-punto { fill: var(--link); }
.gr-serie.c-m3 .gr-linea { stroke: var(--ok); } .gr-serie.c-m3 .gr-punto { fill: var(--ok); }
.gr-serie.c-m4 .gr-linea { stroke: var(--giallo-c); } .gr-serie.c-m4 .gr-punto { fill: var(--giallo-c); }
.gr-serie.c-m5 .gr-linea { stroke: var(--ko); } .gr-serie.c-m5 .gr-punto { fill: var(--ko); }
.con-focus .gr-serie { opacity: .15; } .con-focus .gr-serie.acceso { opacity: 1; } .con-focus .gr-serie.acceso .gr-linea { stroke-width: 3.5; opacity: 1; }
.legenda { display: flex; flex-wrap: wrap; gap: var(--s-1) var(--s-2); margin-top: var(--s-2); }
.legenda .leg { display: inline-flex; align-items: center; gap: 6px; min-height: 32px; padding: 0 10px; border: 1px solid var(--bordo); border-radius: var(--r-full); background: none; color: var(--testo); font-size: .78rem; }
.legenda .leg i { width: 10px; height: 10px; border-radius: 50%; background: var(--neutro); }
.legenda .leg.c-p1 i { background: var(--oro); } .legenda .leg.c-p2 i { background: var(--argento); } .legenda .leg.c-p3 i { background: var(--bronzo); } .legenda .leg.c-pref i { background: var(--accento); }
.legenda .leg.c-m1 i { background: var(--accento); } .legenda .leg.c-m2 i { background: var(--link); } .legenda .leg.c-m3 i { background: var(--ok); } .legenda .leg.c-m4 i { background: var(--giallo-c); } .legenda .leg.c-m5 i { background: var(--ko); }
.legenda .leg[aria-pressed="true"] { border-color: var(--accento); background: var(--accento-tint); }
@keyframes gr-disegna { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
@keyframes gr-appare { from { opacity: 0; } }
.anima .gr-linea { stroke-dasharray: 1; animation: gr-disegna .8s ease-out both; }
.anima .gr-punto { animation: gr-appare .3s .7s both; }
@media (prefers-reduced-motion: reduce) { .anima .gr-linea, .anima .gr-punto, .anima .gr-barra, .anima .gr-fetta, .cf-barre i { animation: none !important; } }
```

Le serie grigie della corsa non hanno legenda colorata: va bene, il pallino resta grigio (`--neutro`).

- [ ] **Step 8: controllo a vista**

Run: `python3 -m scraper.build`, poi `scripts/screenshot.sh /tmp/sl classifiche/serie-a/statistiche serie-a scuro` e lo stesso con `chiaro`.
Expected: 14 linee, di cui 3 colorate (oro, argento, bronzo); marcatori a gradini; etichette leggibili; niente sbordature.

Poi `git checkout site/data site/s site/cal`.

- [ ] **Step 9: commit**

```bash
git add site/js/grafici/base.js site/js/grafici/corsa.js site/js/tests/grafici-corsa.test.js site/js/views/classifiche.js site/css/app.css
git commit -m "feat: corsa al titolo e corsa marcatori nella scheda Statistiche"
```

---

### Task 6: grafici di squadra, giocatore e partita

**Files:**
- Create: `site/js/grafici/barre.js`
- Create: `site/js/grafici/ciambella.js`
- Create: `site/js/grafici/confronto.js`
- Create: `site/js/tests/grafici-altri.test.js`
- Modify: `site/js/views/squadra.js` (`statistiche`)
- Modify: `site/js/views/giocatore.js` (`render`)
- Modify: `site/js/views/partita.js` (`riepilogo`)
- Modify: `site/css/app.css`

**Interfaces:**
- Consumes: `num`, `f1`, `scala`, `tacche` (Task 5); `squadra.partite`, `squadra.stat`, `squadra.riga`, `squadra.mediaGirone`, `giocatore.perPartita`, `partita.confronto`, `partita.precedenti` (Task 1).
- Produces:
  - `graficoGolSVG(partite) -> string`;
  - `graficoGiocatoreSVG(perPartita) -> string`;
  - `ciambellaHTML({v, n, p}) -> string`;
  - `barreConfrontoHTML(righe, {nomeA, nomeB}) -> string`, con `righe` di tipo `[{etichetta, a, b, meglio: 'alto'|'basso', decimali?}]`;
  - `righeConfrontoPartita(p) -> righe[]`.

- [ ] **Step 1: test che falliscono** (`site/js/tests/grafici-altri.test.js`)

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { graficoGolSVG, graficoGiocatoreSVG } from '../grafici/barre.js';
import { ciambellaHTML } from '../grafici/ciambella.js';
import { barreConfrontoHTML, righeConfrontoPartita } from '../grafici/confronto.js';

const P = (giornata, gf, gs, esito) => ({ giornata, gf, gs, esito });

test('gol per giornata: due barre per partita giocata, niente NaN', () => {
  const svg = graficoGolSVG([P(1, 3, 1, 'V'), P(2, 0, 0, 'N'), P(3, 1, 4, 'P'), { giornata: 4, gf: null, gs: null, esito: null }]);
  assert.equal((svg.match(/class="gr-barra su/g) || []).length, 3);
  assert.equal((svg.match(/class="gr-barra giu/g) || []).length, 3);
  assert.match(svg, /gr-v/); assert.match(svg, /gr-p/);
  assert.match(svg, /aria-label="Gol per giornata: 4 fatti e 5 subiti in 3 partite"/);
  assert.ok(!/NaN/.test(svg));
  assert.equal(graficoGolSVG([P(1, 1, 0, 'V')]), '');
  assert.equal(graficoGolSVG(undefined), '');
});

test('giocatore: barre dei gol e linea voti solo con almeno 2 voti', () => {
  const pp = [{ giornata: 1, gol: 2, voto: 7.5 }, { giornata: 2, gol: 0, voto: null }, { giornata: 3, gol: 1, voto: 6 }];
  const svg = graficoGiocatoreSVG(pp);
  assert.equal((svg.match(/class="gr-barra su/g) || []).length, 3);
  assert.match(svg, /class="gr-voti"/);
  assert.ok(!/NaN/.test(svg));
  assert.ok(!/gr-voti/.test(graficoGiocatoreSVG([{ giornata: 1, gol: 1, voto: 7 }, { giornata: 2, gol: 0, voto: null }])));
  assert.equal(graficoGiocatoreSVG([{ giornata: 1, gol: 1 }]), '');
});

test('ciambella: tre fette, totale al centro, vuota senza partite', () => {
  const h = ciambellaHTML({ v: 3, n: 1, p: 0 });
  assert.equal((h.match(/class="gr-fetta/g) || []).length, 2);
  assert.match(h, />4</);
  assert.match(h, /3 vinte/);
  assert.equal(ciambellaHTML({ v: 0, n: 0, p: 0 }), '');
  assert.equal(ciambellaHTML(null), '');
});

test('barre di confronto: meglio alto/basso, decimali con virgola, escape', () => {
  const h = barreConfrontoHTML([
    { etichetta: 'Punti', a: 9, b: 3, meglio: 'alto' },
    { etichetta: 'Posizione', a: 1, b: 7, meglio: 'basso' },
    { etichetta: 'Media', a: 1.5, b: 1.25, meglio: 'alto', decimali: 1 },
    { etichetta: 'Saltata', a: null, b: 2, meglio: 'alto' }], { nomeA: 'EASY M&M', nomeB: 'B' });
  assert.equal((h.match(/class="cf-riga"/g) || []).length, 3);
  assert.equal((h.match(/cf-val a meglio/g) || []).length, 3);
  assert.match(h, /1,5/);
  assert.match(h, /EASY M&amp;M/);
  assert.equal(barreConfrontoHTML([], { nomeA: 'A', nomeB: 'B' }), '');
});

test('righe confronto partita: punti ultime 5 dalla forma, precedenti se ci sono', () => {
  const p = { confronto: { casa: { pos: 2, pt: 10, g: 4, gf: 9, gs: 3, forma: ['V', 'V', 'N', 'P'] }, ospite: { pos: 5, pt: 4, g: 4, gf: 5, gs: 8, forma: ['P', 'N', 'V', 'P'] } },
    precedenti: { bilancio: { casa: 2, pari: 1, ospite: 0 } } };
  const r = righeConfrontoPartita(p);
  assert.deepEqual(r.map(x => x.etichetta), ['Posizione', 'Punti', 'Gol fatti', 'Gol subiti', 'Punti nelle ultime 5', 'Vittorie nei precedenti']);
  assert.deepEqual(r.find(x => x.etichetta === 'Punti nelle ultime 5'), { etichetta: 'Punti nelle ultime 5', a: 7, b: 4, meglio: 'alto' });
  assert.deepEqual(righeConfrontoPartita({ confronto: null }), []);
});
```

- [ ] **Step 2: eseguire e verificare che fallisca**

Run: `node --test site/js/tests/grafici-altri.test.js`
Expected: FAIL con `Cannot find module '../grafici/barre.js'`.

- [ ] **Step 3: `site/js/grafici/barre.js`**

```js
// Barre per giornata: gol fatti/subiti della squadra; gol (e voti) del giocatore.
import { esc } from '../util.js';
import { num, f1, scala, tacche } from './base.js';

const W = 340;

export function graficoGolSVG(partite) {
  const P = (partite || []).filter(p => p && p.esito && num(p.gf) !== null && num(p.gs) !== null);
  if (P.length < 2) return '';
  const H = 190, SX = 10, DX = 10, SU = 16, GIU = 34;
  const max = Math.max(1, ...P.flatMap(p => [num(p.gf), num(p.gs)]));
  const mezzo = SU + (H - SU - GIU) / 2, alt = (H - SU - GIU) / 2;
  const slot = (W - SX - DX) / P.length, lb = Math.min(22, slot * 0.6);
  const h = (v) => (v / max) * alt;
  const barre = P.map((p, i) => {
    const cx = SX + slot * (i + 0.5), x0 = f1(cx - lb / 2), gf = num(p.gf), gs = num(p.gs);
    return `<g><title>Giornata ${esc(String(p.giornata))}: ${gf}-${gs}</title>
      <rect class="gr-barra su gr-${esc(String(p.esito).toLowerCase())}" x="${x0}" y="${f1(mezzo - h(gf))}" width="${f1(lb)}" height="${f1(h(gf))}" rx="2"/>
      <rect class="gr-barra giu" x="${x0}" y="${f1(mezzo)}" width="${f1(lb)}" height="${f1(h(gs))}" rx="2"/>
      ${gf ? `<text class="gr-et" x="${f1(cx)}" y="${f1(mezzo - h(gf) - 4)}" text-anchor="middle">${gf}</text>` : ''}
      ${gs ? `<text class="gr-et" x="${f1(cx)}" y="${f1(mezzo + h(gs) + 12)}" text-anchor="middle">${gs}</text>` : ''}
      <text class="gr-et" x="${f1(cx)}" y="${H - 6}" text-anchor="middle">${esc(String(p.giornata))}ª</text></g>`;
  }).join('');
  const tf = P.reduce((s, p) => s + num(p.gf), 0), ts = P.reduce((s, p) => s + num(p.gs), 0);
  const titolo = `Gol per giornata: ${tf} fatti e ${ts} subiti in ${P.length} partite`;
  return `<svg class="grafico grafico-barre anima" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${titolo}"><title>${titolo}</title><line class="gr-griglia" x1="${SX}" x2="${W - DX}" y1="${f1(mezzo)}" y2="${f1(mezzo)}"/>${barre}</svg>`;
}

export function graficoGiocatoreSVG(perPartita) {
  const P = (perPartita || []).filter(p => p && num(p.giornata) !== null);
  if (P.length < 2) return '';
  const H = 170, SX = 24, DX = 28, SU = 14, GIU = 24;
  const tk = tacche(Math.max(2, ...P.map(p => num(p.gol) || 0)), 2);
  const yG = scala(0, tk[tk.length - 1], H - GIU, SU), yV = scala(4, 10, H - GIU, SU);
  const slot = (W - SX - DX) / P.length, lb = Math.min(20, slot * 0.55);
  const cx = (i) => SX + slot * (i + 0.5);
  const griglia = tk.map(v => `<line class="gr-griglia" x1="${SX}" x2="${W - DX}" y1="${f1(yG(v))}" y2="${f1(yG(v))}"/><text class="gr-et" x="${SX - 6}" y="${f1(yG(v) + 4)}" text-anchor="end">${v}</text>`).join('');
  const barre = P.map((p, i) => {
    const g = num(p.gol) || 0;
    return `<rect class="gr-barra su gr-gol" x="${f1(cx(i) - lb / 2)}" y="${f1(yG(g))}" width="${f1(lb)}" height="${f1(yG(0) - yG(g))}" rx="2"><title>Giornata ${esc(String(p.giornata))}: ${g} gol</title></rect>
      <text class="gr-et" x="${f1(cx(i))}" y="${H - 6}" text-anchor="middle">${esc(String(p.giornata))}ª</text>`;
  }).join('');
  const voti = P.map((p, i) => [i, num(p.voto)]).filter(([, v]) => v !== null);
  const linea = voti.length >= 2
    ? `<g class="gr-voti"><path class="gr-linea" pathLength="1" fill="none" d="${voti.map(([i, v], k) => `${k ? 'L' : 'M'}${f1(cx(i))} ${f1(yV(Math.min(10, Math.max(4, v))))}`).join('')}"/>${voti.map(([i, v]) => `<circle class="gr-punto" cx="${f1(cx(i))}" cy="${f1(yV(Math.min(10, Math.max(4, v))))}" r="3.5"><title>Voto ${v}</title></circle>`).join('')}<text class="gr-et" x="${W - DX + 4}" y="${f1(yV(10) + 4)}">10</text><text class="gr-et" x="${W - DX + 4}" y="${f1(yV(4) + 4)}">4</text></g>`
    : '';
  const tot = P.reduce((s, p) => s + (num(p.gol) || 0), 0);
  const titolo = `Gol partita per partita: ${tot} in ${P.length} partite${linea ? ', con i voti' : ''}`;
  return `<svg class="grafico grafico-barre anima" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${titolo}"><title>${titolo}</title>${griglia}${barre}${linea}</svg>`;
}
```

- [ ] **Step 4: `site/js/grafici/ciambella.js`**

```js
// Ciambella vittorie/pari/sconfitte con il totale al centro.
import { num, f1 } from './base.js';

export function ciambellaHTML(stat) {
  const v = num(stat && stat.v) || 0, n = num(stat && stat.n) || 0, p = num(stat && stat.p) || 0;
  const tot = v + n + p;
  if (!tot) return '';
  let inizio = 0;
  const fetta = (val, cls) => {
    if (!val) return '';
    const len = (val / tot) * 100;
    const s = `<circle class="gr-fetta ${cls}" cx="50" cy="50" r="40" pathLength="100" stroke-dasharray="${f1(len)} ${f1(100 - len)}" stroke-dashoffset="${f1(-inizio)}"/>`;
    inizio += len;
    return s;
  };
  const titolo = `${v} vinte, ${n} pari, ${p} perse su ${tot} partite`;
  return `<div class="ciambella"><svg class="anima" viewBox="0 0 100 100" width="120" height="120" role="img" aria-label="${titolo}"><title>${titolo}</title>
      <g transform="rotate(-90 50 50)">${fetta(v, 'gr-v')}${fetta(n, 'gr-n')}${fetta(p, 'gr-p')}</g>
      <text class="cb-num" x="50" y="52" text-anchor="middle">${tot}</text><text class="cb-et" x="50" y="66" text-anchor="middle">partite</text></svg>
    <ul class="cb-leg"><li><i class="gr-v"></i>${v} vinte</li><li><i class="gr-n"></i>${n} pari</li><li><i class="gr-p"></i>${p} perse</li></ul></div>`;
}
```

Nel test `{ v: 3, n: 1, p: 0 }` deve dare 2 fette, perché `p = 0` non disegna nulla, e il testo `>4<` al centro.

- [ ] **Step 5: `site/js/grafici/confronto.js`**

```js
// Barre contrapposte "A contro B": ogni riga ha due barre proporzionali al valore più alto.
import { esc } from '../util.js';
import { num } from './base.js';

const fmt = (v, dec) => (dec ? v.toFixed(dec).replace('.', ',') : String(v));

export function barreConfrontoHTML(righe, { nomeA, nomeB }) {
  const R = (righe || []).filter(r => num(r.a) !== null && num(r.b) !== null);
  if (!R.length) return '';
  const riga = (r) => {
    const a = num(r.a), b = num(r.b), max = Math.max(a, b) || 1;
    const vinceA = r.meglio === 'basso' ? a < b : a > b, vinceB = r.meglio === 'basso' ? b < a : b > a;
    return `<div class="cf-riga"><span class="cf-val a${vinceA ? ' meglio' : ''}">${fmt(a, r.decimali)}</span>
      <span class="cf-et">${esc(r.etichetta)}</span><span class="cf-val b${vinceB ? ' meglio' : ''}">${fmt(b, r.decimali)}</span>
      <div class="cf-barre" aria-hidden="true"><i class="cf-a${vinceA ? ' meglio' : ''}" style="width:${Math.round((a / max) * 100)}%"></i><i class="cf-b${vinceB ? ' meglio' : ''}" style="width:${Math.round((b / max) * 100)}%"></i></div></div>`;
  };
  return `<div class="confronto"><div class="cf-testa"><b>${esc(nomeA)}</b><b>${esc(nomeB)}</b></div>${R.map(riga).join('')}</div>`;
}

const puntiForma = (f) => (f || []).reduce((s, e) => s + (e === 'V' ? 3 : e === 'N' ? 1 : 0), 0);

export function righeConfrontoPartita(p) {
  const c = p && p.confronto;
  if (!c || !c.casa || !c.ospite) return [];
  const r = [
    { etichetta: 'Posizione', a: c.casa.pos, b: c.ospite.pos, meglio: 'basso' },
    { etichetta: 'Punti', a: c.casa.pt, b: c.ospite.pt, meglio: 'alto' },
    { etichetta: 'Gol fatti', a: c.casa.gf, b: c.ospite.gf, meglio: 'alto' },
    { etichetta: 'Gol subiti', a: c.casa.gs, b: c.ospite.gs, meglio: 'basso' },
    { etichetta: 'Punti nelle ultime 5', a: puntiForma(c.casa.forma), b: puntiForma(c.ospite.forma), meglio: 'alto' },
  ];
  const b = p.precedenti && p.precedenti.bilancio;
  if (b && (b.casa || b.ospite || b.pari)) r.push({ etichetta: 'Vittorie nei precedenti', a: b.casa, b: b.ospite, meglio: 'alto' });
  return r;
}
```

Controllo del test "meglio": Punti 9 > 3, quindi A meglio; Posizione 1 < 7 con meglio basso, quindi A meglio; Media 1,5 > 1,25, quindi A meglio. Fanno 3 occorrenze di `cf-val a meglio` e la riga con `a: null` viene saltata. La classe esce come `cf-val a meglio` perché il codice scrive `a${' meglio'}`.

- [ ] **Step 6: test**

Run: `npm test`
Expected: tutti PASS.

- [ ] **Step 7: collegare i grafici alle viste**

`site/js/views/squadra.js`. Import:

```js
import { graficoGolSVG } from '../grafici/barre.js';
import { ciambellaHTML } from '../grafici/ciambella.js';
import { barreConfrontoHTML } from '../grafici/confronto.js';
```

Dentro `statistiche(s, nSquadre)`, dopo `${andamento(s, nSquadre)}`, mettere il blocco che segue al posto della card "Rendimento" (la card resta, con la ciambella sopra la griglia):

```js
  const gol = graficoGolSVG(s.partite);
  const m = s.mediaGirone, r = s.riga;
  const media = m && r && r.g ? barreConfrontoHTML([
    { etichetta: 'Gol fatti a partita', a: st.gf / st.g, b: m.gf, meglio: 'alto', decimali: 1 },
    { etichetta: 'Gol subiti a partita', a: st.gs / st.g, b: m.gs, meglio: 'basso', decimali: 1 },
    { etichetta: 'Punti a partita', a: r.pt / r.g, b: m.pt, meglio: 'alto', decimali: 1 }], { nomeA: s.nome, nomeB: 'Media girone' }) : '';
```

e nel template:

```js
  return `${andamento(s, nSquadre)}
    ${gol ? card('Gol per giornata', `${gol}<p class="muto grafico-nota">Sopra i gol fatti (colore = risultato), sotto i gol subiti</p>`) : ''}
    ${card('Rendimento', `${ciambellaHTML(st)}<div class="stat-griglia">...invariato...</div>`)}
    ${media ? card('Rispetto alla media del girone', media) : ''}
    ${card('Forma e serie', ...invariato...)}`;
```

`site/js/views/giocatore.js`. Import `graficoGiocatoreSVG` da `'../grafici/barre.js'`; tra la card "Stagione" e "Partita per partita" inserire:

```js
    ${(() => { const svg = graficoGiocatoreSVG(g.perPartita); return svg ? card('Gol e voti', `${svg}<p class="muto grafico-nota">Barre: gol in ogni partita · linea: voto (scala 4–10)</p>`) : ''; })()}
```

`site/js/views/partita.js`. Import `barreConfrontoHTML, righeConfrontoPartita` da `'../grafici/confronto.js'`; aggiungere la funzione:

```js
function confrontoCard(p) {
  const h = barreConfrontoHTML(righeConfrontoPartita(p), { nomeA: p.casa.nome, nomeB: p.ospite.nome });
  return h ? card(p.giocata ? 'Le squadre oggi' : 'Confronto', h) : '';
}
```

In `riepilogo`, nei due `return`, aggiungere `${confrontoCard(p)}` subito prima di `${precedenti(p, nomi)}`. Nel ramo senza tabellino diventa `vuoto(...) + confrontoCard(p) + precedenti(p, nomi)`.

- [ ] **Step 8: CSS**

```css
/* Barre, ciambella, confronto */
.grafico-barre { height: auto; aspect-ratio: 340 / 180; }
.gr-barra { fill: var(--neutro); }
.gr-barra.gr-v { fill: var(--ok); } .gr-barra.gr-n { fill: var(--neutro); } .gr-barra.gr-p { fill: var(--ko); }
.gr-barra.giu { fill: var(--muto); opacity: .45; }
.gr-barra.gr-gol { fill: var(--accento); }
.gr-voti .gr-linea { stroke: var(--link); stroke-width: 2; }
.gr-voti .gr-punto { fill: var(--link); stroke: var(--carta); stroke-width: 1.5; }
.anima .gr-barra { transform-box: fill-box; animation: gr-cresce .7s ease-out both; }
.anima .gr-barra.su { transform-origin: bottom; } .anima .gr-barra.giu { transform-origin: top; }
@keyframes gr-cresce { from { transform: scaleY(0); } }
.ciambella { display: flex; align-items: center; gap: var(--s-4); margin-bottom: var(--s-3); }
.gr-fetta { fill: none; stroke-width: 14; }
.gr-fetta.gr-v { stroke: var(--ok); } .gr-fetta.gr-n { stroke: var(--neutro); } .gr-fetta.gr-p { stroke: var(--ko); }
.anima .gr-fetta { animation: gr-appare .8s ease-out both; }
.cb-num { fill: var(--testo); font-size: 24px; font-weight: 800; } .cb-et { fill: var(--muto); font-size: 11px; }
.cb-leg { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; font-size: .9rem; }
.cb-leg i { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; }
.cb-leg i.gr-v { background: var(--ok); } .cb-leg i.gr-n { background: var(--neutro); } .cb-leg i.gr-p { background: var(--ko); }
.confronto { display: grid; gap: var(--s-3); }
.cf-testa { display: flex; justify-content: space-between; gap: var(--s-3); font-size: .85rem; }
.cf-testa b:last-child { text-align: right; }
.cf-riga { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 2px var(--s-2); }
.cf-et { text-align: center; color: var(--muto); font-size: .8rem; }
.cf-val { font-weight: 700; font-variant-numeric: tabular-nums; color: var(--muto); }
.cf-val.meglio { color: var(--testo); }
.cf-barre { grid-column: 1 / -1; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
.cf-barre i { display: block; height: 8px; border-radius: 4px; background: var(--bordo); animation: gr-allarga .7s ease-out both; }
.cf-barre i.cf-a { justify-self: end; } .cf-barre i.cf-b { justify-self: start; }
.cf-barre i.meglio { background: var(--accento); }
@keyframes gr-allarga { from { width: 0; } }
```

- [ ] **Step 9: controllo a vista**

Run: `python3 -m scraper.build`, poi gli screenshot di `squadra/2530` (scheda Statistiche: va aperta con un clic, quindi si usa uno script puppeteer nello scratchpad), `giocatore/2540-girardi-diego` e `partita/14627`, in tema scuro e chiaro.
Expected: barre colorate, ciambella, confronto leggibile, niente sbordature.

Poi `git checkout site/data site/s site/cal`.

- [ ] **Step 10: commit**

```bash
git add site/js/grafici/barre.js site/js/grafici/ciambella.js site/js/grafici/confronto.js site/js/tests/grafici-altri.test.js site/js/views/squadra.js site/js/views/giocatore.js site/js/views/partita.js site/css/app.css
git commit -m "feat: grafici di squadra (gol, esiti, media), giocatore (gol e voti) e partita (confronto)"
```

---

### Task 7: service worker, verifica finale, pubblicazione

**Files:**
- Modify: `site/sw.js` (`VERSIONE`, `SHELL`)
- Create: `site/js/tests/sw.test.js`

- [ ] **Step 1: test che fallisce** (`site/js/tests/sw.test.js`)

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = fileURLToPath(new URL('../../', import.meta.url));

function jsDi(dir) {
  return readdirSync(dir).flatMap(n => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return n === 'tests' ? [] : jsDi(p);
    return n.endsWith('.js') ? [relative(SITE, p)] : [];
  });
}

test('ogni modulo JS del sito è nella SHELL del service worker', () => {
  const sw = readFileSync(join(SITE, 'sw.js'), 'utf8');
  const mancanti = jsDi(join(SITE, 'js')).filter(f => !sw.includes(`'${f}'`));
  assert.deepEqual(mancanti, []);
});
```

- [ ] **Step 2: eseguire e verificare che fallisca**

Run: `node --test site/js/tests/sw.test.js`
Expected: FAIL. L'elenco dei mancanti contiene `js/calendario.js`, `js/indietro.js`, `js/views/calendario.js` e `js/grafici/*.js`.

- [ ] **Step 3: aggiornare `site/sw.js`**

`const VERSIONE = 'sl-6';` e, in `SHELL`, dopo `'js/views/vantaggi.js'`, aggiungere:

```js
  'js/calendario.js', 'js/indietro.js', 'js/views/calendario.js',
  'js/grafici/base.js', 'js/grafici/corsa.js', 'js/grafici/barre.js', 'js/grafici/ciambella.js', 'js/grafici/confronto.js',
```

- [ ] **Step 4: tutti i test**

Run: `python3 -m pytest -q && npm test`
Expected: tutti PASS.

- [ ] **Step 5: prova finale simulando un iPhone**

Script puppeteer (`puppeteer-core@23.11.1` con il Chrome di sistema), viewport 390×844 mobile, sul sito locale (`python3 -m scraper.build` e poi `python3 -m http.server 8089 -d site`):
- per ogni rotta, controllare `scrollWidth === clientWidth` e nessun errore in console: `#/partite`, `#/classifiche/serie-a`, `#/classifiche/serie-a/calendario`, `#/classifiche/serie-a/statistiche`, `#/classifiche/super-league/calendario`, `#/classifiche/super-league/statistiche`, `#/squadra/2530` (cliccando la scheda Statistiche), `#/giocatore/2540-girardi-diego`, `#/partita/14627`, `#/a/2025-26/classifiche`;
- ripetere le stesse rotte in tema chiaro;
- fare le screenshot e guardarle.

Poi `git checkout site/data site/s site/cal`.

- [ ] **Step 6: commit e push**

```bash
git add site/sw.js site/js/tests/sw.test.js
git commit -m "chore: service worker con i nuovi moduli (sl-6) e test della SHELL"
git -c http.version=HTTP/1.1 push origin main
```

Attendere il workflow (`gh run watch`) e ripetere lo step 5 sul sito pubblicato `https://max2staff.github.io/sporting-live/`.
