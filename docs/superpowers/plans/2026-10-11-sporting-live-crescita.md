# Sporting Live — pacchetto crescita: piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** condivisione (anteprime, pagine e immagini dei risultati, pulsante), ricerca, calendario ICS, andamento e precedenti, archivio stagioni ed estate, documenti, Telegram/statistiche/Vantaggi pronti ma spenti, poster QR, rifiniture.

**Architecture:** tutto generato dal build Python dentro `site/` (JSON, HTML di condivisione, JPEG, ICS); il client vanilla JS legge e mostra. Contenuti curati a mano in `contenuti/`. Funzioni con account esterni attivabili da configurazione/segreti.

**Tech Stack:** Python 3.9 (locale) / 3.12 (Actions), requests, BeautifulSoup, Pillow, qrcode, pytest; JS ES modules, node --test; GitHub Actions + Pages.

**Spec:** `docs/superpowers/specs/2026-10-11-sporting-live-crescita-design.md` (vincolante). Spec precedenti citate lì.

## Global Constraints

- Nessun framework, bundler o font esterno nel sito. CSP di `site/index.html` invariata salvo `img-src 'self' data: https://*.goatcounter.com` (Task 11).
- Tutto il testo dai dati passa da `esc()`; id numerici con `Number(...)`; localStorage solo in try/catch con fallback in memoria.
- Tap target ≥ 44px; nessuno scroll orizzontale di pagina a 320–390px; testi in italiano; tema scuro di default e tema chiaro leggibili.
- Ogni nuovo file JS/CSS caricato dall'app va aggiunto alla `SHELL` di `site/sw.js` nello stesso task (la `VERSIONE` si incrementa una sola volta, nel Task 13). Ogni voce SHELL deve esistere su disco.
- URL assoluti solo da `SITO_URL` (`scraper/config.py`) o `indice.sito`. Mai URL `max2staff.github.io` scritti a mano altrove.
- Il sito ufficiale va trattato con educazione: UA del config, `PAUSA_S` tra richieste, edizioni d'archivio lette una sola volta.
- Ogni commit: messaggio in italiano con prefisso `feat:`/`fix:`/`test:`/`chore:`/`docs:` e ultima riga `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Git solo come `git -C /Users/massimilianogriletti/Documents/Sporting_Live ...`; mai git in altre cartelle. Branch `main`, NON fare push (lo fa il controller alla fine). `git add` per percorso.
- Python locale: se `pytest`/`bs4`/`PIL`/`qrcode` mancano, crea (una volta) un venv in `.venv/` (`python3 -m venv .venv && .venv/bin/pip install -r scraper/requirements.txt pytest`) e usa `.venv/bin/python -m pytest -q`. `.venv/` va in `.gitignore`.
- Verifica visiva con `scripts/screenshot.sh OUT ROTTA [GIRONE] [TEMA]` (env `LARGHEZZA`, `INTRO`); rifare una volta lo scatto se mostra "Caricamento…" o è grigio. Screenshot mai committati.

## Review Focus

1. Pagine di condivisione aperte da WhatsApp: l'anteprima deve mostrare risultato e immagine giusti, e il tocco deve portare alla partita (redirect senza script).
2. Calendario ICS importato da iPhone/Google: fusi orari corretti (Europe/Rome, ora legale/solare), nessuna riga oltre 75 ottetti, caratteri speciali nei nomi (apostrofi, `&`, virgole) escapati.
3. Archivio: un link interno cliccato in archivio non deve mai riportare silenziosamente alla stagione corrente (riscrittura dei link), e i preferiti della stagione corrente non vanno toccati.
4. Ricerca con accenti/apostrofi ("D'ESTE", "NICOLÒ") e parole in ordine diverso.
5. Build ripetuto senza cambi nei dati: nessun file binario riscritto (immagini stabili), così i commit automatici restano piccoli.

---

### Task 1: Fondamenta — workflow, SITO_URL, contenuti, documenti

**Files:**
- Modify: `.github/workflows/aggiorna-e-pubblica.yml`, `scraper/config.py`, `scraper/build.py`, `site/js/views/info.js`, `.gitignore`
- Create: `contenuti/config.json`, `contenuti/documenti.json`, `contenuti/vantaggi.json`, `scraper/tests/test_contenuti.py` (o il file di test build esistente)

**Interfaces:**
- Produces: `config.SITO_URL = "https://max2staff.github.io/sporting-live/"`; `indice.sito` (= SITO_URL), `indice.config` (= contenuti/config.json), `indice.edizioni` (= `[]` per ora; Task 8 la riempie); `site/data/documenti.json` (= contenuti/documenti.json); `site/data/vantaggi.json` (offerte non scadute rispetto alla data di `adesso`). `costruisci(...)` accetta un nuovo parametro opzionale `contenuti: dict | None` (`{"config":…, "documenti":…, "vantaggi":…}`) e `main()` lo legge da `--contenuti` (default `contenuti`).

- [ ] **Step 1: workflow.** Per ogni azione usata (`actions/checkout`, `actions/setup-python`, `actions/setup-node`, `actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`) leggi l'ultima release con `gh api repos/actions/<nome>/releases/latest --jq .tag_name` e usa quella major. `node-version: "22"`, `runs-on: ubuntu-24.04`. Non cambiare trigger, permessi, passi.
- [ ] **Step 2: contenuti.**
  - `contenuti/config.json` = `{"goatcounter": ""}`; `contenuti/vantaggi.json` = `{"offerte": []}`.
  - `contenuti/documenti.json` = `{"documenti": [{"titolo": "…", "url": "https://www.campionatisportingclub.it/…"}]}` con questi sei link della home ufficiale: Documenti calcio a 8/5 (`regolamento-calcio-a-8-2023-2024.htm`), Iscrizione campionati (`iscrizione-campionati-2024-2025.htm`), Modulo variazione gara (`modulo-per-richiesta-variazione-gara.htm`), Modulo trasferimento giocatore (`modulo-per-trasferimento-giocatore.htm`), Modulo apertura sinistri (`modulo-apertura-sinistri-2024.htm`), Liste squadra da stampare (`liste-squadra-da-stampare.htm`). Titoli in italiano normale (non tutto maiuscolo).
- [ ] **Step 3: test build (pytest)** — `indice` contiene `sito`, `config`, `edizioni == []`; `documenti.json` scritto uguale all'input; `vantaggi.json` filtra un'offerta con `validoFino` passato e tiene una senza `validoFino` e una futura; `costruisci` senza `contenuti` funziona come prima (default vuoti).
- [ ] **Step 4: build** — implementa; rigenera `site/data` con `python -m scraper.build` (senza rete).
- [ ] **Step 5: Info** — card "Documenti ufficiali" (dopo "Fonte dei dati"): elenco di link `target="_blank" rel="noopener"`, ciascuno riga a tutta larghezza ≥ 44px con freccia ↗; carica `documenti.json` via `ctx.carica` dentro try/catch (se manca, card omessa).
- [ ] **Step 6:** `.gitignore` += `.venv/`. Test (pytest + `npm test`), screenshot `info` scuro, commit `feat: fondamenta crescita (workflow aggiornato, SITO_URL, contenuti, documenti ufficiali)`.

### Task 2: Stemmi in Python, immagine Open Graph e meta tag

**Files:**
- Create: `scraper/stemma.py`, `scraper/tests/test_stemma.py`, `scraper/tests/fixtures/stemmi_js.json`, `scripts/stemmi_js_fixture.mjs`, `scripts/font/` (TTF + licenza)
- Modify: `scripts/prepara_immagini.py`, `site/index.html`

**Interfaces:**
- Produces: `scraper.stemma.iniziali(nome) -> str`, `colori_stemma(id) -> dict` (stessi campi e valori di `coloriStemma` in `site/js/stemma.js`), `disegna_stemma(squadra: dict, lato_px: int) -> PIL.Image.Image` (RGBA, stessa forma, divisione e iniziali dell'SVG); `scraper.stemma.FONT_BOLD: Path`.

- [ ] **Step 1: fixture di parità.** `scripts/stemmi_js_fixture.mjs` importa `iniziali` e `coloriStemma` da `site/js/stemma.js` e scrive `scraper/tests/fixtures/stemmi_js.json` per un campione: id 1, 7, 2480, 2532, 99999 e i nomi "SOCKS", "F.C. BECK'S", "6 GOMME SCORZE", "EASY M&M", "IMPRESA EDILE GABRIELI", "NZ", "S.GIORGIO", "D'ESTE". Eseguilo con `node scripts/stemmi_js_fixture.mjs` e committa il JSON.
- [ ] **Step 2: test** — `test_stemma.py` confronta `iniziali`/`colori_stemma` con la fixture (uguaglianza esatta dei valori, colori come stringhe identiche); `disegna_stemma` restituisce un'immagine della dimensione chiesta con alfa trasparente agli angoli e pixel del colore primario all'interno.
- [ ] **Step 3: implementa** `scraper/stemma.py` portando fedelmente `site/js/stemma.js` (leggilo per intero: hash FNV-1a, tinte, luminosità 30/40 e 44/52, divisione, iniziali). Il disegno usa Pillow (poligoni/ellissi con supersampling ×4 poi resize LANCZOS per bordi lisci) e il font in `scripts/font/` (scegli un TTF libero, es. Inter Bold o DejaVu Sans Bold, e aggiungi il file di licenza).
- [ ] **Step 4: og.jpg** — `scripts/prepara_immagini.py` genera anche `site/img/og.jpg` 1200×630 < 200 KB: foto premiazione velata (gradiente blu notte → nero), icona app, "Sporting **Live**" (Live arancione), sottotitolo "Risultati, classifiche e marcatori dei campionati Sporting Club Mestre".
- [ ] **Step 5: meta** — in `site/index.html` aggiungi `og:title`, `og:description`, `og:image` (`https://max2staff.github.io/sporting-live/img/og.jpg` — unica eccezione all'URL scritto a mano, perché l'HTML è statico; aggiungi un test pytest che verifica che inizi con `config.SITO_URL`), `og:image:width/height`, `og:url`, `og:type`, `og:locale`, `twitter:card`.
- [ ] **Step 6:** test, apri `og.jpg` con Read, commit `feat: stemmi anche in Python, immagine di anteprima e meta Open Graph`.

