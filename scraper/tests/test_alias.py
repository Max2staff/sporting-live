from __future__ import annotations

import json
from scraper.alias import applica_alias, carica_alias, NOME_OSCURATO
from scraper.tests.test_stats import raw_finto


def test_applica_alias_globali_e_per_girone():
    alias = {"*": {"ROSSI MARIO": "ROSSI MARIO JR"}, "1": {"VERDI LUCA": "***"}, "2": {"NERI ANNA": "NERI ANNALISA"}}
    r = applica_alias(raw_finto(), alias)
    t1 = r["tabellini"]["1"]
    assert t1["marcatori"][0]["nome"] == "ROSSI MARIO JR" and t1["migliore"]["nome"] == "ROSSI MARIO JR"
    assert t1["marcatori"][2]["nome"] == NOME_OSCURATO
    assert any(f["nome"] == NOME_OSCURATO for f in t1["formazioni"])
    assert r["tabellini"]["3"]["formazioni"][1]["nome"] == "NERI ANNA"      # alias del girone 2 non si applica
    assert raw_finto()["tabellini"]["1"]["marcatori"][0]["nome"] == "ROSSI MARIO"   # input non mutato


def test_carica_alias_assente_o_vuoto(tmp_path):
    assert carica_alias(tmp_path / "manca.json") == {"*": {}}
    (tmp_path / "a.json").write_text(json.dumps({"*": {"A B": "A B."}}))
    assert carica_alias(tmp_path / "a.json") == {"*": {"A B": "A B."}}
