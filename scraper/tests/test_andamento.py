from __future__ import annotations

import copy

from scraper.andamento import andamento, precedenti
from scraper.condivisione import scrivi_condivisione
from scraper.tests.test_condivisione import SITO, _partita

SQ = [{"id": 1, "nome": "A"}, {"id": 2, "nome": "B"}, {"id": 3, "nome": "C"}, {"id": 4, "nome": "D"},
      {"id": 9, "nome": "RIPOSO"}]


def P(pid, g, c, o, gc, go, giocata=True):
    return {"id": pid, "giornata": g, "casaId": c, "ospiteId": o, "golCasa": gc, "golOspite": go, "giocata": giocata}


def test_andamento_pari_tiebreak_riposo_e_giornata_incompleta():
    ps = [P(1, 1, 1, 2, 3, 0), P(2, 1, 3, 4, 1, 1), P(3, 1, 9, 1, None, None, False),   # RIPOSO ignorata
          P(4, 2, 1, 3, 0, 0), P(5, 2, 2, 4, 2, 0),                                      # pari + vittoria
          P(6, 3, 1, 4, 5, 0), P(7, 3, 2, 3, None, None, False)]                         # g3 incompleta: esclusa
    a = andamento(ps, SQ)
    assert 9 not in a and set(a) == {1, 2, 3, 4}
    assert [r["giornata"] for r in a[1]] == [1, 2]
    # g1: A 3pt; C,D 1pt (dr 0, gf 1, nome C<D); B 0
    assert [a[i][0]["pos"] for i in (1, 3, 4, 2)] == [1, 2, 3, 4]
    # g2: A 4pt, B 3pt, C 2pt, D 1pt
    assert [(a[i][1]["pos"], a[i][1]["pt"]) for i in (1, 2, 3, 4)] == [(1, 4), (2, 3), (3, 2), (4, 1)]


def test_andamento_tiebreak_differenza_reti():
    ps = [P(1, 1, 1, 3, 1, 0), P(2, 1, 2, 4, 4, 0)]  # A e B 3pt: B ha dr migliore
    a = andamento(ps, SQ)
    assert a[2][0]["pos"] == 1 and a[1][0]["pos"] == 2 and a[3][0]["pos"] == 3  # C (dr -1) prima di D (dr -4)
    assert a[4][0]["pos"] == 4


def _q(pid, data, c, o, gc, go, **x):
    return {"id": pid, "data": data, "casa": c, "ospite": o, "golCasa": gc, "golOspite": go, **x}


def test_precedenti_nomi_invertiti_spazi_bilancio():
    cur = {"id": 10, "casa": {"id": 1, "nome": "Alfa  Team"}, "ospite": {"id": 2, "nome": "BETA"}}
    tutte = [_q(10, "2026-10-01", "ALFA TEAM", "BETA", None, None, giocata=False),       # la partita stessa
             _q(5, "2026-09-01", "beta", "Alfa Team", 3, 1, edizione="2025/26"),           # vince BETA (ospite corrente)
             _q(6, "2025-05-01", "ALFA TEAM", "BETA", 2, 2, edizione="2024/25"),
             _q(7, "2025-03-01", "ALFA  TEAM", "BETA", 1, 0, edizione="2024/25"),
             _q(8, "2025-01-01", "ALFA TEAM", "GAMMA", 4, 0, edizione="2024/25")]
    r = precedenti(cur, tutte)
    assert [p["id"] for p in r["partite"]] == [5, 6, 7]
    assert r["bilancio"] == {"casa": 1, "pari": 1, "ospite": 1}
    assert r["partite"][0]["edizione"] == "2025/26"
    assert precedenti(cur, [])["partite"] == []


def test_precedenti_stesso_id_di_altra_edizione_non_escluso():
    cur = {"id": 10, "casa": {"nome": "A"}, "ospite": {"nome": "B"}}
    r = precedenti(cur, [_q(10, "2025-01-01", "A", "B", 1, 0, edizione="2024/25")])
    assert len(r["partite"]) == 1


def test_hash_immagini_ignora_precedenti(tmp_path):
    out = tmp_path / "p"
    ps = [_partita(1)]
    assert scrivi_condivisione(ps, out, SITO) == 1
    ps2 = copy.deepcopy(ps)
    ps2[0]["precedenti"] = {"partite": [{"data": "2025-01-01"}], "bilancio": {"casa": 1, "pari": 0, "ospite": 0}}
    assert scrivi_condivisione(ps2, out, SITO) == 0
    ps2[0]["precedenti"]["bilancio"]["casa"] = 7
    assert scrivi_condivisione(ps2, out, SITO) == 0


def test_build_aggiunge_andamento_e_precedenti():
    from scraper.build import costruisci
    from scraper.tests.test_build import STAGIONI, raw_con_classifica
    f = costruisci(STAGIONI, {1: raw_con_classifica()}, {"*": {}}, adesso="2026-10-01T21:00:00")
    assert [r["giornata"] for r in f["squadra/10.json"]["andamento"]] == [1, 2, 3]
    assert "precedenti" not in f["partita/1.json"]
    pr = f["partita/2.json"]["precedenti"]   # GAMMA-ALFA, gia' giocata come ALFA-GAMMA alla g3
    assert [p["id"] for p in pr["partite"]] == [3] and pr["bilancio"] == {"casa": 1, "pari": 0, "ospite": 0}