### Task 3: Pagine e immagini di condivisione delle partite

**Files:**
- Create: `scraper/condivisione.py`, `scraper/tests/test_condivisione.py`
- Modify: `scraper/build.py`

**Interfaces:**
- Consumes: `scraper.stemma.disegna_stemma`, `FONT_BOLD`, `config.SITO_URL`.
- Produces: `pagina_condivisione(partita: dict, sito: str) -> str` (HTML), `immagine_risultato(partita: dict) -> bytes` (JPEG), `scrivi_condivisione(partite: list[dict], out_dir: Path, sito: str) -> int` (numero di immagini riscritte). `partita` = il dict di `site/data/partita/<id>.json`. File: `site/s/p/<id>.html`, `site/s/p/<id>.jpg`, `site/s/p/manifest.json` (`{id: hash dei dati usati}`).

- [ ] **Step 1: test**
  - HTML: contiene `og:title` "CASA 2-1 OSPITE", `og:image` = `<sito>s/p/<id>.jpg`, `og:url`, `meta http-equiv="refresh"` verso `../../#/partita/<id>`, un `<a>` visibile allo stesso indirizzo, nessun `<script>`; nomi con `&`, `'` e `<` escapati (`html.escape`).
  - Immagine: JPEG 1080×1080 < 120 KB per una partita con 8 marcatori per lato (mostra al massimo 6 per lato + "+N").
  - Stabilità: due chiamate di `scrivi_condivisione` sugli stessi dati → la seconda restituisce 0 e non cambia `mtime` dei JPEG; cambiando il risultato di una partita → restituisce 1. Partite non giocate: nessun file; file di partite non più presenti: rimossi.
