"""Unisce i raw dei gironi, calcola le statistiche e scrive i JSON per site/data/."""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from datetime import datetime
from pathlib import Path

from . import config
from .andamento import andamento, norm, precedenti
from .alias import applica_alias, carica_alias
from .condivisione import scrivi_condivisione
from .ics import scrivi_calendari
from .fetch import TZ_ROMA
from .stats import classifiche_giocatori, forma, giocatori, partite_squadra, stat_squadra

SOTTOCARTELLE = ("girone", "partita", "squadra", "giocatore")


class BuildError(Exception):
    """Nessun dato pubblicabile: non si sovrascrive l'output precedente."""


def _partita_compatta(p: dict, slug: str, raw: dict) -> dict:
    return {"id": p["id"], "girone": slug, "giornata": p["giornata"], "data": p["data"], "ora": p["ora"],
            "casaId": p["casaId"], "ospiteId": p["ospiteId"], "golCasa": p["golCasa"], "golOspite": p["golOspite"],
            "giocata": p["giocata"], "tavolino": p["tavolino"], "tabellino": str(p["id"]) in raw["tabellini"]}


def _senza_riposo(totale: list[dict]) -> list[dict]:
    """Toglie la riga "RIPOSO" dalla classifica e fa scalare di uno le posizioni che la seguono."""
    out, tolte = [], 0
    for r in totale:
        if norm(r["nome"]) == "RIPOSO":
            tolte += 1
        else:
            out.append({**r, "pos": r["pos"] - tolte})
    return out


