# Sporting Live — pacchetto "crescita" (audit dell'11/10/2026)

Stato: approvato dall'utente con "procedi con tutto" sull'audit presentato in chat l'11/10/2026.
Spec precedenti: `2026-10-10-sporting-live-design.md` (fase 1), `2026-10-10-sporting-live-restyling-design.md` (restyling). Tutto ciò che non è detto qui resta come lì.

## Obiettivo

Far crescere l'uso dell'app tra i giocatori (condivisione, utilità quotidiana) e preparare la fase sponsor, senza server e senza account a pagamento. Ogni funzione che richiede un account esterno (statistiche di visita, Telegram, dominio) viene costruita **pronta ma spenta**: si accende con una chiave di configurazione o un segreto GitHub, senza toccare il codice.

## Vincoli (invariati)

- Sito statico su GitHub Pages, vanilla JS ES modules, niente bundler/framework/font esterni. Python 3.9 in locale, 3.12 in Actions.
- CSP di `site/index.html`: si può solo aggiungere `https://*.goatcounter.com` a `img-src` (sezione 8). Nient'altro.
- `esc()` su ogni testo dai dati, `Number()` sugli id; localStorage sempre in try/catch con fallback in memoria; tap target ≥ 44px; nessuno scroll orizzontale a 320–390px; testi in italiano.
- Educazione verso il sito ufficiale: UA dichiarato, pausa tra richieste, cache permanente dei tabellini; le stagioni chiuse si leggono **una volta** e non si rileggono più.
- URL pubblico di base in un solo posto: `SITO_URL` in `scraper/config.py` (oggi `https://max2staff.github.io/sporting-live/`), usato da tutto ciò che genera URL assoluti (Open Graph, calendari, poster, Telegram).

## 1. Affidabilità dell'aggiornamento

- Il workflow ha già `workflow_dispatch`. Le pianificazioni non sono ancora partite (repo nuovo): il controller verifica lunedì 12/10 sera; se non partono si apre un'issue nel ledger e si valuta un trigger esterno (fuori da questo piano).
- Aggiornare le azioni alle versioni che girano su Node 24 (verificare l'ultima major con `gh api repos/actions/<nome>/releases/latest`), `node-version: "22"`, e fissare `runs-on: ubuntu-24.04` per non subire la migrazione del 19/10.

## 2. Condivisione

### 2a. Anteprima dei link
`site/index.html` riceve meta Open Graph e Twitter: `og:title` "Sporting Live", `og:description` (quella già presente), `og:image` = `SITO_URL + "img/og.jpg"` (1200×630, generata da `scripts/prepara_immagini.py`: foto premiazione velata, logo app, scritta "Sporting Live — risultati e classifiche dei campionati Sporting Club Mestre"), `og:url`, `og:type=website`, `og:locale=it_IT`, `twitter:card=summary_large_image`.

### 2b. Pagine di condivisione per partita, con immagine del risultato
- Il build genera, per **ogni partita giocata**, `site/s/p/<id>.html`: pagina minima con meta OG specifici (titolo "CASA 2-1 OSPITE", descrizione "Serie B · giornata 4 · mer 07/10 · marcatori…"), `og:image` = `SITO_URL + "s/p/<id>.jpg"`, e redirect a `../../#/partita/<id>` con `<meta http-equiv="refresh" content="0;url=…">` più un link visibile (nessuno script inline: CSP).
- Il build genera `site/s/p/<id>.jpg` 1080×1080 (JPEG qualità ~82, < 120 KB) con Pillow: fondo blu notte/nero con fascia arancio-azzurra, i due stemmi **identici a quelli dell'app** (porting Python di `site/js/stemma.js`: stesso hash FNV-1a, stessi colori, stessa forma e iniziali; test che confrontano colori e iniziali Python vs JS su un campione di id/nomi), nomi squadre, risultato grande, girone · giornata · data, marcatori per lato (max 6 per lato, poi "+N"), MVP, logo "Sporting Live" in basso. Font: DejaVu Sans Bold incluso in Pillow? No: si usa un TTF libero copiato nel repo in `scripts/font/` (Inter o DejaVu, licenza OFL/Bitstream compatibile, file di licenza accanto).
- Le immagini si rigenerano solo se cambiano i dati della partita (hash dei dati salvato nel nome o in un manifest `site/s/p/manifest.json`), così i commit dei dati non riscrivono centinaia di binari.
- Partite non giocate: nessuna pagina; il pulsante condivide l'URL normale.

### 2c. Pulsante Condividi
Componente `condividiHTML(opzioni)` + `collegaCondividi(root)` in `site/js/views/condividi.js`:
- Partita giocata: URL `SITO_URL s/p/<id>.html`; in più "Condividi immagine" che scarica il JPEG e usa `navigator.share({files})` se `navigator.canShare` lo consente, altrimenti apre l'immagine in una nuova scheda (l'utente la salva).
- Classifica, squadra, giocatore, partita non giocata: URL dell'app con hash (`location.href`), titolo e testo adatti.
- Senza `navigator.share`: copia negli appunti (`navigator.clipboard.writeText`) e mostra "Link copiato" per 2 s; se anche gli appunti falliscono, mostra il link selezionabile.
- Il JS conosce `SITO_URL` da `indice.sito` (scritto dal build).

