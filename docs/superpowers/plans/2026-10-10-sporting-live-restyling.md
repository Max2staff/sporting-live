# Sporting Live — restyling: piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tema scuro nero di default, introduzione al primo avvio, selettore campionato/girone sempre visibile, stemmi generati per ogni squadra, foto nelle testate e pagine più ricche.

**Architecture:** Solo `site/` più due flag nella build Python (`stemma`, `foto`, e `zone` opzionale da `stagioni.json`). Tre moduli puri nuovi e testati (`stemma.js`, `contesto.js`, `evidenza.js`), un modulo UI per il foglio di scelta del girone, una vista `intro`, CSS riscritto con il nero come base. Nessun cambio a scraper, dati o workflow.

**Tech Stack:** JavaScript ES modules senza bundler, `node --test`; Python 3.9/3.12 + Pillow per le immagini; Chrome headless per la verifica visiva.

**Spec:** `docs/superpowers/specs/2026-10-10-sporting-live-restyling-design.md` (estende `2026-10-10-sporting-live-design.md`)

## Global Constraints

- Nessun framework, bundler o web font esterno; CSP di `site/index.html` invariata (immagini solo da `self`).
- Ogni accesso a localStorage dentro try/catch, con fallback in memoria.
- Tap target ≥ 44px; nessuno scroll orizzontale di pagina a 320–390px; testi in italiano.
- Tutto il testo che viene dai dati passa da `esc()`; id numerici interpolati con `Number(...)`.
- Palette: sfondo `#0a0a0a`, card `#161a1f`, card alta `#1f252b`, bordo `#2a323a`, testo `#f3f5f7`, muto `#9aa7b2`, arancione `#ff4e00`, azzurro `#38bdf8`, verde `#22c55e`, giallo `#facc15`, rosso `#ef4444`, blu notte `#01213b`.
- Foto ≤ 250 KB ciascuna; stemmi generati come SVG inline senza richieste di rete.
- Ogni commit: messaggio in italiano con prefisso `feat:`/`fix:`/`test:`/`chore:`/`docs:` e ultima riga `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Git solo come `git -C /Users/massimilianogriletti/Documents/Sporting_Live ...`; mai git in altre cartelle. Branch `main` (repo pubblico: NON fare push; lo fa il controller alla fine).
- Non modificare `site/data/`, `scraper/cache/`, `build/raw/` salvo dove un task lo dice (Task 1 rigenera `site/data` con `python -m scraper.build`, senza rete).

## Review Focus

1. Nomi squadra con apostrofi, `&`, cifre o sigle puntate ("AUTOSANDONA'", "EASY M&M", "6 GOMME SCORZE", "R.S.M. CARPENEDO"): le iniziali devono essere leggibili e l'HTML valido. Test in Task 2.
2. localStorage bloccato (Safari privato): intro, girone scelto e tema devono funzionare in memoria senza eccezioni e l'intro non deve ricomparire a ogni cambio pagina della stessa sessione. Test in Task 2.
3. Girone salvato che non esiste più (cambio stagione): il contesto torna a "tutti" invece di rompere le viste. Test in Task 2.
4. Inizio stagione senza partite giocate: "In evidenza" e podio non devono comparire né lanciare errori. Test in Task 2 (`evidenza.test.js`) e verifica in Task 5.
5. Tema chiaro scelto in Info: tutte le viste restano leggibili (contrasto testo/sfondo) e le testate hero restano scure. Verifica visiva in Task 8.

---

### Task 1: Immagini e flag stemma/foto/zone nella build

**Files:**
- Create: `scripts/prepara_immagini.py`, `site/img/foto/premiazione.jpg`, `site/img/foto/campo.jpg`, `site/img/loghi/endas.png`, `site/img/loghi/sporting-club-mestre.png`, `site/img/stemmi/.gitkeep`, `site/img/squadre/.gitkeep`
- Modify: `scraper/build.py` (`costruisci`, `main`), `scraper/tests/test_build.py`, `README.md`
- Regenerate: `site/data/**` con `python -m scraper.build` (niente rete)

**Interfaces:**
- Produces: `costruisci(stagioni, raws, alias, adesso, img_dir: Path | None = None)`; in `indice.squadre[]` la chiave `stemma: bool`; in `squadra/<id>.json` le chiavi `stemma: bool`, `foto: bool`; in `indice.campionati[].gironi[]` e in `girone/<slug>.json` la chiave `zone: {"promozione": int, "retrocessione": int} | null` copiata da `stagioni.json` (chiave opzionale `zone` del girone).
- Produces: file immagine ai percorsi sopra, usati dalle viste come `img/foto/campo.jpg`, `img/foto/premiazione.jpg`, `img/loghi/endas.png`, `img/loghi/sporting-club-mestre.png`, `img/stemmi/<id>.png`, `img/squadre/<id>.jpg`.

- [ ] **Step 1: Test della build** — aggiungi in fondo a `scraper/tests/test_build.py`:
```python
def test_flag_stemma_foto_e_zone(tmp_path):
    (tmp_path / "stemmi").mkdir()
    (tmp_path / "squadre").mkdir()
    (tmp_path / "stemmi" / "10.png").write_bytes(b"x")
    (tmp_path / "squadre" / "30.jpg").write_bytes(b"x")
    stagioni = json.loads(json.dumps(STAGIONI))
    stagioni["campionati"][0]["gironi"][0]["zone"] = {"promozione": 2, "retrocessione": 1}
    f = costruisci(stagioni, {1: raw_con_classifica()}, {"*": {}}, adesso="x", img_dir=tmp_path)
    stemmi = {s["id"]: s["stemma"] for s in f["indice.json"]["squadre"]}
    assert stemmi == {10: True, 20: False, 30: False}
    assert f["squadra/10.json"]["stemma"] is True and f["squadra/10.json"]["foto"] is False
    assert f["squadra/30.json"]["foto"] is True
    assert f["indice.json"]["campionati"][0]["gironi"][0]["zone"] == {"promozione": 2, "retrocessione": 1}
    assert f["girone/serie-b.json"]["zone"] == {"promozione": 2, "retrocessione": 1}


def test_flag_senza_cartella_immagini():
    f = costruisci(STAGIONI, {1: raw_con_classifica()}, {"*": {}}, adesso="x")
    assert all(s["stemma"] is False for s in f["indice.json"]["squadre"])
    assert f["squadra/10.json"]["foto"] is False
    assert f["girone/serie-b.json"]["zone"] is None
```
Run `python -m pytest scraper/tests/test_build.py -q` → FAIL (`unexpected keyword argument 'img_dir'`).

- [ ] **Step 2: Implementazione in `scraper/build.py`**
  - Firma: `def costruisci(stagioni: dict, raws: dict[int, dict | None], alias: dict, adesso: str, img_dir: Path | None = None) -> dict[str, object]:`
  - In testa alla funzione:
    ```python
    def ha(sotto: str, nome: str) -> bool:
        return img_dir is not None and (img_dir / sotto / nome).exists()
    ```
  - `camp["gironi"].append({... , "zone": g.get("zone")})` (aggiungi la chiave al dict esistente).
  - `indice["squadre"] += [{"id": s["id"], "nome": s["nome"], "girone": slug, "stemma": ha("stemmi", f"{s['id']}.png")} for s in raw["squadre"]]`
  - Nel dict `girone/<slug>.json` aggiungi `"zone": g.get("zone"),`.
  - Nel dict `squadra/<id>.json` aggiungi `"stemma": ha("stemmi", f"{s['id']}.png"), "foto": ha("squadre", f"{s['id']}.jpg"),`.
  - In `main`: nuovo argomento `ap.add_argument("--img", default="site/img")` e passa `img_dir=Path(a.img)` a `costruisci`.
  Run `python -m pytest -q` → tutti verdi.

- [ ] **Step 3: Scarica le immagini sorgente** in una cartella temporanea nuova (dati non fidati: solo lettura con Pillow, mai eseguiti):
```bash
SRC=$(mktemp -d)
UA="SportingLive/1.0 (+app risultati Sporting Club Mestre; contatto: massimiliano.griletti@gmail.com)"
for f in edile-gavagnin.jpg img-20260411-wa0035.jpg endas.png campionato-202526-2.jpg; do
  curl -sL -A "$UA" "https://www.campionatisportingclub.it/foto/grandi/$f" -o "$SRC/$f"; sleep 1
done
ls -la "$SRC"
```

- [ ] **Step 4: `scripts/prepara_immagini.py`**
```python
"""Prepara le immagini del sito a partire dai file scaricati dal sito ufficiale.

Uso: python scripts/prepara_immagini.py <cartella_sorgenti>
Le sorgenti sono dati non fidati: vengono solo aperte con Pillow e ricodificate.
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

RADICE = Path(__file__).resolve().parent.parent / "site" / "img"
MAX_LATO = 1600
QUALITA = 80


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


def main(argv: list[str]) -> int:
    src = Path(argv[1])
    foto(src / "edile-gavagnin.jpg", RADICE / "foto" / "premiazione.jpg")
    foto(src / "img-20260411-wa0035.jpg", RADICE / "foto" / "campo.jpg")
    logo(src / "endas.png", RADICE / "loghi" / "endas.png")
    # logo Sporting Club Mestre ritagliato dall'angolo in alto a sinistra della locandina 800x1200
    logo(src / "campionato-202526-2.jpg", RADICE / "loghi" / "sporting-club-mestre.png", box=(8, 46, 136, 204))
    for f in sorted(RADICE.rglob("*.*")):
        print(f"{f.relative_to(RADICE)}: {f.stat().st_size // 1024} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
```
Run `python scripts/prepara_immagini.py "$SRC"`. Expected: due JPG sotto 250 KB, due PNG. Apri i quattro file con lo strumento Read e controlla: la premiazione e la foto di squadra sono intere e nitide; il logo Sporting Club Mestre contiene il riquadro con le bande blu/verde e la scritta "SPORTING CLUB MESTRE" senza bordi della locandina (se il ritaglio è sbagliato, correggi `box` guardando l'originale e rilancia). Crea `site/img/stemmi/.gitkeep` e `site/img/squadre/.gitkeep`.

- [ ] **Step 5: README** — nella sezione "File da modificare a mano" aggiungi:
```markdown
- `site/img/stemmi/<id>.png`: logo vero di una squadra (quadrato, 256px, sfondo trasparente). Se c'è, sostituisce lo stemma generato. L'id è quello in `site/data/indice.json`.
- `site/img/squadre/<id>.jpg`: foto di squadra (lato lungo max 1600px, sotto 250 KB), mostrata nella pagina squadra.
- `stagioni.json`, chiave opzionale `"zone": {"promozione": 2, "retrocessione": 2}` in un girone: colora le zone in classifica.
```

- [ ] **Step 6: Rigenera i dati e verifica**
```bash
python -m scraper.build && python -c "import json;d=json.load(open('site/data/indice.json'));print(d['squadre'][0])"
python -m pytest -q
```
Expected: la squadra stampata ha `"stemma": false`; suite verde.

- [ ] **Step 7: Commit** `feat: immagini del sito e flag stemma, foto e zone nella build` (include `site/data` rigenerato, `site/img/**`, script, test, README).

---

### Task 2: Moduli puri — stemmi, contesto, evidenza

**Files:**
- Create: `site/js/stemma.js`, `site/js/contesto.js`, `site/js/evidenza.js`, `site/js/tests/stemma.test.js`, `site/js/tests/contesto.test.js`, `site/js/tests/evidenza.test.js`

**Interfaces:**
- Consumes: `esc` da `site/js/util.js`.
- Produces:
  - `stemma.js`: `iniziali(nome) -> string`, `coloriStemma(id) -> {primario, secondario, motivo}`, `stemmaHTML(squadra: {id, nome, stemma?}, dim = 40) -> string` (SVG inline o `<img>`; sempre con classe `stemma` e `aria-hidden="true"`).
  - `contesto.js`: `TUTTI = 'tutti'`, `gironi(indice) -> [{...girone, campionato: {id, nome}}]`, `leggiGirone(indice) -> slug | 'tutti'`, `impostaGirone(slug)`, `gironeEffettivo(indice) -> slug | null`, `etichettaGirone(indice, slug) -> string`, `introDaMostrare() -> bool`, `segnaIntroVista()`, `riattivaIntro()`, `_reset()`.
  - `evidenza.js`: `capolista(girone) -> riga | null`, `capocannoniere(girone) -> giocatore | null`, `ultimaGiornata(girone) -> {giornata, partite} | null`, `podio(righe) -> righe[0..3]`.

- [ ] **Step 1: Test** `site/js/tests/stemma.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { iniziali, coloriStemma, stemmaHTML } from '../stemma.js';

test('iniziali', () => {
  assert.equal(iniziali('SOCKS'), 'SO');
  assert.equal(iniziali('F.C. PELIGROS'), 'PE');
  assert.equal(iniziali('R.S.M. CARPENEDO'), 'CA');
  assert.equal(iniziali('REAL GNECA MIAMI'), 'GM');
  assert.equal(iniziali('EASY M&M'), 'EM');
  assert.equal(iniziali("AUTOSANDONA'"), 'AU');
  assert.equal(iniziali('6 GOMME SCORZE'), '6G');
  assert.equal(iniziali('NZ'), 'NZ');
  assert.equal(iniziali(''), '?');
  assert.equal(iniziali(null), '?');
});

test('colori stabili e diversi', () => {
  assert.deepEqual(coloriStemma(2480), coloriStemma(2480));
  assert.notEqual(coloriStemma(1).primario, coloriStemma(2).primario);
  assert.ok([0, 1, 2].includes(coloriStemma(2480).motivo));
  assert.match(coloriStemma(7).primario, /^hsl\(\d+ \d+% \d+%\)$/);
});

test('stemma generato o immagine', () => {
  const svg = stemmaHTML({ id: 2480, nome: 'SOCKS' }, 40);
  assert.match(svg, /^<svg class="stemma"/);
  assert.match(svg, />SO</);
  assert.match(svg, /aria-hidden="true"/);
  const img = stemmaHTML({ id: 2480, nome: 'SOCKS', stemma: true }, 24);
  assert.match(img, /<img class="stemma" src="img\/stemmi\/2480\.png" width="24" height="24"/);
  assert.equal(stemmaHTML(null), '');
  assert.ok(!stemmaHTML({ id: 1, nome: '<b>x</b>' }).includes('<b>'));
});
```
`site/js/tests/contesto.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TUTTI, gironi, leggiGirone, impostaGirone, gironeEffettivo, etichettaGirone, introDaMostrare, segnaIntroVista, riattivaIntro, _reset } from '../contesto.js';

const indice = { campionati: [
  { id: 'c8', nome: 'Calcio a 8', gironi: [{ slug: 'serie-a', nome: 'Serie A' }, { slug: 'serie-b', nome: 'Serie B' }] },
  { id: 'c5', nome: 'Calcio a 5', gironi: [{ slug: 'super-league', nome: 'Super League' }] }] };

test('gironi piatti con campionato', () => {
  assert.deepEqual(gironi(indice).map(g => [g.slug, g.campionato.nome]), [['serie-a', 'Calcio a 8'], ['serie-b', 'Calcio a 8'], ['super-league', 'Calcio a 5']]);
});

test('girone: default, scelta, slug sparito, effettivo, etichetta (senza storage)', () => {
  _reset();
  assert.equal(leggiGirone(indice), TUTTI);
  assert.equal(gironeEffettivo(indice), 'serie-a');
  impostaGirone('serie-b');
  assert.equal(leggiGirone(indice), 'serie-b');
  assert.equal(gironeEffettivo(indice), 'serie-b');
  assert.equal(etichettaGirone(indice, 'serie-b'), 'Calcio a 8 · Serie B');
  assert.equal(etichettaGirone(indice, TUTTI), 'Tutti i gironi');
  impostaGirone('girone-vecchio');
  assert.equal(leggiGirone(indice), TUTTI);
  assert.equal(gironeEffettivo({ campionati: [] }), null);
});

test('intro: una volta, anche con storage che lancia', () => {
  globalThis.localStorage = { getItem() { throw new Error('no'); }, setItem() { throw new Error('no'); } };
  try {
    _reset();
    assert.equal(introDaMostrare(), true);
    segnaIntroVista();
    assert.equal(introDaMostrare(), false);
    riattivaIntro();
    assert.equal(introDaMostrare(), true);
  } finally { delete globalThis.localStorage; }
});

test('persistenza con storage vero', () => {
  const mem = {};
  globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); } };
  try {
    _reset();
    impostaGirone('super-league');
    segnaIntroVista();
    _reset();
    assert.equal(leggiGirone(indice), 'super-league');
    assert.equal(introDaMostrare(), false);
  } finally { delete globalThis.localStorage; }
});
```
`site/js/tests/evidenza.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { capolista, capocannoniere, ultimaGiornata, podio } from '../evidenza.js';

const riga = (squadraId, pos, pt, g) => ({ squadraId, nome: `S${squadraId}`, pos, pt, g, v: 0, n: 0, p: 0, gf: 0, gs: 0, dr: 0 });
const P = (id, giornata, giocata) => ({ id, giornata, giocata });
const girone = {
  classifica: { totale: [riga(1, 1, 9, 3), riga(2, 2, 6, 3), riga(3, 3, 3, 3), riga(4, 4, 0, 3)] },
  giocatori: { marcatori: [{ slug: '1-a', nome: 'A', squadraId: 1, gol: 5 }] },
  partite: [P(10, 1, true), P(11, 2, true), P(12, 2, true), P(13, 3, false)],
};

test('evidenza a stagione in corso', () => {
  assert.equal(capolista(girone).squadraId, 1);
  assert.equal(capocannoniere(girone).nome, 'A');
  assert.deepEqual(ultimaGiornata(girone), { giornata: 2, partite: [P(11, 2, true), P(12, 2, true)] });
  assert.deepEqual(podio(girone.classifica.totale).map(r => r.squadraId), [1, 2, 3]);
});

test('evidenza a inizio stagione', () => {
  const vuoto = { classifica: { totale: [riga(1, 1, 0, 0)] }, giocatori: { marcatori: [] }, partite: [P(1, 1, false)] };
  assert.equal(capolista(vuoto), null);
  assert.equal(capocannoniere(vuoto), null);
  assert.equal(ultimaGiornata(vuoto), null);
  assert.deepEqual(podio([]), []);
  assert.equal(capolista({}), null);
  assert.equal(ultimaGiornata({}), null);
});
```
Run `npm test` → FAIL (moduli mancanti).

- [ ] **Step 2: `site/js/stemma.js`**
```js
// Stemmi delle squadre: logo vero se presente, altrimenti scudo SVG generato in modo stabile dall'id.
import { esc } from './util.js';

const PAROLE_IGNORATE = new Set(['REAL', 'ASD', 'FC', 'AC', 'SS', 'US', 'AS', 'CALCIO', 'C5', 'C8']);

export function iniziali(nome) {
  const parole = String(nome ?? '').toUpperCase().split(/\s+/).filter(Boolean)
    .filter(p => !p.includes('.'))                        // sigle puntate: F.C., R.S.M., A.S.D.
    .map(p => p.replace(/[^A-Z0-9À-Ý&]/g, ''))
    .filter(p => p && !PAROLE_IGNORATE.has(p));
  const pulite = parole.map(p => p.replace(/&/g, '')).filter(Boolean);
  if (!pulite.length) return '?';
  if (pulite.length === 1) return pulite[0].slice(0, 2);
  return pulite[0][0] + pulite[1][0];
}

function hash(id) {
  let h = 2166136261;
  for (const ch of String(id)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function coloriStemma(id) {
  const h = hash(id);
  const tinta = h % 360;
  const tinta2 = (tinta + 140 + ((h >>> 9) % 80)) % 360;
  return { primario: `hsl(${tinta} 68% 42%)`, secondario: `hsl(${tinta2} 78% 56%)`, motivo: (h >>> 17) % 3 };
}

const SCUDO = 'M20 1.5 37.5 6.5V22c0 12-7.5 20-17.5 24.5C10 42 2.5 34 2.5 22V6.5Z';
const MOTIVI = [
  'M2 31 38 11v12L2 43Z',          // fascia diagonale
  'M20 0h20v48H20Z',               // metà verticale
  'M2 17 20 29 38 17v11L20 40 2 28Z', // chevron
];
let contatore = 0;

export function stemmaHTML(squadra, dim = 40) {
  if (!squadra) return '';
  const id = Number(squadra.id);
  if (squadra.stemma) return `<img class="stemma" src="img/stemmi/${id}.png" width="${dim}" height="${dim}" alt="" aria-hidden="true" loading="lazy">`;
  const { primario, secondario, motivo } = coloriStemma(id);
  const sigla = esc(iniziali(squadra.nome));
  const clip = `sc${id}-${++contatore}`;
  const larg = Math.round(dim * 40 / 48);
  return `<svg class="stemma" viewBox="0 0 40 48" width="${larg}" height="${dim}" aria-hidden="true">`
    + `<clipPath id="${clip}"><path d="${SCUDO}"/></clipPath>`
    + `<g clip-path="url(#${clip})"><rect width="40" height="48" fill="${primario}"/><path d="${MOTIVI[motivo]}" fill="${secondario}"/></g>`
    + `<path d="${SCUDO}" fill="none" stroke="rgba(255,255,255,.9)" stroke-width="1.6"/>`
    + `<text x="20" y="25" text-anchor="middle" dominant-baseline="middle" font-family="system-ui,-apple-system,sans-serif" font-weight="800" font-size="${sigla.length > 1 ? 15 : 19}" fill="#fff" stroke="rgba(0,0,0,.45)" stroke-width="2.4" paint-order="stroke">${sigla}</text>`
    + '</svg>';
}
```

- [ ] **Step 3: `site/js/contesto.js`**
```js
// Campionato/girone scelto e stato dell'introduzione. Storage con fallback in memoria.
const K_GIRONE = 'sl.girone';
const K_INTRO = 'sl.intro';
const memoria = {};

function leggi(k) {
  try { const v = globalThis.localStorage?.getItem(k); if (v != null) return v; } catch { /* storage bloccato */ }
  return memoria[k] ?? null;
}
function scrivi(k, v) {
  memoria[k] = v;
  try { globalThis.localStorage?.setItem(k, v); } catch { /* solo in memoria */ }
}

