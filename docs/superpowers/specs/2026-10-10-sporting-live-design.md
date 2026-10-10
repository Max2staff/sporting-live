# Sporting Live — specifica di progetto

Data: 2026-10-10. Stato: approvata in conversazione, in attesa di revisione scritta.

## 1. Scopo

Web app pubblica, pensata per lo smartphone, con risultati, calendari, classifiche e statistiche di
tutti i campionati organizzati dallo Sporting Club Mestre (Endas Venezia), oggi pubblicati sul sito
`campionatisportingclub.it`. Sostituisce per i giocatori la consultazione del sito ufficiale, che non è
pensato per il telefono. Una sezione "Vantaggi" ospita le offerte degli sponsor, unica fonte di
entrate del progetto (copertura costi e tempo del manutentore).

Nasce come progetto separato dall'app privata SOCKS Calciotto (`Documents/Socks_Calciotto`), dalla
quale riusa scraper e parser. L'app SOCKS non viene toccata.

Fuori ambito, per decisione esplicita: login e account, cassa di squadra, inserimento risultati da
parte dell'organizzazione, app native per gli store, pannello sponsor self-service, notifiche push
(possibili fasi future, vedi §10).

## 2. Vincoli e decisioni prese

- Nessun server, nessun database: scraper su GitHub Actions, sito statico su GitHub Pages.
- Dati letti dal sito ufficiale con il consenso dell'organizzatore (accordo verbale; da confermare
  per email in due righe: autorizzazione a leggere e ripubblicare i dati, sponsor portati e
  incassati dal manutentore).
- Accesso pubblico, nessuna password, nessuna cifratura.
- Preferiti ("Le mie squadre") salvati solo sul telefono (localStorage).
- Statistiche individuali complete e pagine giocatore, con privacy policy ed email per chiedere
  l'oscuramento del proprio nome.
- Nome: **Sporting Live**. Dominio previsto `sportinglive.it` (da acquistare; finché non c'è si
  usa `https://<utente>.github.io/sporting-live/`).
- Identità visiva derivata dal sito ufficiale: blu notte `#01213b`, azzurro `#00579e`, arancione
  `#ff4e00` come accento, grigi `#455a64` / `#eceff1`. Logo nuovo e semplice "Sporting Live";
  marchi Endas Venezia e Sporting Club Mestre in testata, solo con il loro consenso.
- Modelli di riferimento per UX: diretta.it e livescore.com (lista partite per giornata, barra
  campionati, preferiti con stellina, dettaglio partita con tabellino, barra inferiore).

## 3. Scala e fonte dati

Sito ufficiale, stagione 2026/27 (rilevato il 2026-10-10):

| Campionato | Gironi | idgirone |
|---|---|---|
| Calcio a 8 — Serie A, B, C | 3 | 422, 421, 425 (da verificare quale è A/C) |
| Calcio a 5 — Super League | 1 | 426 |
| Trofei estivi (World Cup, coppe) | 5–7 l'estate | 404–411 nel 2026 |

Tutte le pagine sono le stesse tre PHP già lette dallo scraper SOCKS, parametrizzate su `idgirone`:

- `campionati0gironigiornatepartite_calendario.php?idgirone=N`
- `campionati0gironigiornatepartite_classifica.php?idgirone=N[&tipo=incasa|fuoricasa][&giornata=G]`
- `campionati0gironigiornatepartite_tabellini.php?idgirone=N&tipo=partita&idpartita=P`

Le partite si giocano nei giorni feriali, tra le 20:30 e le 22:00. Ordine di grandezza per run
completo: 4 calendari + 4 classifiche + tabellini nuovi (10–20 per serata) ≈ 30 richieste, con pausa
di 0,5 s ≈ 1 minuto.

## 4. Architettura

```
Sporting_Live/
  stagioni.json            # elenco campionati/gironi da leggere (a mano)
  sponsor.json             # offerte sponsor (a mano)
  alias.json               # varianti di nomi giocatori -> nome canonico (a mano)
  scraper/                 # Python 3.12 (3.9 compatibile in locale)
    config.py  fetch.py  parse.py  build.py  stats.py
    cache/                 # HTML dei tabellini e delle giornate concluse (committato)
    tests/  fixtures/
  site/                    # sito statico (HTML/CSS/JS vanilla, moduli ES, nessun bundler)
    index.html  css/  js/  js/views/  js/tests/  img/  icons/
    data/                  # JSON prodotti dalla build (committati, serviti da Pages)
    manifest.webmanifest  sw.js
  .github/workflows/build.yml
  docs/superpowers/specs/  docs/superpowers/plans/
```

