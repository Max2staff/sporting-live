from __future__ import annotations

from scraper.parse import parse_calendario, parse_classifica, parse_tabellino


def test_classifica_serie_a(fixture):
    righe = parse_classifica(fixture("classifica_425_serie_a.html"))
    assert len(righe) == 14
    assert righe[0]["pos"] == 1 and all(r["squadraId"] for r in righe)


def test_calendario_c5(fixture):
    partite = parse_calendario(fixture("calendario_426_c5.html"))
    assert len({p["giornata"] for p in partite}) >= 9       # 10 squadre → 18 giornate
    assert all(p["id"] for p in partite)


def test_tabellino_serie_a(fixture):
    # Nel girone C5 (426) nessuna partita è ancora stata giocata: il tabellino
    # con formazioni proviene dalla Serie A (425), stessa struttura di pagina.
    t = parse_tabellino(fixture("tabellino_425_14627.html"))
    assert t["casa"] and t["ospite"]
    assert isinstance(t["golCasa"], int) and isinstance(t["golOspite"], int)
    assert t["formazioni"], "la fixture scelta deve avere le formazioni pubblicate"
