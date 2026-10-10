from scraper.parse import parse_tabellino


def test_tabellino_testa_e_marcatori(fixture):
    t = parse_tabellino(fixture("tabellino_13529.html"))
    assert (t["casa"], t["ospite"], t["golCasa"], t["golOspite"]) == ("NOVAK C5", "KALESPOR", 5, 9)
    assert len(t["marcatori"]) == 14
    assert t["marcatori"][0] == {"squadra": "NOVAK C5", "nome": "NAJIL AYVAS", "minuto": 4}
    assert t["marcatori"][5] == {"squadra": "KALESPOR", "nome": "ALPAJ HASPAR", "minuto": 8}
    assert sum(1 for m in t["marcatori"] if m["squadra"] == "KALESPOR") == 9


def test_tabellino_formazioni_voti_ammonizioni(fixture):
    t = parse_tabellino(fixture("tabellino_13529.html"))
    f = {(x["squadra"], x["nome"]): x for x in t["formazioni"]}
    assert len(f) == 16
    assert f[("NOVAK C5", "ENGUEL MUSTAFA")]["numero"] == 1
    assert f[("KALESPOR", "SALAM SARDER")]["voto"] == 8.0
    assert f[("KALESPOR", "ADEM FURKAN")]["ammonito"] is True
    assert f[("KALESPOR", "ADEM FURKAN")]["voto"] is None
    assert f[("KALESPOR", "OSMAN CELIL")] == {
        "squadra": "KALESPOR", "nome": "OSMAN CELIL", "numero": 3,
        "voto": 8.0, "ammonito": False, "espulso": False,
    }
    # il nome non deve contenere il voto né residui delle icone
    assert all(not x["nome"][-1].isdigit() for x in t["formazioni"])


def test_tabellino_migliore(fixture):
    t = parse_tabellino(fixture("tabellino_13529.html"))
    assert t["migliore"] == {"nome": "GJOCHAN EMRO", "squadra": "KALESPOR"}


def test_tabellino_partita_a_tavolino_si_legge(fixture):
    t = parse_tabellino(fixture("tabellino_tavolino_13597.html"))
    assert (t["casa"], t["golCasa"], t["golOspite"]) == ("MAERNECHESTER UNITED", 5, 0)
    assert len(t["marcatori"]) == 5
    assert t["migliore"]["nome"] == "MINTO DIMITRI"


def test_marcatore_con_apostrofo_curvo():
    from scraper.parse import _RE_MARCATORE
    curvo = "MARIO ROSSI 12’"          # ’ U+2019
    dritto = "MARIO ROSSI 12'"         # ' U+0027
    for s in (curvo, dritto):
        m = _RE_MARCATORE.match(s)
        assert m and m.group(1) == "MARIO ROSSI" and m.group(2) == "12", s
