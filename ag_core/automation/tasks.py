from fc_core.core.celery_app import celery_app
from fc_core.automation.scrapers.scraper_factory import ScraperFactory
from fc_core.core.database import SessionLocal
from fc_core.core.models import Processo
import logging

logger = logging.getLogger(__name__)

@celery_app.task(bind=True, max_retries=3)
def scrape_processo_task(self, sistema: str, numero_processo: str, credentials: dict = None):
    """Task assíncrona para scraping de processo"""
    try:
        logger.info(f"Iniciando scraping {sistema} - {numero_processo}")
        
        scraper = ScraperFactory.create(sistema, headless=True)
        if not scraper:
            raise ValueError(f"Sistema {sistema} não suportado")
        
        resultado = scraper.executar(numero_processo, credentials)
        
        if resultado["success"]:
            # Salva no banco
            db = SessionLocal()
            try:
                processo = db.query(Processo).filter(Processo.pasta == numero_processo).first()
                if processo:
                    # Atualiza
                    for key, value in resultado["processo"].items():
                        if hasattr(processo, key):
                            setattr(processo, key, value)
                else:
                    # Cria novo
                    processo = Processo(pasta=numero_processo, **resultado["processo"])
                    db.add(processo)
                
                db.commit()
                logger.info(f"Processo {numero_processo} salvo no banco")
            finally:
                db.close()
        
        return resultado
    
    except Exception as e:
        logger.error(f"Erro no scraping: {str(e)}")
        raise self.retry(exc=e, countdown=60)

@celery_app.task
def scrape_batch_task(sistema: str, numeros_processos: list, credentials: dict = None):
    """Task para scraping em lote"""
    resultados = []
    for numero in numeros_processos:
        resultado = scrape_processo_task.delay(sistema, numero, credentials)
        resultados.append(resultado.id)
    return resultados