- [ ] **Step 2: implementa** il layout dell'immagine come da spec §2b (fondo `#0a0a0a`→`#01213b`, fascia `#ff4e00`→`#38bdf8`, stemmi 260px, risultato grande bianco, nomi in maiuscolo con a capo automatico su 2 righe max, girone · giornata · data, marcatori per lato con minuto, "★ MVP nome", "Sporting Live" in basso con "Live" arancione). JPEG qualità 82, `optimize=True`.
- [ ] **Step 3: build** — `main()` chiama `scrivi_condivisione` dopo `scrivi` con le partite giocate della stagione corrente; stampa il numero di immagini riscritte. Il workflow già committa `site/`? No: committa solo `site/data` — aggiungi `site/s` al `git add` del workflow.
- [ ] **Step 4:** rigenera, apri 2 immagini con Read (una con molti marcatori, una 0-0 o a tavolino), commit `feat: pagine e immagini di condivisione dei risultati`.

### Task 4: Pulsante Condividi

**Files:**
- Create: `site/js/views/condividi.js`, `site/js/tests/condividi.test.js`
- Modify: `site/js/views/partita.js`, `classifiche.js`, `squadra.js`, `giocatore.js`, `site/css/app.css`, `site/sw.js`

**Interfaces:**
- Produces: `datiCondivisione(tipo, oggetto, sito, href) -> {titolo, testo, url, immagine?}` (pura, testata); `condividiHTML() -> string` (pulsante con icona "condividi", `aria-label="Condividi"`, 44×44); `collegaCondividi(root, dati)`.

