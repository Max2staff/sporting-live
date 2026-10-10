"""Statistiche di squadra e giocatori. Funzioni pure sul raw di un girone (vedi fetch.raccogli_girone)."""
from __future__ import annotations

import re
import unicodedata

MIN_VOTI = 3
MIN_PRESENZE_FAIRPLAY = 3
MAX_VOCI = 50


def slug_giocatore(squadra_id: int, nome: str) -> str:
    s = unicodedata.normalize("NFKD", nome).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return f"{squadra_id}-{s}"


def _esito(gf, gs):
    if gf is None or gs is None:
        return None
    return "V" if gf > gs else "P" if gf < gs else "N"


def partite_squadra(raw: dict, squadra_id: int) -> list[dict]:
    out = []
    for p in raw["partite"]:
        if squadra_id not in (p["casaId"], p["ospiteId"]):
            continue
        casa = p["casaId"] == squadra_id
        gf, gs = (p["golCasa"], p["golOspite"]) if casa else (p["golOspite"], p["golCasa"])
        out.append({"id": p["id"], "giornata": p["giornata"], "data": p["data"], "ora": p["ora"], "casa": casa,
                    "avversarioId": p["ospiteId"] if casa else p["casaId"], "gf": gf, "gs": gs,
                    "esito": _esito(gf, gs) if p["giocata"] else None, "giocata": p["giocata"],
                    "tavolino": p["tavolino"], "tabellino": str(p["id"]) in raw["tabellini"]})
    return sorted(out, key=lambda x: (x["data"] or "9999-99-99", x["giornata"], x["id"]))


def forma(raw: dict, squadra_id: int, n: int = 5) -> list[str]:
    esiti = [p["esito"] for p in partite_squadra(raw, squadra_id) if p["esito"]]
    return esiti[-n:]


def _tondo(x: float) -> float:
    return round(x + 1e-9, 2)


def stat_squadra(raw: dict, squadra_id: int) -> dict:
    gs_ = [p for p in partite_squadra(raw, squadra_id) if p["esito"]]

    def conta(ps):
        return {"g": len(ps), "v": sum(p["esito"] == "V" for p in ps), "n": sum(p["esito"] == "N" for p in ps),
                "p": sum(p["esito"] == "P" for p in ps)}

    gf = sum(p["gf"] for p in gs_)
    gsub = sum(p["gs"] for p in gs_)
    serie = None
    if gs_:
        ultimo = gs_[-1]["esito"]
        n = 0
        for p in reversed(gs_):
            if p["esito"] != ultimo:
                break
            n += 1
        serie = {"tipo": ultimo, "n": n}
    return {**conta(gs_), "gf": gf, "gs": gsub,
            "mediaGf": _tondo(gf / len(gs_)) if gs_ else 0, "mediaGs": _tondo(gsub / len(gs_)) if gs_ else 0,
            "casa": conta([p for p in gs_ if p["casa"]]), "fuori": conta([p for p in gs_ if not p["casa"]]),
            "serie": serie}


def giocatori(raw: dict) -> list[dict]:
    per: dict[tuple, dict] = {}
    partite = {p["id"]: p for p in raw["partite"]}

    def get(sq, nome):
        k = (sq, nome)
        if k not in per:
            per[k] = {"slug": slug_giocatore(sq, nome), "nome": nome, "squadraId": sq, "presenze": 0, "gol": 0,
                      "voti": [], "ammonizioni": 0, "espulsioni": 0, "mvp": 0, "perPartita": []}
        return per[k]

    for idp, t in raw["tabellini"].items():
        p = partite.get(int(idp))
        if p is None:
            continue
        mig = t.get("migliore") or {}
        for f in t["formazioni"]:
            sq = f["squadraId"]
            if sq is None:
                continue
            casa = p["casaId"] == sq
            gf, gs = (p["golCasa"], p["golOspite"]) if casa else (p["golOspite"], p["golCasa"])
            g = get(sq, f["nome"])
            gol = sum(1 for m in t["marcatori"] if m["squadraId"] == sq and m["nome"] == f["nome"])
            is_mvp = mig.get("squadraId") == sq and mig.get("nome") == f["nome"]
            g["presenze"] += 1
            g["gol"] += gol
            if f["voto"] is not None:
                g["voti"].append(f["voto"])
            g["ammonizioni"] += int(bool(f["ammonito"]))
            g["espulsioni"] += int(bool(f["espulso"]))
            g["mvp"] += int(is_mvp)
            g["perPartita"].append({"idPartita": p["id"], "giornata": p["giornata"], "data": p["data"],
                                    "avversarioId": p["ospiteId"] if casa else p["casaId"], "casa": casa,
                                    "gf": gf, "gs": gs, "esito": _esito(gf, gs), "gol": gol, "voto": f["voto"],
                                    "ammonito": bool(f["ammonito"]), "espulso": bool(f["espulso"]), "mvp": is_mvp})
    out = []
    for g in per.values():
        g["perPartita"].sort(key=lambda x: (x["giornata"], x["idPartita"]))
        voti = g.pop("voti")
        g["nVoti"] = len(voti)
        g["votoMedio"] = _tondo(sum(voti) / len(voti)) if voti else None
        out.append(g)
    return sorted(out, key=lambda g: (g["squadraId"], g["nome"]))


def _senza_partite(g: dict) -> dict:
    return {k: v for k, v in g.items() if k != "perPartita"}


def classifiche_giocatori(lista: list[dict]) -> dict:
    marcatori = sorted((g for g in lista if g["gol"] > 0), key=lambda g: (-g["gol"], g["presenze"], g["nome"]))
    voti = sorted((g for g in lista if g["nVoti"] >= MIN_VOTI), key=lambda g: (-g["votoMedio"], -g["nVoti"], g["nome"]))
    mvp = sorted((g for g in lista if g["mvp"] > 0), key=lambda g: (-g["mvp"], g["nome"]))
    fairplay = sorted((g for g in lista if g["presenze"] >= MIN_PRESENZE_FAIRPLAY),
                      key=lambda g: (g["ammonizioni"] + 3 * g["espulsioni"], -g["presenze"], g["nome"]))
    return {k: [_senza_partite(g) for g in v[:MAX_VOCI]]
            for k, v in (("marcatori", marcatori), ("voti", voti), ("mvp", mvp), ("fairplay", fairplay))}