def costruisci(stagioni: dict, raws: dict[int, dict | None], alias: dict, adesso: str, img_dir: Path | None = None,
              contenuti: dict | None = None, archivio: bool = False) -> dict[str, object]:
    contenuti = contenuti or {}
    def ha(sotto: str, nome: str) -> bool:
        return img_dir is not None and (img_dir / sotto / nome).exists()

    files: dict[str, object] = {}
    tutte: list[dict] = []
    cerca: dict[str, list] = {"squadre": [], "giocatori": []}
    indice = {"stagione": stagioni["stagione"], "generato": adesso, "campionati": [], "squadre": [], "partite": [],
               "sito": config.SITO_URL, "config": contenuti.get("config") or {}, "edizioni": []}
    for c in stagioni["campionati"]:
        camp = {"id": c["id"], "nome": c["nome"], "gironi": []}
        for g in c["gironi"]:
            raw = raws.get(g["idgirone"])
            if not raw or not raw["classifica"]["totale"]:
                continue
            raw = applica_alias(raw, alias)
            raw = {**raw, "classifica": {**raw["classifica"], "totale": _senza_riposo(raw["classifica"]["totale"])}}
            slug, ginfo = g["slug"], {"slug": g["slug"], "nome": g["nome"]}
            nome_sq = {s["id"]: s["nome"] for s in raw["squadre"]}
            nome = lambda i: nome_sq.get(i, "?")  # noqa: E731
            camp["gironi"].append({"idgirone": g["idgirone"], "slug": slug, "nome": g["nome"],
                                   "aggiornato": raw["aggiornato"], "stale": bool(raw["stale"]), "zone": g.get("zone")})
            indice["squadre"] += [{"id": s["id"], "nome": s["nome"], "girone": slug, "stemma": ha("stemmi", f"{s['id']}.png")} for s in raw["squadre"]]
            compatte = [_partita_compatta(p, slug, raw) for p in raw["partite"]]
            indice["partite"] += compatte
            lista = giocatori(raw)
            cerca["squadre"] += [{"id": s["id"], "nome": s["nome"], "girone": slug} for s in raw["squadre"]
                                 if s["nome"].strip().upper() != "RIPOSO"]
            cerca["giocatori"] += [{"slug": gi["slug"], "nome": gi["nome"], "squadraId": gi["squadraId"], "girone": slug} for gi in lista]
            files[f"girone/{slug}.json"] = {
                "idgirone": g["idgirone"], "slug": slug, "nome": g["nome"], "campionato": {"id": c["id"], "nome": c["nome"]},
                "stagione": stagioni["stagione"], "aggiornato": raw["aggiornato"], "stale": raw["stale"],
                "zone": g.get("zone"),
                "squadre": [{"id": s["id"], "nome": s["nome"], "forma": forma(raw, s["id"])} for s in raw["squadre"]],
                "classifica": {"totale": raw["classifica"]["totale"]}, "partite": compatte, "giocatori": classifiche_giocatori(lista)}
            for p in raw["partite"]:
                files[f"partita/{p['id']}.json"] = {
                    "id": p["id"], "girone": ginfo, "giornata": p["giornata"], "data": p["data"], "ora": p["ora"],
                    "casa": {"id": p["casaId"], "nome": nome(p["casaId"])},
                    "ospite": {"id": p["ospiteId"], "nome": nome(p["ospiteId"])},
                    "golCasa": p["golCasa"], "golOspite": p["golOspite"], "giocata": p["giocata"],
                    "tavolino": p["tavolino"], "tabellino": raw["tabellini"].get(str(p["id"]))}
            tutte += [{"id": p["id"], "data": p["data"], "casa": nome(p["casaId"]), "ospite": nome(p["ospiteId"]),
                       "golCasa": p["golCasa"], "golOspite": p["golOspite"], "giocata": p["giocata"]}
                      for p in raw["partite"]]
            serie = andamento(raw["partite"], raw["squadre"])
            righe = {r["squadraId"]: r for r in raw["classifica"]["totale"]}
            for s in raw["squadre"]:
                riga = righe.get(s["id"])
                files[f"squadra/{s['id']}.json"] = {
                    "id": s["id"], "nome": s["nome"], "girone": ginfo,
                    "stemma": ha("stemmi", f"{s['id']}.png"), "foto": ha("squadre", f"{s['id']}.jpg"), "pos": riga["pos"] if riga else None,
                    "riga": {k: riga[k] for k in ("pt", "g", "v", "n", "p", "gf", "gs", "dr")} if riga else None,
                    "stat": stat_squadra(raw, s["id"]), "andamento": serie.get(s["id"], []), "forma": forma(raw, s["id"]),
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
    for k, v in files.items():
        if k.startswith("partita/"):
            prec = precedenti(v, tutte)
            if prec["partite"]:
                v["precedenti"] = prec
    indice["generato"] = max(g["aggiornato"] for c in indice["campionati"] for g in c["gironi"])
    if archivio:
        indice["archivio"] = True
        indice["nome"] = stagioni.get("nome", stagioni["stagione"])
        indice["documenti"] = stagioni.get("documenti", [])
        del indice["edizioni"]
    files["indice.json"] = indice
    files["cerca.json"] = cerca
    if archivio:
        return files
    files["documenti.json"] = contenuti.get("documenti") or {"documenti": []}
    oggi = adesso[:10]
    offerte = (contenuti.get("vantaggi") or {}).get("offerte", [])
    files["vantaggi.json"] = {"offerte": [o for o in offerte if not o.get("validoFino") or o["validoFino"] >= oggi]}
    return files


def scrivi(files: dict[str, object], out_dir: Path) -> None:
    for sc in SOTTOCARTELLE:
        shutil.rmtree(out_dir / sc, ignore_errors=True)
    for rel, obj in files.items():
        path = out_dir / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def pulisci_archivi(out_dir: Path, slugs) -> list[str]:
    """Rimuove le cartelle `<out>/a/<slug>/` che non sono più un'edizione con dati. Solo cartelle dirette di `a/`."""
    base = out_dir / "a"
    rimosse = []
    if base.is_dir():
        for c in sorted(base.iterdir()):
            if c.is_dir() and not c.is_symlink() and c.name not in set(slugs):
                shutil.rmtree(c)
                rimosse.append(c.name)
    return rimosse


def costruisci_archivio(stagioni: dict, raws_per_slug: dict[str, dict[int, dict | None]], alias: dict,
                        adesso: str, img_dir: Path | None = None) -> tuple[list[dict], dict[str, dict[str, object]]]:
    """Costruisce un albero per ogni edizione chiusa con almeno un girone leggibile.
    Ritorna (elenco `edizioni` per l'indice principale, {slug: files})."""
    edizioni, alberi = [], {}
    for ed in stagioni.get("archivio", []):
        try:
            alberi[ed["slug"]] = costruisci(ed, raws_per_slug.get(ed["slug"], {}), alias, adesso,
                                            img_dir=img_dir, archivio=True)
        except BuildError:
            continue
        edizioni.append({"slug": ed["slug"], "nome": ed["nome"], "documenti": ed.get("documenti", [])})
    return edizioni, alberi


def collega_edizioni(corrente: dict[str, object], alberi: dict[str, dict[str, object]], edizioni: list[dict]) -> None:
    """Collegamenti tra edizioni (modifica i dict in place).

    - `squadra/<id>.json.ancheIn`: la stessa squadra (per nome normalizzato) nelle altre edizioni, corrente
      compresa: [{edizione (slug o None = stagione corrente), nome, id, girone, pos}].
    - `partita/<id>.json.precedenti`: scontri diretti su tutte le edizioni; ogni riga d'archivio ha `edizione`.
    """
    nome_ed = {e["slug"]: e["nome"] for e in edizioni}
    nome_ed[None] = f"Stagione {corrente['indice.json']['stagione']}"
    alberi_tutti: list[tuple[str | None, dict[str, object]]] = [(None, corrente)] + [
        (e["slug"], alberi[e["slug"]]) for e in edizioni if e["slug"] in alberi]
    per_nome: dict[str, list[tuple[str | None, dict]]] = {}
    per_coppia: dict[frozenset, list[dict]] = {}
    for slug, files in alberi_tutti:
        for rel, v in files.items():
            if rel.startswith("squadra/") and norm(v["nome"]) != "RIPOSO":
                per_nome.setdefault(norm(v["nome"]), []).append((slug, v))
            elif rel.startswith("partita/"):
                q = {"id": v["id"], "data": v["data"], "casa": v["casa"]["nome"], "ospite": v["ospite"]["nome"],
                     "golCasa": v["golCasa"], "golOspite": v["golOspite"], "giocata": v["giocata"]}
                if slug is not None:
                    q["edizione"] = slug
                per_coppia.setdefault(frozenset((norm(q["casa"]), norm(q["ospite"]))), []).append(q)
    for slug, files in alberi_tutti:
        for rel, v in files.items():
            if rel.startswith("squadra/") and norm(v["nome"]) != "RIPOSO":
                altre = [{"edizione": s2, "nome": nome_ed[s2], "id": w["id"], "girone": w["girone"]["nome"], "pos": w["pos"]}
                         for s2, w in per_nome.get(norm(v["nome"]), []) if s2 != slug]
                v.pop("ancheIn", None)
                if altre:
                    v["ancheIn"] = altre
            elif rel.startswith("partita/"):
                v.pop("precedenti", None)
                pool = per_coppia.get(frozenset((norm(v["casa"]["nome"]), norm(v["ospite"]["nome"]))), [])
                prec = precedenti({**v, "edizione": slug}, pool)
                if prec["partite"]:
                    v["precedenti"] = prec


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--stagioni", default="stagioni.json")
    ap.add_argument("--raw", default="build/raw")
    ap.add_argument("--alias", default="alias.json")
    ap.add_argument("--out", default="site/data")
    ap.add_argument("--img", default="site/img")
    ap.add_argument("--condivisione", default="site/s/p")
    ap.add_argument("--cal", default="site/cal")
    ap.add_argument("--contenuti", default="contenuti")
    a = ap.parse_args(argv)
    stagioni = json.loads(Path(a.stagioni).read_text(encoding="utf-8"))
    raws = {}
    for c in stagioni["campionati"]:
        for g in c["gironi"]:
            f = Path(a.raw) / f"{g['idgirone']}.json"
            raws[g["idgirone"]] = json.loads(f.read_text(encoding="utf-8")) if f.exists() else None
    raws_arch: dict[str, dict[int, dict | None]] = {}
    for ed in stagioni.get("archivio", []):
        raws_arch[ed["slug"]] = {}
        for c in ed["campionati"]:
            for g in c["gironi"]:
                f = Path(a.raw) / "a" / ed["slug"] / f"{g['idgirone']}.json"
                raws_arch[ed["slug"]][g["idgirone"]] = json.loads(f.read_text(encoding="utf-8")) if f.exists() else None
    contenuti = {}
    for nome in ("config", "documenti", "vantaggi"):
        f = Path(a.contenuti) / f"{nome}.json"
        if f.exists():
            contenuti[nome] = json.loads(f.read_text(encoding="utf-8"))
    adesso = datetime.now(TZ_ROMA).isoformat(timespec="seconds")
    try:
        alias_d = carica_alias(Path(a.alias))
        files = costruisci(stagioni, raws, alias_d,
                           adesso=adesso, img_dir=Path(a.img), contenuti=contenuti)
    except BuildError as e:
        print("ERRORE:", e, file=sys.stderr)
        return 1
    edizioni, alberi = costruisci_archivio(stagioni, raws_arch, alias_d, adesso, img_dir=Path(a.img))
    files["indice.json"]["edizioni"] = edizioni
    collega_edizioni(files, alberi, edizioni)
    scrivi(files, Path(a.out))
    for slug in pulisci_archivi(Path(a.out), alberi):
        print(f"{a.out}/a/{slug}: edizione non più presente, rimossa")
    for slug, albero in alberi.items():
        scrivi(albero, Path(a.out) / "a" / slug)
        print(f"{a.out}/a/{slug}: {len(albero)} file")
    print(f"site/data: {len(files)} file, {len(files['indice.json']['partite'])} partite")
    giocate = [v for k, v in files.items() if k.startswith("partita/") and v["giocata"]]
    n = scrivi_condivisione(giocate, Path(a.condivisione), config.SITO_URL, Path(a.img) / "stemmi")
    print(f"{a.condivisione}: {len(giocate)} pagine, {n} immagini riscritte")
    nc = scrivi_calendari(files, Path(a.cal), config.SITO_URL, adesso)
    print(f"{a.cal}: {nc} calendari riscritti")
    return 0


if __name__ == "__main__":
    sys.exit(main())