export const TUTTI = 'tutti';
export const gironi = (indice) => (indice.campionati || []).flatMap(c => c.gironi.map(g => ({ ...g, campionato: { id: c.id, nome: c.nome } })));
export function leggiGirone(indice) {
  const v = leggi(K_GIRONE);
  return v && v !== TUTTI && gironi(indice).some(g => g.slug === v) ? v : TUTTI;
}
export const impostaGirone = (slug) => scrivi(K_GIRONE, slug);
export function gironeEffettivo(indice) {
  const g = leggiGirone(indice);
  return g === TUTTI ? (gironi(indice)[0]?.slug ?? null) : g;
}
export function etichettaGirone(indice, slug) {
  const g = gironi(indice).find(x => x.slug === slug);
  return g ? `${g.campionato.nome} · ${g.nome}` : 'Tutti i gironi';
}
export const introDaMostrare = () => leggi(K_INTRO) !== 'ok';
export const segnaIntroVista = () => scrivi(K_INTRO, 'ok');
export const riattivaIntro = () => scrivi(K_INTRO, 'no');
export function _reset() { for (const k of Object.keys(memoria)) delete memoria[k]; }
```

- [ ] **Step 4: `site/js/evidenza.js`**
```js
// Dati "in evidenza" di un girone (girone/<slug>.json). Funzioni pure.
export function capolista(girone) {
  const r = girone?.classifica?.totale?.[0];
  return r && r.g > 0 ? r : null;
}
export const capocannoniere = (girone) => girone?.giocatori?.marcatori?.[0] || null;
export function ultimaGiornata(girone) {
  const giocate = (girone?.partite || []).filter(p => p.giocata);
  if (!giocate.length) return null;
  const giornata = Math.max(...giocate.map(p => p.giornata));
  return { giornata, partite: giocate.filter(p => p.giornata === giornata) };
}
export const podio = (righe) => (righe || []).slice(0, 3);
```

- [ ] **Step 5: Run** `npm test` → PASS (15 precedenti + 9 nuovi) e `node --check` sui tre file.
- [ ] **Step 6: Commit** `feat: stemmi generati, contesto girone e dati in evidenza`.

---

### Task 3: Tema nero, CSS nuovo, shell con barra contesto e foglio girone

**Files:**
- Replace: `site/css/app.css` (riscritto per intero, contiene anche i componenti usati dai Task 4–7)
- Modify: `site/js/tema.js`, `site/js/router.js`, `site/js/app.js`, `site/js/views/comuni.js`, `site/index.html` (solo `theme-color`)
- Create: `site/js/views/contesto-ui.js`, `site/js/views/intro.js` (segnaposto, sostituito in Task 4), `scripts/screenshot.sh`
- Test: `site/js/tests/router.test.js`, `site/js/tests/tema.test.js`

**Interfaces:**
- Consumes: `stemmaHTML` (Task 2), `contesto.js` (Task 2), `indice.squadre[].stemma` (Task 1).
- Produces:
  - `tema.js`: `leggiTema() -> 'scuro'|'chiaro'|'auto'` (default `'scuro'`), `impostaTema(t)`, `applicaTema(t)`: `'scuro'` → `data-theme="dark"`, `'chiaro'` → `data-theme="light"`, `'auto'` → attributo rimosso.
  - `router.js`: `'intro'` aggiunto alle viste note.
  - `comuni.js`: `squadraDa(indice, id) -> {id, nome, stemma}`; `rigaPartita` mostra lo stemma (24px) prima di ogni nome; `heroHTML({foto, classe, contenuto}) -> string`.
  - `contesto-ui.js`: `barraContesto(indice, {tutti: bool}) -> string` (bottone `.chip-contesto[data-contesto]`), `collegaContesto(root, indice, {tutti, onCambio(slug)})` (apre il foglio dal basso, imposta il girone, chiude, chiama `onCambio`).
  - `app.js`: al primo `avvia()` se `introDaMostrare()` e la rotta non è `intro`, porta a `#/intro`; con vista `intro` non disegna testata, footer e tabbar (aggiunge la classe `intro` a `<body>`).

