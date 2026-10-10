"""Unisce i raw dei gironi, calcola le statistiche e scrive i JSON per site/data/."""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from datetime import datetime
from pathlib import Path

from .alias import applica_alias, carica_alias
from .fetch import TZ_ROMA
from .stats import classifiche_giocatori, forma, giocatori, partite_squadra, stat_squadra

SOTTOCARTELLE = ("girone", "partita", "squadra", "giocatore")


class BuildError(Exception):
    """Nessun dato pubblicabile: non si sovrascrive l'output precedente."""


def _partita_compatta(p: dict, slug: str, raw: dict) -> dict:
    return {"id": p["id"], "girone": slug, "giornata": p["giornata"], "data": p["data"], "ora": p["ora"],
            "casaId": p["casaId"], "ospiteId": p["ospiteId"], "golCasa": p["golCasa"], "golOspite": p["golOspite"],
            "giocata": p["giocata"], "tavolino": p["tavolino"], "tabellino": str(p["id"]) in raw["tabellini"]}


def costruisci(stagioni: dict, raws: dict[int, dict | None], alias: dict, adesso: str, img_dir: Path | None = None) -> dict[str, object]:
    def ha(sotto: str, nome: str) -> bool:
        return img_dir is not None and (img_dir / sotto / nome).exists()

    files: dict[str, object] = {}
    indice = {"stagione": stagioni["stagione"], "generato": adesso, "campionati": [], "squadre": [], "partite": []}
    for c in stagioni["campionati"]:
        camp = {"id": c["id"], "nome": c["nome"], "gironi": []}
        for g in c["gironi"]:
            raw = raws.get(g["idgirone"])
            if not raw or not raw["classifica"]["totale"]:
                continue
            raw = applica_alias(raw, alias)
            slug, ginfo = g["slug"], {"slug": g["slug"], "nome": g["nome"]}
            nome_sq = {s["id"]: s["nome"] for s in raw["squadre"]}
            nome = lambda i: nome_sq.get(i, "?")  # noqa: E731
            camp["gironi"].append({"idgirone": g["idgirone"], "slug": slug, "nome": g["nome"],
                                   "aggiornato": raw["aggiornato"], "stale": bool(raw["stale"]), "zone": g.get("zone")})
            indice["squadre"] += [{"id": s["id"], "nome": s["nome"], "girone": slug, "stemma": ha("stemmi", f"{s['id']}.png")} for s in raw["squadre"]]
            compatte = [_partita_compatta(p, slug, raw) for p in raw["partite"]]
            indice["partite"] += compatte
            lista = giocatori(raw)
            files[f"girone/{slug}.json"] = {
                "idgirone": g["idgirone"], "slug": slug, "nome": g["nome"], "campionato": {"id": c["id"], "nome": c["nome"]},
                "stagione": stagioni["stagione"], "aggiornato": raw["aggiornato"], "stale": raw["stale"],
                "zone": g.get("zone"),
                "squadre": [{"id": s["id"], "nome": s["nome"], "forma": forma(raw, s["id"])} for s in raw["squadre"]],
                "classifica": raw["classifica"], "partite": compatte, "giocatori": classifiche_giocatori(lista)}
            for p in raw["partite"]:
                files[f"partita/{p['id']}.json"] = {
                    "id": p["id"], "girone": ginfo, "giornata": p["giornata"], "data": p["data"], "ora": p["ora"],
                    "casa": {"id": p["casaId"], "nome": nome(p["casaId"])},
                    "ospite": {"id": p["ospiteId"], "nome": nome(p["ospiteId"])},
                    "golCasa": p["golCasa"], "golOspite": p["golOspite"], "giocata": p["giocata"],
                    "tavolino": p["tavolino"], "tabellino": raw["tabellini"].get(str(p["id"]))}
            righe = {r["squadraId"]: r for r in raw["classifica"]["totale"]}
            for s in raw["squadre"]:
                riga = righe.get(s["id"])
                files[f"squadra/{s['id']}.json"] = {
                    "id": s["id"], "nome": s["nome"], "girone": ginfo,
                    "stemma": ha("stemmi", f"{s['id']}.png"), "foto": ha("squadre", f"{s['id']}.jpg"), "pos": riga["pos"] if riga else None,
                    "riga": {k: riga[k] for k in ("pt", "g", "v", "n", "p", "gf", "gs", "dr")} if riga else None,
                    "stat": stat_squadra(raw, s["id"]), "forma": forma(raw, s["id"]),
                    "partite": [{**p, "avversario": nome(p["avversarioId"])} for p in partite_squadra(raw, s["id"])],
                    "rosa": [{k: v for k, v in gi.items() if k != "perPartita"} for gi in lista if gi["squadraId"] == s["id"]]}
            for gi in lista:
                files[f"giocatore/{gi['slug']}.json"] = {
                    **{k: v for k, v in gi.items() if k != "perPartita"}, "squadra": nome(gi["squadraId"]), "girone": ginfo,
                    "perPartita": [{**pp, "avversario": nome(pp["avversarioId"])} for pp in gi["perPartita"]]}
        if camp["gironi"]:
            indice["campionati"].append(camp)
    if not indice["campionati"]:
        raise BuildError("nessun girone con classifica: indice vuoto, output precedente mantenuto")
    indice["generato"] = max(g["aggiornato"] for c in indice["campionati"] for g in c["gironi"])
    files["indice.json"] = indice
    return files


def scrivi(files: dict[str, object], out_dir: Path) -> None:
    for sc in SOTTOCARTELLE:
        shutil.rmtree(out_dir / sc, ignore_errors=True)
    for rel, obj in files.items():
        path = out_dir / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--stagioni", default="stagioni.json")
    ap.add_argument("--raw", default="build/raw")
    ap.add_argument("--alias", default="alias.json")
    ap.add_argument("--out", default="site/data")
    ap.add_argument("--img", default="site/img")
    a = ap.parse_args(argv)
    stagioni = json.loads(Path(a.stagioni).read_text(encoding="utf-8"))
    raws = {}
    for c in stagioni["campionati"]:
        for g in c["gironi"]:
            f = Path(a.raw) / f"{g['idgirone']}.json"
            raws[g["idgirone"]] = json.loads(f.read_text(encoding="utf-8")) if f.exists() else None
    try:
        files = costruisci(stagioni, raws, carica_alias(Path(a.alias)),
                           adesso=datetime.now(TZ_ROMA).isoformat(timespec="seconds"), img_dir=Path(a.img))
    except BuildError as e:
        print("ERRORE:", e, file=sys.stderr)
        return 1
    scrivi(files, Path(a.out))
    print(f"site/data: {len(files)} file, {len(files['indice.json']['partite'])} partite")
    return 0


if __name__ == "__main__":
    sys.exit(main())
