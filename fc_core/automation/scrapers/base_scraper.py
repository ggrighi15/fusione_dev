from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from abc import ABC, abstractmethod
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class BaseScraper(ABC):
    def __init__(self, headless: bool = True, timeout: int = 30):
        self.headless = headless
        self.timeout = timeout
        self.driver: Optional[webdriver.Chrome] = None
    
    def setup_driver(self):
        """Configura o driver do Selenium"""
        options = Options()
        if self.headless:
            options.add_argument("--headless=new")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        options.add_argument("--window-size=1920,1080")
        options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        
        self.driver = webdriver.Chrome(options=options)
        self.driver.implicitly_wait(10)
        logger.info("Driver configurado")
    
    def teardown_driver(self):
        """Fecha o driver"""
        if self.driver:
            self.driver.quit()
            logger.info("Driver fechado")
    
    def wait_for_element(self, by: By, value: str, timeout: Optional[int] = None):
        """Aguarda elemento estar presente"""
        wait_time = timeout or self.timeout
        try:
            element = WebDriverWait(self.driver, wait_time).until(
                EC.presence_of_element_located((by, value))
            )
            return element
        except TimeoutException:
            logger.error(f"Timeout aguardando elemento: {value}")
            raise
    
    def safe_find(self, by: By, value: str) -> Optional[str]:
        """Busca elemento de forma segura"""
        try:
            element = self.driver.find_element(by, value)
            return element.text.strip()
        except NoSuchElementException:
            return None
    
    @abstractmethod
    def login(self, credentials: Dict[str, str]) -> bool:
        """Implementar login específico"""
        pass
    
    @abstractmethod
    def buscar_processo(self, numero_processo: str) -> Dict[str, Any]:
        """Implementar busca de processo"""
        pass
    
    @abstractmethod
    def extrair_movimentacoes(self, numero_processo: str) -> list:
        """Implementar extração de movimentações"""
        pass
    
    def executar(self, numero_processo: str, credentials: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """Executa scraping completo"""
        try:
            self.setup_driver()
            
            if credentials:
                login_success = self.login(credentials)
                if not login_success:
                    raise Exception("Falha no login")
            
            processo = self.buscar_processo(numero_processo)
            movimentacoes = self.extrair_movimentacoes(numero_processo)
            
            return {
                "success": True,
                "processo": processo,
                "movimentacoes": movimentacoes
            }
        
        except Exception as e:
            logger.error(f"Erro no scraping: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
        
        finally:
            self.teardown_driver()