- [ ] **Step 1: Test**
`site/js/tests/router.test.js`: aggiungi
```js
test('rotta intro', () => {
  assert.deepEqual(analizza('#/intro'), { vista: 'intro', params: [] });
  assert.deepEqual(analizza('#/intro/2'), { vista: 'intro', params: ['2'] });
});
```
`site/js/tests/tema.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

function finto() {
  const attr = {};
  globalThis.document = { documentElement: { setAttribute: (k, v) => { attr[k] = v; }, removeAttribute: (k) => { delete attr[k]; } } };
  return attr;
}

test('tema scuro di default, chiaro e auto', async () => {
  const attr = finto();
  const { leggiTema, impostaTema, applicaTema } = await import('../tema.js');
  assert.equal(leggiTema(), 'scuro');
  applicaTema();
  assert.equal(attr['data-theme'], 'dark');
  impostaTema('chiaro');
  assert.equal(attr['data-theme'], 'light');
  impostaTema('auto');
  assert.equal(attr['data-theme'], undefined);
  delete globalThis.document;
});
```
Run `npm test` → FAIL.

- [ ] **Step 2: `site/js/tema.js`**
```js
const CHIAVE = 'sl.tema';
let memoria = null;
export function leggiTema() {
  try { const v = globalThis.localStorage?.getItem(CHIAVE); if (v) return v; } catch { /* storage bloccato */ }
  return memoria || 'scuro';
}
export function impostaTema(t) {
  memoria = t;
  try { globalThis.localStorage?.setItem(CHIAVE, t); } catch { /* solo in memoria */ }
  applicaTema(t);
}
export function applicaTema(t = leggiTema()) {
  const root = document.documentElement;
  if (t === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', t === 'chiaro' ? 'light' : 'dark');
}
```
In `site/js/router.js` aggiungi `'intro'` all'array `VISTE`. In `site/index.html` metti `<meta name="theme-color" content="#0a0a0a">`.

