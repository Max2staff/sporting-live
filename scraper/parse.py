"""Parser HTML del sito campionatisportingclub.it. Funzioni pure: stringa HTML → dict.

Struttura verificata su pagine reali (fixture in tests/fixtures):
- classifica: <table> con <th>SQUADRA</th><th>PT</th>…; ogni riga ha <a href="…idsquadra=N">
- calendario: <table class="campionaticalendario"> per giornata, <caption>giornata N</caption>
- tabellino: .squadre-incontro, .partitarisultato, .partitadettagligoal, table.tabellaformazionetitolari
"""
from __future__ import annotations

import re
from bs4 import BeautifulSoup, Tag


class ParseError(Exception):
    """L'HTML non ha la struttura attesa (probabile cambio del sito)."""


def _soup(html: str) -> BeautifulSoup:
    return BeautifulSoup(html, "html.parser")


def _txt(el: Tag | None) -> str:
    if el is None:
        return ""
    return re.sub(r"\s+", " ", el.get_text(" ", strip=True)).strip()


def _int(s: str) -> int:
    s = s.strip().replace("−", "-")
    return int(s) if re.fullmatch(r"-?\d+", s) else 0


def _id_da_href(a: Tag | None, chiave: str) -> int | None:
    if a is None:
        return None
    m = re.search(rf"{chiave}=(\d+)", a.get("href", ""))
    return int(m.group(1)) if m else None


# --- classifica -----------------------------------------------------------

_COLONNE = ["pt", "g", "v", "n", "p", "gf", "gs", "dr"]


def parse_classifica(html: str) -> list[dict]:
    soup = _soup(html)
    tabella = None
    for t in soup.select("table"):
        intestazioni = [_txt(th) for th in t.select("tr th")]
        if intestazioni and intestazioni[0] == "":      # alcuni tornei hanno una colonna logo iniziale
            intestazioni = intestazioni[1:]
        if intestazioni[:2] == ["SQUADRA", "PT"]:
            tabella = t
            break
    if tabella is None:
        raise ParseError("tabella classifica non trovata")

    righe = []
    for tr in tabella.select("tr"):
        tds = tr.select("td")
        if len(tds) == 2 + len(_COLONNE) and not _txt(tds[0]):
            tds = tds[1:]                                 # scarta la colonna logo
        if len(tds) != 1 + len(_COLONNE):
            continue
        a = tds[0].select_one("a[href*='idsquadra=']")
        riga = {
            "squadraId": _id_da_href(a, "idsquadra"),
            "nome": _txt(tds[0]),
            "pos": len(righe) + 1,
        }
        for chiave, td in zip(_COLONNE, tds[1:]):
            riga[chiave] = _int(_txt(td))
        righe.append(riga)
    if not righe:
        raise ParseError("classifica senza righe")
    return righe


# --- calendario -----------------------------------------------------------

_RE_DATAORA = re.compile(r"(\d{2})/(\d{2})/(\d{4})\s+(\d{2}:\d{2})")
_RE_RISULTATO = re.compile(r"^\s*(\d+)\s*-\s*(\d+)\s*$")


def parse_calendario(html: str) -> list[dict]:
    soup = _soup(html)
    tabelle = soup.select("table.campionaticalendario")
    if not tabelle:
        raise ParseError("nessuna tabella campionaticalendario")

    partite = []
    for tabella in tabelle:
        m = re.search(r"giornata\s+(\d+)", _txt(tabella.select_one("caption")), re.I)
        if not m:
            raise ParseError("caption giornata non riconosciuta")
        giornata = int(m.group(1))
        for tr in tabella.select("tr"):
            tds = tr.select("td")
            if len(tds) < 2:
                continue
            idpartita = _id_da_href(tr.select_one("a[href*='idpartita=']"), "idpartita")
            if idpartita is None:
                raise ParseError(f"riga senza idpartita alla giornata {giornata}")
            dm = _RE_DATAORA.search(tds[0].get_text(" "))
            data = f"{dm.group(3)}-{dm.group(2)}-{dm.group(1)}" if dm else None
            ora = dm.group(4) if dm else None
            casa = _txt(tds[1].select_one(".partitasquadracasa"))
            ospite = _txt(tds[1].select_one(".partitasquadraospite"))
            rm = _RE_RISULTATO.match(_txt(tds[1].select_one(".partitainfo")))
            gol_casa = int(rm.group(1)) if rm else None
            gol_ospite = int(rm.group(2)) if rm else None
            partite.append({
                "id": idpartita, "giornata": giornata, "data": data, "ora": ora,
                "casa": casa, "ospite": ospite,
                "golCasa": gol_casa, "golOspite": gol_ospite,
                "giocata": rm is not None,
                "tavolino": rm is not None and data is None,
            })
    return partite


# --- tabellino ------------------------------------------------------------

_RE_MARCATORE = re.compile("^(.+?)\\s+(\\d+)['’]$")


def _cella_giocatore(td: Tag) -> dict | None:
    """Una cella formazione: <span><span>NOME</span><span><img ammonizione></span><span class=voto>8</span></span>.
    L'icona goal può stare prima del nome. Il voto è opzionale."""
    voto_el = td.select_one(".tabellaformazionevoto")
    voto_txt = _txt(voto_el).replace(",", ".")
    voto = float(voto_txt) if re.fullmatch(r"\d+(\.\d+)?", voto_txt) else None
    ammonito = td.select_one("img[src*='ammonizione']") is not None
    espulso = td.select_one("img[src*='espuls']") is not None
    for el in td.select("img, .tabellaformazionevoto"):
        el.decompose()
    nome = _txt(td)
    if not nome:
        return None
    return {"nome": nome, "voto": voto, "ammonito": ammonito, "espulso": espulso}


def parse_tabellino(html: str) -> dict:
    soup = _soup(html)
    squadre = [_txt(x) for x in soup.select(".squadre-incontro")]
    risultati = [_txt(x) for x in soup.select(".partitarisultato")]
    if len(squadre) != 2 or len(risultati) != 2:
        raise ParseError("testa tabellino non riconosciuta")
    casa, ospite = squadre

    marcatori = []
    blocchi = soup.select(".partitadettagligoal > div")
    for squadra, blocco in zip((casa, ospite), blocchi):
        for sp in blocco.find_all("span", recursive=False):
            m = _RE_MARCATORE.match(_txt(sp))
            if m:
                marcatori.append({"squadra": squadra, "nome": m.group(1), "minuto": int(m.group(2))})

    formazioni = []
    tabella = soup.select_one("table.tabellaformazionetitolari")
    if tabella is not None:
        for tr in tabella.select("tr"):
            tds = tr.select("td")
            if len(tds) != 3:
                continue
            numero_txt = _txt(tds[1])
            numero = int(numero_txt) if numero_txt.isdigit() else None
            for squadra, td in ((casa, tds[0]), (ospite, tds[2])):
                g = _cella_giocatore(td)
                if g:
                    formazioni.append({"squadra": squadra, "numero": numero, **g})

    migliore = None
    mig = soup.select_one(".partitamiglioratleta")
    if mig is not None and _txt(mig.select_one("strong")):
        migliore = {"nome": _txt(mig.select_one("strong")), "squadra": _txt(mig.select_one(".partitaluogo"))}

    return {
        "casa": casa, "ospite": ospite,
        "golCasa": _int(risultati[0]), "golOspite": _int(risultati[1]),
        "marcatori": marcatori, "formazioni": formazioni, "migliore": migliore,
    }
