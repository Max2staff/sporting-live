import json
import re
import colorsys
from pathlib import Path

from scraper import config
from scraper.stemma import FONT_BOLD, colori_stemma, disegna_stemma, iniziali
from scraper.tests.conftest import FIXTURES

JS = json.loads((FIXTURES / "stemmi_js.json").read_text(encoding="utf-8"))


def test_colori_come_js():
    assert JS["colori"]
    for c in JS["colori"]:
        atteso = {k: v for k, v in c.items() if k != "id"}
        assert colori_stemma(c["id"]) == atteso


def test_iniziali_come_js():
    assert JS["iniziali"]
    for r in JS["iniziali"]:
        assert iniziali(r["nome"]) == r["iniziali"], r["nome"]


def test_iniziali_casi_limite():
    assert iniziali(None) == "?"
    assert iniziali("F.C.") == "?"


def test_font_presente():
    assert FONT_BOLD.is_file()
    assert (FONT_BOLD.parent / "LICENSE.txt").is_file()


def test_disegna_stemma():
    sq = {"id": 2480, "nome": "SOCKS"}
    im = disegna_stemma(sq, 200)
    assert im.size == (200, 200) and im.mode == "RGBA"
    assert im.getpixel((0, 0))[3] == 0 and im.getpixel((199, 199))[3] == 0
    assert im.getpixel((199, 0))[3] == 0 and im.getpixel((0, 199))[3] == 0
    # motivo 2 (chevron): punto sullo scudo fuori dal chevron e dal testo = colore primario
    h, s, l = (int(x) for x in re.fullmatch(r"hsl\((\d+) (\d+)% (\d+)%\)", colori_stemma(2480)["primario"]).groups())
    atteso = tuple(round(v * 255) for v in colorsys.hls_to_rgb(h / 360, l / 100, s / 100))
    px = im.getpixel((100, 36))   # in alto, dentro lo scudo
    assert px[3] == 255 and all(abs(a - b) <= 2 for a, b in zip(px[:3], atteso))


def test_og_image_url_da_config():
    html = (Path(config.__file__).resolve().parent.parent / "site" / "index.html").read_text(encoding="utf-8")
    m = re.search(r'<meta property="og:image" content="([^"]+)"', html)
    assert m and m.group(1) == config.SITO_URL + "img/og.jpg"
    u = re.search(r'<meta property="og:url" content="([^"]+)"', html)
    assert u and u.group(1) == config.SITO_URL