- [ ] **Step 1: test** di `datiCondivisione`: partita giocata → url `<sito>s/p/<id>.html`, immagine `<sito>s/p/<id>.jpg`, titolo "CASA 2-1 OSPITE"; partita non giocata → url = href, nessuna immagine, testo con data e ora; classifica → "Classifica Serie B · Sporting Live"; squadra/giocatore → nome + girone.
- [ ] **Step 2: implementa** `collegaCondividi`: `navigator.share({title,text,url})`; pulsante secondario "Immagine" solo per partite giocate: `fetch(immagine)` → `File` → `navigator.canShare({files})` ? `navigator.share({files,title})` : `window.open(immagine)`. Senza `navigator.share`: `navigator.clipboard.writeText(url)` e un toast "Link copiato" (elemento `role="status"`, 2 s); se fallisce, mostra il link in un `<input readonly>` selezionato. `AbortError` dell'utente ignorato silenziosamente.
- [ ] **Step 3:** pulsante nell'hero di partita (accanto al punteggio, in alto a destra), classifica (accanto al titolo), squadra (accanto alla stella), giocatore (accanto al nome). `indice.sito` arriva da `ctx.indice.sito`.
- [ ] **Step 4:** SHELL += `js/views/condividi.js`; test, screenshot partita/classifica scuro e chiaro, commit `feat: pulsante condividi su partita, classifica, squadra e giocatore`.

### Task 5: Ricerca

**Files:**
- Create: `site/js/cerca.js`, `site/js/tests/cerca.test.js`, `site/js/views/cerca.js`
- Modify: `scraper/build.py` (+ test), `site/js/router.js` (VISTE += 'cerca'), `site/js/app.js` (vista + icona lente nella testata, link `#/cerca`), `site/css/app.css`, `site/sw.js`

**Interfaces:**
- Produces: `site/data/cerca.json` = `{"squadre":[{"id","nome","girone"}],"giocatori":[{"slug","nome","squadraId","girone"}]}` (squadre senza "RIPOSO"); `normalizza(s) -> string` (minuscolo, senza accenti con `normalize('NFD')`, apostrofi/punti → spazio, spazi compressi); `cerca(dati, q, max=30) -> [{tipo:'squadra'|'giocatore', ...}]` (tutte le parole di q devono essere prefisso di una parola del nome, in qualsiasi ordine; squadre prima; dentro ogni tipo ordine alfabetico; q < 2 caratteri → []).

- [ ] **Step 1: test** — "socks" trova SOCKS; "beck" trova F.C. BECK'S; "d este" e "deste"? (solo "d este" e "este" devono trovare D'ESTE SIMONE; documenta che "deste" non trova); "nicolo" trova NICOLÒ; "simone d" trova "D'ESTE SIMONE"; "s" → []; max rispettato; RIPOSO assente.
- [ ] **Step 2: implementa** build + logica + vista: hero compatto con campo `type="search"` grande (font 1.1rem, 48px), `aria-label="Cerca squadra o giocatore"`, risultati come righe con stemma 32px, nome, girone (e squadra per i giocatori), link a `#/squadra/<id>` / `#/giocatore/<slug>`. Stato vuoto: "Scrivi almeno 2 lettere". Nessun risultato: "Nessun risultato per …". La query resta nell'URL (`#/cerca/<q>` con `replace` a ogni digitazione, debounce 150 ms) così il tasto indietro torna ai risultati.
- [ ] **Step 3:** SHELL += `js/cerca.js`, `js/views/cerca.js`; test, screenshot `cerca/beck` scuro e 320px, commit `feat: ricerca di squadre e giocatori`.

### Task 6: Calendario della squadra (ICS)

**Files:**
- Create: `scraper/ics.py`, `scraper/tests/test_ics.py`
- Modify: `scraper/build.py`, `site/js/views/squadra.js`, `site/css/app.css`, `.github/workflows/aggiorna-e-pubblica.yml` (`git add` += `site/cal`)

