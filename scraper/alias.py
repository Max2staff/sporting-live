"""Correzione nomi giocatori (varianti → canonico) e oscuramento su richiesta."""
from __future__ import annotations

import copy
import json
from pathlib import Path

NOME_OSCURATO = "GIOCATORE OSCURATO"


def carica_alias(path: Path) -> dict:
    if not path.exists():
        return {"*": {}}
    dati = json.loads(path.read_text(encoding="utf-8"))
    dati.setdefault("*", {})
    return dati


def applica_alias(raw: dict, alias: dict) -> dict:
    mappa = dict(alias.get("*", {}))
    mappa.update(alias.get(str(raw["idgirone"]), {}))
    if not mappa:
        return raw

    def nome(n: str) -> str:
        v = mappa.get(n, n)
        return NOME_OSCURATO if v == "***" else v

    out = copy.deepcopy(raw)
    for t in out["tabellini"].values():
        for m in t["marcatori"]:
            m["nome"] = nome(m["nome"])
        for f in t["formazioni"]:
            f["nome"] = nome(f["nome"])
        if t.get("migliore"):
            t["migliore"]["nome"] = nome(t["migliore"]["nome"])
    return out
