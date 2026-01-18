import asyncio
from fc_core.automation.scrapers.scraper_factory import ScraperFactory
import logging

logging.basicConfig(level=logging.INFO)

def test_admin_integrations():
    print("\n--- Testando Scrapers Administrativos ---")
    
    # Lista de sistemas administrativos para teste
    admin_systems = ["comprot", "antt", "ridigital", "sei_federal"]
    
    for sys_id in admin_systems:
        print(f"\n🔹 Criando scraper para: {sys_id}")
        scraper = ScraperFactory.create(sys_id, headless=True)
        
        if not scraper:
            print(f"❌ Falha ao criar scraper {sys_id}")
            continue
            
        print(f"✅ Criado: {scraper.__class__.__name__}")
        print(f"   URL: {scraper.BASE_URL}")
        
        # Teste de execução simulada
        mock_id = "123456789"
        if sys_id == "comprot":
             mock_id = "10120.000123/2024-55"
        elif sys_id == "antt":
             mock_id = "12345678000199" # CNPJ
        
        try:
            # Login Simulado
            scraper.login({})
            # Busca Simulada
            res = scraper.buscar_processo(mock_id)
            print(f"   Resultado Busca: {res.get('origem')} - Status: {res.get('status', 'OK')}")
        except Exception as e:
            print(f"   ⚠️ Erro na execução: {e}")

if __name__ == "__main__":
    test_admin_integrations()