**Interfaces:**
- Produces: `calendario_squadra(squadra: dict, partite: list[dict], girone: dict, sito: str, adesso: str) -> str` (testo ICS con CRLF); `site/cal/<id>.ics` per ogni squadra reale della stagione corrente.

- [ ] **Step 1: test** — inizia con `BEGIN:VCALENDAR` e finisce con `END:VCALENDAR\r\n`; contiene `X-WR-CALNAME`, `REFRESH-INTERVAL;VALUE=DURATION:PT6H`, un blocco `VTIMEZONE` Europe/Rome (con STANDARD e DAYLIGHT); una partita del 14/10 alle 20:30 → `DTSTART;TZID=Europe/Rome:20261014T203000` e `DTEND` 21:30; partita con data ma senza ora → `DTSTART;VALUE=DATE:`; partita senza data → assente; giocata → SUMMARY "CASA 2-1 OSPITE"; nome con `,` `;` `\` escapati; nessuna riga > 75 ottetti (testa con un nome lungo e accentato, misurando in UTF-8 senza spezzare un carattere multibyte); UID `partita-<id>@sportinglive`; `DTSTAMP` in UTC.
- [ ] **Step 2: implementa** a mano (niente librerie) e collega al build; rigenera.
- [ ] **Step 3: pagina squadra** — nella scheda Risultati, sotto "Prossima partita", riga con icona calendario: pulsante "Aggiungi al calendario" (`href="webcal://<host+path da indice.sito>cal/<id>.ics"`) e sotto, piccolo, "oppure scarica il file" (`https`, attributo `download`). Testo d'aiuto: "Le partite si aggiornano da sole quando cambiano date e orari."
- [ ] **Step 4:** test, screenshot squadra/2480, commit `feat: calendario della squadra da aggiungere al telefono`.

### Task 7: Andamento in classifica e precedenti

**Files:**
- Create: `scraper/andamento.py`, `scraper/tests/test_andamento.py`, `site/js/grafico.js`, `site/js/tests/grafico.test.js`
- Modify: `scraper/build.py`, `site/js/views/squadra.js`, `site/js/views/partita.js`, `site/css/app.css`, `site/sw.js`

**Interfaces:**
- Produces: `andamento(partite_girone: list[dict], squadre: list[dict]) -> dict[int, list[{"giornata","pos","pt"}]]` — classifica ricalcolata dopo ogni giornata **in cui tutte le partite sono giocate** (vittoria 3, pari 1; ordine: punti, differenza reti, gol fatti, nome; esclusa "RIPOSO" e le partite contro "RIPOSO"); `precedenti(partita, tutte_le_partite_con_nomi) -> {"partite":[{id?, edizione?, data, casa, ospite, golCasa, golOspite}], "bilancio":{"casa":V,"pari":N,"ospite":V}}` abbinando per **nome normalizzato** (maiuscolo, spazi compressi) ed escludendo la partita stessa; `squadra/<id>.json.andamento`, `partita/<id>.json.precedenti`. `graficoAndamentoSVG(serie, nSquadre) -> string` (pura).

- [ ] **Step 1: test Python** — 4 squadre, 3 giornate inventate con un pari e una giornata incompleta (esclusa); tie-break su differenza reti; RIPOSO ignorata; precedenti trovati anche a nomi invertiti casa/ospite e con spazi diversi; bilancio dal punto di vista di casa/ospite della partita corrente.
- [ ] **Step 2: test JS** — `graficoAndamentoSVG` con 1 punto → '' ; con 5 punti → `<svg` con `viewBox`, 5 `<circle`, `<title>` accessibile ("Andamento in classifica: dalla 7ª alla 3ª posizione"), asse y invertito (pos 1 ha y minore).
- [ ] **Step 3: implementa** e collega: scheda Statistiche della squadra → card "Andamento" col grafico (linea `--arancio`, griglia tenue, etichette giornate, larghezza 100%, altezza 160px) e nota "Posizione calcolata dai risultati"; pagina partita → card "Precedenti" in Riepilogo (dopo marcatori) solo se ci sono precedenti: righe data · risultato, e il bilancio "V CASA · N · V OSPITE". Per ora le partite d'archivio non esistono: il Task 9 le aggiunge passando più partite a `precedenti`.
- [ ] **Step 4:** SHELL += `js/grafico.js`; test, screenshot squadra (scheda Statistiche: usa una rotta o, se le schede non hanno rotta, documenta come l'hai verificata), commit `feat: andamento in classifica e precedenti tra le squadre`.

### Task 8: Archivio — lettura e build delle edizioni chiuse

**Files:**
- Modify: `stagioni.json`, `scraper/fetch.py`, `scraper/build.py` (+ test), `.github/workflows/aggiorna-e-pubblica.yml` (nulla da aggiungere se `build/raw` e `site/data` coprono già i nuovi percorsi: verifica)

**Interfaces:**
- Produces: `stagioni.json.archivio = [{slug, nome, stagione, campionati:[…stessa forma…], documenti:[{titolo,url}]}]`; raw in `build/raw/a/<slug>/<idgirone>.json`; output in `site/data/a/<slug>/` (indice, girone, partita, squadra, giocatore — stessa forma della stagione corrente, con `indice.archivio = true`, `indice.nome`, `indice.documenti`); `indice.edizioni = [{slug, nome}]` nell'indice principale.

- [ ] **Step 1: individua i gironi.** 2025/26: Calcio a 8 Serie A 392, Serie B 388, Serie C 393; Calcio a 5 Super League 390. Estate 2026: "Trofeo World Cup 2026" calcio a 8, gironi 404 (Girone A), 405 (Girone B), 406 (Girone C), 407 (Girone D), 408 (Girone E Open); "Summer Cup" calcio a 5: apri `https://www.campionatisportingclub.it/summer-cup-calcio-a-5-2026.htm` (una richiesta, UA del config) e cerca link `idgirone=`; se c'è un girone con calendario, aggiungilo, altrimenti solo il documento. Documenti: PDF delle finali (play-off/play-out 2026, coppe) presi dalla pagina `I-CAMPIONATI.htm` come link. Slug edizioni: `2025-26`, `estate-2026`.
- [ ] **Step 2: test fetch** (con fetcher finto): un'edizione d'archivio con raw già presente non genera richieste; senza raw genera le richieste e scrive `build/raw/a/<slug>/<id>.json`; un girone d'archivio che solleva ParseError viene saltato con avviso e non blocca gli altri; la stagione corrente si comporta come prima.
- [ ] **Step 3: test build** — `indice.edizioni` elenca le edizioni presenti; l'albero `a/<slug>/` contiene indice e girone; un'edizione senza raw viene omessa da `edizioni`.
- [ ] **Step 4: implementa** e lancia **una volta** `python -m scraper.fetch` in locale (rete; serviranno molti minuti per i tabellini, è previsto: non abbassare `PAUSA_S`), poi `python -m scraper.build`. Controlla dimensioni (`du -sh site/data/a build/raw/a`) e riportale.
- [ ] **Step 5:** commit `feat: archivio delle edizioni chiuse (2025/26 ed estate 2026)` (codice, `stagioni.json`, raw e dati generati).

