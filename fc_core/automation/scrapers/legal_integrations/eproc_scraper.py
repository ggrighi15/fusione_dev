from fc_core.automation.scrapers.base_scraper import BaseScraper
from selenium.webdriver.common.by import By
from typing import Dict, Any
import time
import logging

logger = logging.getLogger(__name__)

class EProcScraper(BaseScraper):
    """Scraper para o sistema e-Proc (TRF)"""
    
    BASE_URL = "https://eproc.jfsp.jus.br/eprocV2/"
    
    def login(self, credentials: Dict[str, str]) -> bool:
        """Login no e-Proc"""
        try:
            self.driver.get(self.BASE_URL)
            logger.info("Acessando e-Proc...")
            
            # e-Proc geralmente usa certificado digital, então simula acesso público
            consulta_publica = self.wait_for_element(By.LINK_TEXT, "Consulta Pública")
            consulta_publica.click()
            
            time.sleep(2)
            logger.info("Acesso público e-Proc realizado")
            return True
        
        except Exception as e:
            logger.error(f"Erro no acesso e-Proc: {str(e)}")
            return False
    
    def buscar_processo(self, numero_processo: str) -> Dict[str, Any]:
        """Busca processo no e-Proc"""
        try:
            search_field = self.wait_for_element(By.ID, "fPP:numProcesso:numeroSequencial")
            search_field.clear()
            search_field.send_keys(numero_processo)
            
            search_button = self.driver.find_element(By.ID, "fPP:btnPesquisarProcessos")
            search_button.click()
            
            time.sleep(2)
            
            processo_data = {
                "numero": numero_processo,
                "classe": self.safe_find(By.XPATH, "//span[@id='classeProcesso']"),
                "assunto": self.safe_find(By.XPATH, "//span[@id='assuntoProcesso']"),
                "distribuicao": self.safe_find(By.XPATH, "//span[@id='dataDistribuicao']"),
                "origem": "e-Proc"
            }
            
            logger.info(f"Processo {numero_processo} encontrado no e-Proc")
            return processo_data
        
        except Exception as e:
            logger.error(f"Erro ao buscar processo no e-Proc: {str(e)}")
            return {"numero": numero_processo, "erro": str(e), "origem": "e-Proc"}
    
    def extrair_movimentacoes(self, numero_processo: str) -> list:
        """Extrai movimentações do e-Proc"""
        try:
            movimentacoes_elements = self.driver.find_elements(By.CLASS_NAME, "infraMovimentacao")
            
            movimentacoes = []
            for mov in movimentacoes_elements[:50]:
                try:
                    data = mov.find_element(By.CLASS_NAME, "dataMovimentacao").text.strip()
                    descricao = mov.find_element(By.CLASS_NAME, "descricaoMovimentacao").text.strip()
                    
                    movimentacoes.append({
                        "data": data,
                        "descricao": descricao,
                        "origem": "e-Proc"
                    })
                except:
                    continue
            
            logger.info(f"Extraídas {len(movimentacoes)} movimentações do e-Proc")
            return movimentacoes
        
        except Exception as e:
            logger.error(f"Erro ao extrair movimentações do e-Proc: {str(e)}")
            return []
