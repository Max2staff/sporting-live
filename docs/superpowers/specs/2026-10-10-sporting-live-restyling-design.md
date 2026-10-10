# Sporting Live — restyling: tema nero, introduzione, selettore girone, stemmi

Data: 2026-10-10. Stato: approvato in conversazione. Estende la spec di fase 1
(`2026-10-10-sporting-live-design.md`); vale solo per `site/` più piccole aggiunte alla build.

## 1. Obiettivo

Rendere l'app riconoscibile e piacevole: tema scuro nero di default con colori vivi, una
introduzione al primo avvio con scelta di campionato, girone e squadra, un selettore di categoria e
girone sempre a portata, stemmi per tutte le squadre, foto nelle testate, pagine più ricche.
Scraper, dati e workflow non cambiano, salvo §5 (flag stemma/foto nella build).

## 2. Tema e identità

- Default scuro nero: sfondo `#0a0a0a`, superficie card `#161a1f`, superficie alta `#1f252b`, bordo
  `#2a323a`, testo `#f3f5f7`, muto `#9aa7b2`.
- Accenti: arancione `#ff4e00` (risultati del giorno, azioni primarie, stella attiva), azzurro
  elettrico `#38bdf8` (link, selezione, tab attiva), verde acido `#22c55e` vittorie, giallo
  `#facc15` pareggi/ammonizioni, rosso `#ef4444` sconfitte/espulsioni.
- Testate "hero": foto di sfondo con velo scuro (gradiente da `#01213b` 85% a `#0a0a0a`), titolo
  grande; usate in intro, home, partita, squadra, info.
- Tipografia: font di sistema; risultati e numeri chiave in peso 800 e dimensione grande
  (punteggio partita 2.8rem); titoli 1.3rem peso 700, lettere leggermente strette (`letter-spacing:-.01em`).
- Tema chiaro resta selezionabile in Info (token semantici già previsti); `data-theme` di default
  è `dark` se l'utente non ha scelto.

## 3. Introduzione (primo avvio)

Rotta `#/intro`, mostrata automaticamente se `localStorage['sl.intro']` non è `'ok'` (fallback: se lo
storage non è disponibile, mostrata una volta per sessione in memoria). Tre passi a tutto schermo,
con punti di avanzamento e "Salta" sempre visibile:

1. **Benvenuto**: foto premiazione, logo Sporting Live, "Tutti i campionati dello Sporting Club
   Mestre in tasca: risultati, classifiche, statistiche." Pulsante "Inizia".
2. **Il tuo campionato**: card grandi per ogni campionato dell'indice (Calcio a 8, Calcio a 5),
   sotto i gironi come chip; la scelta imposta il contesto (§4).
3. **La tua squadra**: griglia di stemmi delle squadre del girone scelto; tocco = preferita (più
   di una possibile); "Fatto" chiude e porta alla home. Scelta salvata con l'API preferiti esistente.

Al termine `sl.intro = 'ok'`. In Info c'è "Rivedi l'introduzione".

## 4. Contesto: categoria e girone

- Modulo `contesto.js`: `leggiGirone() -> slug | 'tutti'`, `impostaGirone(slug)`, storage
  `sl.girone`, fallback in memoria. Default `'tutti'`.
- Barra chip sotto la testata in Partite, Classifiche, Giocatori: "Calcio a 8 · Serie B ▾" (o
  "Tutti i gironi ▾" in Partite). Tocco: foglio dal basso (`<dialog>` o div fisso) con i campionati
  e i gironi; opzione "Tutti i gironi" solo per Partite.
- Partite: con un girone scelto mostra solo quel girone; con "tutti" raggruppa come oggi.
  Classifiche e Giocatori: se il contesto è `'tutti'` usano il primo girone; il cambio nel foglio
  aggiorna il contesto per tutte le viste. Le rotte `#/classifiche/<slug>` e `#/giocatori/<slug>`
  restano valide e, se presenti, impostano il contesto.