Flusso: Actions (schedule o push) → `pytest` → `python -m scraper.fetch` (legge il sito, aggiorna
cache, scrive `build/raw/<idgirone>.json`) → `python -m scraper.build` (unisce gironi, calcola
statistiche, applica alias, scrive `site/data/*.json`) → commit di `site/data` e `scraper/cache` su
`main` → GitHub Pages pubblica `site/` dalla cartella `/site` del branch `main` (un solo repo
pubblico, nessuna deploy key).

Schedulazione (`TZ=Europe/Rome`, cron in UTC): ogni 30 minuti dal lunedì al venerdì dalle 20:00
alle 23:30; una volta al giorno alle 07:00; manuale con `workflow_dispatch`; su push che tocca
`stagioni.json`, `sponsor.json`, `alias.json`, `scraper/**`, `site/**` (esclusi `site/data`).
`concurrency: group=build` per evitare run sovrapposti. Nota: le schedulazioni GitHub si spengono
dopo 60 giorni senza commit; i run scrivono commit solo se i dati cambiano, quindi in pausa estiva
serve un run manuale ogni due mesi (documentato nel README).

## 5. Dati

### 5.1 `stagioni.json` (input manuale)

```json
{
  "stagione": "2026/27",
  "campionati": [
    {"id": "c8", "nome": "Calcio a 8", "gironi": [
      {"idgirone": 422, "nome": "Serie A", "slug": "serie-a"},
      {"idgirone": 421, "nome": "Serie B", "slug": "serie-b"},
      {"idgirone": 425, "nome": "Serie C", "slug": "serie-c"}]},
    {"id": "c5", "nome": "Calcio a 5", "gironi": [
      {"idgirone": 426, "nome": "Super League", "slug": "super-league"}]}
  ],
  "archivio": []
}
```

`archivio` conterrà le stagioni chiuse (stessa struttura) per mantenere lo storico senza rileggerle.
Un girone con `"attivo": false` viene servito dai dati in cache senza nuove richieste.

### 5.2 Scraper (`scraper/`)

- `config.py`: costanti del sito (BASE, URL builder, UA `SportingLive/1.0`, pausa, timeout,
  tentativi). Riuso diretto da SOCKS, senza `IDGIRONE`/`IDSQUADRA`.
- `parse.py`: riuso diretto di `parse_classifica`, `parse_calendario`, `parse_tabellino` da SOCKS,
  con le loro fixture e i loro test. Da verificare su un girone diverso (Serie A, Super League C5):
  se la struttura HTML differisce, il parser va esteso e la fixture aggiunta.
- `fetch.py`: `Fetcher` riusato. Per ogni girone attivo: calendario, classifica totale, classifica
  in casa/fuori casa, tabellini delle partite giocate non ancora in cache. Produce
  `build/raw/<idgirone>.json` con: `aggiornato`, `squadre` (id→nome), `classifica`, `partite`,
  `tabellini` (per id partita), `stale` (sezioni servite dal dato precedente), `errori`.
  Politica di errore, come SOCKS: ogni sezione fa fallback al dato precedente e segna `stale`;
  il run fallisce (mail da Actions) solo se la classifica totale di un girone non si legge e non
  c'è nessun dato precedente, oppure se gli avvisi superano 10 per girone.
- `build.py`: unisce i raw, applica `alias.json`, chiama `stats.py`, scrive i file di §5.3. Non
  scrive mai un indice vuoto: se accadrebbe, esce con errore e lascia i file precedenti.
- `stats.py` (puro, testabile): da calendario + tabellini calcola per giocatore e per squadra:
  presenze, gol, media voto, numero voti, ammonizioni, espulsioni, "migliore in campo", forma
  ultime 5, serie di risultati. L'identità del giocatore è `(nome canonico, squadra, girone)`;
  nessun collegamento tra squadre o stagioni diverse (evita omonimi e trasferimenti).

### 5.3 Output per il sito (`site/data/`)

- `indice.json`: stagione, campionati, gironi (slug, nome, idgirone, `aggiornato`, `stale`),
  elenco squadre con id, nome, slug, girone; `generato` (timestamp).
- `girone/<slug>.json`: classifica (totale, casa, fuori), partite (con id, giornata, data, ora,
  casaId, ospiteId, gol, giocata, tavolino), giornate con date, marcatori del girone, migliori voti,
  fair play, forma per squadra.
- `partita/<id>.json`: tabellino completo (marcatori con minuto, formazioni con numero e voto,
  cartellini, migliore in campo).
- `squadra/<id>.json`: rosa aggregata dai tabellini, statistiche squadra, risultati, prossime.
- `giocatore/<slug>.json`: riepilogo e lista partita per partita. Slug = `squadraId-nome-canonico`.
- `sponsor.json` copiato da root, con i loghi in `site/img/sponsor/`.

