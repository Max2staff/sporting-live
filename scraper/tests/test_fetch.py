import json
from datetime import datetime
from pathlib import Path
from scraper.fetch import Fetcher, raccogli_girone

G = 390   # girone delle fixture "giocate" (stagione 2025/26)


def fake_get_factory(fixture, mancanti=(), tabellini_extra=None):
    """Mappa URL → fixture. `mancanti`: frammenti di URL che simulano il sito giù.
    `tabellini_extra`: {idpartita: nomefile} per far rispondere partite specifiche con una fixture scelta."""
    tabellini_extra = tabellini_extra or {}

    def fake_get(url):
        if any(m in url for m in mancanti):
            raise RuntimeError("simulo sito giù")
        if "calendario.php" in url:
            return fixture("calendario_2025_giocato.html")
        if "tipo=incasa" in url or "tipo=fuoricasa" in url:
            return fixture("classifica_incasa.html")
        if "classifica.php" in url:
            return fixture("classifica_giornata5.html")
        for idp, nomefile in tabellini_extra.items():
            if f"idpartita={idp}" in url:
                return fixture(nomefile)
        if "idpartita=13529" in url:
            return fixture("tabellino_13529.html")
        if "tabellini.php" in url:
            return fixture("tabellino_tavolino_13597.html")
        raise AssertionError(f"URL inatteso {url}")
    return fake_get


def test_raccoglie_tutto_e_mappa_gli_id(fixture, tmp_path):
    f = Fetcher(get=fake_get_factory(fixture), pausa=0)
    t = raccogli_girone(f, tmp_path, G, adesso=datetime(2026, 3, 10, 6, 0))
    assert t["idgirone"] == G
    assert len(t["squadre"]) == 10
    assert t["classifica"]["totale"][0]["nome"] == "PRINCIPE 1846"
    assert len(t["classifica"]["casa"]) == 10 and len(t["classifica"]["trasferta"]) == 10
    assert len(t["partite"]) == 90
    p = next(x for x in t["partite"] if x["id"] == 13529)
    assert p["casaId"] == next(s["id"] for s in t["squadre"] if s["nome"] == "NOVAK C5")
    assert "casa" not in p
    assert set(t["tabellini"]) == {str(x["id"]) for x in t["partite"] if x["giocata"]}
    tab = t["tabellini"]["13529"]
    assert tab["marcatori"][0]["squadraId"] == p["casaId"]
    assert tab["migliore"]["squadraId"] == p["ospiteId"]
    assert tab["completo"] is True
    assert t["errori"] == [] and t["stale"] == {}
    assert t["aggiornato"].startswith("2026-03-10T06:00")


def test_cache_tabellini_evita_ridownload(fixture, tmp_path):
    f1 = Fetcher(get=fake_get_factory(fixture), pausa=0)
    prima = raccogli_girone(f1, tmp_path, G)
    assert len([u for u in f1.log if "tabellini.php" in u]) == 90
    assert (tmp_path / "tabellini" / "13529.html").exists()
    f2 = Fetcher(get=fake_get_factory(fixture), pausa=0)
    raccogli_girone(f2, tmp_path, G, precedente=prima)
    assert len([u for u in f2.log if "tabellini.php" in u]) == 0


def test_tabellino_senza_formazioni_recente_non_si_cachea(fixture, tmp_path):
    html = fixture("tabellino_13529.html").replace("tabellaformazionetitolari", "tabella-rimossa")
    base = fake_get_factory(fixture)
    f = Fetcher(get=lambda url: html if "idpartita=13535" in url else base(url), pausa=0)
    t = raccogli_girone(f, tmp_path, G, adesso=datetime(2025, 1, 1))   # prima della stagione: ogni partita è "recente"
    assert "13535" not in t["tabellini"]
    assert not (tmp_path / "tabellini" / "13535.html").exists()
    assert 13535 in t["incompleti"]
    assert not any(e.startswith("tabellini.13535") for e in t["errori"])
    assert t["stale"] == {}


def test_tabellino_senza_formazioni_vecchio_si_accetta(fixture, tmp_path):
    html = fixture("tabellino_13529.html").replace("tabellaformazionetitolari", "tabella-rimossa")
    base = fake_get_factory(fixture)
    f = Fetcher(get=lambda url: html if "idpartita=13535" in url else base(url), pausa=0)
    t = raccogli_girone(f, tmp_path, G, adesso=datetime(2027, 1, 1))
    assert t["tabellini"]["13535"]["completo"] is False
    assert t["tabellini"]["13535"]["formazioni"] == []


def test_fallback_ai_dati_precedenti_con_stale(fixture, tmp_path):
    f1 = Fetcher(get=fake_get_factory(fixture), pausa=0)
    prima = raccogli_girone(f1, tmp_path, G, adesso=datetime(2026, 3, 9, 6, 0))
    f2 = Fetcher(get=fake_get_factory(fixture, mancanti=["calendario.php", "tipo=incasa"]), pausa=0)
    t = raccogli_girone(f2, tmp_path, G, precedente=prima, adesso=datetime(2026, 3, 10, 6, 0))
    assert len(t["partite"]) == 90
    assert t["stale"]["partite"].startswith("2026-03-09")
    assert t["stale"]["classifica.casa"].startswith("2026-03-09")
    assert any(e.startswith("partite:") for e in t["errori"])


def test_classifica_totale_assente_senza_precedente_fallisce(fixture, tmp_path):
    import pytest
    f = Fetcher(get=fake_get_factory(fixture, mancanti=["classifica.php?idgirone=390"]), pausa=0)
    with pytest.raises(RuntimeError):
        raccogli_girone(f, tmp_path, G)


