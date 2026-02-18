from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from fc_core.automation.tasks import scrape_processo_task, scrape_batch_task
from fc_core.automation.scrapers.scraper_factory import ScraperFactory

router = APIRouter()

class ScrapeRequest(BaseModel):
    sistema: str
    numero_processo: str
    username: Optional[str] = None
    password: Optional[str] = None

class BatchScrapeRequest(BaseModel):
    sistema: str
    numeros_processos: list[str]
    username: Optional[str] = None
    password: Optional[str] = None

@router.get("/sistemas")
def listar_sistemas():
    """Lista sistemas jurídicos disponíveis"""
    return {
        "sistemas": ScraperFactory.sistemas_disponiveis(),
        "total": len(ScraperFactory.sistemas_disponiveis())
    }

@router.post("/scrape")
def scrape_processo(request: ScrapeRequest, background_tasks: BackgroundTasks):
    """Inicia scraping de um processo"""
    credentials = None
    if request.username and request.password:
        credentials = {
            "username": request.username,
            "password": request.password
        }
    
    task = scrape_processo_task.delay(request.sistema, request.numero_processo, credentials)
    
    return {
        "message": "Scraping iniciado",
        "task_id": task.id,
        "sistema": request.sistema,
        "processo": request.numero_processo
    }

@router.post("/scrape/batch")
def scrape_batch(request: BatchScrapeRequest):
    """Inicia scraping em lote"""
    credentials = None
    if request.username and request.password:
        credentials = {
            "username": request.username,
            "password": request.password
        }
    
    task = scrape_batch_task.delay(request.sistema, request.numeros_processos, credentials)
    
    return {
        "message": "Scraping em lote iniciado",
        "task_id": task.id,
        "sistema": request.sistema,
        "total_processos": len(request.numeros_processos)
    }

@router.get("/task/{task_id}")
def consultar_task(task_id: str):
    """Consulta status de uma task"""
    from celery.result import AsyncResult
    task = AsyncResult(task_id)
    
    return {
        "task_id": task_id,
        "status": task.state,
        "result": task.result if task.ready() else None
    }
