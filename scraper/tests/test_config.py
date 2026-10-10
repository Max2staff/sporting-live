from __future__ import annotations

from scraper import config


def test_url():
    assert config.url_calendario(421) == "https://www.campionatisportingclub.it/campionati0gironigiornatepartite_calendario.php?idgirone=421"
    assert config.url_classifica(421) == "https://www.campionatisportingclub.it/campionati0gironigiornatepartite_classifica.php?idgirone=421"
    assert config.url_classifica(421, tipo="incasa").endswith("?idgirone=421&tipo=incasa")
    assert config.url_tabellino(421, 14083).endswith("tabellini.php?idgirone=421&tipo=partita&idpartita=14083")


def test_user_agent_identificabile():
    assert "SportingLive" in config.USER_AGENT and "contatto" in config.USER_AGENT
