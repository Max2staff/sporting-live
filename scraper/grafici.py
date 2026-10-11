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
