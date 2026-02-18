from typing import Optional

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

router = APIRouter()

_INTEGRATIONS_IMPORT_ERROR: Optional[str] = None
try:
    from fc_core.automation.tasks import scrape_processo_task, scrape_batch_task
    from fc_core.automation.scrapers.scraper_factory import ScraperFactory
except Exception as exc:
    _INTEGRATIONS_IMPORT_ERROR = str(exc)
    scrape_processo_task = None
    scrape_batch_task = None
    ScraperFactory = None


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
    """Lista sistemas juridicos disponiveis."""
    if ScraperFactory is None:
        return {
            "sistemas": [],
            "total": 0,
            "warning": "Integrations stack not available in this environment.",
            "detail": _INTEGRATIONS_IMPORT_ERROR,
        }

    sistemas = ScraperFactory.sistemas_disponiveis()
    return {"sistemas": sistemas, "total": len(sistemas)}


@router.post("/scrape")
def scrape_processo(request: ScrapeRequest, background_tasks: BackgroundTasks):
    """Inicia scraping de um processo."""
    if scrape_processo_task is None:
        raise HTTPException(
            status_code=503,
            detail=f"Integrations stack unavailable: {_INTEGRATIONS_IMPORT_ERROR}",
        )

    credentials = None
    if request.username and request.password:
        credentials = {"username": request.username, "password": request.password}

    task = scrape_processo_task.delay(request.sistema, request.numero_processo, credentials)

    return {
        "message": "Scraping iniciado",
        "task_id": task.id,
        "sistema": request.sistema,
        "processo": request.numero_processo,
    }


@router.post("/scrape/batch")
def scrape_batch(request: BatchScrapeRequest):
    """Inicia scraping em lote."""
    if scrape_batch_task is None:
        raise HTTPException(
            status_code=503,
            detail=f"Integrations stack unavailable: {_INTEGRATIONS_IMPORT_ERROR}",
        )

    credentials = None
    if request.username and request.password:
        credentials = {"username": request.username, "password": request.password}

    task = scrape_batch_task.delay(request.sistema, request.numeros_processos, credentials)

    return {
        "message": "Scraping em lote iniciado",
        "task_id": task.id,
        "sistema": request.sistema,
        "total_processos": len(request.numeros_processos),
    }


@router.get("/task/{task_id}")
def consultar_task(task_id: str):
    """Consulta status de uma task."""
    try:
        from celery.result import AsyncResult
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Celery unavailable: {exc}") from exc

    task = AsyncResult(task_id)
    return {"task_id": task_id, "status": task.state, "result": task.result if task.ready() else None}

