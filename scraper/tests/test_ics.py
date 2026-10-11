import json

from scraper.ics import calendario_squadra, scrivi_calendari

SITO = "https://x.github.io/y/"
ADESSO = "2026-10-11T12:00:00+02:00"


def _p(pid=1, data="2026-10-14", ora="20:30", casa="ALFA", ospite="BETA", gc=None, go=None, giocata=False):
    return {"id": pid, "girone": {"slug": "serie-b", "nome": "Serie B"}, "giornata": 5, "data": data, "ora": ora,
            "casa": {"id": 1, "nome": casa}, "ospite": {"id": 2, "nome": ospite}, "golCasa": gc, "golOspite": go,
            "giocata": giocata, "tavolino": False, "tabellino": None}


def _ics(partite, nome="SOCKS"):
    return calendario_squadra({"id": 1, "nome": nome}, partite, {"nome": "Serie B"}, SITO, ADESSO)


def test_struttura():
    t = _ics([_p()])
    assert t.startswith("BEGIN:VCALENDAR") and t.endswith("END:VCALENDAR\r\n")
    assert "X-WR-CALNAME:SOCKS · Sporting Live" in t
    assert "REFRESH-INTERVAL;VALUE=DURATION:PT6H" in t
    assert "TZID:Europe/Rome" in t and "BEGIN:STANDARD" in t and "BEGIN:DAYLIGHT" in t
    assert "\n" not in t.replace("\r\n", "")
    assert t.count("BEGIN:") == t.count("END:")


def test_evento_con_ora():
    t = _ics([_p()])
    assert "DTSTART;TZID=Europe/Rome:20261014T203000\r\n" in t
    assert "DTEND;TZID=Europe/Rome:20261014T213000\r\n" in t
    assert "UID:partita-1@sportinglive\r\n" in t
    assert "DTSTAMP:20261011T100000Z\r\n" in t
    assert "SUMMARY:ALFA - BETA\r\n" in t


def test_senza_ora_e_senza_data():
    t = _ics([_p(1, ora=None), _p(2, data=None)])
    assert "DTSTART;VALUE=DATE:20261014\r\n" in t
    assert "partita-2@" not in t


def test_giocata_e_escape():
    t = _ics([_p(giocata=True, gc=2, go=1, casa="A,B;C\\D", ospite="O")])
    assert r"SUMMARY:A\,B\;C\\D 2-1 O" + "\r\n" in t


def test_righe_75_ottetti():
    t = _ics([_p(casa="ÀÈÌÒÙ " * 20, ospite="NICOLÒ D'ESTE " * 6)], nome="Ñ" * 60)
    for r in t.split("\r\n")[:-1]:
        assert len(r.encode("utf-8")) <= 75
    # il folding non rompe i caratteri: dopo l'unfold il testo e' integro
    unfold = t.replace("\r\n ", "")
    assert "SUMMARY:" + "ÀÈÌÒÙ " * 20 in unfold


def _files(nome_ospite="BETA"):
    sq = lambda i, n, pid: {"id": i, "nome": n, "girone": {"slug": "serie-b", "nome": "Serie B"},
                            "partite": [{"id": pid}, {"id": 9}]}
    return {"squadra/1.json": sq(1, "ALFA", 1), "squadra/2.json": sq(2, nome_ospite, 1),
            "squadra/3.json": sq(3, "RIPOSO", 9),
            "partita/1.json": _p(1, ospite=nome_ospite), "partita/9.json": _p(9, ospite="RIPOSO")}


def test_scrittura_stabile_e_pulizia(tmp_path):
    f = _files()
    assert scrivi_calendari(f, tmp_path, SITO, ADESSO) == 2
    primo = {p.name: p.read_bytes() for p in tmp_path.glob("*.ics")}
    assert set(primo) == {"1.ics", "2.ics"}          # niente RIPOSO
    assert b"RIPOSO" not in primo["1.ics"]          # partite di riposo saltate
    (tmp_path / "77.ics").write_text("x")           # squadra scomparsa
    assert scrivi_calendari(f, tmp_path, SITO, "2026-10-12T08:00:00+02:00") == 0
    assert {p.name: p.read_bytes() for p in tmp_path.glob("*.ics")} == primo   # DTSTAMP invariato
    assert scrivi_calendari(_files("GAMMA"), tmp_path, SITO, "2026-10-12T08:00:00+02:00") == 2