## 5. Stemmi e foto

- `stemma.js`: `stemmaHTML(squadra, dim)` restituisce SVG inline: scudo con due colori derivati in
  modo deterministico dall'`id` (hash → tonalità principale e secondaria, saturazione e luminosità
  fisse per leggibilità su nero), iniziali (`iniziali(nome)`: iniziali delle prime due parole significative, ignorando le
  sigle puntate come "F.C.", "R.S.M." e le parole REAL, ASD, FC, AC, SS, US, AS, CALCIO, C5, C8;
  con una sola parola significativa, le sue prime due lettere: SOCKS → SO, F.C. PELIGROS → PE).
  Se `squadra.stemma` è vero, al posto dell'SVG un `<img src="img/stemmi/<id>.png">` con lo stesso
  contorno. Dimensioni: 24 (righe), 40 (classifica/podio), 72 (testate), 96 (intro).
- Loghi veri: `site/img/stemmi/<id>.png` (quadrati, 256px). Build: `indice.squadre[].stemma`
  e `squadra/<id>.json.stemma` = esistenza del file; `squadra/<id>.json.foto` = esistenza di
  `site/img/squadre/<id>.jpg`. Il logo SOCKS verrà aggiunto quando l'utente indica quale delle
  proposte 2026/27 è stata scelta; fino ad allora anche SOCKS usa lo stemma generato.
- Foto hero in `site/img/foto/`: `premiazione.jpg` e `campo.jpg` dal sito ufficiale (consenso
  dell'organizzazione), ridimensionate a 1600px, qualità 80. Loghi: `site/img/loghi/endas.png`,
  `sporting-club-mestre.png`.

## 6. Pagine

- **Home**: hero compatto (foto campo, giorno selezionato, chip contesto), "La mia squadra" con
  stemma, prossima e ultima partita; blocco "In evidenza" per il girone scelto (capolista con
  punti, capocannoniere con gol, ultima giornata giocata) o, con "tutti", le capoliste; poi le
  partite del giorno con stemmi.
- **Partita**: hero con i due stemmi grandi, punteggio al centro, nomi sotto, giornata e data;
  timeline con icona pallone per i gol e cartellini colorati; migliore in campo con badge ★.
- **Classifica**: podio dei primi tre (stemma, nome, punti; il primo più alto) sopra la tabella;
  badge "capolista"; zone promozione/retrocessione come bordo colorato a sinistra delle righe, in
  base a `stagioni.json` (`promozione`, `retrocessione` per girone; default assenti).
- **Squadra**: hero con stemma grande, nome, girone, posizione, forma; foto di squadra se esiste.
- **Giocatori**: righe-card con stemma della squadra, numero grande a destra; medaglie oro/argento/
  bronzo ai primi tre.
- **Giocatore**: testata con stemma della squadra e numeri grandi.
- **Info**: credits con loghi Endas e Sporting Club Mestre su foto premiazione, "Rivedi
  l'introduzione", tema.

## 7. Vincoli

Come fase 1: niente framework né bundler, nessun font esterno, localStorage sempre in try/catch,
tap ≥ 44px, testi in italiano, CSP invariata (immagini solo da `self`). Peso aggiunto: foto
≤ 250 KB l'una, stemmi SVG inline senza richieste di rete. Service worker: aggiornare `VERSIONE` e
aggiungere i nuovi file alla SHELL.

## 8. Test

Node: `stemma.js` (iniziali, colori stabili per id, scelta img/svg), `contesto.js` (default,
persistenza, fallback), logica intro (quando mostrarla), "In evidenza" (capolista/capocannoniere
da girone.json). Python: build aggiunge i flag `stemma`/`foto` in base ai file. Verifica visiva
finale con Chrome headless a 390px su intro, home, partita, classifica, squadra, giocatori, info,
nel tema nero e nel tema chiaro.
