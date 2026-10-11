from __future__ import annotations

import json
import pytest
from scraper.build import BuildError, costruisci, scrivi, main
from scraper.tests.test_stats import raw_finto

STAGIONI = {"stagione": "2026/27", "campionati": [
    {"id": "c8", "nome": "Calcio a 8", "gironi": [{"idgirone": 1, "nome": "Serie B", "slug": "serie-b", "attivo": True}]}],
    "archivio": []}


def raw_con_classifica():
    r = raw_finto()
    r["classifica"]["totale"] = [
        {"squadraId": 10, "nome": "ALFA", "pos": 1, "pt": 4, "g": 3, "v": 1, "n": 1, "p": 1, "gf": 5, "gs": 5, "dr": 0},
        {"squadraId": 30, "nome": "GAMMA", "pos": 2, "pt": 4, "g": 2, "v": 1, "n": 1, "p": 0, "gf": 4, "gs": 3, "dr": 1},
        {"squadraId": 20, "nome": "BETA", "pos": 3, "pt": 0, "g": 1, "v": 0, "n": 0, "p": 1, "gf": 1, "gs": 2, "dr": -1}]
    return r


def test_costruisci_tutti_i_file():
    f = costruisci(STAGIONI, {1: raw_con_classifica()}, {"*": {}}, adesso="2026-10-01T21:00:00")
    ind = f["indice.json"]
    assert ind["stagione"] == "2026/27" and ind["generato"] == "2026-10-01T07:00:00"
    assert ind["campionati"][0]["gironi"][0] == {"idgirone": 1, "slug": "serie-b", "nome": "Serie B",
                                                 "aggiornato": "2026-10-01T07:00:00", "stale": False, "zone": None}
    assert {s["id"] for s in ind["squadre"]} == {10, 20, 30} and ind["squadre"][0]["girone"] == "serie-b"
    assert len(ind["partite"]) == 4 and ind["partite"][0]["tabellino"] is True and ind["partite"][3]["tabellino"] is False
    g = f["girone/serie-b.json"]
    assert g["campionato"] == {"id": "c8", "nome": "Calcio a 8"}
    assert next(s for s in g["squadre"] if s["id"] == 10)["forma"] == ["V", "N", "P"]
    assert g["giocatori"]["marcatori"][0]["nome"] == "ROSSI MARIO"
    p = f["partita/1.json"]
    assert p["casa"] == {"id": 10, "nome": "ALFA"} and p["tabellino"]["migliore"]["nome"] == "ROSSI MARIO"
    assert f["partita/4.json"]["tabellino"] is None
    s = f["squadra/10.json"]
    assert s["pos"] == 1 and s["riga"]["pt"] == 4 and s["stat"]["g"] == 3
    assert s["partite"][1]["avversario"] == "GAMMA"
    assert any(r["slug"] == "10-rossi-mario" for r in s["rosa"]) and "perPartita" not in s["rosa"][0]
    gi = f["giocatore/10-rossi-mario.json"]
    assert gi["squadra"] == "ALFA" and gi["girone"]["slug"] == "serie-b" and gi["perPartita"][0]["avversario"] == "BETA"
    assert "giocatore/None-ignoto.json" not in f


def test_alias_applicati():
    f = costruisci(STAGIONI, {1: raw_con_classifica()}, {"*": {"ROSSI MARIO": "***"}}, adesso="x")
    assert "giocatore/10-rossi-mario.json" not in f
    assert f["partita/1.json"]["tabellino"]["migliore"]["nome"] == "GIOCATORE OSCURATO"


def test_girone_senza_partite_giocate_ok():
    r = raw_con_classifica()
    r["tabellini"] = {}
    for p in r["partite"]:
        p.update(giocata=False, golCasa=None, golOspite=None)
    f = costruisci(STAGIONI, {1: r}, {"*": {}}, adesso="x")
    assert f["girone/serie-b.json"]["giocatori"] == {"marcatori": [], "voti": [], "mvp": [], "fairplay": []}
    assert f["squadra/10.json"]["rosa"] == [] and f["squadra/10.json"]["forma"] == []
    assert not any(k.startswith("giocatore/") for k in f)


def test_raw_mancante_salta_il_girone_e_stale_vero():
    r = raw_con_classifica()
    r["stale"] = {"partite": "2026-09-30T07:00:00"}
    f = costruisci(STAGIONI, {1: r, 99: None}, {"*": {}}, adesso="x")
    assert f["indice.json"]["campionati"][0]["gironi"][0]["stale"] is True


def test_indice_vuoto_rifiutato():
    r = raw_con_classifica()
    r["classifica"]["totale"] = []
    with pytest.raises(BuildError):
        costruisci(STAGIONI, {1: r}, {"*": {}}, adesso="x")
    with pytest.raises(BuildError):
        costruisci(STAGIONI, {}, {"*": {}}, adesso="x")


def test_scrivi_sostituisce_le_cartelle(tmp_path):
    out = tmp_path / "data"
    (out / "partita").mkdir(parents=True)
    (out / "partita" / "vecchio.json").write_text("{}")
    scrivi({"indice.json": {"a": 1}, "partita/1.json": {"b": 2}}, out)
    assert json.loads((out / "indice.json").read_text()) == {"a": 1}
    assert (out / "partita" / "1.json").exists() and not (out / "partita" / "vecchio.json").exists()


