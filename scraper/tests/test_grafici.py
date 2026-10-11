from __future__ import annotations

from scraper.grafici import confronto, corsa_marcatori, media_girone
from scraper.stats import giocatori
from scraper.tests.test_stats import raw_finto


def test_corsa_marcatori_cumulati_e_ordine():
    raw = raw_finto()
    c = corsa_marcatori(giocatori(raw), raw["partite"])
    assert c["giornate"] == [1, 2, 3]
    assert [m["nome"] for m in c["marcatori"]] == ["ROSSI MARIO", "NERI ANNA", "VERDI LUCA"]
    assert c["marcatori"][0]["gol"] == [2, 2, 2]
    assert c["marcatori"][1]["gol"] == [0, 0, 1]
    assert set(c["marcatori"][0]) == {"slug", "nome", "squadraId", "gol"}


def test_corsa_marcatori_limite_e_nessun_gol():
    raw = raw_finto()
    assert len(corsa_marcatori(giocatori(raw), raw["partite"], n=1)["marcatori"]) == 1
    for t in raw["tabellini"].values():
        t["marcatori"] = []
    assert corsa_marcatori(giocatori(raw), raw["partite"]) is None


def test_media_girone():
    tot = [{"pos": 1, "pt": 6, "g": 2, "gf": 5, "gs": 1}, {"pos": 2, "pt": 0, "g": 2, "gf": 1, "gs": 5},
           {"pos": 3, "pt": 0, "g": 0, "gf": 0, "gs": 0}]
    assert media_girone(tot) == {"gf": 1.5, "gs": 1.5, "pt": 1.5}
    assert media_girone([]) is None
    assert media_girone([{"pos": 1, "pt": 0, "g": 0, "gf": 0, "gs": 0}]) is None


def test_confronto():
    rc = {"pos": 1, "pt": 6, "g": 2, "gf": 5, "gs": 1, "v": 2}
    ro = {"pos": 3, "pt": 1, "g": 2, "gf": 2, "gs": 4}
    c = confronto(rc, ro, ["V", "V"], ["N", "P"])
    assert c == {"casa": {"pos": 1, "pt": 6, "g": 2, "gf": 5, "gs": 1, "forma": ["V", "V"]},
                 "ospite": {"pos": 3, "pt": 1, "g": 2, "gf": 2, "gs": 4, "forma": ["N", "P"]}}
    assert confronto(None, ro, [], []) is None
    assert confronto(rc, None, [], []) is None
