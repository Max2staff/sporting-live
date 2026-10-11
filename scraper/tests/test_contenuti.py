from __future__ import annotations

from scraper import config
from scraper.build import costruisci
from scraper.tests.test_build import STAGIONI, raw_con_classifica

ADESSO = "2026-10-11T21:00:00"


def _build(contenuti=None):
    return costruisci(STAGIONI, {1: raw_con_classifica()}, {"*": {}}, adesso=ADESSO, contenuti=contenuti)


def test_indice_ha_sito_config_edizioni():
    f = _build({"config": {"goatcounter": "x"}})
    ind = f["indice.json"]
    assert ind["sito"] == config.SITO_URL and ind["config"] == {"goatcounter": "x"} and ind["edizioni"] == []


def test_documenti_copiati_uguali():
    docs = {"documenti": [{"titolo": "A", "url": "https://x/a.htm"}]}
    assert _build({"documenti": docs})["documenti.json"] == docs


def test_vantaggi_filtra_scadute():
    off = [{"id": "vecchia", "validoFino": "2026-10-10"}, {"id": "senza"}, {"id": "futura", "validoFino": "2026-12-31"},
           {"id": "oggi", "validoFino": "2026-10-11"}]
    ids = [o["id"] for o in _build({"vantaggi": {"offerte": off}})["vantaggi.json"]["offerte"]]
    assert ids == ["senza", "futura", "oggi"]


def test_senza_contenuti_default_vuoti():
    f = _build()
    assert f["indice.json"]["config"] == {} and f["indice.json"]["edizioni"] == []
    assert f["documenti.json"] == {"documenti": []} and f["vantaggi.json"] == {"offerte": []}
