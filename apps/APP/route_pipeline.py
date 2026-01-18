from fastapi import APIRouter, BackgroundTasks, HTTPException
from fc_core.automation.orchestrator import Orchestrator, ScrapingRequest
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

async def run_orchestrator_task(request: ScrapingRequest):
    """
    Função auxiliar para executar o orquestrador em background.
    """
    try:
        orchestrator = Orchestrator()
        logger.info(f"Iniciando task background para {request.target_id}")
        await orchestrator.run_pipeline(request)
        logger.info(f"Task background finalizada para {request.target_id}")
    except Exception as e:
        logger.error(f"Erro na execução da task background: {e}")

@router.post("/run", status_code=202)
async def trigger_pipeline(request: ScrapingRequest, background_tasks: BackgroundTasks):
    """
    Endpoint para iniciar o pipeline de orquestração.
    
    - **target_id**: CNJ ou identificador do alvo.
    - **sources**: Lista de fontes (pje, espaider, instagram, etc).
    - **fetch_related**: Se deve buscar processos relacionados.
    - **client_code**: (Opcional) Código do cliente para forçar associação.
    - **module_code**: (Opcional) Código do módulo.
    """
    try:
        # Adiciona a execução à fila de background tasks
        background_tasks.add_task(run_orchestrator_task, request)
        
        return {
            "message": "Pipeline iniciado com sucesso. O processamento ocorrerá em segundo plano.",
            "target": request.target_id,
            "status": "queued"
        }
    except Exception as e:
        logger.error(f"Erro ao agendar pipeline: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")