### Task 9: Archivio nell'app

**Files:**
- Modify: `site/js/router.js` (+ test), `site/js/app.js`, `site/js/data.js`, `site/js/views/info.js`, `site/js/views/squadra.js`, `site/js/views/partita.js`, `scraper/build.py` (precedenti cross-edizione + "anche in"), `site/css/app.css`

**Interfaces:**
- Produces: `analizza(hash)` restituisce anche `edizione: string|null` (`#/a/<ed>/…` → edizione `<ed>`, resto come prima; `#/a` senza edizione → partite senza edizione); `prefissaLink(html|root, edizione)`; `squadra/<id>.json.ancheIn = [{edizione, nome, id}]` (stessa squadra per nome normalizzato in altre edizioni, anche la corrente se si è in archivio); precedenti che includono partite di tutte le edizioni con il campo `edizione`.

- [ ] **Step 1: test router** — `#/a/2025-26/classifiche/serie-b` → `{edizione:'2025-26', vista:'classifiche', params:['serie-b']}`; `#/partite` → `edizione:null`; vista sconosciuta dopo il prefisso → partite con edizione.
- [ ] **Step 2: app** — con edizione: indice da `data/a/<ed>/indice.json`, `ctx.carica` con base `a/<ed>/`, `ctx.naviga` aggiunge il prefisso, dopo ogni render tutti gli `a[href^="#/"]` dentro `<main>` e nella tab bar ricevono il prefisso (tranne il link della fascia "torna alla stagione in corso"); fascia sotto la testata "Archivio · <nome> — Torna alla stagione in corso"; testata con il nome dell'edizione al posto della stagione. Contesto girone, preferiti e intro non si leggono né scrivono in archivio (il girone mostrato viene dalla rotta, default il primo). Edizione inesistente → messaggio "Edizione non trovata" con link alla stagione corrente.
- [ ] **Step 3: Info** — card "Archivio" con le edizioni (`indice.edizioni`) e, per ogni edizione, i documenti (PDF finali) come link esterni. **Squadra** — riga "Anche in: Stagione 2025/26 (Serie B, 7º)" con link. **Partita** — nei precedenti, le partite d'archivio mostrano il nome dell'edizione e linkano a `#/a/<ed>/partita/<id>`.
- [ ] **Step 4:** test, screenshot `a/2025-26/classifiche/serie-b`, `a/estate-2026/partite`, `squadra/2480` (anche in), commit `feat: archivio navigabile con stagioni passate ed estate`.

