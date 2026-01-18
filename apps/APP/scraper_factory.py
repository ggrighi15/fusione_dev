from typing import Optional, Dict
from fc_core.automation.scrapers.base_scraper import BaseScraper
from fc_core.automation.scrapers.legal_integrations.pje_scraper import PJeScraper
from fc_core.automation.scrapers.legal_integrations.eproc_scraper import EProcScraper
from fc_core.automation.scrapers.legal_integrations.esaj_scraper import ESAJScraper
from fc_core.automation.scrapers.legal_integrations.projudi_scraper import ProjudiScraper
from fc_core.automation.scrapers.legal_integrations.sei_scraper import SEIScraper
import logging

logger = logging.getLogger(__name__)

class ScraperFactory:
    """Factory para criar scrapers específicos"""
    
    # Mapeamento de Sistemas Base
    SYSTEM_CLASSES = {
        "pje": PJeScraper,
        "eproc": EProcScraper,
        "esaj": ESAJScraper,
        "projudi": ProjudiScraper,
        "sei": SEIScraper
    }

    # Mapeamento Tribunal -> (Sistema, URL Base)
    # Isso evita criar uma classe para cada tribunal se a lógica for compartilhada
    COURT_CONFIG = {
        # TJs
        "tjmg": ("pje", "https://pje.tjmg.jus.br/pje/login.seam"),
        "tjsp": ("esaj", "https://esaj.tjsp.jus.br/cpopg/open.do"),
        "tjrs": ("eproc", "https://eproc1g.tjrs.jus.br/eproc/"),
        "tjsc": ("eproc", "https://eproc1g.tjsc.jus.br/eproc/"),
        "tjpr": ("projudi", "https://projudi.tjpr.jus.br/projudi/"),
        "tjgo": ("projudi", "https://projudi.tjgo.jus.br/projudi/"),
        "tjal": ("esaj", "https://www2.tjal.jus.br/cpopg/open.do"),
        "tjms": ("esaj", "https://esaj.tjms.jus.br/cpopg/open.do"),
        "tjam": ("esaj", "https://consultasaj.tjam.jus.br/cpopg/open.do"),
        "tjac": ("esaj", "https://esaj.tjac.jus.br/cpopg/open.do"),
        
        # TRFs
        "trf1": ("pje", "https://pje1g.trf1.jus.br/pje/login.seam"),
        "trf2": ("eproc", "https://eproc.trf2.jus.br/eproc/"),
        "trf3": ("pje", "https://pje1g.trf3.jus.br/pje/login.seam"),
        "trf4": ("eproc", "https://eproc.trf4.jus.br/eproc/"),
        "trf5": ("pje", "https://pje.trf5.jus.br/pje/login.seam"),

        # TRTs (Padrão PJe, mas URLs variam)
        "trt1": ("pje", "https://pje.trt1.jus.br/primeirograu/login.seam"),
        "trt2": ("pje", "https://pje.trt2.jus.br/primeirograu/login.seam"),
        "trt3": ("pje", "https://pje.trt3.jus.br/primeirograu/login.seam"),
        "trt4": ("pje", "https://pje.trt4.jus.br/primeirograu/login.seam"),
        "trt5": ("pje", "https://pje.trt5.jus.br/primeirograu/login.seam"),
        "trt15": ("pje", "https://pje.trt15.jus.br/primeirograu/login.seam"),
        
        # Superiores
        "stj": ("stj_scraper", "https://processo.stj.jus.br/processo/consulta"), # TODO: Implementar
        "stf": ("stf_scraper", "https://portal.stf.jus.br/processos/"), # TODO: Implementar
    }
    
    @classmethod
    def create(cls, source_id: str, headless: bool = True) -> Optional[BaseScraper]:
        """
        Cria instância do scraper apropriado.
        source_id pode ser um sistema ('pje', 'esaj') ou um tribunal ('tjmg', 'trt3').
        """
        source_key = source_id.lower()
        
        # 1. Tenta encontrar na configuração de tribunais
        if source_key in cls.COURT_CONFIG:
            system_name, url = cls.COURT_CONFIG[source_key]
            logger.info(f"Criando scraper para {source_key} usando driver {system_name}")
            
            scraper_cls = cls.SYSTEM_CLASSES.get(system_name)
            if scraper_cls:
                scraper = scraper_cls(headless=headless)
                # Sobrescreve a URL base da classe com a URL específica do tribunal
                scraper.BASE_URL = url 
                return scraper
            else:
                logger.warning(f"Driver {system_name} não implementado para {source_key}")
                return None

        # 2. Se não for tribunal, tenta direto pelo nome do sistema
        scraper_cls = cls.SYSTEM_CLASSES.get(source_key)
        if scraper_cls:
            return scraper_cls(headless=headless)
            
        logger.error(f"Scraper não encontrado para: {source_id}")
        return None
    
    @classmethod
    def get_supported_sources(cls) -> list:
        """Retorna lista de todas as fontes suportadas (Sistemas + Tribunais)"""
        return list(cls.SYSTEM_CLASSES.keys()) + list(cls.COURT_CONFIG.keys())
