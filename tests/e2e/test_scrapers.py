import pytest
from fc_core.automation.scrapers.scraper_factory import ScraperFactory

@pytest.mark.parametrize("sistema", ["pje", "eproc", "esaj", "projudi", "sei"])
def test_scraper_factory(sistema):
    """Testa criação de scrapers"""
    scraper = ScraperFactory.create(sistema)
    assert scraper is not None
    assert hasattr(scraper, "executar")
    assert hasattr(scraper, "buscar_processo")
    assert hasattr(scraper, "extrair_movimentacoes")

def test_sistemas_disponiveis():
    """Testa lista de sistemas"""
    sistemas = ScraperFactory.sistemas_disponiveis()
    assert len(sistemas) == 5
    assert "pje" in sistemas
    assert "esaj" in sistemas
    assert "sei" in sistemas