Dimensione attesa: indice < 20 KB, girone < 100 KB. Il sito carica `indice.json` all'avvio e gli
altri file su richiesta; il service worker li tiene in cache con strategia "rete prima, cache se
offline" per i JSON e "cache prima" per gli asset.

### 5.4 Nomi giocatori

Il sito ufficiale scrive i nomi a mano nei tabellini, con varianti. `alias.json` mappa
`variante → nome canonico` per girone; le varianti non mappate restano come sono. Lo scraper
segnala in log i nomi "simili" (distanza di edit ≤ 2 nella stessa squadra) senza unirli: la
decisione è manuale, come nell'app SOCKS.

## 6. Sito: navigazione e schermate

Vanilla JS con moduli ES, router su hash (`#/partite`, `#/girone/serie-b`, `#/partita/14083`,
`#/squadra/2480`, `#/giocatore/<slug>`, `#/vantaggi`, `#/vantaggi/<id>`, `#/info`). Nessun
framework e nessun bundler, come l'app SOCKS: il sito è servito così com'è.

Barra inferiore fissa con quattro voci: **Partite**, **Classifiche**, **Giocatori**, **Vantaggi**.
Testata: logo Sporting Live a sinistra, stagione, icona info/impostazioni (tema chiaro/scuro,
privacy) a destra.

