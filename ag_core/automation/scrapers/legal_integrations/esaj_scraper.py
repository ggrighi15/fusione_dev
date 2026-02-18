from fc_core.automation.scrapers.base_scraper import BaseScraper
from selenium.webdriver.common.by import By
from typing import Dict, Any
import time
import logging

logger = logging.getLogger(__name__)

class ESAJScraper(BaseScraper):
    """Scraper para o sistema e-SAJ (TJ-SP)"""
    
    BASE_URL = "https://esaj.tjsp.jus.br/cpopg/open.do"
    
    def login(self, credentials: Dict[str, str]) -> bool:
        """e-SAJ não requer login para consulta pública"""
        try:
            self.driver.get(self.BASE_URL)
            logger.info("Acessando e-SAJ (consulta pública)...")
            time.sleep(2)
            return True
        except Exception as e:
            logger.error(f"Erro ao acessar e-SAJ: {str(e)}")
            return False
    
    def buscar_processo(self, numero_processo: str) -> Dict[str, Any]:
        """Busca processo no e-SAJ"""
        try:
            # Remove formatação do número
            numero_limpo = numero_processo.replace(".", "").replace("-", "")
            
            search_field = self.wait_for_element(By.ID, "numeroDigitoAnoUnificado")
            search_field.clear()
            search_field.send_keys(numero_limpo)
            
            search_button = self.driver.find_element(By.ID, "pbEnviar")
            search_button.click()
            
            time.sleep(3)
            
            processo_data = {
                "numero": numero_processo,
                "classe": self.safe_find(By.XPATH, "//span[contains(@class, 'classeProcesso')]"),
                "assunto": self.safe_find(By.XPATH, "//span[contains(@class, 'assuntoProcesso')]"),
                "area": self.safe_find(By.XPATH, "//span[contains(@class, 'areaProcesso')]"),
                "distribuicao": self.safe_find(By.XPATH, "//div[@id='dataDistribuicao']"),
                "valor_causa": self.safe_find(By.XPATH, "//div[@id='valorAcaoProcesso']"),
                "origem": "e-SAJ"
            }
            
            logger.info(f"Processo {numero_processo} encontrado no e-SAJ")
            return processo_data
        
        except Exception as e:
            logger.error(f"Erro ao buscar processo no e-SAJ: {str(e)}")
            return {"numero": numero_processo, "erro": str(e), "origem": "e-SAJ"}
    
    def extrair_movimentacoes(self, numero_processo: str) -> list:
        """Extrai movimentações do e-SAJ"""
        try:
            movimentacoes_table = self.driver.find_element(By.ID, "tabelaTodasMovimentacoes")
            movimentacoes_rows = movimentacoes_table.find_elements(By.TAG_NAME, "tr")
            
            movimentacoes = []
            for row in movimentacoes_rows[1:51]:  # Pula header, limita a 50
                try:
                    cols = row.find_elements(By.TAG_NAME, "td")
                    if len(cols) >= 2:
                        data = cols[0].text.strip()
                        descricao = cols[2].text.strip() if len(cols) > 2 else cols[1].text.strip()
                        
                        movimentacoes.append({
                            "data": data,
                            "descricao": descricao,
                            "origem": "e-SAJ"
                        })
                except:
                    continue
            
            logger.info(f"Extraídas {len(movimentacoes)} movimentações do e-SAJ")
            return movimentacoes
        
        except Exception as e:
            logger.error(f"Erro ao extrair movimentações do e-SAJ: {str(e)}")
            return []
