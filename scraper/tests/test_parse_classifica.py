from scraper.parse import parse_classifica, ParseError
import pytest


def test_classifica_inizio_stagione_tutte_a_zero(fixture):
    righe = parse_classifica(fixture("classifica_2026_vuota.html"))
    assert len(righe) == 14
    socks = next(r for r in righe if r["nome"] == "SOCKS")
    assert socks["squadraId"] == 2480
    assert socks["pos"] == 4
    assert (socks["pt"], socks["g"], socks["gf"], socks["dr"]) == (0, 0, 0, 0)
    assert righe[0]["nome"] == "REAL GNECA MIAMI" and righe[0]["pos"] == 1


def test_classifica_alla_giornata_ignora_tabella_risultati(fixture):
    # la pagina "giornata=N" contiene due tabelle: classifica + risultati della giornata
    righe = parse_classifica(fixture("classifica_giornata5.html"))
    assert righe[0]["nome"] == "PRINCIPE 1846"
    assert (righe[0]["pt"], righe[0]["g"], righe[0]["v"], righe[0]["n"], righe[0]["p"]) == (15, 5, 5, 0, 0)
    maerne = next(r for r in righe if r["nome"] == "MAERNECHESTER UNITED")
    assert (maerne["pt"], maerne["gf"], maerne["gs"], maerne["dr"]) == (12, 38, 22, 16)


def test_classifica_in_casa(fixture):
    righe = parse_classifica(fixture("classifica_incasa.html"))
    assert righe[0]["nome"] == "MAERNECHESTER UNITED"
    assert (righe[0]["pt"], righe[0]["g"], righe[0]["v"], righe[0]["n"], righe[0]["p"],
            righe[0]["gf"], righe[0]["gs"], righe[0]["dr"]) == (24, 9, 8, 0, 1, 61, 25, 36)


def test_classifica_senza_tabella_solleva():
    with pytest.raises(ParseError):
        parse_classifica("<html><body><p>niente</p></body></html>")