def test_main_non_tocca_out_se_build_fallisce(tmp_path):
    (tmp_path / "stagioni.json").write_text(json.dumps(STAGIONI))
    (tmp_path / "raw").mkdir()
    out = tmp_path / "data"
    out.mkdir()
    (out / "indice.json").write_text('{"vecchio": true}')
    rc = main(["--stagioni", str(tmp_path / "stagioni.json"), "--raw", str(tmp_path / "raw"),
               "--alias", str(tmp_path / "alias.json"), "--out", str(out),
               "--condivisione", str(tmp_path / "s"), "--cal", str(tmp_path / "cal")])
    assert rc == 1 and json.loads((out / "indice.json").read_text()) == {"vecchio": True}
    (tmp_path / "raw" / "1.json").write_text(json.dumps(raw_con_classifica()))
    rc = main(["--stagioni", str(tmp_path / "stagioni.json"), "--raw", str(tmp_path / "raw"),
               "--alias", str(tmp_path / "alias.json"), "--out", str(out),
               "--condivisione", str(tmp_path / "s"), "--cal", str(tmp_path / "cal")])
    assert rc == 0 and (out / "girone" / "serie-b.json").exists()


def test_flag_stemma_foto_e_zone(tmp_path):
    (tmp_path / "stemmi").mkdir()
    (tmp_path / "squadre").mkdir()
    (tmp_path / "stemmi" / "10.png").write_bytes(b"x")
    (tmp_path / "squadre" / "30.jpg").write_bytes(b"x")
    stagioni = json.loads(json.dumps(STAGIONI))
    stagioni["campionati"][0]["gironi"][0]["zone"] = {"promozione": 2, "retrocessione": 1}
    f = costruisci(stagioni, {1: raw_con_classifica()}, {"*": {}}, adesso="x", img_dir=tmp_path)
    stemmi = {s["id"]: s["stemma"] for s in f["indice.json"]["squadre"]}
    assert stemmi == {10: True, 20: False, 30: False}
    assert f["squadra/10.json"]["stemma"] is True and f["squadra/10.json"]["foto"] is False
    assert f["squadra/30.json"]["foto"] is True
    assert f["indice.json"]["campionati"][0]["gironi"][0]["zone"] == {"promozione": 2, "retrocessione": 1}
    assert f["girone/serie-b.json"]["zone"] == {"promozione": 2, "retrocessione": 1}


def test_flag_senza_cartella_immagini():
    f = costruisci(STAGIONI, {1: raw_con_classifica()}, {"*": {}}, adesso="x")
    assert all(s["stemma"] is False for s in f["indice.json"]["squadre"])
    assert f["squadra/10.json"]["foto"] is False
    assert f["girone/serie-b.json"]["zone"] is None


def test_cerca_json_senza_riposo():
    r = raw_con_classifica()
    r["squadre"].append({"id": 99, "nome": "RIPOSO"})
    f = costruisci(STAGIONI, {1: r}, {"*": {}}, adesso="2026-10-01T21:00:00")
    c = f["cerca.json"]
    assert {s["id"] for s in c["squadre"]} == {10, 20, 30} and c["squadre"][0] == {"id": 10, "nome": "ALFA", "girone": "serie-b"}
    assert {"slug": "10-rossi-mario", "nome": "ROSSI MARIO", "squadraId": 10, "girone": "serie-b"} in c["giocatori"]


ARCH = {"slug": "2025-26", "nome": "Stagione 2025/26", "stagione": "2025/26", "documenti": [{"titolo": "PDF", "url": "u"}],
        "campionati": [{"id": "c8", "nome": "Calcio a 8", "gironi": [{"idgirone": 1, "nome": "Serie B", "slug": "serie-b"}]}]}


def test_costruisci_archivio_edizioni_e_albero():
    from scraper.build import costruisci_archivio
    st = {**STAGIONI, "archivio": [ARCH, {**ARCH, "slug": "vuota", "nome": "Vuota"}]}
    edizioni, alberi = costruisci_archivio(st, {"2025-26": {1: raw_con_classifica()}, "vuota": {1: None}},
                                           {"*": {}}, adesso="2026-10-01T21:00:00")
    assert edizioni == [{"slug": "2025-26", "nome": "Stagione 2025/26"}]
    f = alberi["2025-26"]
    assert "girone/serie-b.json" in f and "partita/1.json" in f and "squadra/10.json" in f
    ind = f["indice.json"]
    assert ind["archivio"] is True and ind["nome"] == "Stagione 2025/26" and ind["documenti"] == [{"titolo": "PDF", "url": "u"}]
    assert "edizioni" not in ind and ind["stagione"] == "2025/26"


def test_main_scrive_archivio_e_indice_edizioni(tmp_path):
    (tmp_path / "raw" / "a" / "2025-26").mkdir(parents=True)
    (tmp_path / "raw" / "1.json").write_text(json.dumps(raw_con_classifica()))
    (tmp_path / "raw" / "a" / "2025-26" / "1.json").write_text(json.dumps(raw_con_classifica()))
    (tmp_path / "stagioni.json").write_text(json.dumps({**STAGIONI, "archivio": [ARCH, {**ARCH, "slug": "senza-raw"}]}))
    rc = main(["--stagioni", str(tmp_path / "stagioni.json"), "--raw", str(tmp_path / "raw"),
               "--alias", str(tmp_path / "x.json"), "--out", str(tmp_path / "data"), "--img", str(tmp_path / "img"),
               "--condivisione", str(tmp_path / "s"), "--cal", str(tmp_path / "cal"),
               "--contenuti", str(tmp_path / "contenuti")])
    assert rc == 0
    ind = json.loads((tmp_path / "data" / "indice.json").read_text())
    assert ind["edizioni"] == [{"slug": "2025-26", "nome": "Stagione 2025/26"}]
    assert (tmp_path / "data" / "a" / "2025-26" / "indice.json").exists()
    assert (tmp_path / "data" / "a" / "2025-26" / "girone" / "serie-b.json").exists()
    assert not (tmp_path / "data" / "a" / "senza-raw").exists()
    assert not (tmp_path / "s" / "a").exists() and not (tmp_path / "cal" / "a").exists()