### Task 10: Avvisi su Telegram (spenti) e guida di attivazione

**Files:**
- Create: `scripts/telegram.py`, `scraper/tests/test_telegram.py`, `docs/attivazione.md`
- Modify: `.github/workflows/aggiorna-e-pubblica.yml`

**Interfaces:**
- Produces: `nuovi_risultati(indice_prima: dict|None, indice_dopo: dict) -> list[dict]`; `messaggi(nuovi, indice_dopo, sito) -> list[str]` (≤ 5 nuove partite in un girone → un messaggio per partita; > 5 → un riepilogo per girone con tutte le righe); `main()` legge `TELEGRAM_TOKEN`/`TELEGRAM_CHAT` dall'ambiente; se mancano esce 0 con "Telegram non configurato"; invia con `requests.post(https://api.telegram.org/bot<token>/sendMessage, data={chat_id, text, parse_mode:'HTML', disable_web_page_preview:false})`; errori → stampa `::warning::` ed esce 0.

- [ ] **Step 1: test** — nessun indice prima → nessun messaggio (primo avvio non spamma); partita passata a giocata → 1 messaggio con "Serie B", "CASA 2-1 OSPITE" e link `<sito>s/p/<id>.html`; 7 nuove nello stesso girone → 1 riepilogo; nomi con `<`/`&` escapati per HTML di Telegram; senza variabili d'ambiente non chiama la rete.
- [ ] **Step 2: workflow** — prima del build copia l'indice pubblicato (`cp site/data/indice.json /tmp/indice-prima.json || true`); dopo il deploy, passo "Avvisi Telegram" con `env: TELEGRAM_TOKEN: ${{ secrets.TELEGRAM_TOKEN }}`, `TELEGRAM_CHAT: ${{ secrets.TELEGRAM_CHAT }}` e `continue-on-error: true`, che lancia `python scripts/telegram.py /tmp/indice-prima.json site/data/indice.json`.
- [ ] **Step 3: `docs/attivazione.md`** — sezioni brevi e numerate, in italiano semplice, per: Telegram (BotFather → token; canale pubblico; bot amministratore; chat id `@nomecanale`; segreti nel repo: Settings → Secrets → Actions), statistiche GoatCounter (account gratuito, codice, dove scriverlo: `contenuti/config.json`), Vantaggi (esempio di offerta JSON commentato, dove mettere il logo), dominio (comprare il dominio, record DNS per GitHub Pages, file `site/CNAME`, cambiare `SITO_URL` e l'`og:image` in `index.html`, Settings → Pages → Custom domain → Enforce HTTPS), stemmi e foto delle squadre (formati: PNG quadrato trasparente ≥ 256px in `site/img/stemmi/<id>.png`, JPG 1200px in `site/img/squadre/<id>.jpg`; come trovare l'id), poster.
- [ ] **Step 4:** test, commit `feat: avvisi Telegram pronti da attivare e guida di attivazione`.

### Task 11: Statistiche di visita (spente) e Vantaggi

**Files:**
- Create: `site/js/visite.js`, `site/js/tests/visite.test.js`, `site/js/views/vantaggi.js`
- Modify: `site/index.html` (CSP img-src), `site/js/app.js`, `site/js/router.js` (VISTE += 'vantaggi'), `site/js/views/info.js` (privacy), `site/css/app.css`, `site/sw.js`