- [ ] **Step 3: `site/css/app.css` — sostituisci tutto il file con:**
```css
/* Sporting Live — nero di base, accenti vivi. Livelli: primitivi → semantici → componenti. */
:root {
  --nero: #0a0a0a; --antracite: #161a1f; --antracite-2: #1f252b; --grafite: #2a323a;
  --bianco: #f3f5f7; --grigio: #9aa7b2; --blu-notte: #01213b;
  --arancio: #ff4e00; --arancio-2: #ff7a3d; --azzurro: #38bdf8; --verde: #22c55e; --giallo: #facc15; --rosso: #ef4444;
  --oro: #f5c542; --argento: #c0c7cf; --bronzo: #d08a4b;
  --r-sm: 8px; --r-md: 14px; --r-lg: 20px; --r-full: 999px;
  --s-1: .25rem; --s-2: .5rem; --s-3: .75rem; --s-4: 1rem; --s-5: 1.25rem; --s-6: 1.5rem; --s-8: 2rem;
  --font: -apple-system, system-ui, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  --tab-h: 62px; --max-w: 640px;
  --ombra: 0 8px 24px rgba(0,0,0,.35);
}
/* semantici: scuro (default) */
:root {
  color-scheme: dark;
  --sfondo: var(--nero); --carta: var(--antracite); --carta-alt: var(--antracite-2); --bordo: var(--grafite);
  --testo: var(--bianco); --muto: var(--grigio);
  --accento: var(--arancio); --accento-forte: var(--arancio-2); --accento-tint: rgba(255,78,0,.16);
  --link: var(--azzurro); --link-tint: rgba(56,189,248,.14);
  --ok: var(--verde); --neutro: #6b7782; --ko: var(--rosso); --giallo-c: var(--giallo);
  --testata: rgba(10,10,10,.86); --on-hero: #fff; --on-hero-muto: rgba(255,255,255,.72);
}
/* semantici: chiaro (scelto in Info, o automatico con sistema chiaro) */
:root[data-theme="light"] {
  color-scheme: light;
  --sfondo: #f2f4f7; --carta: #ffffff; --carta-alt: #eef1f4; --bordo: #dde2e8;
  --testo: #0f1720; --muto: #56636f; --accento-forte: #d64200; --accento-tint: rgba(255,78,0,.12);
  --link: #0369a1; --link-tint: rgba(3,105,161,.1); --ok: #15803d; --neutro: #8a96a1; --ko: #b91c1c; --giallo-c: #ca8a04;
  --testata: rgba(255,255,255,.9);
}
@media (prefers-color-scheme: light) { :root:not([data-theme]) {
  color-scheme: light;
  --sfondo: #f2f4f7; --carta: #ffffff; --carta-alt: #eef1f4; --bordo: #dde2e8;
  --testo: #0f1720; --muto: #56636f; --accento-forte: #d64200; --accento-tint: rgba(255,78,0,.12);
  --link: #0369a1; --link-tint: rgba(3,105,161,.1); --ok: #15803d; --neutro: #8a96a1; --ko: #b91c1c; --giallo-c: #ca8a04;
  --testata: rgba(255,255,255,.9);
} }

* { box-sizing: border-box; }
html, body { margin: 0; background: var(--sfondo); color: var(--testo); font: 16px/1.45 var(--font); -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%; }
a { color: inherit; text-decoration: none; }
button, select, input { font: inherit; color: inherit; }
button { cursor: pointer; }
main { max-width: var(--max-w); margin: 0 auto; padding: var(--s-3) var(--s-4); overflow-x: clip; }
h2 { font-size: 1.3rem; font-weight: 800; letter-spacing: -.01em; margin: var(--s-4) 0 var(--s-2); }
.vuoto { text-align: center; padding: 2rem 1rem; color: var(--muto); }
.vuoto a { color: var(--link); text-decoration: underline; }
.muto { color: var(--muto); font-size: .9rem; margin: 0; }
.centro { text-align: center; } .centro a { color: var(--link); font-weight: 600; }
.scheletro { height: 180px; border-radius: var(--r-md); background: linear-gradient(90deg, var(--carta), var(--carta-alt), var(--carta)); background-size: 200% 100%; animation: sk 1.2s infinite; }
@keyframes sk { to { background-position: -200% 0; } }
.fonte { max-width: var(--max-w); margin: 0 auto; padding: var(--s-2) var(--s-4) calc(var(--tab-h) + var(--s-4) + env(safe-area-inset-bottom)); font-size: .72rem; color: var(--muto); text-align: center; }
.fonte a { color: var(--muto); text-decoration: underline; }

/* testata */
header.testa { position: sticky; top: 0; z-index: 5; background: var(--testata); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); border-bottom: 1px solid var(--bordo); padding: var(--s-2) var(--s-4); padding-top: max(var(--s-2), env(safe-area-inset-top)); display: flex; align-items: center; justify-content: space-between; gap: var(--s-3); }
.marchio { display: flex; align-items: center; gap: var(--s-2); font-size: 1.15rem; font-weight: 800; letter-spacing: -.01em; min-height: 44px; }
.marchio b { color: var(--accento); }
.agg { font-size: .7rem; color: var(--muto); text-align: right; line-height: 1.25; }
.stale { color: var(--accento); font-weight: 700; }

/* barra inferiore */
.tabbar { position: fixed; bottom: 0; left: 0; right: 0; height: calc(var(--tab-h) + env(safe-area-inset-bottom)); padding-bottom: env(safe-area-inset-bottom); background: var(--testata); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); border-top: 1px solid var(--bordo); display: flex; z-index: 5; }
.tabbar a { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; font-size: .68rem; color: var(--muto); min-height: 44px; }
.tabbar a svg { width: 22px; height: 22px; }
.tabbar a.attivo { color: var(--accento); font-weight: 700; }

/* hero con foto */
.hero { position: relative; margin: calc(-1 * var(--s-3)) calc(-1 * var(--s-4)) var(--s-4); padding: var(--s-5) var(--s-4) var(--s-5); color: var(--on-hero); background: linear-gradient(180deg, rgba(1,33,59,.80) 0%, rgba(10,10,10,.94) 100%), var(--foto, none) center / cover no-repeat, #05111c; overflow: hidden; }
.hero::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: linear-gradient(90deg, var(--arancio), var(--azzurro)); }
.hero h1 { font-size: 1.6rem; line-height: 1.15; font-weight: 800; letter-spacing: -.02em; margin: 0 0 var(--s-1); }
.hero .sotto { color: var(--on-hero-muto); font-size: .85rem; margin: 0; }
.hero a { color: var(--on-hero); }

/* barra contesto e foglio */
.chip-contesto { display: inline-flex; align-items: center; gap: var(--s-2); min-height: 44px; padding: 0 var(--s-4); border-radius: var(--r-full); border: 1px solid rgba(255,255,255,.22); background: rgba(255,255,255,.1); color: var(--on-hero); font-weight: 700; }
.chip-contesto .freccina { opacity: .8; font-size: .8rem; }
.contesto-riga { display: flex; justify-content: space-between; align-items: center; gap: var(--s-2); flex-wrap: wrap; margin-bottom: var(--s-3); }
.foglio-velo { position: fixed; inset: 0; background: rgba(0,0,0,.6); z-index: 20; display: flex; align-items: flex-end; justify-content: center; }
.foglio { width: 100%; max-width: var(--max-w); background: var(--carta); color: var(--testo); border-radius: var(--r-lg) var(--r-lg) 0 0; padding: var(--s-4) var(--s-4) calc(var(--s-6) + env(safe-area-inset-bottom)); max-height: 80vh; overflow-y: auto; box-shadow: var(--ombra); }
.foglio h3 { margin: var(--s-3) 0 var(--s-2); font-size: .78rem; text-transform: uppercase; letter-spacing: .6px; color: var(--muto); }
.foglio .maniglia { width: 40px; height: 4px; border-radius: 2px; background: var(--bordo); margin: 0 auto var(--s-3); }
.chips { display: flex; flex-wrap: wrap; gap: var(--s-2); }
.chip { min-height: 44px; padding: 0 var(--s-4); border-radius: var(--r-full); border: 1px solid var(--bordo); background: var(--carta-alt); font-weight: 600; }
.chip.attivo { background: var(--accento); border-color: var(--accento); color: #fff; }

/* card, segmenti, tab */
.card { background: var(--carta); border: 1px solid var(--bordo); border-radius: var(--r-md); padding: var(--s-3) var(--s-4); margin-bottom: var(--s-3); }
.card.piena { padding: 0; overflow: hidden; }
.card h3 { margin: 0 0 var(--s-2); font-size: .74rem; text-transform: uppercase; letter-spacing: .6px; color: var(--muto); }
.card p { margin: 0 0 var(--s-2); } .card p:last-child { margin-bottom: 0; }
.card p a { color: var(--link); text-decoration: underline; }
.segmenti { display: flex; gap: var(--s-1); background: var(--carta-alt); border-radius: var(--r-full); padding: 3px; margin: var(--s-2) 0 var(--s-3); }
.segmenti button { flex: 1; border: 0; background: transparent; color: var(--muto); border-radius: var(--r-full); min-height: 44px; padding: 0 var(--s-2); font-weight: 600; }
.segmenti button.attivo { background: var(--accento); color: #fff; }
.tabs { display: flex; gap: var(--s-4); overflow-x: auto; border-bottom: 1px solid var(--bordo); margin: 0 0 var(--s-3); scrollbar-width: none; }
.tabs::-webkit-scrollbar { display: none; }
.tabs button { border: 0; background: none; color: var(--muto); padding: var(--s-2) 0; min-height: 44px; white-space: nowrap; border-bottom: 3px solid transparent; margin-bottom: -1px; font-weight: 600; }
.tabs button.attivo { color: var(--testo); border-color: var(--accento); }

/* tabelle */
.scroll-x { overflow-x: auto; }
table.tab { width: 100%; border-collapse: collapse; font-size: .9rem; }
.tab th, .tab td { padding: 9px 6px; text-align: center; border-bottom: 1px solid var(--bordo); white-space: nowrap; }
.tab th { color: var(--muto); font-weight: 700; font-size: .7rem; text-transform: uppercase; letter-spacing: .4px; }
.tab tr:last-child td { border-bottom: 0; }
.tab .sx { text-align: left; }
.tab .nome { max-width: 46vw; overflow: hidden; text-overflow: ellipsis; }
.tab .nome .stemma { vertical-align: middle; margin-right: 8px; }
.tab tr.evid td { background: var(--accento-tint); }
.tab tr.cliccabile { cursor: pointer; } .tab tr.cliccabile td { height: 44px; }
.tab tr.zona-su td:first-child { box-shadow: inset 4px 0 0 var(--ok); }
.tab tr.zona-giu td:first-child { box-shadow: inset 4px 0 0 var(--ko); }

/* forma, badge, cartellini, stemma */
.forma-lista { display: inline-flex; gap: 3px; }
.forma { display: inline-flex; width: 20px; height: 20px; border-radius: var(--r-full); font-size: .66rem; font-weight: 800; color: #fff; align-items: center; justify-content: center; }
.forma.V { background: var(--ok); } .forma.N { background: var(--neutro); } .forma.P { background: var(--ko); }
.badge { display: inline-block; font-size: .66rem; font-weight: 700; padding: 2px 8px; border-radius: var(--r-full); background: var(--carta-alt); color: var(--muto); }
.badge.accento { background: var(--accento-tint); color: var(--accento-forte); }
.cart { display: inline-block; width: 9px; height: 13px; border-radius: 2px; vertical-align: -2px; margin-left: 4px; }
.cart.giallo { background: var(--giallo-c); } .cart.rosso { background: var(--ko); }
.stemma { flex-shrink: 0; display: inline-block; }
img.stemma { object-fit: contain; border-radius: 6px; }

/* stellina */
.stella { border: 0; background: none; color: var(--muto); min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; padding: 0; pointer-events: auto; }
.stella svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 2; }
.stella.attiva { color: var(--accento); } .stella.attiva svg { fill: currentColor; }

/* home: selettore giorno (dentro l'hero) */
.giorno { display: flex; align-items: center; justify-content: space-between; gap: var(--s-2); }
.giorno .freccia { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: var(--r-full); background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.2); color: var(--on-hero); font-size: 1.4rem; }
.giorno .freccia.off { opacity: .3; }
.giorno .titolo { flex: 1; position: relative; text-align: center; font-weight: 800; font-size: 1.2rem; line-height: 1.2; min-height: 44px; display: flex; flex-direction: column; justify-content: center; }
.giorno .titolo:focus-within { outline: 2px solid var(--accento); outline-offset: 2px; border-radius: var(--r-sm); }
.giorno .titolo small { display: block; color: var(--on-hero-muto); font-weight: 500; font-size: .78rem; }
.giorno .titolo select { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; }

/* in evidenza */
.evidenza { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--s-2); margin-bottom: var(--s-3); }
.tessera { position: relative; background: linear-gradient(160deg, var(--carta-alt), var(--carta)); border: 1px solid var(--bordo); border-radius: var(--r-md); padding: var(--s-3); display: flex; flex-direction: column; gap: var(--s-1); min-height: 104px; }
.tessera small { color: var(--muto); font-size: .68rem; text-transform: uppercase; letter-spacing: .6px; font-weight: 700; }
.tessera .chi { display: flex; align-items: center; gap: var(--s-2); font-weight: 700; line-height: 1.2; min-width: 0; }
.tessera .chi span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tessera .numero { font-size: 1.6rem; font-weight: 800; color: var(--accento); line-height: 1; margin-top: auto; }
.tessera .numero small { font-size: .7rem; color: var(--muto); text-transform: none; letter-spacing: 0; margin-left: 4px; }

/* gruppi e righe partita */
.intest-girone { min-height: 44px; display: flex; align-items: center; justify-content: space-between; padding: var(--s-2) var(--s-4); background: var(--carta-alt); font-size: .8rem; color: var(--muto); }
.intest-girone b { color: var(--testo); }
.freccia-piccola { color: var(--link); font-weight: 700; }
.partita { position: relative; display: grid; grid-template-columns: 56px 1fr auto; align-items: center; gap: var(--s-2); padding: var(--s-2) var(--s-3); border-top: 1px solid var(--bordo); min-height: 68px; }
.partita-link { position: absolute; inset: 0; z-index: 0; }
.partita .stella, .partita .squadre span, .partita .squadre .stemma, .partita .quando, .partita .extra { position: relative; z-index: 1; }
.partita .squadre span, .partita .squadre .stemma, .partita .quando, .partita .extra { pointer-events: none; }
.partita.tavolino .ris { color: var(--muto); }
.quando { text-align: center; line-height: 1.1; }
.quando small { display: block; color: var(--muto); font-size: .66rem; }
.ris { font-weight: 800; font-size: 1.15rem; }
.ris i { font-style: normal; color: var(--muto); padding: 0 2px; }
.ris.evid { color: var(--accento); }
.ora { color: var(--muto); font-size: .9rem; font-weight: 600; }
.squadre .riga { display: flex; align-items: center; gap: var(--s-2); min-width: 0; }
.squadre .riga span { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.squadre .riga.pref span { font-weight: 800; color: var(--accento-forte); }
.extra { display: flex; flex-direction: column; gap: 3px; align-items: flex-end; }
.mia { padding: var(--s-2) 0; border-top: 1px solid var(--bordo); }
.mia:first-of-type { border-top: 0; }
.mia-nome { font-weight: 800; display: flex; align-items: center; gap: var(--s-2); min-height: 44px; }
.mia-riga small { color: var(--muto); font-size: .68rem; text-transform: uppercase; letter-spacing: .5px; font-weight: 700; }
.mia-riga .partita { border-top: 0; padding-left: 0; padding-right: 0; min-height: 56px; }

/* dettaglio partita */
.hero .meta { font-size: .74rem; color: var(--on-hero-muto); text-align: center; margin-bottom: var(--s-3); }
.scontro { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: var(--s-2); }
.scontro .lato { display: flex; flex-direction: column; align-items: center; text-align: center; font-weight: 700; gap: var(--s-1); font-size: .92rem; line-height: 1.2; }
.scontro .lato a { min-height: 44px; display: flex; flex-direction: column; align-items: center; gap: var(--s-2); }
.scontro .lato .stella { color: var(--on-hero-muto); }
.scontro .lato .stella.attiva { color: var(--accento); }
.punteggio { font-size: 2.8rem; font-weight: 800; letter-spacing: 1px; line-height: 1; }
.punteggio i { font-style: normal; color: var(--on-hero-muto); padding: 0 4px; }
.punteggio small { font-size: 1.2rem; color: var(--on-hero-muto); }
.timeline { list-style: none; margin: 0; padding: 0; }
.timeline li { display: flex; align-items: center; gap: var(--s-2); padding: 8px 0; border-bottom: 1px solid var(--bordo); }
.timeline li:last-child { border-bottom: 0; }
.timeline li.ospite { flex-direction: row-reverse; text-align: right; }
.timeline .min { color: var(--accento); font-weight: 800; min-width: 34px; }
.timeline .pallone { font-size: .95rem; }
.mvp { margin: var(--s-3) 0 0; font-weight: 700; display: flex; align-items: center; gap: var(--s-2); }
.mvp .badge { background: var(--giallo-c); color: #111; }
.tab.form td.casa, .tab.form th.casa { text-align: left; }
.tab.form td.ospite, .tab.form th.ospite { text-align: right; }
.tab.form td.num { color: var(--muto); font-size: .75rem; }
.voto { margin-left: 6px; font-size: .78rem; font-weight: 800; color: var(--link); }

/* classifica: podio */
.podio { display: grid; grid-template-columns: 1fr 1.15fr 1fr; align-items: end; gap: var(--s-2); margin: var(--s-2) 0 var(--s-4); }
.gradino { display: flex; flex-direction: column; align-items: center; gap: var(--s-1); text-align: center; min-width: 0; }
.gradino .nome { font-weight: 700; font-size: .82rem; line-height: 1.2; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gradino .base { width: 100%; border-radius: var(--r-sm) var(--r-sm) 0 0; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.3rem; color: #111; }
.gradino.p1 .base { height: 76px; background: linear-gradient(180deg, var(--oro), #b8901f); }
.gradino.p2 .base { height: 56px; background: linear-gradient(180deg, var(--argento), #8c949c); }
.gradino.p3 .base { height: 44px; background: linear-gradient(180deg, var(--bronzo), #9a5f2c); }
.gradino .pt { font-size: .78rem; color: var(--muto); font-weight: 700; }

/* squadra e giocatore */
.hero-squadra { display: flex; align-items: center; gap: var(--s-4); }
.hero-squadra h1 { margin: 0; }
.hero-squadra .stella { color: var(--on-hero-muto); margin-left: auto; }
.hero-squadra .stella.attiva { color: var(--accento); }
.foto-squadra { width: 100%; border-radius: var(--r-md); display: block; margin-bottom: var(--s-3); }
.ris-riga { display: grid; grid-template-columns: 64px 1fr auto; align-items: center; gap: var(--s-2); padding: 8px 0; border-top: 1px solid var(--bordo); min-height: 48px; }
.ris-riga:first-child { border-top: 0; }
.ris-riga .data { color: var(--muto); font-size: .78rem; }
.ris-riga .avv { display: flex; align-items: center; gap: var(--s-2); overflow: hidden; white-space: nowrap; }
.ris-riga .avv span { overflow: hidden; text-overflow: ellipsis; }
.ris-riga .punti { display: inline-flex; align-items: center; gap: 6px; font-weight: 800; }
.stat-griglia { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--s-3) var(--s-4); }
.stat small { display: block; color: var(--muto); font-size: .68rem; text-transform: uppercase; letter-spacing: .5px; font-weight: 700; }
.stat b { font-size: 1.5rem; font-weight: 800; }

/* classifiche giocatori */
.riga-gioc { display: grid; grid-template-columns: 34px auto 1fr auto; align-items: center; gap: var(--s-3); padding: var(--s-2) var(--s-4); border-top: 1px solid var(--bordo); min-height: 60px; }
.riga-gioc:first-child { border-top: 0; }
.riga-gioc .pos { font-weight: 800; color: var(--muto); text-align: center; font-size: 1.05rem; }
.riga-gioc .chi { min-width: 0; }
.riga-gioc .chi b { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.riga-gioc .chi small { color: var(--muto); font-size: .74rem; }
.riga-gioc .valore { font-size: 1.4rem; font-weight: 800; color: var(--accento); }
.sq-sotto { display: block; color: var(--muto); font-size: .72rem; }

/* info */
.loghi { display: flex; gap: var(--s-4); align-items: center; margin-top: var(--s-3); }
.loghi img { height: 56px; width: auto; background: #fff; border-radius: var(--r-sm); padding: 4px; }

/* introduzione */
body.intro { background: #05111c; }
.intro-schermo { min-height: 100vh; min-height: 100dvh; display: flex; flex-direction: column; color: #fff; background: linear-gradient(180deg, rgba(1,33,59,.55) 0%, rgba(10,10,10,.96) 70%), var(--foto, none) center / cover no-repeat, #05111c; padding: max(var(--s-4), env(safe-area-inset-top)) var(--s-4) max(var(--s-6), env(safe-area-inset-bottom)); }
.intro-schermo .alto { display: flex; justify-content: space-between; align-items: center; }
.intro-schermo .salta { color: rgba(255,255,255,.8); min-height: 44px; display: inline-flex; align-items: center; padding: 0 var(--s-2); font-weight: 600; }
.intro-corpo { max-width: var(--max-w); width: 100%; margin: auto auto 0; display: flex; flex-direction: column; gap: var(--s-4); }
.intro-corpo h1 { font-size: 2.1rem; line-height: 1.1; font-weight: 800; letter-spacing: -.02em; margin: 0; }
.intro-corpo h1 b { color: var(--arancio); }
.intro-corpo p { color: rgba(255,255,255,.8); margin: 0; font-size: 1.05rem; }
.punti-avanzamento { display: flex; gap: 6px; }
.punti-avanzamento i { width: 8px; height: 8px; border-radius: 4px; background: rgba(255,255,255,.3); }
.punti-avanzamento i.attivo { width: 24px; background: var(--arancio); }
.bottone { display: inline-flex; align-items: center; justify-content: center; min-height: 52px; padding: 0 var(--s-6); border-radius: var(--r-full); border: 0; background: var(--arancio); color: #fff; font-weight: 800; font-size: 1.05rem; }
.bottone.secondario { background: rgba(255,255,255,.12); }
.camp-card { background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.16); border-radius: var(--r-md); padding: var(--s-4); }
.camp-card h2 { margin: 0 0 var(--s-3); font-size: 1.2rem; }
.camp-card .chip { background: rgba(255,255,255,.1); border-color: rgba(255,255,255,.22); color: #fff; }
.griglia-squadre { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: var(--s-2); max-height: 52vh; overflow-y: auto; }
.squadra-scelta { display: flex; flex-direction: column; align-items: center; gap: var(--s-1); padding: var(--s-2); min-height: 108px; border-radius: var(--r-md); border: 1px solid rgba(255,255,255,.16); background: rgba(255,255,255,.06); color: #fff; font-size: .74rem; font-weight: 700; text-align: center; line-height: 1.15; }
.squadra-scelta[aria-pressed="true"] { border-color: var(--arancio); background: rgba(255,78,0,.22); }
```

