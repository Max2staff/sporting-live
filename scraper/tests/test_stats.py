from scraper.stats import (slug_giocatore, partite_squadra, forma, stat_squadra, giocatori,
                           classifiche_giocatori)


def raw_finto():
    def tab(marc, form, mig):
        return {"marcatori": marc, "formazioni": form, "migliore": mig, "completo": True}
    F = lambda sq, nome, voto=7.0, amm=False, esp=False: {"squadraId": sq, "nome": nome, "numero": 1,
                                                          "voto": voto, "ammonito": amm, "espulso": esp}
    return {
        "idgirone": 1, "aggiornato": "2026-10-01T07:00:00", "stale": {}, "errori": [],
        "squadre": [{"id": 10, "nome": "ALFA"}, {"id": 20, "nome": "BETA"}, {"id": 30, "nome": "GAMMA"}],
        "classifica": {"totale": [], "casa": [], "trasferta": []},
        "partite": [
            {"id": 1, "giornata": 1, "data": "2026-09-16", "ora": "20:30", "casaId": 10, "ospiteId": 20,
             "golCasa": 2, "golOspite": 1, "giocata": True, "tavolino": False},
            {"id": 2, "giornata": 2, "data": "2026-09-23", "ora": "20:30", "casaId": 30, "ospiteId": 10,
             "golCasa": 3, "golOspite": 3, "giocata": True, "tavolino": False},
            {"id": 3, "giornata": 3, "data": "2026-09-30", "ora": "20:30", "casaId": 10, "ospiteId": 30,
             "golCasa": 0, "golOspite": 1, "giocata": True, "tavolino": False},
            {"id": 4, "giornata": 4, "data": None, "ora": None, "casaId": 20, "ospiteId": 10,
             "golCasa": None, "golOspite": None, "giocata": False, "tavolino": False},
        ],
        "tabellini": {
            "1": tab([{"squadraId": 10, "nome": "ROSSI MARIO", "minuto": 5},
                      {"squadraId": 10, "nome": "ROSSI MARIO", "minuto": 40},
                      {"squadraId": 20, "nome": "VERDI LUCA", "minuto": 50},
                      {"squadraId": None, "nome": "IGNOTO", "minuto": 1}],
                     [F(10, "ROSSI MARIO", 8.0), F(10, "BIANCHI PAOLO", 6.5, amm=True), F(20, "VERDI LUCA", 7.0),
                      F(None, "IGNOTO", 7.0)],
                     {"squadraId": 10, "nome": "ROSSI MARIO"}),
            "2": tab([], [F(10, "ROSSI MARIO", 7.0), F(10, "BIANCHI PAOLO", None, esp=True), F(30, "NERI ANNA", 7.5)], None),
            "3": tab([{"squadraId": 30, "nome": "NERI ANNA", "minuto": 12}],
                     [F(10, "ROSSI MARIO", 6.0), F(30, "NERI ANNA", 8.5)], {"squadraId": 30, "nome": "NERI ANNA"}),
        },
    }


def test_slug():
    assert slug_giocatore(2480, "D'ANGELO JOSÈ  MARÍA") == "2480-d-angelo-jose-maria"


def test_partite_squadra_e_forma():
    ps = partite_squadra(raw_finto(), 10)
    assert [p["esito"] for p in ps] == ["V", "N", "P", None]
    assert ps[1]["casa"] is False and ps[1]["avversarioId"] == 30 and (ps[1]["gf"], ps[1]["gs"]) == (3, 3)
    assert ps[3]["data"] is None and ps[3]["tabellino"] is False and ps[0]["tabellino"] is True
    assert forma(raw_finto(), 10) == ["V", "N", "P"]
    assert forma(raw_finto(), 10, n=2) == ["N", "P"]
    assert forma(raw_finto(), 99) == []


def test_stat_squadra():
    s = stat_squadra(raw_finto(), 10)
    assert (s["g"], s["v"], s["n"], s["p"], s["gf"], s["gs"]) == (3, 1, 1, 1, 5, 5)
    assert s["mediaGf"] == 1.67 and s["casa"] == {"g": 2, "v": 1, "n": 0, "p": 1}
    assert s["serie"] == {"tipo": "P", "n": 1}
    assert stat_squadra(raw_finto(), 99)["g"] == 0 and stat_squadra(raw_finto(), 99)["serie"] is None


def test_giocatori_aggregati_e_ignoto_escluso():
    g = {x["slug"]: x for x in giocatori(raw_finto())}
    assert "None-ignoto" not in g and not any(x["nome"] == "IGNOTO" for x in g.values())
    rossi = g["10-rossi-mario"]
    assert (rossi["presenze"], rossi["gol"], rossi["votoMedio"], rossi["nVoti"], rossi["mvp"]) == (3, 2, 7.0, 3, 1)
    assert rossi["perPartita"][0] == {"idPartita": 1, "giornata": 1, "data": "2026-09-16", "avversarioId": 20,
                                      "casa": True, "gf": 2, "gs": 1, "esito": "V", "gol": 2, "voto": 8.0,
                                      "ammonito": False, "espulso": False, "mvp": True}
    bianchi = g["10-bianchi-paolo"]
    assert (bianchi["ammonizioni"], bianchi["espulsioni"], bianchi["nVoti"], bianchi["votoMedio"]) == (1, 1, 1, 6.5)


def test_classifiche_giocatori():
    c = classifiche_giocatori(giocatori(raw_finto()))
    assert [x["nome"] for x in c["marcatori"]] == ["ROSSI MARIO", "VERDI LUCA", "NERI ANNA"]   # a parità di gol, meno presenze prima
    assert [x["nome"] for x in c["voti"]] == ["ROSSI MARIO"]          # unico con almeno 3 voti
    assert [x["nome"] for x in c["mvp"]] == ["NERI ANNA", "ROSSI MARIO"]   # a parità, ordine alfabetico
    assert [x["nome"] for x in c["fairplay"]] == ["ROSSI MARIO"]      # unico con 3 presenze
    assert "perPartita" not in c["marcatori"][0]


def test_girone_senza_partite_giocate():
    r = raw_finto()
    r["tabellini"] = {}
    for p in r["partite"]:
        p.update(giocata=False, golCasa=None, golOspite=None)
    assert giocatori(r) == [] and forma(r, 10) == []
    assert classifiche_giocatori([]) == {"marcatori": [], "voti": [], "mvp": [], "fairplay": []}