## 3. Ricerca

- Il build scrive `site/data/cerca.json`: `{squadre:[{id,nome,girone}], giocatori:[{slug,nome,squadraId,girone}]}` della stagione corrente.
- Rotta `#/cerca`, icona lente nella testata. Campo di ricerca con autofocus; risultati dal 2° carattere, ricerca senza accenti e senza maiuscole, parole in qualsiasi ordine, max 30 risultati, squadre prima dei giocatori; ogni risultato con stemma e girone. Logica pura in `site/js/cerca.js` con test.

## 4. Calendario della squadra (ICS)

- Il build scrive `site/cal/<squadraId>.ics` per ogni squadra della stagione corrente: un VEVENT per partita **con data**, `UID:partita-<id>@sportinglive`, `DTSTART;TZID=Europe/Rome` (con VTIMEZONE Europe/Rome), durata 1 h (orario mancante: evento giornaliero), `SUMMARY:CASA - OSPITE` (con risultato "2-1" dopo la partita), `DESCRIPTION` con girone, giornata e link alla partita, `X-WR-CALNAME:<Squadra> · Sporting Live`, `REFRESH-INTERVAL;VALUE=DURATION:PT6H`. Righe ≤ 75 ottetti (folding), CRLF, escape di `,;\`. Generazione in `scraper/ics.py` con test.
- Pagina squadra: pulsante "Aggiungi al calendario" → `webcal://<host>/<path>cal/<id>.ics`, più link "scarica il file" (https) per chi non ha webcal.

## 5. Andamento e precedenti

- `girone/<slug>.json` include già `classifica.perGiornata` (verificare la forma nel raw). Il build aggiunge a `squadra/<id>.json` la serie `andamento: [{giornata, pos}]`.
- Pagina squadra, scheda Statistiche: grafico SVG inline (nessuna libreria) della posizione per giornata, asse y invertito (1 in alto), linea arancio, punti, etichette giornata; ≥ 2 punti per mostrarlo.
- Pagina partita: card "Precedenti" con gli scontri tra le due squadre nella stagione corrente e nelle stagioni d'archivio (abbinamento **per nome normalizzato**, perché gli id cambiano a ogni stagione), più bilancio V/N/P. Il build precalcola i precedenti nel JSON della partita.

## 6. Avvisi su Telegram (pronto ma spento)

- `scripts/telegram.py`: confronta l'indice pubblicato prima del build con quello nuovo; per ogni partita diventata giocata invia un messaggio al canale ("⚽ Serie B · CASA 2-1 OSPITE" + link alla pagina di condivisione). Al massimo 1 messaggio riepilogativo per girone per esecuzione se le nuove partite sono più di 5.
- Gira nel workflow dopo il deploy solo se esistono i segreti `TELEGRAM_TOKEN` e `TELEGRAM_CHAT`; errori di Telegram non fanno fallire il job (warning).
- Istruzioni per l'utente in `docs/attivazione.md` (creare il bot con BotFather, il canale, aggiungere il bot come amministratore, salvare i segreti).

## 7. Contenuti