- [ ] **Step 4: `site/js/views/comuni.js`** — aggiungi in testa `import { stemmaHTML } from '../stemma.js';` e:
```js
export function squadraDa(indice, id) {
  const s = indice.squadre.find(x => x.id === id);
  return s ? { id: s.id, nome: s.nome, stemma: !!s.stemma } : { id, nome: '?', stemma: false };
}
export const heroHTML = ({ foto = 'campo', classe = '', contenuto = '' }) =>
  `<section class="hero ${classe}" style="--foto:url(img/foto/${foto}.jpg)">${contenuto}</section>`;
```
e in `rigaPartita` sostituisci le due righe `.riga` con (stesso markup più lo stemma prima del nome):
```js
      <div class="riga ${casaPref ? 'pref' : ''}">${stemmaHTML(squadraDa(indice, p.casaId), 24)}<span>${esc(nomeSquadra(indice, p.casaId))}</span>${stellaHTML(p.casaId, nomeSquadra(indice, p.casaId), casaPref)}</div>
      <div class="riga ${ospPref ? 'pref' : ''}">${stemmaHTML(squadraDa(indice, p.ospiteId), 24)}<span>${esc(nomeSquadra(indice, p.ospiteId))}</span>${stellaHTML(p.ospiteId, nomeSquadra(indice, p.ospiteId), ospPref)}</div>
```

- [ ] **Step 5: `site/js/views/contesto-ui.js`**
```js
import { esc } from '../util.js';
import { TUTTI, leggiGirone, impostaGirone, etichettaGirone } from '../contesto.js';

export function barraContesto(indice, { tutti = false } = {}) {
  const scelto = leggiGirone(indice);
  const slug = scelto === TUTTI && !tutti ? (indice.campionati[0]?.gironi[0]?.slug ?? TUTTI) : scelto;
  return `<button class="chip-contesto" data-contesto aria-haspopup="dialog">${esc(etichettaGirone(indice, slug))}<span class="freccina" aria-hidden="true">▾</span></button>`;
}

export function collegaContesto(root, indice, { tutti = false, onCambio }) {
  const btn = root.querySelector('[data-contesto]');
  if (!btn) return;
  btn.onclick = () => apriFoglio(indice, { tutti, onCambio, ritorno: btn });
}

function apriFoglio(indice, { tutti, onCambio, ritorno }) {
  const scelto = leggiGirone(indice);
  const velo = document.createElement('div');
  velo.className = 'foglio-velo';
  velo.innerHTML = `<div class="foglio" role="dialog" aria-modal="true" aria-label="Scegli campionato e girone">
    <div class="maniglia"></div>
    ${tutti ? `<div class="chips"><button class="chip ${scelto === TUTTI ? 'attivo' : ''}" data-girone="${TUTTI}">Tutti i gironi</button></div>` : ''}
    ${indice.campionati.map(c => `<h3>${esc(c.nome)}</h3><div class="chips">${c.gironi.map(g => `<button class="chip ${scelto === g.slug ? 'attivo' : ''}" data-girone="${esc(g.slug)}">${esc(g.nome)}</button>`).join('')}</div>`).join('')}
  </div>`;
  const chiudi = () => { velo.remove(); document.removeEventListener('keydown', suTasto); ritorno?.focus(); };
  const suTasto = (e) => { if (e.key === 'Escape') chiudi(); };
  velo.onclick = (e) => { if (e.target === velo) chiudi(); };
  velo.querySelectorAll('[data-girone]').forEach(b => { b.onclick = () => { impostaGirone(b.dataset.girone); chiudi(); onCambio?.(b.dataset.girone); }; });
  document.addEventListener('keydown', suTasto);
  document.body.appendChild(velo);
  velo.querySelector('.chip.attivo, .chip')?.focus();
}
```

- [ ] **Step 6: `site/js/app.js`**
  - Import: `import * as intro from './views/intro.js';` e `import { introDaMostrare } from './contesto.js';`; aggiungi `intro` a `VISTE`.
  - In `render()`, subito dopo aver calcolato `rotta`: se `rotta.vista === 'intro'` → `document.body.classList.add('intro')`, `app.innerHTML = '<main class="intro-main"></main>'`, poi lo stesso try/render/dopo di sempre su quel `main` (con la guardia `renderId`) e `return`; altrimenti `document.body.classList.remove('intro')` e prosegui come oggi.
  - Testata: sostituisci `<img src="icons/icon.svg" ...>` con lo stesso tag (resta) e lascia `agg.`; nessun altro cambio.
  - In `avvia()`, dopo `indice = await caricaIndice(); ultimoCaricamento = Date.now();` e prima di `await render();`: `if (introDaMostrare() && !location.hash.startsWith('#/intro')) { history.replaceState(null, '', '#/intro'); }`.
- [ ] **Step 7: Segnaposto** `site/js/views/intro.js`:
```js
export async function render() { return '<p class="vuoto">Introduzione in costruzione. <a href="#/partite">Vai alle partite</a></p>'; }
```

- [ ] **Step 8: Script di verifica visiva `scripts/screenshot.sh`** (usato anche dai task successivi; rendilo eseguibile con `chmod +x`):
```bash
#!/usr/bin/env bash
# Screenshot a 390px di una rotta del sito locale, con intro/girone/tema preimpostati.
# Uso: scripts/screenshot.sh OUT_DIR ROTTA [GIRONE] [TEMA]
#   es.  scripts/screenshot.sh /tmp/shots partite serie-b scuro
#        INTRO=no scripts/screenshot.sh /tmp/shots intro        (mostra l'introduzione)
set -euo pipefail
OUT=$1; ROTTA=$2; GIRONE=${3:-tutti}; TEMA=${4:-scuro}; INTRO=${INTRO:-ok}
RADICE=$(cd "$(dirname "$0")/.." && pwd)
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
TMP=$(mktemp -d); ln -s "$RADICE/site" "$TMP/site"
cat > "$TMP/apri.html" <<HTML
<!doctype html><script>localStorage.setItem('sl.intro','$INTRO');localStorage.setItem('sl.girone','$GIRONE');localStorage.setItem('sl.tema','$TEMA');location.replace('/site/#/$ROTTA')</script>
HTML
printf '<!doctype html><body style="margin:0;background:#888"><iframe src="http://localhost:8089/apri.html" style="width:390px;height:844px;border:0"></iframe>' > "$TMP/cornice.html"
python3 -m http.server -d "$TMP" 8089 >/dev/null 2>&1 & PID=$!
sleep 1
mkdir -p "$OUT"; NOME=$(echo "$ROTTA" | tr '/' '_')
"$CH" --headless=new --disable-gpu --hide-scrollbars --window-size=500,860 --virtual-time-budget=6000 --screenshot="$OUT/${NOME}-${GIRONE}-${TEMA}.png" "file://$TMP/cornice.html" 2>/dev/null || true
kill $PID 2>/dev/null || true; rm -rf "$TMP"
echo "$OUT/${NOME}-${GIRONE}-${TEMA}.png"
```
Poi `npm test` (verde), `node --check` su ogni file in `site/js` e `site/js/views`, e:
```bash
OUT=$(mktemp -d)
scripts/screenshot.sh $OUT partite tutti scuro
scripts/screenshot.sh $OUT classifiche serie-b scuro
scripts/screenshot.sh $OUT partite tutti chiaro
```
Apri i tre PNG con lo strumento Read. Atteso: sfondo nero, testata scura sfocata, righe partita con stemmi colorati a sinistra dei nomi, tabbar con voce attiva arancione, segmenti arancioni; nel tema chiaro sfondo chiaro e testo scuro leggibile. Correggi il CSS se qualcosa è illeggibile o sborda a destra.

