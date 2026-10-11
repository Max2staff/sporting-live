import copy
import io
import json
import os
import re

from PIL import Image

from scraper.condivisione import immagine_risultato, pagina_condivisione, scrivi_condivisione

SITO = "https://esempio.test/sl/"


def _partita(pid=1, casa="Venice Oud", ospite="NZ", gc=2, go=1, mar=None, giocata=True, tavolino=False):
    return {"id": pid, "girone": {"slug": "serie-b", "nome": "Serie B"}, "giornata": 4, "data": "2026-10-07", "ora": "20:00",
            "casa": {"id": 10, "nome": casa}, "ospite": {"id": 20, "nome": ospite}, "golCasa": gc, "golOspite": go,
            "giocata": giocata, "tavolino": tavolino,
            "tabellino": {"marcatori": mar or [], "formazioni": [], "migliore": {"squadraId": 10, "nome": "ROSSI MARIO"}, "completo": True}}


def test_pagina_og():
    h = pagina_condivisione(_partita(7), SITO)
    assert '<meta property="og:title" content="Venice Oud 2-1 NZ">' in h
    assert f'<meta property="og:image" content="{SITO}s/p/7.jpg">' in h
    assert f'<meta property="og:url" content="{SITO}s/p/7.html">' in h
    assert '<meta http-equiv="refresh" content="0;url=../../#/partita/7">' in h
    assert '<a href="../../#/partita/7">' in h
    assert "<script" not in h
    assert "Serie B · giornata 4 · mer 07/10" in h


def test_pagina_escape():
    h = pagina_condivisione(_partita(casa="Bar & <Co>", ospite="L'Ago"), SITO)
    assert "Bar &amp; &lt;Co&gt;" in h and "L&#x27;Ago" in h
    assert "<Co>" not in h


def _molti():
    mar = [{"squadraId": s, "nome": f"COGNOME{i} NOME", "minuto": i} for s in (10, 20) for i in range(1, 9)]
    return _partita(1, gc=8, go=8, mar=mar)


def test_immagine_dimensioni_e_peso():
    b = immagine_risultato(_molti())
    im = Image.open(io.BytesIO(b))
    assert im.format == "JPEG" and im.size == (1080, 1080)
    assert len(b) < 120_000


def test_immagine_casi_limite():
    for p in (_partita(gc=0, go=0), _partita(tavolino=True, gc=3, go=0),
              _partita(casa="A.S.D. Associazione Sportiva Dilettantistica Molto Lunga Di Mestre", ospite="X")):
        assert len(immagine_risultato(p)) < 120_000


def test_stabilita(tmp_path):
    out = tmp_path / "p"
    ps = [_partita(1), _partita(2, gc=0, go=0), _partita(3, giocata=False, gc=None, go=None)]
    assert scrivi_condivisione(ps, out, SITO) == 2
    assert not (out / "3.html").exists() and not (out / "3.jpg").exists()
    mt = {f.name: f.stat().st_mtime_ns for f in out.glob("*.*")}
    os.utime(out / "1.jpg", ns=(1, 1)); mt["1.jpg"] = 1
    assert scrivi_condivisione(copy.deepcopy(ps), out, SITO) == 0
    assert {f.name: f.stat().st_mtime_ns for f in out.glob("*.*")} == mt
    (out / "note.txt").write_text("x"); (out / "altro.png").write_text("x")
    ps[0]["golCasa"] = 5
    assert scrivi_condivisione(ps, out, SITO) == 1
    # partita non piu' presente: file rimossi
    assert scrivi_condivisione(ps[:1], out, SITO) == 0
    assert not (out / "2.html").exists() and not (out / "2.jpg").exists()
    assert (out / "note.txt").exists() and (out / "altro.png").exists()
    assert list(json.loads((out / "manifest.json").read_text())) == ["1"]


def test_partita_malformata_non_blocca(tmp_path, capsys):
    out = tmp_path / "p"
    buone = [_partita(1), _partita(2, gc=0, go=0)]
    brutta = _partita(3, gc=None, go=None)            # giocata ma senza gol
    brutta2 = _partita(4, mar=[{"squadraId": 10, "minuto": 5}])  # marcatore senza nome
    assert scrivi_condivisione(buone + [brutta, brutta2], out, SITO) == 2
    assert (out / "1.jpg").exists() and (out / "2.html").exists()
    assert "AVVISO: condivisione partita 3" in capsys.readouterr().err
    assert sorted(json.loads((out / "manifest.json").read_text())) == ["1", "2"]
    # la partita 1 era buona e diventa malformata: restano file e voce di manifest precedenti
    prima = (out / "1.jpg").read_bytes()
    rotta = _partita(1, gc=None, go=None)
    assert scrivi_condivisione([rotta, buone[1]], out, SITO) == 0
    assert (out / "1.jpg").read_bytes() == prima and (out / "1.html").exists()
    assert "1" in json.loads((out / "manifest.json").read_text())


def test_immagine_senza_stemmi_generati(monkeypatch):
    import scraper.condivisione as c

    def vietato(*a, **k):
        raise AssertionError("niente stemmi generati nelle immagini")
    monkeypatch.setattr(c, "disegna_stemma", vietato, raising=False)
    for p in (_partita(), _partita(casa="A.S.D. Associazione Sportiva Dilettantistica Molto Lunga Di Mestre", ospite="X")):
        assert len(immagine_risultato(p)) < 120_000


def test_immagine_con_logo_vero(tmp_path):
    Image.new("RGBA", (300, 300), (255, 0, 0, 255)).save(tmp_path / "10.png")
    im = Image.open(io.BytesIO(immagine_risultato(_partita(), stemmi_dir=tmp_path))).convert("RGB")
    assert any(r > 200 and g < 60 and b < 60 for r, g, b in im.getdata())


def test_hash_ignora_confronto():
    from scraper.condivisione import _hash
    a, b = _partita(), _partita()
    b["confronto"] = {"casa": {"pos": 1}, "ospite": {"pos": 2}}
    assert _hash(a, None) == _hash(b, None)