**Interfaces:**
- Produces: `percorsoAnonimo(rotta) -> string` (pura: `/partite`, `/partita`, `/classifiche/serie-b`, `/squadra/2480`, `/giocatore`, `/cerca` — niente query di ricerca né slug di giocatori; con edizione: `/a/<ed>/…`); `conta(rotta, config)` (nessun invio se `!config.goatcounter`, se `location.hostname` è `localhost`/`127.0.0.1`, o se `navigator.doNotTrack === '1'`).

- [ ] **Step 1: test** di `percorsoAnonimo` e delle condizioni di `conta` (iniettando un finto `Image`/`location`/`navigator`).
- [ ] **Step 2: implementa** visite (chiamata da `render()` in app.js dopo ogni render riuscito) e CSP `img-src 'self' data: https://*.goatcounter.com`. Privacy in Info: "Se attivo, l'app conta in forma anonima le pagine viste (senza cookie e senza dati personali) per sapere quante persone la usano."
- [ ] **Step 3: Vantaggi** — `app.js` carica `vantaggi.json` (try/catch) all'avvio; se `offerte.length` > 0 la tab bar ha la quinta voce "Vantaggi" (icona tag/regalo) e `#/vantaggi` mostra hero + card per offerta (logo `img/sponsor/<logo>` se presente, titolo, sponsor, descrizione, "Come ottenerlo", "Valido fino al …", pulsanti `tel:`/sito/mappa `https://maps.google.com/?q=<indirizzo>` solo se presenti). Con 0 offerte, `#/vantaggi` mostra "Presto qui sconti e iniziative dei partner per chi gioca nei campionati." e nessuna tab. Testa la vista con un `vantaggi.json` temporaneo di 2 offerte (screenshot), poi ripristina `offerte: []`.
- [ ] **Step 4:** SHELL += `js/visite.js`, `js/views/vantaggi.js`; test, screenshot tabbar con 5 voci a 320px (temporaneo), commit `feat: statistiche di visita anonime pronte e sezione Vantaggi`.

### Task 12: Poster con QR code

**Files:**
- Create: `scripts/poster.py`, `docs/poster/poster-a4.png`, `docs/poster/poster-a4.pdf`
- Modify: `scraper/requirements.txt` (+ `qrcode`)

- [ ] **Step 1:** `scripts/poster.py` genera un A4 verticale 2480×3508 (300 dpi): fondo nero, foto premiazione in alto velata, titolo "Sporting **Live**", sottotitolo "Risultati, classifiche e marcatori di tutti i campionati, sul telefono", QR code grande (bianco su nero o nero su riquadro bianco, correzione errori M, ≥ 900px) verso `config.SITO_URL`, URL leggibile sotto il QR, "Inquadra con la fotocamera · gratis · senza registrazione", loghi Sporting Club Mestre ed Endas in basso. PDF dallo stesso PNG (Pillow `save(..., "PDF", resolution=300)`).
- [ ] **Step 2:** genera, apri il PNG con Read, verifica che il QR si decodifichi (se disponibile `zbarimg` o `cv2`, altrimenti rigenera il QR in memoria e confronta la matrice), commit `feat: poster A4 con QR code per i campi`.

### Task 13: Rifiniture, accessibilità e chiusura

**Files:**
- Modify: `site/css/app.css`, `site/js/views/contesto-ui.js`, `site/sw.js`

- [ ] **Step 1: tema chiaro** — accento testuale/stati attivi `#c2410c` nel tema chiaro (tab bar attiva, segmenti attivi con testo, link arancioni); pulsanti pieni arancioni con testo bianco: se il contrasto di `#ff4e00` con bianco è < 4.5:1 usa `#c2410c` come fondo nel tema chiaro. Calcola e riporta i contrasti.
- [ ] **Step 2: foglio** — focus trap (Tab/Shift+Tab ciclano dentro), `overflow:hidden` sul body mentre è aperto, focus restituito al chip che l'ha aperto alla chiusura (anche su hashchange se l'elemento esiste ancora).
- [ ] **Step 3: service worker** — `VERSIONE = 'sl-4'`; controlla che ogni import JS dell'app e ogni file della SHELL esista (script rapido con `node` o `ls`).
- [ ] **Step 4: giro visivo finale** — screenshot 390 e 320, scuro e chiaro, di: partite, cerca/beck, partita giocata, classifiche/serie-b, squadra/2480, giocatori/serie-b, info, a/2025-26/classifiche/serie-b. Correggi ciò che non va. Commit `fix: contrasto del tema chiaro, focus nel foglio, service worker`.
