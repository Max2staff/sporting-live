from scraper.parse import parse_calendario


def test_calendario_nuova_stagione_tutte_da_giocare(fixture):
    partite = parse_calendario(fixture("calendario_2026.html"))
    assert len(partite) == 182                     # 14 squadre, 26 giornate, 7 partite a giornata
    assert {p["giornata"] for p in partite} == set(range(1, 27))
    prima = partite[0]
    assert prima == {
        "id": 14083, "giornata": 1, "data": "2026-09-16", "ora": "20:00",
        "casa": "SOCKS", "ospite": "EASY M&M",
        "golCasa": None, "golOspite": None, "giocata": False, "tavolino": False,
    }
    assert all(not p["giocata"] for p in partite)


def test_calendario_stagione_giocata_con_risultati(fixture):
    partite = parse_calendario(fixture("calendario_2025_giocato.html"))
    assert len(partite) == 90
    p = next(x for x in partite if x["id"] == 13529)
    assert (p["casa"], p["ospite"], p["golCasa"], p["golOspite"]) == ("NOVAK C5", "KALESPOR", 5, 9)
    assert p["giocata"] and not p["tavolino"]
    assert (p["data"], p["ora"]) == ("2025-10-06", "20:00")


def test_calendario_partita_a_tavolino_senza_data(fixture):
    partite = parse_calendario(fixture("calendario_2025_giocato.html"))
    p = next(x for x in partite if x["id"] == 13597)
    assert p["data"] is None and p["ora"] is None
    assert (p["golCasa"], p["golOspite"]) == (5, 0)
    assert p["giocata"] and p["tavolino"]
