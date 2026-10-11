# Calendario, tasto indietro e grafici — design

Data: 2026-10-11 · Stato: approvato in chat, in attesa di revisione del documento

## Obiettivo

L'utente vuole tre cose che oggi mancano all'app:

1. un calendario del girone diviso per giornate;
2. un modo per tornare indietro, sia dalle pagine di dettaglio sia dopo aver cambiato girone;
3. grafici "da effetto wow" sull'andamento e sulle statistiche.

Scelte fatte dall'utente:
- il calendario va dentro Classifiche;
- il tasto indietro serve nelle pagine di dettaglio e nella scelta del girone;
- servono tutti e quattro i gruppi di grafici: corsa al titolo, gol e risultati della squadra, marcatori, confronto partita.

Vincoli già presenti nel progetto:
- niente librerie esterne (i grafici sono SVG scritti a mano, come `site/js/grafico.js`);
- tema chiaro e tema scuro;
- deve funzionare anche nelle pagine d'archivio (`#/a/<edizione>/...`);
- la riga "RIPOSO" non è mai una squadra vera.

## 1. Calendario (scheda in Classifiche)

- `#/classifiche/<girone>` diventa una pagina con tre schede: **Classifica**, **Calendario**, **Statistiche**.
  - Indirizzi: `#/classifiche/<girone>`, `#/classifiche/<girone>/calendario`, `#/classifiche/<girone>/statistiche`, con prefisso d'archivio quando serve.
  - Il pulsante di condivisione resta nella scheda Classifica.
- **Calendario**:
  - una giornata alla volta, `#/classifiche/<girone>/calendario/<n>`;
  - frecce ‹ › e un menu a tendina con tutte le giornate;
  - giornata iniziale: la prima con almeno una partita non giocata, altrimenti l'ultima;
  - riga partita: data breve, ora, stemmi e nomi, risultato oppure "–". "A tavolino" ha un'etichetta;
  - le partite delle squadre preferite sono evidenziate e ogni riga porta a `#/partita/<id>`;
  - le partite senza giornata o senza data finiscono in un gruppo "Da definire".
