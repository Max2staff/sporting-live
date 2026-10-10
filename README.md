# Sporting Live

Risultati, classifiche e statistiche dei campionati dello Sporting Club Mestre, dal telefono.
Spec: `docs/superpowers/specs/2026-10-10-sporting-live-design.md`.

## Sviluppo locale

    python3 -m venv .venv && source .venv/bin/activate
    pip install -r scraper/requirements.txt
    python -m pytest -q && npm test
    python -m scraper.fetch && python -m scraper.build
    python3 -m http.server -d site 8080

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
- Un tabellino accettato senza formazioni dopo 7 giorni (completo=false) non viene più riletto: per forzarlo, cancella il suo file in scraper/cache/<idgirone>/tabellini/ e lancia un run.

## File da modificare a mano

- `stagioni.json`: campionati e gironi da leggere (idgirone dal sito ufficiale).
- `alias.json`: varianti di nomi giocatori → nome canonico; `"***"` oscura un nome.
