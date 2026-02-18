from fc_core.automation.scrapers.base_scraper import BaseScraper
from selenium.webdriver.common.by import By
from typing import Dict, Any
import time
import logging

logger = logging.getLogger(__name__)

class SEIScraper(BaseScraper):
    """Scraper para o sistema SEI (Sistema Eletrônico de Informações)"""
    
    BASE_URL = "https://sei.sp.gov.br/sei/"
    
    def login(self, credentials: Dict[str, str]) -> bool:
        """Login no SEI"""
        try:
            self.driver.get(self.BASE_URL)
            logger.info("Acessando SEI...")
            
            username_field = self.wait_for_element(By.ID, "txtUsuario")
            password_field = self.driver.find_element(By.ID, "pwdSenha")
            
            username_field.send_keys(credentials.get("username", ""))
            password_field.send_keys(credentials.get("password", ""))
            
            login_button = self.driver.find_element(By.ID, "sbmLogin")
            login_button.click()
            
            time.sleep(3)
            
            if "login" not in self.driver.current_url.lower():
                logger.info("Login SEI realizado")
                return True
            else:
                logger.error("Falha no login SEI")
                return False
        
        except Exception as e:
            logger.error(f"Erro no login SEI: {str(e)}")
            return False
    
    def buscar_processo(self, numero_processo: str) -> Dict[str, Any]:
        """Busca processo no SEI"""
        try:
            search_field = self.wait_for_element(By.ID, "txtPesquisaRapida")
            search_field.clear()
            search_field.send_keys(numero_processo)
            search_field.submit()
            
            time.sleep(2)
            
            processo_data = {
                "numero": numero_processo,
                "tipo": self.safe_find(By.XPATH, "//div[@id='divInformacao']//span[contains(text(), 'Tipo:')]"),
                "especificacao": self.safe_find(By.XPATH, "//div[@id='divInformacao']//span[contains(text(), 'Especificação:')]"),
                "data_abertura": self.safe_find(By.XPATH, "//div[@id='divInformacao']//span[contains(text(), 'Gerado em:')]"),
                "origem": "SEI"
            }
            
            logger.info(f"Processo {numero_processo} encontrado no SEI")
            return processo_data
        
        except Exception as e:
            logger.error(f"Erro ao buscar processo no SEI: {str(e)}")
            return {"numero": numero_processo, "erro": str(e), "origem": "SEI"}
    
    def extrair_movimentacoes(self, numero_processo: str) -> list:
        """Extrai andamentos do SEI"""
        try:
            andamentos_link = self.driver.find_element(By.LINK_TEXT, "Consultar Andamento")
            andamentos_link.click()
            
            time.sleep(2)
            
            andamentos_elements = self.driver.find_elements(By.CLASS_NAME, "infraTrClara")
            
            movimentacoes = []
            for and_elem in andamentos_elements[:50]:
                try:
                    cols = and_elem.find_elements(By.TAG_NAME, "td")
                    if len(cols) >= 3:
                        data = cols[0].text.strip()
                        unidade = cols[1].text.strip()
                        descricao = cols[2].text.strip()
                        
                        movimentacoes.append({
                            "data": data,
                            "descricao": f"{unidade} - {descricao}",
                            "origem": "SEI"
                        })
                except:
                    continue
            
            logger.info(f"Extraídos {len(movimentacoes)} andamentos do SEI")
            return movimentacoes
        
        except Exception as e:
            logger.error(f"Erro ao extrair andamentos do SEI: {str(e)}")
            return []