### 7a. Edizioni d'archivio
- `stagioni.json` → `archivio`: lista di edizioni chiuse con la stessa struttura di quella corrente più `slug` (es. `2025-26`, `estate-2026`) e `nome` ("Stagione 2025/26", "Estate 2026"). Da inserire: 2025/26 (Calcio a 8: Serie A 392, B 388, C 393; Calcio a 5: Super League 390) ed Estate 2026 (Trofeo World Cup calcio a 8: gironi 404–408 con i nomi del sito ufficiale; Summer Cup calcio a 5: girone da individuare sulla pagina `summer-cup-calcio-a-5-2026.htm`). I gironi 409/410 ("classifiche generali") e i tabelloni delle finali (solo PDF) **non** si importano: le finali compaiono come link al PDF ufficiale nella pagina dell'edizione (campo `documenti` nell'edizione).
- Fetch: le edizioni d'archivio si leggono solo se il loro raw manca (`build/raw/<ed>/<idgirone>.json`); poi mai più. Un errore di parsing su un girone d'archivio lo salta con avviso, non blocca il resto.
- Build: ogni edizione ha il suo albero `site/data/a/<ed>/` con la stessa struttura di `site/data/` (indice, girone, partita, squadra, giocatore); l'indice principale elenca le edizioni (`edizioni: [{slug, nome}]`).
- App: rotte con prefisso `#/a/<ed>/…` (es. `#/a/2025-26/classifiche/serie-b`). Il router estrae l'edizione; `ctx.carica` legge da `data/a/<ed>/`; dopo ogni render `app.js` riscrive i link interni `#/…` dentro `<main>` aggiungendo il prefisso, e `ctx.naviga` lo aggiunge. Una fascia sotto la testata dice "Archivio · Stagione 2025/26 — torna alla stagione in corso". Preferiti, intro e girone scelto valgono solo per la stagione corrente (in archivio il girone si sceglie solo dalla rotta/foglio e non si salva).
- Info: sezione "Archivio" con l'elenco delle edizioni. Pagina squadra: "Anche in" con link alla stessa squadra (per nome) nelle edizioni d'archivio.

### 7b. Documenti
Info, card "Documenti ufficiali": link (nuova scheda) a regolamento/documenti, modulo variazione gara, trasferimento giocatore, apertura sinistri, iscrizioni, liste squadra; URL presi dalla home ufficiale e tenuti in `contenuti/documenti.json`, copiato dal build in `site/data/documenti.json`.

## 8. Fase sponsor

### 8a. Statistiche di visita (pronto ma spento)
- `contenuti/config.json` → `{ "goatcounter": "" }`, copiato dal build nell'indice (`indice.config`). Se vuoto non succede nulla.
- `site/js/visite.js`: a ogni cambio di rotta invia un pixel `https://<codice>.goatcounter.com/count?p=<percorso senza parametri personali>&t=<titolo>&rnd=…` con `new Image()`; percorso normalizzato (`/partita`, `/squadra/2480`, `/classifiche/serie-b`…), niente cookie, niente dati personali; rispetta `navigator.doNotTrack === '1'`. Nessun invio in localhost.
- CSP: `img-src 'self' data: https://*.goatcounter.com`.
- Info/Privacy: frase aggiornata ("conteggio anonimo delle pagine viste, senza cookie").

### 8b. Vantaggi (sponsor)
- `contenuti/vantaggi.json`: `{ "offerte": [ {id, sponsor, logo, titolo, descrizione, come, validoFino, link, telefono, indirizzo} ] }`, loghi in `site/img/sponsor/`. Il build lo copia filtrando le offerte scadute.
- Se non ci sono offerte attive la sezione non appare da nessuna parte. Se ci sono: quinta voce "Vantaggi" nella tab bar e rotta `#/vantaggi` con card per offerta (logo, titolo, descrizione, "Come ottenerlo", validità, pulsanti chiama/sito/mappa).
- Esempio commentato in `docs/attivazione.md`; nel repo il file parte con `offerte: []`.

### 8c. Dominio e poster
- `docs/attivazione.md`: come collegare `sportinglive.it` (record DNS, file `site/CNAME`, cambiare `SITO_URL`).
- `scripts/poster.py` genera `docs/poster/poster-a4.png` (2480×3508, 300 dpi) e `.pdf`: sfondo nero, foto, "Risultati, classifiche e marcatori sul telefono", QR code verso `SITO_URL`, loghi Sporting Club Mestre ed Endas. QR con la libreria `qrcode` (aggiunta a `scraper/requirements.txt`, che già include Pillow).

## 9. Rifiniture tecniche

- Tema chiaro: per testo e stati attivi su fondo chiaro usare un arancione scuro (`#c2410c`, contrasto ≥ 4.5:1 su bianco) tramite la variabile d'accento del tema chiaro; l'arancione pieno resta per grafica e pulsanti pieni con testo bianco (verificare contrasto ≥ 4.5:1 o testo bold ≥ 3:1).
- Foglio del girone: focus trap (Tab/Shift+Tab restano nel foglio), blocco dello scroll della pagina sotto, focus restituito al chip che l'ha aperto.

## Fuori ambito

Notifiche push vere, account, input dei risultati, acquisto del dominio, creazione degli account GoatCounter/Telegram (le fa l'utente seguendo `docs/attivazione.md`), raccolta degli stemmi veri dalle squadre (l'utente/organizzatore; l'app li supporta già).

## Verifica

Test Python (pytest) e JS (node --test) per ogni modulo puro nuovo; screenshot a 390 e 320 px nei temi scuro e chiaro delle schermate toccate; controllo della pagina di condivisione con un validatore OG offline (parsing dei meta nel test). Revisione per task e revisione finale prima del push.
