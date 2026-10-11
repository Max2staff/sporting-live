"""Andamento in classifica ricalcolato dai risultati e precedenti tra due squadre."""
from __future__ import annotations


def norm(nome) -> str:
    """Nome normalizzato per gli abbinamenti: maiuscolo, spazi compressi."""
    if isinstance(nome, dict):
        nome = nome.get("nome")
    return " ".join(str(nome or "").upper().split())


def _giocata(p: dict) -> bool:
    return bool(p.get("giocata")) and isinstance(p.get("golCasa"), int) and isinstance(p.get("golOspite"), int)


def andamento(partite_girone: list[dict], squadre: list[dict]) -> dict[int, list[dict]]:
    """Classifica ricalcolata dopo ogni giornata con tutte le partite giocate.

    Vittoria 3, pari 1. Ordine: punti, differenza reti, gol fatti, nome. "RIPOSO" e le partite
    contro "RIPOSO" sono ignorate. Ritorna {squadraId: [{giornata, pos, pt}]}.
    """
    reali = {s["id"]: s["nome"] for s in squadre if norm(s["nome"]) != "RIPOSO"}
    partite = [p for p in partite_girone if p["casaId"] in reali and p["ospiteId"] in reali]
    per_g: dict[int, list[dict]] = {}
    for p in partite:
        per_g.setdefault(p["giornata"], []).append(p)
    tot = {i: {"pt": 0, "dr": 0, "gf": 0} for i in reali}
    serie: dict[int, list[dict]] = {i: [] for i in reali}
    for g in sorted(per_g):
        if not all(_giocata(p) for p in per_g[g]):
            continue  # giornata incompleta: esclusa (e non conteggiata nei punti successivi)
        for p in per_g[g]:
            gc, go = p["golCasa"], p["golOspite"]
            for i, f, s in ((p["casaId"], gc, go), (p["ospiteId"], go, gc)):
                t = tot[i]
                t["pt"] += 3 if f > s else 1 if f == s else 0
                t["dr"] += f - s
                t["gf"] += f
        ordine = sorted(reali, key=lambda i: (-tot[i]["pt"], -tot[i]["dr"], -tot[i]["gf"], norm(reali[i])))
        for pos, i in enumerate(ordine, 1):
            serie[i].append({"giornata": g, "pos": pos, "pt": tot[i]["pt"]})
    return serie


def precedenti(partita: dict, tutte: list[dict]) -> dict:
    """Scontri precedenti tra le due squadre di `partita`, abbinati per nome normalizzato.

    `tutte`: lista piatta di partite {id?, edizione?, data, casa, ospite, golCasa, golOspite, giocata?}
    con `casa`/`ospite` come nome (stringa) o {"nome": ...}. Bilancio dal punto di vista di
    casa/ospite della partita corrente.
    """
    nc, no = norm(partita["casa"]), norm(partita["ospite"])
    corrente = (partita.get("id"), partita.get("edizione"))
    trovate = []
    for q in tutte:
        if (q.get("id"), q.get("edizione")) == corrente and q.get("id") is not None:
            continue
        a, b = norm(q["casa"]), norm(q["ospite"])
        if {a, b} != {nc, no} or nc == no or not _giocata({"giocata": q.get("giocata", True), **q}):
            continue
        trovate.append(q)
    trovate.sort(key=lambda q: q.get("data") or "", reverse=True)
    bil = {"casa": 0, "pari": 0, "ospite": 0}
    out = []
    for q in trovate:
        gc, go = q["golCasa"], q["golOspite"]
        if gc == go:
            bil["pari"] += 1
        else:
            vinc = norm(q["casa"]) if gc > go else norm(q["ospite"])
            bil["casa" if vinc == nc else "ospite"] += 1
        riga = {k: q[k] for k in ("id", "edizione") if q.get(k) is not None}
        riga.update({"data": q.get("data"), "casa": norm_nome(q["casa"]), "ospite": norm_nome(q["ospite"]),
                     "golCasa": gc, "golOspite": go})
        out.append(riga)
    return {"partite": out, "bilancio": bil}


def norm_nome(n) -> str:
    return n.get("nome") if isinstance(n, dict) else str(n)
