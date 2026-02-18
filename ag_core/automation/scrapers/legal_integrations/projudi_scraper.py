from fc_core.automation.scrapers.base_scraper import BaseScraper
from selenium.webdriver.common.by import By
from typing import Dict, Any
import time
import logging

logger = logging.getLogger(__name__)

class ProjudiScraper(BaseScraper):
    """Scraper para o sistema Projudi"""
    
    BASE_URL = "https://projudi.tjsp.jus.br/projudi/"
    
    def login(self, credentials: Dict[str, str]) -> bool:
        """Login no Projudi"""
        try:
            self.driver.get(self.BASE_URL)
            logger.info("Acessando Projudi...")
            
            username_field = self.wait_for_element(By.ID, "login")
            password_field = self.driver.find_element(By.ID, "senha")
            
            username_field.send_keys(credentials.get("username", ""))
            password_field.send_keys(credentials.get("password", ""))
            
            login_button = self.driver.find_element(By.NAME, "Acessar")
            login_button.click()
            
            time.sleep(3)
            
            if "login" not in self.driver.current_url.lower():
                logger.info("Login Projudi realizado")
                return True
            else:
                logger.error("Falha no login Projudi")
                return False
        
        except Exception as e:
            logger.error(f"Erro no login Projudi: {str(e)}")
            return False
    
    def buscar_processo(self, numero_processo: str) -> Dict[str, Any]:
        """Busca processo no Projudi"""
        try:
            search_field = self.wait_for_element(By.ID, "numeroProcesso")
            search_field.clear()
            search_field.send_keys(numero_processo)
            
            search_button = self.driver.find_element(By.ID, "btnPesquisar")
            search_button.click()
            
            time.sleep(2)
            
            processo_data = {
                "numero": numero_processo,
                "classe": self.safe_find(By.XPATH, "//span[@id='classe']"),
                "assunto": self.safe_find(By.XPATH, "//span[@id='assunto']"),
                "distribuicao": self.safe_find(By.XPATH, "//span[@id='dataDistribuicao']"),
                "origem": "Projudi"
            }
            
            logger.info(f"Processo {numero_processo} encontrado no Projudi")
            return processo_data
        
        except Exception as e:
            logger.error(f"Erro ao buscar processo no Projudi: {str(e)}")
            return {"numero": numero_processo, "erro": str(e), "origem": "Projudi"}
    
    def extrair_movimentacoes(self, numero_processo: str) -> list:
        """Extrai movimentações do Projudi"""
        try:
            movimentacoes_elements = self.driver.find_elements(By.CLASS_NAME, "movimentacao")
            
            movimentacoes = []
            for mov in movimentacoes_elements[:50]:
                try:
                    data = mov.find_element(By.CLASS_NAME, "data").text.strip()
                    descricao = mov.find_element(By.CLASS_NAME, "descricao").text.strip()
                    
                    movimentacoes.append({
                        "data": data,
                        "descricao": descricao,
                        "origem": "Projudi"
                    })
                except:
                    continue
            
            logger.info(f"Extraídas {len(movimentacoes)} movimentações do Projudi")
            return movimentacoes
        
        except Exception as e:
            logger.error(f"Erro ao extrair movimentações do Projudi: {str(e)}")
            return []