- **Partite**: quando è scelto un solo girone, sotto il selettore del giorno compare il link "Calendario completo ›".
- Logica pura in `site/js/calendario.js`: `giornate(partite)`, `giornataIniziale(partite)`, `partiteGiornata(partite, n)`. La vista sta in `site/js/views/classifiche.js`, che si divide in schede (eventualmente con l'aiuto di `views/calendario.js`).

## 2. Tasto indietro

- **Pagine di dettaglio** (`squadra`, `partita`, `giocatore`): pulsante ‹ a sinistra nella testata, al posto del logo.
  - Se nella sessione c'è una pagina precedente dell'app, fa `history.back()`.
  - Altrimenti (link aperto da fuori) va alla pagina madre con `location.replace`:
    - partita → `#/partite/<data>`;
    - squadra → `#/classifiche/<girone>`;
    - giocatore → `#/squadra/<squadraId>`;
    - nelle pagine d'archivio il prefisso viene mantenuto.
  - Per sapere se c'è una pagina precedente: un contatore di navigazioni interne in `sessionStorage`, con ripiego in memoria se lo storage non è disponibile, oppure `history.state`.
- **Scelta del girone**: scegliere un girone nel foglio fa `location.hash = ...` con il girone nell'indirizzo, non `replaceState`. Così ogni cambio è un passo della cronologia e il "back" del telefono riporta al girone precedente. Per "Tutti i gironi" in Partite si usa un indirizzo esplicito.
  - Va verificato come oggi `impostaGirone` e le viste leggono il girone, perché la scelta salvata e quella nell'indirizzo devono restare coerenti.
- Logica pura in `site/js/indietro.js`: `paginaMadre(rotta, dati)` e la gestione del contatore.

## 3. Grafici

Ogni grafico è una funzione pura che restituisce una stringa SVG e sta in `site/js/grafici/` (il grafico esistente si sposta lì, oppure resta in `grafico.js` e viene importato da lì).

Regole comuni:
- `viewBox` fissa e `width="100%"`;
- `role="img"` e `aria-label` con una frase che riassume il dato;
- colori presi dalle variabili CSS del tema;
- etichette mai sotto gli 11 px;
- se i dati sono troppo pochi, nessun grafico: la funzione restituisce `''` e la card non compare.

Animazione:
- linee disegnate con `stroke-dashoffset`, barre che crescono con `transform: scaleY` e ciambella con `stroke-dasharray`;
- solo CSS, circa 0,8 s;
- disattivata con `@media (prefers-reduced-motion: reduce)`.

| Grafico | Dove | Dati | Dettagli |
|---|---|---|---|
| Corsa al titolo | Classifiche → Statistiche | nuovo `girone.andamento`: `{squadraId: [{giornata, pt, pos}]}` | Punti cumulati per giornata. Le prime 3 della classifica attuale e le preferite sono colorate, le altre grigie e sottili. Sotto, una legenda con i nomi: toccandone uno la sua linea si evidenzia (classe CSS, nessun nuovo render). Almeno 2 giornate giocate. |
| Corsa marcatori | Classifiche → Statistiche | nuovo `girone.corsaMarcatori`: `[{slug, nome, squadraId, gol: [cumulati per giornata]}]`, primi 5 | Linee a gradini, con il nome a fine linea. Almeno 2 giornate e almeno 1 gol. |
| Gol per giornata | Squadra → Statistiche | `squadra.partite` (gf, gs, giornata) | Barre contrapposte: gol fatti sopra, gol subiti sotto. Il colore dice l'esito (V, N, P). |
| Ciambella esiti | Squadra → Statistiche | `squadra.stat` | V/N/P con il numero di partite giocate al centro. |
| Confronto con la media | Squadra → Statistiche | `squadra.stat` più la media del girone, calcolata nel generatore come `squadra.mediaGirone`: `{gf, gs, pt}` per partita | Tre barre orizzontali "squadra" contro "media". |
| Gol e voti per partita | Giocatore | `giocatore.perPartita` | Barre dei gol. Se ci sono almeno 2 voti, anche una linea con i voti (scala 4–10). |
| Confronto partita | Partita | squadre del girone, classifica, forma e `precedenti` | Barre contrapposte casa/ospite per posizione, punti, gol fatti, gol subiti e media punti nelle ultime 5, più il bilancio dei precedenti. Vale anche per le partite da giocare. I dati sono quelli della classifica attuale, non di quel giorno, e il grafico lo scrive (titolo "Le squadre oggi"). Il generatore aggiunge a `partita/<id>.json` un campo `confronto` con le righe di classifica delle due squadre e la loro forma, così la pagina non deve caricare il girone. |

### Modifiche al generatore (`scraper/build.py`)

- `girone/<slug>.json`:
  - `andamento`, presa da `andamento()` che esiste già e ha anche `pt`;
  - `corsaMarcatori`, calcolata da `giocatori(raw)[*].perPartita`, ordinata per gol e con i primi 5.
- `squadra/<id>.json`: `mediaGirone`.
- `partita/<id>.json`: `confronto` con `{casa: {pos, pt, g, gf, gs, forma}, ospite: {...}}`; `null` se la classifica non c'è.
- La riga RIPOSO va esclusa ovunque. Si applica anche agli archivi, che vengono rigenerati.

## Test

- **Python**: per `andamento` nel girone, `corsaMarcatori` (ordine, cumulati, girone senza gol), `mediaGirone`, `confronto` (anche con RIPOSO e senza classifica).
- **JavaScript** (`node --test`):
  - `calendario.js`: giornata iniziale, girone finito, partite da definire;
  - `indietro.js`: pagina madre per ogni vista, con e senza archivio;
  - ogni funzione grafico: restituisce `''` quando i dati sono troppo pochi, aria-label corretta, numero di elementi corretto, nessun `NaN` nell'SVG.
- **A mano**: simulazione iPhone con puppeteer su Classifica, Calendario, Statistiche, Squadra, Giocatore e Partita, in tema chiaro e scuro. Controllo che non ci siano sbordature laterali né errori in console.

## Fuori da questo lavoro

Spazi sponsor, grafici nelle immagini da condividere, griglia mensile del calendario.
