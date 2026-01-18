import asyncio
from fc_core.automation.scrapers.scraper_factory import ScraperFactory
import logging

# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("TestIntegrations")

def test_factory_mapping():
    print("\n--- Testando Mapeamento da Factory ---")
    sources_to_test = ["domicilio", "diario_nacional", "tjmg", "tjrs"]
    
    for source in sources_to_test:
        scraper = ScraperFactory.create(source, headless=True)
        if scraper:
            print(f"✅ {source} -> {scraper.__class__.__name__} ({scraper.BASE_URL})")
        else:
            print(f"❌ {source} -> Falha ao criar scraper")

async def test_djen_execution():
    print("\n--- Testando Execução do DJEN ---")
    scraper = ScraperFactory.create("diario_nacional", headless=True)
    
    # Teste com código de cliente conhecido
    resultado = scraper.executar("0345", {}) # 0345 é nosso cliente de teste
    
    print(f"Status: {resultado.get('success')}")
    if resultado.get("success"):
        processo = resultado.get("processo", {})
        pubs = processo.get("publicacoes", [])
        print(f"Publicações Encontradas: {len(pubs)}")
        for pub in pubs:
            print(f" - {pub['data_disponibilizacao']}: {pub['conteudo']}")
    else:
        print(f"Erro: {resultado.get('error')}")

if __name__ == "__main__":
    test_factory_mapping()
    asyncio.run(test_djen_execution())