**Partite** (home). Selettore giorno in alto come Diretta: giorno corrente al centro, frecce per
scorrere, calendario a tendina; i giorni senza partite vengono saltati. Sotto, blocco "Le mie
squadre" (se ci sono preferiti) con la prossima/ultima partita di ciascuna; poi le partite del
giorno raggruppate per campionato e girone, con intestazione cliccabile che porta alla classifica.
Riga partita: ora o risultato, nomi squadre, stellina preferiti, indicatore "tabellino disponibile".
Partita a tavolino evidenziata. Stato aggiornamento in fondo ("Aggiornato alle 21:30"; "dati
parziali" se `stale`).

**Dettaglio partita.** Testata con squadre, risultato grande, giornata e data. Tab: Riepilogo
(marcatori con minuto in timeline, migliore in campo), Formazioni (due colonne, numero, nome,
voto, icone cartellini), Classifica (estratto del girone con le due squadre evidenziate). Tocco su
nome giocatore → pagina giocatore; su squadra → pagina squadra.

**Classifiche.** Tab orizzontali per girone. Tabella: pos, squadra, PT, G, V, N, P, GF, GS, DR,
forma ultime 5 (pallini colorati). Toggle totale/casa/fuori. Tocco su riga → pagina squadra.

**Pagina squadra.** Testata con nome, girone, posizione, stellina. Tab: Risultati (tutte le
partite con risultato, prossima in evidenza), Rosa (giocatori con presenze, gol, media voto,
cartellini), Statistiche (gol fatti/subiti per partita, rendimento casa/fuori, serie).

**Giocatori.** Selettore girone (o "tutti"). Tab: Marcatori, Migliori voti (minimo 3 voti),
Migliori in campo, Fair play (meno cartellini, minimo presenze). Tocco → pagina giocatore.

**Pagina giocatore.** Nome, squadra, girone; card con presenze, gol, media voto, cartellini,
premi; lista partita per partita (data, avversario, risultato, voto, gol, cartellini).

**Vantaggi.** Lista offerte sponsor come card: logo, titolo, sintesi, scadenza, categoria. Tocco →
schermata offerta a tutto schermo pensata per essere mostrata in negozio: logo grande, descrizione,
codice in evidenza, validità, indirizzo e link. Banner sponsor in home (posizione "home") e riga
"Campionato offerto da" nelle classifiche (posizione "girone/<slug>"), solo se presenti in
`sponsor.json`.

**Info.** Chi siamo, fonte dati (link al sito ufficiale), privacy policy, email per oscuramento
nome, crediti, versione, tema.

### 6.1 Stile

- Tema chiaro di default con testata blu notte; tema scuro con sfondo `#0b1620`; rispetta
  `prefers-color-scheme`, selezionabile in Info, salvato in localStorage.
- Accento arancione per: risultati delle partite del giorno, stellina attiva, badge "oggi", pulsanti
  primari. Verde/giallo/rosso solo per forma e cartellini.
- Font di sistema; nessun web font esterno (velocità e niente richieste a terzi).
- Icone: SVG inline, set coerente (stellina, frecce, calendario, cartellini, pallone).
- Larghezza massima 640 px centrata su desktop; tap target ≥ 44 px; nessuno scroll orizzontale.
- Caricamento: scheletri grigi, mai pagine vuote; errore di rete → ultimi dati con avviso.
- PWA: manifest con icone 192/512 e maskable, `display: standalone`, colore tema blu notte,
  service worker con aggiornamento silenzioso e avviso "nuova versione disponibile".

### 6.2 Preferiti

Stellina su righe partita, pagina squadra, classifica. Salvati in localStorage come lista di
`squadraId`. Sezione "Le mie squadre" in home; nelle classifiche la riga della squadra preferita è
evidenziata. Nessuna sincronizzazione tra dispositivi (dichiarato in Info).

## 7. Sponsor (`sponsor.json`)

```json
{
  "offerte": [
    {
      "id": "pizzeria-rossi-2026",
      "sponsor": "Pizzeria Rossi",
      "logo": "pizzeria-rossi.png",
      "titolo": "10% per le squadre dei campionati",
      "descrizione": "Mostra questa schermata alla cassa.",
      "codice": "SPORTING10",
      "categoria": "Ristorazione",
      "valida_dal": "2026-10-15",
      "valida_al": "2027-06-30",
      "indirizzo": "Via ... Mestre",
      "link": "https://...",
      "posizioni": ["vantaggi", "home"],
      "attiva": true
    }
  ]
}
```

Le offerte scadute o con `attiva: false` non vengono pubblicate (filtro nella build). Le posizioni
possibili: `vantaggi` (lista), `home` (banner a rotazione sotto il selettore giorno), `girone/<slug>`
(riga sponsor della classifica). Gestione manuale: file modificato e pushato dal manutentore;
online al run successivo (~2 minuti).

Misurazione: Cloudflare Web Analytics (senza cookie, nessun banner) con eventi personalizzati per
"apertura offerta" e "banner visto"; in alternativa GoatCounter. Il numero di aperture per offerta
è il dato che si dà allo sponsor. Nessun tracciamento individuale.

Fatturazione e contratti con gli sponsor restano fuori dall'app.

## 8. Aspetti legali e di rispetto del sito ufficiale

- Privacy policy in Info: dati trattati (nomi dei giocatori già pubblicati dall'organizzazione,
  nessun dato raccolto dagli utenti, preferiti solo sul dispositivo, analytics senza cookie),
  titolare, email per oscuramento. Un nome da oscurare va in `alias.json` con valore `"***"` e il
  build lo sostituisce ovunque con "Giocatore".
- Footer: "Dati: campionatisportingclub.it, Endas Venezia".
- Scraper educato: UA identificabile con contatto, pausa 0,5 s, cache dei tabellini, nessuna
  richiesta oltre le pagine elencate, nessun run nelle ore di punta del sito.

## 9. Test e verifica

- `pytest scraper/tests`: parser su fixture HTML (quelle SOCKS più almeno una classifica, un
  calendario e un tabellino per ogni girone di tipo diverso: Serie A, Super League C5, un trofeo
  estivo); `stats.py` su un piccolo set sintetico (gol, voti, cartellini, forma, migliore in campo,
  alias, oscuramento); `build.py` che rifiuta un indice vuoto e mantiene i file precedenti.
- `node --test site/js/tests`: router, formattazione date/giornate, selezione del giorno con
  partite, preferiti, filtro offerte attive, composizione home.
- Actions: i test girano prima dello scraping; un run che produce dati identici non fa commit.
- Verifica manuale prima della prima pubblicazione: demo locale con `python3 -m http.server -d site`
  usando i dati reali, controllo su iPhone e Android (installazione sulla home, offline, tema).

## 10. Fasi

1. **Prima versione (visibile all'organizzatore)**: §4, §5, §6 senza Vantaggi; pubblicata su
   github.io. Riuso del parser, dati reali di tutti i gironi 2026/27.
2. **Vantaggi e dominio**: §7, analytics, privacy policy completa, dominio `sportinglive.it`,
   loghi ufficiali con consenso.
3. **Eventuali**: notifiche push (richiede un servizio esterno per l'invio), pannello sponsor
   self-service (richiede backend e login sponsor), altri centri sportivi (richiede `stagioni.json`
   per centro e un selettore in testata; il modello dati è già per girone, quindi compatibile).

## 11. Rischi

- Cambio di HTML del sito ufficiale: stesse difese di SOCKS (fallback per sezione, soglia avvisi,
  mail su fallimento). Le fixture non lo rilevano; lo rilevano i log e il flag `stale` in pagina.
- Gironi con strutture diverse (coppe a eliminazione, tabelloni PDF): fuori dalla prima versione;
  `stagioni.json` include solo gironi con calendario e classifica standard.
- Omonimi: identità giocatore per squadra e girone, non globale; accettato.
- Sponsor senza misurazione affidabile: le analytics sono approssimate per natura (adblock);
  dichiararlo allo sponsor.