- [ ] **Step 9: Commit** `feat: tema nero, nuovo stile, barra contesto e stemmi nelle righe partita`.

---

### Task 4: Introduzione al primo avvio

**Files:**
- Replace: `site/js/views/intro.js`
- Modify: `site/js/views/info.js` (link "Rivedi l'introduzione")

**Interfaces:**
- Consumes: `contesto.js` (`gironi`, `impostaGirone`, `leggiGirone`, `gironeEffettivo`, `segnaIntroVista`, `riattivaIntro`), `preferiti.js` (`èPreferita`, `togglePreferito`), `stemmaHTML`, `esc`, `app.js` (vista `intro` senza testata/tabbar, `ctx.naviga`).
- Rotte: `#/intro` (passo 1), `#/intro/2`, `#/intro/3`.

- [ ] **Step 1: `site/js/views/intro.js`**
```js
import { esc } from '../util.js';
import { stemmaHTML } from '../stemma.js';
import { gironi, impostaGirone, gironeEffettivo, segnaIntroVista } from '../contesto.js';
import { èPreferita, togglePreferito } from '../preferiti.js';

const punti = (n) => `<div class="punti-avanzamento" aria-label="Passo ${n} di 3">${[1, 2, 3].map(i => `<i class="${i === n ? 'attivo' : ''}"></i>`).join('')}</div>`;
const schermo = (foto, n, corpo) => `<section class="intro-schermo" style="--foto:url(img/foto/${foto}.jpg)">
  <div class="alto">${punti(n)}<a href="#/partite" class="salta" data-fine>Salta</a></div>
  <div class="intro-corpo">${corpo}</div></section>`;

function passo1() {
  return schermo('premiazione', 1, `
    <img src="icons/icon.svg" alt="" width="64" height="64">
    <h1>Sporting <b>Live</b></h1>
    <p>Tutti i campionati dello Sporting Club Mestre in tasca: risultati, classifiche, marcatori e statistiche, aggiornati ogni sera.</p>
    <a class="bottone" href="#/intro/2">Inizia</a>`);
}

function passo2(indice) {
  return schermo('campo', 2, `
    <h1>Il tuo <b>campionato</b></h1>
    <p>Scegli categoria e girone: lo ritrovi sempre in alto per cambiarlo.</p>
    ${indice.campionati.map(c => `<div class="camp-card"><h2>${esc(c.nome)}</h2><div class="chips">${c.gironi.map(g => `<button class="chip" data-girone="${esc(g.slug)}">${esc(g.nome)}</button>`).join('')}</div></div>`).join('')}`);
}

function passo3(indice) {
  const slug = gironeEffettivo(indice);
  const g = gironi(indice).find(x => x.slug === slug);
  const squadre = indice.squadre.filter(s => s.girone === slug).sort((a, b) => a.nome.localeCompare(b.nome));
  return schermo('campo', 3, `
    <h1>La tua <b>squadra</b></h1>
    <p>${g ? esc(`${g.campionato.nome} · ${g.nome}`) : ''}. Tocca la tua squadra (anche più di una): la vedrai per prima.</p>
    <div class="griglia-squadre">${squadre.map(s => `<button class="squadra-scelta" data-squadra="${Number(s.id)}" aria-pressed="${èPreferita(s.id)}">${stemmaHTML(s, 48)}<span>${esc(s.nome)}</span></button>`).join('')}</div>
    <button class="bottone" data-fine>Fatto</button>`);
}

export async function render({ indice, rotta }) {
  const n = Number(rotta.params[0]) || 1;
  return n === 2 ? passo2(indice) : n === 3 ? passo3(indice) : passo1();
}

export function dopo(ctx, root) {
  root.querySelectorAll('[data-fine]').forEach(el => { el.onclick = (e) => { e.preventDefault(); segnaIntroVista(); ctx.naviga('#/partite'); }; });
  root.querySelectorAll('[data-girone]').forEach(b => { b.onclick = () => { impostaGirone(b.dataset.girone); ctx.naviga('#/intro/3'); }; });
  root.querySelectorAll('.squadra-scelta').forEach(b => {
    b.onclick = () => { togglePreferito(b.dataset.squadra); b.setAttribute('aria-pressed', String(èPreferita(b.dataset.squadra))); };
  });
}
```

- [ ] **Step 2: Info** — in `site/js/views/info.js` importa `riattivaIntro` da `../contesto.js` e aggiungi, prima della riga con la versione, `<p class="centro"><a href="#/intro" data-rivedi>Rivedi l'introduzione</a></p>`; in `dopo` collega `root.querySelector('[data-rivedi]').onclick = () => riattivaIntro();` (la navigazione la fa il link).

- [ ] **Step 3: Verifica** — `npm test`, `node --check site/js/views/intro.js site/js/views/info.js`, poi:
```bash
OUT=$(mktemp -d)
INTRO=no scripts/screenshot.sh $OUT intro
INTRO=no scripts/screenshot.sh $OUT intro/2
INTRO=no scripts/screenshot.sh $OUT intro/3 serie-b
```
Apri i PNG con Read. Atteso: foto a tutto schermo con velo scuro, titolo grande con parola arancione, punti di avanzamento, "Salta" in alto a destra; passo 2 con due card (Calcio a 8 con tre chip, Calcio a 5 con uno); passo 3 con griglia di stemmi colorati e nomi della Serie B e bottone "Fatto". Nessun elemento oltre i 390px.
- [ ] **Step 4: Commit** `feat: introduzione al primo avvio con scelta di girone e squadra`.

---

### Task 5: Home Partite con hero, contesto e "In evidenza"

**Files:**
- Replace: `site/js/views/partite.js`

**Interfaces:**
- Consumes: `heroHTML`, `rigaPartita`, `collegaStelle`, `nomeSquadra`, `squadraDa`, `card`, `vuoto` (comuni.js), `barraContesto`, `collegaContesto` (contesto-ui.js), `TUTTI`, `leggiGirone`, `gironi` (contesto.js), `capolista`, `capocannoniere`, `ultimaGiornata` (evidenza.js), `stemmaHTML`, funzioni di `giorni.js`, `ctx.carica('girone/<slug>.json')`.
- Comportamento: con girone scelto, giorni e partite solo di quel girone; con "tutti", tutte (come oggi). Il cambio di girone dal foglio ridisegna la vista restando sulla stessa rotta.

- [ ] **Step 1: `site/js/views/partite.js`**
```js
import { esc, formattaData, formattaDataLunga } from '../util.js';
import { DA_DEFINIRE, giorniConPartite, giornoIniziale, partiteDelGiorno, raggruppaPerGirone, partitePreferite } from '../giorni.js';
import { leggiPreferiti } from '../preferiti.js';
import { stemmaHTML } from '../stemma.js';
import { TUTTI, leggiGirone, gironi } from '../contesto.js';
import { capolista, capocannoniere, ultimaGiornata } from '../evidenza.js';
import { rigaPartita, collegaStelle, nomeSquadra, squadraDa, card, vuoto, heroHTML } from './comuni.js';
import { barraContesto, collegaContesto } from './contesto-ui.js';

function selettoreGiorno(giorni, giorno, oggi, haDaDefinire) {
  const i = giorni.indexOf(giorno);
  const prev = i > 0 ? giorni[i - 1] : null, next = i >= 0 && i < giorni.length - 1 ? giorni[i + 1] : null;
  const titolo = giorno === DA_DEFINIRE ? 'Da definire' : (giorno === oggi ? 'Oggi' : formattaDataLunga(giorno));
  return `<div class="giorno">
    ${prev ? `<a class="freccia" href="#/partite/${prev}" aria-label="giorno precedente">‹</a>` : '<span class="freccia off" aria-hidden="true">‹</span>'}
    <label class="titolo"><span>${esc(titolo)}</span>${giorno !== DA_DEFINIRE ? `<small>${esc(formattaData(giorno))}</small>` : ''}
      <select aria-label="Scegli il giorno">${giorni.map(g => `<option value="${g}" ${g === giorno ? 'selected' : ''}>${formattaData(g)}${g === oggi ? ' (oggi)' : ''}</option>`).join('')}${haDaDefinire ? `<option value="${DA_DEFINIRE}" ${giorno === DA_DEFINIRE ? 'selected' : ''}>da definire</option>` : ''}</select>
    </label>
    ${next ? `<a class="freccia" href="#/partite/${next}" aria-label="giorno successivo">›</a>` : '<span class="freccia off" aria-hidden="true">›</span>'}
  </div>`;
}

function bloccoPreferite(indice, partite, oggi) {
  const pref = leggiPreferiti();
  if (!pref.length) return card('Le mie squadre', '<p class="muto">Tocca la stellina accanto a una squadra per vederla qui.</p>');
  const r = partitePreferite(indice.partite, pref, oggi);
  if (!r.length) return '';
  return card('Le mie squadre', r.map(x => `<div class="mia">
      <a href="#/squadra/${Number(x.squadraId)}" class="mia-nome">${stemmaHTML(squadraDa(indice, x.squadraId), 32)}${esc(nomeSquadra(indice, x.squadraId))}</a>
      ${x.ultima ? `<div class="mia-riga"><small>ultima</small>${rigaPartita(x.ultima, indice, { mostraData: true })}</div>` : ''}
      ${x.prossima ? `<div class="mia-riga"><small>prossima</small>${rigaPartita(x.prossima, indice, { mostraData: true })}</div>` : ''}
    </div>`).join(''));
}

const tessera = (titolo, chi, numero, href) => `<a class="tessera" href="${href}"><small>${esc(titolo)}</small><div class="chi">${chi}</div><div class="numero">${numero}</div></a>`;

async function inEvidenza(indice, scelto, carica) {
  try {
    if (scelto !== TUTTI) {
      const g = await carica(`girone/${scelto}.json`);
      const cl = capolista(g), cc = capocannoniere(g), ug = ultimaGiornata(g);
      const t = [];
      if (cl) t.push(tessera('Capolista', `${stemmaHTML(squadraDa(indice, cl.squadraId), 28)}<span>${esc(cl.nome)}</span>`, `${cl.pt}<small>punti</small>`, `#/squadra/${Number(cl.squadraId)}`));
      if (cc) t.push(tessera('Capocannoniere', `${stemmaHTML(squadraDa(indice, cc.squadraId), 28)}<span>${esc(cc.nome)}</span>`, `${cc.gol}<small>gol</small>`, `#/giocatore/${esc(cc.slug)}`));
      if (ug) t.push(tessera('Ultima giornata', `<span>${ug.partite.length} partite giocate</span>`, `${ug.giornata}ª<small>giornata</small>`, `#/classifiche/${esc(scelto)}`));
      return t.length ? `<div class="evidenza">${t.join('')}</div>` : '';
    }
    const tutti = await Promise.all(gironi(indice).map(async x => ({ x, g: await carica(`girone/${x.slug}.json`) })));
    const t = tutti.map(({ x, g }) => ({ x, cl: capolista(g) })).filter(o => o.cl)
      .map(({ x, cl }) => tessera(`Capolista ${x.nome}`, `${stemmaHTML(squadraDa(indice, cl.squadraId), 28)}<span>${esc(cl.nome)}</span>`, `${cl.pt}<small>punti</small>`, `#/squadra/${Number(cl.squadraId)}`));
    return t.length ? `<div class="evidenza">${t.join('')}</div>` : '';
  } catch { return ''; }
}

