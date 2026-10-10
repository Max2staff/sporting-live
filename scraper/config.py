"""Costanti del sito ufficiale e costruzione URL."""
from __future__ import annotations

BASE = "https://www.campionatisportingclub.it/"
USER_AGENT = "SportingLive/1.0 (+app risultati Sporting Club Mestre; contatto: massimiliano.griletti@gmail.com)"
PAUSA_S = 0.5
TIMEOUT_S = 20
TENTATIVI = 3
GIORNI_TABELLINO_INCOMPLETO = 7   # dopo tanti giorni un tabellino senza formazioni si accetta com'è

_P = BASE + "campionati0gironigiornatepartite_"


def url_classifica(idgirone: int, tipo: str | None = None) -> str:
    u = f"{_P}classifica.php?idgirone={idgirone}"
    return u + (f"&tipo={tipo}" if tipo else "")      # tipo: "incasa" | "fuoricasa"


def url_calendario(idgirone: int) -> str:
    return f"{_P}calendario.php?idgirone={idgirone}"


def url_tabellino(idgirone: int, idpartita: int) -> str:
    return f"{_P}tabellini.php?idgirone={idgirone}&tipo=partita&idpartita={idpartita}"
