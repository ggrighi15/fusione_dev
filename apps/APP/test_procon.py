import asyncio
from fc_core.automation.scrapers.scraper_factory import ScraperFactory
import logging

logging.basicConfig(level=logging.INFO)

def test_procon_integrations():
    print("\n--- Testando Integrações de Defesa do Consumidor ---")
    
    systems = ["procon_nacional", "consumidor_gov"]
    
    for sys_id in systems:
        print(f"\n🔹 Criando scraper para: {sys_id}")
        scraper = ScraperFactory.create(sys_id, headless=True)
        
        if not scraper:
            print(f"❌ Falha ao criar scraper {sys_id}")
            continue
            
        print(f"✅ Criado: {scraper.__class__.__name__}")
        print(f"   URL: {scraper.BASE_URL}")
        
        try:
            # Login Simulado
            scraper.login({})
            # Busca Simulada
            res = scraper.buscar_processo("2024.01/000123")
            print(f"   Resultado Busca: {res.get('origem')} - Status: {res.get('status', 'OK')}")
        except Exception as e:
            print(f"   ⚠️ Erro na execução: {e}")

if __name__ == "__main__":
    test_procon_integrations()