export async function render({ indice, rotta, oggi, carica }) {
  const scelto = leggiGirone(indice);
  const partite = scelto === TUTTI ? indice.partite : indice.partite.filter(p => p.girone === scelto);
  const giorni = giorniConPartite(partite);
  const haDaDefinire = partite.some(p => !p.data);
  const param = rotta.params[0];
  const giorno = (param && (giorni.includes(param) || param === DA_DEFINIRE) ? param : null) || giornoIniziale(giorni, oggi) || (haDaDefinire ? DA_DEFINIRE : null);
  const hero = heroHTML({ foto: 'campo', classe: 'hero-home', contenuto: `
    <div class="contesto-riga">${barraContesto(indice, { tutti: true })}</div>
    ${giorno ? selettoreGiorno(giorni, giorno, oggi, haDaDefinire) : '<h1>Nessuna partita in calendario</h1>'}` });
  if (!giorno) return hero;
  const gruppi = raggruppaPerGirone(partiteDelGiorno(partite, giorno), indice);
  return `${hero}
    ${bloccoPreferite(indice, partite, oggi)}
    ${await inEvidenza(indice, scelto, carica)}
    ${gruppi.length ? gruppi.map(g => `<section class="card piena">
      <a class="intest-girone" href="#/classifiche/${esc(g.girone.slug)}"><span>${esc(g.campionato)} · <b>${esc(g.girone.nome)}</b></span><span class="freccia-piccola">classifica ›</span></a>
      ${g.partite.map(p => rigaPartita(p, indice, { evidenzia: giorno === oggi })).join('')}
    </section>`).join('') : vuoto('Nessuna partita in questo giorno.')}`;
}

export function dopo(ctx, root) {
  const ridisegna = async () => { root.innerHTML = await render(ctx); dopo(ctx, root); };
  const sel = root.querySelector('.giorno select');
  if (sel) sel.onchange = () => ctx.naviga(`#/partite/${sel.value}`);
  collegaStelle(root, ridisegna);
  collegaContesto(root, ctx.indice, { tutti: true, onCambio: () => { if (ctx.rotta.params.length) ctx.naviga('#/partite'); else ridisegna(); } });
}
```
Nota: un giorno nell'URL che non ha partite nel girone scelto viene ignorato e si usa il giorno iniziale (risolve anche il deferred "giorno sconosciuto nell'URL").

- [ ] **Step 2: Verifica** — `npm test`, `node --check site/js/views/partite.js`, poi:
```bash
OUT=$(mktemp -d)
scripts/screenshot.sh $OUT partite tutti scuro
scripts/screenshot.sh $OUT partite serie-b scuro
```
Apri i PNG. Atteso: hero con foto del campo velata, chip "Tutti i gironi ▾" / "Calcio a 8 · Serie B ▾", selettore giorno bianco; sotto "Le mie squadre", tessere "In evidenza" (con "tutti": capolista per girone; con Serie B: capolista, capocannoniere, ultima giornata) e le partite del giorno con stemmi.
- [ ] **Step 3: Commit** `feat: home con hero, scelta girone e in evidenza`.

---

### Task 6: Partita, Classifiche e Squadra con hero, stemmi e podio

**Files:**
- Modify: `site/js/views/partita.js`, `site/js/views/classifiche.js`, `site/js/views/squadra.js`

**Interfaces:**
- Consumes: `heroHTML`, `squadraDa`, `stellaHTML`, `collegaStelle`, `card`, `vuoto` (comuni.js); `stemmaHTML`; `barraContesto`, `collegaContesto`; `impostaGirone`, `gironeEffettivo`, `gironi` (contesto.js); `podio` (evidenza.js); `girone.zone` e `squadra.foto` (Task 1).
- Rotte invariate: `#/partita/<id>`, `#/classifiche[/<slug>]`, `#/squadra/<id>`. In Classifiche uno slug nell'URL imposta anche il contesto.

- [ ] **Step 1: `site/js/views/partita.js`**
  - Import aggiuntivi: `import { stemmaHTML } from '../stemma.js';` e da `./comuni.js` anche `heroHTML, squadraDa`.
  - Sotto `let tab = 'riepilogo';` aggiungi `let ultimaId = null;`.
  - In `riepilogo`, la riga della timeline diventa:
    ```js
    `<li class="${m.lato}"><span class="min">${m.minuto}'</span><span class="pallone" aria-hidden="true">⚽</span>${nomeLink(t, m.lato === 'casa' ? p.casa.id : p.ospite.id, m.nome)}</li>`
    ```
    e il migliore in campo diventa:
    ```js
    `<p class="mvp"><span class="badge">★ MVP</span>${nomeLink(t, t.migliore.squadraId, t.migliore.nome)}</p>`
    ```
  - `classifica(p, carica)` diventa `classifica(p, carica, indice)`: tutto il corpo dentro `try { ... } catch { return vuoto('Classifica non disponibile.'); }`, e la cella nome diventa `<td class="sx nome"><a href="#/squadra/${Number(r.squadraId)}">${stemmaHTML(squadraDa(indice, r.squadraId), 24)}${esc(r.nome)}</a></td>`.
  - `render` diventa:
    ```js
    export async function render({ indice, rotta, carica }) {
      const p = await carica(`partita/${rotta.params[0]}.json`);
      if (p.id !== ultimaId) { tab = 'riepilogo'; ultimaId = p.id; }
      const corpo = tab === 'formazioni' ? formazioni(p) : tab === 'classifica' ? await classifica(p, carica, indice) : riepilogo(p);
      const lato = (sq) => `<div class="lato"><a href="#/squadra/${Number(sq.id)}">${stemmaHTML(squadraDa(indice, sq.id), 72)}<span>${esc(sq.nome)}</span></a>${stellaHTML(sq.id, sq.nome)}</div>`;
      return `${heroHTML({ foto: 'campo', classe: 'hero-partita', contenuto: `
          <div class="meta">${esc(p.girone.nome)} · giornata ${Number(p.giornata)} · ${esc(formattaDataLunga(p.data))}${p.ora ? ` ore ${esc(p.ora)}` : ''}${p.tavolino ? ' · <span class="badge">a tavolino</span>' : ''}</div>
          <div class="scontro">${lato(p.casa)}<div class="punteggio">${p.giocata ? `${p.golCasa}<i>-</i>${p.golOspite}` : `<small>${esc(p.ora || '--:--')}</small>`}</div>${lato(p.ospite)}</div>` })}
        <div class="tabs">${[['riepilogo', 'Riepilogo'], ['formazioni', 'Formazioni'], ['classifica', 'Classifica']].map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? 'attivo' : ''}">${l}</button>`).join('')}</div>
        ${corpo}`;
    }
    ```

- [ ] **Step 2: `site/js/views/classifiche.js`** — sostituisci il file:
```js
import { esc, formaHTML, segnoDR } from '../util.js';
import { èPreferita } from '../preferiti.js';
import { stemmaHTML } from '../stemma.js';
import { gironi, impostaGirone, gironeEffettivo } from '../contesto.js';
import { podio } from '../evidenza.js';
import { vuoto, heroHTML, squadraDa } from './comuni.js';
import { barraContesto, collegaContesto } from './contesto-ui.js';

let tipo = 'totale';

function podioHTML(indice, righe) {
  const p = podio(righe);
  if (p.length < 3 || !p[0].g) return '';
  const gradino = (r, n) => `<a class="gradino p${n}" href="#/squadra/${Number(r.squadraId)}">${stemmaHTML(squadraDa(indice, r.squadraId), n === 1 ? 56 : 44)}<span class="nome">${esc(r.nome)}</span><span class="pt">${r.pt} pt</span><span class="base">${n}</span></a>`;
  return `<div class="podio">${gradino(p[1], 2)}${gradino(p[0], 1)}${gradino(p[2], 3)}</div>`;
}

function classeZona(zone, pos, totale) {
  if (!zone) return '';
  if (zone.promozione && pos <= zone.promozione) return 'zona-su';
  if (zone.retrocessione && pos > totale - zone.retrocessione) return 'zona-giu';
  return '';
}

export async function render({ indice, rotta, carica }) {
  const lista = gironi(indice);
  if (!lista.length) return vuoto('Nessun campionato in corso.');
  if (rotta.params[0] && lista.some(g => g.slug === rotta.params[0])) impostaGirone(rotta.params[0]);
  const slug = gironeEffettivo(indice);
  const g = await carica(`girone/${slug}.json`);
  const forma = new Map(g.squadre.map(s => [s.id, s.forma]));
  const righe = g.classifica[tipo] || [];
  const parziali = g.stale && Object.keys(g.stale).length ? ' <span class="badge">dati parziali</span>' : '';
  return `${heroHTML({ foto: 'campo', classe: 'hero-classifica', contenuto: `
      <div class="contesto-riga">${barraContesto(indice)}</div>
      <h1>Classifica${parziali}</h1><p class="sotto">${esc(g.campionato.nome)} · ${esc(g.nome)} · stagione ${esc(g.stagione)}</p>` })}
    ${tipo === 'totale' ? podioHTML(indice, righe) : ''}
    <div class="segmenti">${[['totale', 'Totale'], ['casa', 'Casa'], ['trasferta', 'Trasferta']].map(([k, l]) => `<button data-tipo="${k}" class="${tipo === k ? 'attivo' : ''}">${l}</button>`).join('')}</div>
    ${righe.length ? `<section class="card piena"><div class="scroll-x"><table class="tab">
      <thead><tr><th>#</th><th class="sx">Squadra</th><th>PT</th><th>G</th><th>V</th><th>N</th><th>P</th><th>GF</th><th>GS</th><th>DR</th>${tipo === 'totale' ? '<th>Forma</th>' : ''}</tr></thead>
      <tbody>${righe.map(r => `<tr class="cliccabile ${èPreferita(r.squadraId) ? 'evid' : ''} ${classeZona(g.zone, r.pos, righe.length)}" data-squadra="${Number(r.squadraId)}"><td>${r.pos}</td><td class="sx nome">${stemmaHTML(squadraDa(indice, r.squadraId), 24)}${esc(r.nome)}</td><td><b>${r.pt}</b></td><td>${r.g}</td><td>${r.v}</td><td>${r.n}</td><td>${r.p}</td><td>${r.gf}</td><td>${r.gs}</td><td>${segnoDR(r.dr)}</td>${tipo === 'totale' ? `<td>${formaHTML(forma.get(r.squadraId))}</td>` : ''}</tr>`).join('')}</tbody>
    </table></div></section>
    ${g.zone ? '<p class="muto centro">Bordo verde: zona promozione · bordo rosso: zona retrocessione</p>' : ''}` : vuoto('Classifica non disponibile.')}`;
}

export function dopo(ctx, root) {
  root.querySelectorAll('.segmenti button').forEach(b => { b.onclick = async () => { tipo = b.dataset.tipo; root.innerHTML = await render(ctx); dopo(ctx, root); }; });
  root.querySelectorAll('tr[data-squadra]').forEach(tr => { tr.onclick = () => ctx.naviga(`#/squadra/${tr.dataset.squadra}`); });
  collegaContesto(root, ctx.indice, { onCambio: (slug) => ctx.naviga(`#/classifiche/${slug}`) });
}
```

- [ ] **Step 3: `site/js/views/squadra.js`**
  - Import aggiuntivi: `import { stemmaHTML } from '../stemma.js';` e da `./comuni.js` anche `heroHTML, squadraDa`.
  - Sotto `let tab = 'risultati';` aggiungi `let ultimaId = null;`.
  - `rigaRis` riceve `indice` come secondo parametro e la cella avversario diventa `<span class="avv">${stemmaHTML(squadraDa(indice, p.avversarioId), 22)}<span>${p.casa ? '' : '@ '}${esc(p.avversario)}</span></span>`; aggiorna le chiamate in `risultati(s, indice)` (`rigaRis(prossima, indice)`, `s.partite.map(p => rigaRis(p, indice))`).
  - In `risultati(s, indice)`, prima delle card: `${s.foto ? `<img class="foto-squadra" src="img/squadre/${Number(s.id)}.jpg" alt="Foto di squadra: ${esc(s.nome)}" loading="lazy">` : ''}`.
  - `render` diventa:
    ```js
    export async function render({ indice, rotta, carica }) {
      const s = await carica(`squadra/${rotta.params[0]}.json`);
      if (s.id !== ultimaId) { tab = 'risultati'; ultimaId = s.id; }
      const corpo = tab === 'rosa' ? rosa(s) : tab === 'statistiche' ? statistiche(s) : risultati(s, indice);
      return `${heroHTML({ foto: 'campo', classe: 'hero-squadra-box', contenuto: `
          <div class="hero-squadra">${stemmaHTML({ id: s.id, nome: s.nome, stemma: s.stemma }, 72)}
            <div><h1>${esc(s.nome)}</h1><p class="sotto"><a href="#/classifiche/${esc(s.girone.slug)}">${esc(s.girone.nome)}</a>${s.pos ? ` · ${s.pos}º posto · ${s.riga.pt} pt` : ''}</p>
            <p class="sotto">${formaHTML(s.forma)}</p></div>
            ${stellaHTML(s.id, s.nome)}</div>` })}
        <div class="tabs">${[['risultati', 'Risultati'], ['rosa', 'Rosa'], ['statistiche', 'Statistiche']].map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? 'attivo' : ''}">${l}</button>`).join('')}</div>
        ${corpo}`;
    }
    ```

