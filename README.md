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

1. Crea il repo pubblico `sporting-live` su github.com, vuoto (senza fare il push).
2. Settings → Pages → Source: **GitHub Actions**.
3. Settings → Actions → General → Workflow permissions: **Read and write**.
4. Fai il push di `main`: il primo run parte da solo.
5. Verifica l'URL: al termine del run il sito è su `https://<utente>.github.io/sporting-live/`.

Se il primo run fallisce a `configure-pages`, Pages non era ancora abilitato: abilitalo e rilancia il workflow.

## Operatività

- Il workflow gira ogni mezz'ora nelle serate feriali (dalle 19:00-20:00 fino a mezzanotte e mezza/l'una e mezza, a seconda dell'ora legale) e una volta al mattino presto; i risultati di una serata compaiono entro mezz'ora dalla pubblicazione sul sito ufficiale.
- Un run fa un commit (`chore: aggiornamento dati [skip ci]`) solo se i dati del sito ufficiale sono cambiati; l'ora in testata all'app è quella dell'ultimo cambiamento.
- Le schedulazioni si spengono dopo 60 giorni senza commit: in pausa estiva lancia un run manuale ogni due mesi.
- Nuova stagione: aggiorna `stagioni.json` (sposta i gironi vecchi in `archivio`), svuota `scraper/cache/` e `build/raw/` (lascia i file `.gitkeep`).
- Un nome giocatore scritto in due modi: aggiungi la variante in `alias.json`; per oscurare un nome usa `"***"`.
- Se il sito ufficiale cambia HTML: il run mostra righe `AVVISO` e la pagina segnala "dati parziali";
  fallisce (mail da GitHub) solo con più di 10 avvisi per girone o senza classifica e senza dati precedenti.
- Un tabellino accettato senza formazioni dopo 7 giorni (completo=false) non viene più riletto: per forzarlo, cancella il suo file in scraper/cache/<idgirone>/tabellini/ e lancia un run.

## File da modificare a mano

- `stagioni.json`: campionati e gironi da leggere (idgirone dal sito ufficiale).
- `alias.json`: varianti di nomi giocatori → nome canonico; `"***"` oscura un nome.
