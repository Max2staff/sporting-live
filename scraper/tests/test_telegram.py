import importlib.util
from pathlib import Path

import pytest

_p = Path(__file__).resolve().parents[2] / "scripts" / "telegram.py"
_spec = importlib.util.spec_from_file_location("telegram_script", _p)
tg = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(tg)

SITO = "https://esempio.it/sl/"


def indice(partite, casa="CASA", ospite="OSPITE"):
    return {
        "sito": SITO,
        "campionati": [{"gironi": [{"slug": "serie-b", "nome": "Serie B"}]}],
        "squadre": [{"id": 1, "nome": casa}, {"id": 2, "nome": ospite}],
        "partite": partite,
    }


def p(i, giocata, gc=None, go=None):
    return {"id": i, "girone": "serie-b", "giocata": giocata,
            "golCasa": gc, "golOspite": go, "casaId": 1, "ospiteId": 2}


def test_primo_avvio_non_spamma():
    assert tg.nuovi_risultati(None, indice([p(1, True, 2, 1)])) == []


def test_una_partita_un_messaggio():
    prima = indice([p(1, False)])
    dopo = indice([p(1, True, 2, 1)])
    nuovi = tg.nuovi_risultati(prima, dopo)
    msg = tg.messaggi(nuovi, dopo, SITO)
    assert len(msg) == 1
    assert "Serie B" in msg[0] and "CASA 2-1 OSPITE" in msg[0]
    assert f"{SITO}s/p/1.html" in msg[0]


def test_gia_giocata_non_e_nuova():
    ind = indice([p(1, True, 2, 1)])
    assert tg.nuovi_risultati(ind, ind) == []


def test_riepilogo_sopra_soglia():
    prima = indice([p(i, False) for i in range(7)])
    dopo = indice([p(i, True, 1, 0) for i in range(7)])
    msg = tg.messaggi(tg.nuovi_risultati(prima, dopo), dopo, SITO)
    assert len(msg) == 1
    assert msg[0].count("CASA 1-0 OSPITE") == 7


def test_escape_html():
    prima = indice([p(1, False)], "A<B", "C&D")
    dopo = indice([p(1, True, 0, 0)], "A<B", "C&D")
    msg = tg.messaggi(tg.nuovi_risultati(prima, dopo), dopo, SITO)[0]
    assert "A&lt;B" in msg and "C&amp;D" in msg and "A<B" not in msg


def test_senza_segreti_niente_rete(monkeypatch, capsys):
    monkeypatch.delenv("TELEGRAM_TOKEN", raising=False)
    monkeypatch.delenv("TELEGRAM_CHAT", raising=False)

    def boom(*a, **k):
        raise AssertionError("rete chiamata")
    monkeypatch.setattr(tg.requests, "post", boom)
    assert tg.main(["a.json", "b.json"]) == 0
    assert "Telegram non configurato" in capsys.readouterr().out


def test_invio_e_errori_non_falliscono(monkeypatch, tmp_path, capsys):
    import json
    a, b = tmp_path / "a.json", tmp_path / "b.json"
    a.write_text(json.dumps(indice([p(1, False)])))
    b.write_text(json.dumps(indice([p(1, True, 2, 1)])))
    monkeypatch.setenv("TELEGRAM_TOKEN", "T")
    monkeypatch.setenv("TELEGRAM_CHAT", "@canale")
    chiamate = []

    class R:
        status_code = 200

    def ok(url, data=None, timeout=None):
        chiamate.append((url, data))
        return R()
    monkeypatch.setattr(tg.requests, "post", ok)
    assert tg.main([str(a), str(b)]) == 0
    assert chiamate[0][0] == "https://api.telegram.org/botT/sendMessage"
    assert chiamate[0][1]["parse_mode"] == "HTML" and chiamate[0][1]["chat_id"] == "@canale"

    def ko(*a, **k):
        raise RuntimeError("giù")
    monkeypatch.setattr(tg.requests, "post", ko)
    assert tg.main([str(a), str(b)]) == 0
    assert "::warning::" in capsys.readouterr().out