def test_squadra_non_mappata_da_avviso_e_id_none(fixture, tmp_path):
    cal = fixture("calendario_2025_giocato.html").replace("NOVAK C5", "NOVAK CINQUE")
    base = fake_get_factory(fixture)
    f = Fetcher(get=lambda url: cal if "calendario.php" in url else base(url), pausa=0)
    t = raccogli_girone(f, tmp_path, G)
    p = next(x for x in t["partite"] if x["id"] == 13529)
    assert p["casaId"] is None
    assert any("squadra non mappata" in e for e in t["errori"])


def test_main_scrive_un_raw_per_girone(fixture, tmp_path, monkeypatch):
    from scraper import fetch
    (tmp_path / "stagioni.json").write_text(json.dumps({"stagione": "x", "campionati": [
        {"id": "c", "nome": "C", "gironi": [{"idgirone": 390, "nome": "G", "slug": "g", "attivo": True},
                                             {"idgirone": 1, "nome": "Off", "slug": "off", "attivo": False}]}]}))
    monkeypatch.setattr(fetch, "Fetcher", lambda: Fetcher(get=fake_get_factory(fixture), pausa=0))
    rc = fetch.main(["--stagioni", str(tmp_path / "stagioni.json"), "--out", str(tmp_path / "raw"),
                     "--cache", str(tmp_path / "cache")])
    assert rc == 0
    assert (tmp_path / "raw" / "390.json").exists() and not (tmp_path / "raw" / "1.json").exists()


def test_fuso_roma_e_aggiornato_invariato(fixture, tmp_path):
    from scraper.fetch import TZ_ROMA
    assert datetime.now(TZ_ROMA).utcoffset().total_seconds() in (3600, 7200)
    f = Fetcher(get=fake_get_factory(fixture), pausa=0)
    t = raccogli_girone(f, tmp_path, G, adesso=datetime(2026, 3, 10, 6, 0))
    assert t["aggiornato"] == "2026-03-10T06:00:00"


def test_data_malformata_non_abbatte_il_girone(fixture, tmp_path, monkeypatch):
    from scraper import fetch
    orig = fetch.parse_calendario
    def finto(html):
        ps = orig(html)
        ps[0]["data"] = "31/02/2026"
        return ps
    monkeypatch.setattr(fetch, "parse_calendario", finto)
    f = Fetcher(get=fake_get_factory(fixture), pausa=0)
    t = raccogli_girone(f, tmp_path, G, adesso=datetime(2026, 3, 10))
    assert len(t["partite"]) == 90


def test_main_continua_dopo_girone_che_esplode(fixture, tmp_path, monkeypatch):
    from scraper import fetch
    (tmp_path / "stagioni.json").write_text(json.dumps({"stagione": "x", "campionati": [
        {"id": "c", "nome": "C", "gironi": [{"idgirone": 7, "nome": "A", "slug": "a"},
                                             {"idgirone": 390, "nome": "G", "slug": "g"}]}]}))
    base = fake_get_factory(fixture)
    def get(url):
        if "idgirone=7&" in url or url.endswith("idgirone=7"):
            raise ValueError("boom")
        return base(url)
    monkeypatch.setattr(fetch, "Fetcher", lambda: Fetcher(get=get, pausa=0))
    monkeypatch.setattr(fetch, "raccogli_girone", fetch.raccogli_girone)
    rc = fetch.main(["--stagioni", str(tmp_path / "stagioni.json"), "--out", str(tmp_path / "raw"),
                     "--cache", str(tmp_path / "cache")])
    assert rc == 1 and (tmp_path / "raw" / "390.json").exists()


def test_main_fallisce_con_piu_di_10_avvisi(tmp_path, monkeypatch):
    from scraper import fetch
    (tmp_path / "stagioni.json").write_text(json.dumps({"stagione": "x", "campionati": [
        {"id": "c", "nome": "C", "gironi": [{"idgirone": 5, "nome": "G", "slug": "g"}]}]}))
    monkeypatch.setattr(fetch, "raccogli_girone", lambda *a, **k: {
        "aggiornato": "x", "idgirone": 5, "partite": [], "tabellini": {}, "incompleti": [], "stale": {},
        "errori": [f"e{i}" for i in range(11)]})
    rc = fetch.main(["--stagioni", str(tmp_path / "stagioni.json"), "--out", str(tmp_path / "raw"),
                     "--cache", str(tmp_path / "cache")])
    assert rc == 1 and (tmp_path / "raw" / "5.json").exists()


def test_aggiornato_invariato_se_contenuto_uguale(fixture, tmp_path):
    f = Fetcher(get=fake_get_factory(fixture), pausa=0)
    prima = raccogli_girone(f, tmp_path, G, adesso=datetime(2026, 3, 9, 6, 0))
    secondo = raccogli_girone(Fetcher(get=fake_get_factory(fixture), pausa=0), tmp_path, G,
                              precedente=prima, adesso=datetime(2026, 3, 10, 6, 0))
    assert secondo["aggiornato"] == prima["aggiornato"]


def test_aggiornato_cambia_se_contenuto_diverso(fixture, tmp_path):
    prima = raccogli_girone(Fetcher(get=fake_get_factory(fixture), pausa=0), tmp_path, G, adesso=datetime(2026, 3, 9, 6, 0))
    base = fake_get_factory(fixture)
    cal = fixture("calendario_2025_giocato.html").replace("NOVAK C5", "NOVAK CINQUE")
    f = Fetcher(get=lambda url: cal if "calendario.php" in url else base(url), pausa=0)
    secondo = raccogli_girone(f, tmp_path, G, precedente=prima, adesso=datetime(2026, 3, 10, 6, 0))
    assert secondo["aggiornato"] == "2026-03-10T06:00:00"