- [ ] **Step 4: Verifica** — `npm test`, `node --check` sui tre file, poi:
```bash
OUT=$(mktemp -d)
P=$(python3 -c "import json;d=json.load(open('site/data/indice.json'));print([p['id'] for p in d['partite'] if p['tabellino']][0])")
scripts/screenshot.sh $OUT partita/$P serie-b scuro
scripts/screenshot.sh $OUT classifiche/serie-b serie-b scuro
scripts/screenshot.sh $OUT squadra/2480 serie-b scuro
```
Apri i PNG con Read. Atteso: partita con due stemmi grandi ai lati del punteggio su foto velata, timeline con minuto arancione e pallone; classifica con podio oro/argento/bronzo e stemmi in tabella; squadra con stemma grande, nome, posizione e pallini forma nell'hero, avversari con stemma.
- [ ] **Step 5: Commit** `feat: hero e stemmi in partita, podio in classifica, testata squadra`.

---

### Task 7: Giocatori, Giocatore, Info e service worker

**Files:**
- Modify: `site/js/views/giocatori.js`, `site/js/views/giocatore.js`, `site/js/views/info.js`, `site/sw.js`

**Interfaces:**
- Consumes: `heroHTML`, `squadraDa`, `card`, `vuoto` (comuni.js); `stemmaHTML`; `barraContesto`, `collegaContesto`; `impostaGirone`, `gironeEffettivo`, `gironi`, `riattivaIntro` (contesto.js); `leggiTema`, `impostaTema` (tema.js).

- [ ] **Step 1: `site/js/views/giocatori.js`** — sostituisci il file:
```js
import { esc } from '../util.js';
import { stemmaHTML } from '../stemma.js';
import { gironi, impostaGirone, gironeEffettivo } from '../contesto.js';
import { nomeSquadra, squadraDa, vuoto, heroHTML } from './comuni.js';
import { barraContesto, collegaContesto } from './contesto-ui.js';

let tab = 'marcatori';
const VALORE = { marcatori: (g) => g.gol, voti: (g) => g.votoMedio, mvp: (g) => g.mvp, fairplay: (g) => g.ammonizioni + 3 * g.espulsioni };
const UNITA = { marcatori: 'gol', voti: 'media', mvp: 'premi', fairplay: 'punti cart.' };
const NOTE = { voti: 'Almeno 3 voti.', fairplay: 'Almeno 3 presenze; ammonizione 1 punto, espulsione 3: meno punti prima.', marcatori: '', mvp: 'Premi "migliore in campo".' };
const MEDAGLIE = ['🥇', '🥈', '🥉'];

export async function render({ indice, rotta, carica }) {
  const lista = gironi(indice);
  if (!lista.length) return vuoto('Nessun campionato in corso.');
  if (rotta.params[0] && lista.some(g => g.slug === rotta.params[0])) impostaGirone(rotta.params[0]);
  const slug = gironeEffettivo(indice);
  const g = await carica(`girone/${slug}.json`);
  const righe = (g.giocatori || {})[tab] || [];
  return `${heroHTML({ foto: 'premiazione', classe: 'hero-giocatori', contenuto: `
      <div class="contesto-riga">${barraContesto(indice)}</div>
      <h1>Giocatori</h1><p class="sotto">${esc(g.campionato.nome)} · ${esc(g.nome)}</p>` })}
    <div class="segmenti">${[['marcatori', 'Gol'], ['voti', 'Voti'], ['mvp', 'MVP'], ['fairplay', 'Fair play']].map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? 'attivo' : ''}">${l}</button>`).join('')}</div>
    ${righe.length ? `<section class="card piena">${righe.map((r, i) => `<a class="riga-gioc" href="#/giocatore/${esc(r.slug)}">
        <span class="pos">${i < 3 ? MEDAGLIE[i] : i + 1}</span>${stemmaHTML(squadraDa(indice, r.squadraId), 32)}
        <span class="chi"><b>${esc(r.nome)}</b><small>${esc(nomeSquadra(indice, r.squadraId))} · ${r.presenze} pres.</small></span>
        <span class="valore" aria-label="${UNITA[tab]}">${VALORE[tab](r)}</span></a>`).join('')}</section>
      ${NOTE[tab] ? `<p class="muto centro">${NOTE[tab]}</p>` : ''}` : vuoto('Nessun dato: le statistiche compaiono dopo le prime partite con tabellino.')}`;
}

export function dopo(ctx, root) {
  root.querySelectorAll('.segmenti button').forEach(b => { b.onclick = async () => { tab = b.dataset.tab; root.innerHTML = await render(ctx); dopo(ctx, root); }; });
  collegaContesto(root, ctx.indice, { onCambio: (slug) => ctx.naviga(`#/giocatori/${slug}`) });
}
```

- [ ] **Step 2: `site/js/views/giocatore.js`** — import `stemmaHTML` e da comuni `heroHTML, squadraDa`; `render` riceve `{ indice, rotta, carica }` e la testata `<section class="testa-squadra">...</section>` è sostituita da:
```js
heroHTML({ foto: 'campo', classe: 'hero-giocatore', contenuto: `<div class="hero-squadra">${stemmaHTML(squadraDa(indice, g.squadraId), 64)}
  <div><h1>${esc(g.nome)}</h1><p class="sotto"><a href="#/squadra/${Number(g.squadraId)}">${esc(g.squadra)}</a> · <a href="#/classifiche/${esc(g.girone.slug)}">${esc(g.girone.nome)}</a></p></div></div>` })
```
Il resto (card Stagione e Partita per partita) resta; la card Stagione ora mostra numeri grandi grazie al CSS.

- [ ] **Step 3: `site/js/views/info.js`**
  - Import da `./comuni.js` anche `heroHTML`.
  - In cima al markup restituito metti:
    ```js
    heroHTML({ foto: 'premiazione', classe: 'hero-info', contenuto: `<h1>Sporting <b style="color:var(--arancio)">Live</b></h1><p class="sotto">I campionati dello Sporting Club Mestre, dal telefono.</p>
      <div class="loghi"><img src="img/loghi/sporting-club-mestre.png" alt="Sporting Club Mestre"><img src="img/loghi/endas.png" alt="Endas"></div>` })
    ```
    e rimuovi il vecchio `<h2>Sporting Live</h2>`.
  - Segmenti tema: `[['scuro', 'Scuro'], ['chiaro', 'Chiaro'], ['auto', 'Automatico']]`.
  - Mantieni il link "Rivedi l'introduzione" del Task 4.

- [ ] **Step 4: `site/sw.js`** — `const VERSIONE = 'sl-2';` e aggiungi alla SHELL: `'js/stemma.js', 'js/contesto.js', 'js/evidenza.js', 'js/views/contesto-ui.js', 'js/views/intro.js', 'img/foto/campo.jpg', 'img/foto/premiazione.jpg', 'img/loghi/endas.png', 'img/loghi/sporting-club-mestre.png'`. Controlla con `ls` che ogni voce della SHELL esista (se una manca l'installazione del service worker fallisce).

- [ ] **Step 5: Verifica** — `npm test`, `node --check` su tutti i file JS e su `site/sw.js`, poi:
```bash
OUT=$(mktemp -d)
scripts/screenshot.sh $OUT giocatori/serie-b serie-b scuro
G=$(python3 -c "import json;print(json.load(open('site/data/girone/serie-b.json'))['giocatori']['marcatori'][0]['slug'])")
scripts/screenshot.sh $OUT giocatore/$G serie-b scuro
scripts/screenshot.sh $OUT info tutti scuro
```
Apri i PNG. Atteso: lista giocatori con medaglie, stemmi e numero grande arancione; giocatore con stemma e nome nell'hero; info con foto premiazione e i due loghi su fondo bianco.
- [ ] **Step 6: Commit** `feat: giocatori con medaglie e stemmi, info con loghi, service worker aggiornato`.

---

### Task 8: Rifinitura visiva su tutte le schermate, nero e chiaro

**Files:**
- Modify: solo `site/css/app.css` e, se serve, piccoli ritocchi di markup nelle viste.

- [ ] **Step 1: Screenshot di tutte le schermate**
```bash
OUT=$(mktemp -d)
P=$(python3 -c "import json;d=json.load(open('site/data/indice.json'));print([p['id'] for p in d['partite'] if p['tabellino']][0])")
G=$(python3 -c "import json;print(json.load(open('site/data/girone/serie-b.json'))['giocatori']['marcatori'][0]['slug'])")
for T in scuro chiaro; do
  for R in partite classifiche/serie-b partita/$P squadra/2480 giocatori/serie-b giocatore/$G info; do scripts/screenshot.sh $OUT $R serie-b $T; done
done
INTRO=no scripts/screenshot.sh $OUT intro; INTRO=no scripts/screenshot.sh $OUT intro/2; INTRO=no scripts/screenshot.sh $OUT intro/3 serie-b
echo $OUT
```
- [ ] **Step 2: Controlla ogni PNG con Read** contro questa lista e correggi nel CSS ciò che non va: testo leggibile su ogni sfondo (in chiaro le hero restano scure con testo bianco), niente elementi che escono dai 390px, stemmi allineati al testo, podio con i tre gradini alla base comune, tessere "In evidenza" della stessa altezza, tabbar che non copre l'ultimo contenuto, nessun "undefined" o "[object" visibile.
- [ ] **Step 3: Ripeti gli screenshot delle schermate corrette** e allegale nel report (percorsi dei PNG).
- [ ] **Step 4:** `npm test`, `python -m pytest -q`. **Commit** `fix: rifinitura visiva tema nero e chiaro` (solo se ci sono state modifiche).
