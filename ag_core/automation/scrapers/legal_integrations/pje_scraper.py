from fc_core.automation.scrapers.base_scraper import BaseScraper
from selenium.webdriver.common.by import By
from typing import Dict, Any
import time
import logging

logger = logging.getLogger(__name__)

class PJeScraper(BaseScraper):
    """Scraper para o sistema PJe (Processo Judicial Eletrônico)"""
    
    BASE_URL = "https://pje.tjsp.jus.br/pje/login.seam"
    
    def login(self, credentials: Dict[str, str]) -> bool:
        """Login no PJe"""
        try:
            self.driver.get(self.BASE_URL)
            logger.info("Acessando PJe...")
            
            # Aguarda campo de usuário
            username_field = self.wait_for_element(By.ID, "username")
            password_field = self.driver.find_element(By.ID, "password")
            
            username_field.send_keys(credentials.get("username", ""))
            password_field.send_keys(credentials.get("password", ""))
            
            login_button = self.driver.find_element(By.ID, "btnEntrar")
            login_button.click()
            
            time.sleep(3)
            
            # Verifica se login foi bem-sucedido
            if "login" not in self.driver.current_url.lower():
                logger.info("Login PJe realizado com sucesso")
                return True
            else:
                logger.error("Falha no login PJe")
                return False
        
        except Exception as e:
            logger.error(f"Erro no login PJe: {str(e)}")
            return False
    
    def buscar_processo(self, numero_processo: str) -> Dict[str, Any]:
        """Busca processo no PJe"""
        try:
            # Navega para consulta de processos
            self.driver.get("https://pje.tjsp.jus.br/pje/Processo/ConsultaProcesso/listView.seam")
            
            # Campo de busca
            search_field = self.wait_for_element(By.ID, "fPP:numeroProcesso:numeroSequencial")
            search_field.clear()
            search_field.send_keys(numero_processo)
            
            # Botão de pesquisar
            search_button = self.driver.find_element(By.ID, "fPP:searchProcessos")
            search_button.click()
            
            time.sleep(2)
            
            # Extrai dados do processo
            processo_data = {
                "numero": numero_processo,
                "classe": self.safe_find(By.XPATH, "//span[@id='classeProcessual']"),
                "assunto": self.safe_find(By.XPATH, "//span[@id='assuntoProcessual']"),
                "area": self.safe_find(By.XPATH, "//span[@id='areaProcessual']"),
                "distribuicao": self.safe_find(By.XPATH, "//span[@id='dataDistribuicao']"),
                "valor_causa": self.safe_find(By.XPATH, "//span[@id='valorCausa']"),
                "origem": "PJe"
            }
            
            logger.info(f"Processo {numero_processo} encontrado no PJe")
            return processo_data
        
        except Exception as e:
            logger.error(f"Erro ao buscar processo no PJe: {str(e)}")
            return {"numero": numero_processo, "erro": str(e), "origem": "PJe"}
    
    def extrair_movimentacoes(self, numero_processo: str) -> list:
        """Extrai movimentações do processo"""
        try:
            # Clica na aba de movimentações
            movimentacoes_tab = self.driver.find_element(By.XPATH, "//a[contains(text(), 'Movimentações')]")
            movimentacoes_tab.click()
            
            time.sleep(2)
            
            # Extrai lista de movimentações
            movimentacoes_elements = self.driver.find_elements(By.CLASS_NAME, "movimentacao-item")
            
            movimentacoes = []
            for mov in movimentacoes_elements[:50]:  # Limita a 50 movimentações
                try:
                    data = mov.find_element(By.CLASS_NAME, "data-movimentacao").text.strip()
                    descricao = mov.find_element(By.CLASS_NAME, "descricao-movimentacao").text.strip()
                    
                    movimentacoes.append({
                        "data": data,
                        "descricao": descricao,
                        "origem": "PJe"
                    })
                except:
                    continue
            
            logger.info(f"Extraídas {len(movimentacoes)} movimentações do PJe")
            return movimentacoes
        
        except Exception as e:
            logger.error(f"Erro ao extrair movimentações do PJe: {str(e)}")
            return []
