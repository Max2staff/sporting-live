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
