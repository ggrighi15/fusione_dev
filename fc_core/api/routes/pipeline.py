from typing import Dict, List, Optional
import logging

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger(__name__)


class PipelineRequest(BaseModel):
    target_id: str
    sources: List[str]
    fetch_related: bool = False
    credentials: Optional[Dict[str, Dict[str, str]]] = None
    client_code: Optional[str] = None
    module_code: Optional[str] = None


async def run_orchestrator_task(request: PipelineRequest):
    """
    Executa o orquestrador em background com import tardio para evitar
    quebrar bootstrap da API quando dependencias de scraper nao estao presentes.
    """
    try:
        from fc_core.automation.orchestrator import Orchestrator, ScrapingRequest

        orchestrator = Orchestrator()
        internal_request = ScrapingRequest(**request.model_dump())
        logger.info("Iniciando task background para %s", request.target_id)
        await orchestrator.run_pipeline(internal_request)
        logger.info("Task background finalizada para %s", request.target_id)
    except Exception as exc:
        logger.error("Erro na execucao da task background: %s", exc)


@router.post("/run", status_code=202)
async def trigger_pipeline(request: PipelineRequest, background_tasks: BackgroundTasks):
    """
    Endpoint para iniciar o pipeline de orquestracao.
    """
    try:
        background_tasks.add_task(run_orchestrator_task, request)
        return {
            "message": "Pipeline iniciado com sucesso. O processamento ocorrera em segundo plano.",
            "target": request.target_id,
            "status": "queued",
        }
    except Exception as exc:
        logger.error("Erro ao agendar pipeline: %s", exc)
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(exc)}") from exc

