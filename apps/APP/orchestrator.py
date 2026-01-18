import logging
import asyncio
from typing import List, Dict, Any, Optional, Set
from enum import Enum
from pydantic import BaseModel
from sqlalchemy.orm import Session
from fc_core.core.database import SessionLocal
from fc_core.core.models import Processo

# Importa scrapers já migrados
from fc_core.automation.scrapers.instagram_scraper import InstagramScraper

logger = logging.getLogger(__name__)

class DataSource(str, Enum):
    PJE = "pje"
    ESPAIDER = "espaider"
    INSTAGRAM = "instagram"
    TJMG = "tjmg"
    TRT3 = "trt3"
    JUSBRASIL = "jusbrasil"

class ClientCode(str, Enum):
    VIPAL = "0001" # Borrachas Vipal S.A.
    INTERNO = "0000"

class ModuleCode(str, Enum):
    CONTENCIOSO = "3"
    CONSULTIVO = "2"
    SOCIETARIO = "1"

class ScrapingRequest(BaseModel):
    target_id: str  # CNJ Principal
    sources: List[DataSource]
    fetch_related: bool = False  # Buscar apensos/dependentes?
    credentials: Optional[Dict[str, Dict[str, str]]] = None
    
    # Parâmetros para geração de pasta (Regra de Negócio)
    cliente_cod: str = ClientCode.VIPAL 
    modulo_cod: str = ModuleCode.CONTENCIOSO

class ScrapingResult(BaseModel):
    source: DataSource
    success: bool
    data: Optional[Dict[str, Any]] = None
    related_processes: List[str] = [] 
    error: Optional[str] = None

class Orchestrator:
    """
    Orquestrador Inteligente: Busca, Descobre e Consolida.
    """
    
    def __init__(self, db: Session = None):
        self.db = db or SessionLocal()

    async def run_pipeline(self, request: ScrapingRequest) -> Dict[str, Any]:
        logger.info(f"🚀 Pipeline iniciado para {request.target_id}")
        
        # 1. Executa extração paralela
        tasks = []
        for source in request.sources:
            tasks.append(self._dispatch_scraper(source, request.target_id, request.credentials))
        
        results = await asyncio.gather(*tasks)
        
        # 2. Consolidação
        consolidated_data = {
            "main_target": request.target_id,
            "sources_results": [],
            "discovered_related": set()
        }

        for res in results:
            consolidated_data["sources_results"].append(res.dict())
            if res.success and res.related_processes:
                consolidated_data["discovered_related"].update(res.related_processes)

        # 3. Persistência com Regra de Negócio (Pasta)
        self._save_to_db(request, results)
        
        # 4. Recursividade
        if request.fetch_related and consolidated_data["discovered_related"]:
            new_targets = consolidated_data["discovered_related"] - {request.target_id}
            if new_targets:
                logger.info(f"🔍 Descobertos {len(new_targets)} processos relacionados.")
                consolidated_data["related_pipeline_triggered"] = list(new_targets)

        consolidated_data["discovered_related"] = list(consolidated_data["discovered_related"])
        return consolidated_data

    async def _dispatch_scraper(self, source: DataSource, target: str, creds: Optional[Dict] = None) -> ScrapingResult:
        creds = creds or {}
        try:
            if source == DataSource.INSTAGRAM:
                return await self._run_instagram(target, creds.get("instagram", {}))
            elif source in [DataSource.PJE, DataSource.TJMG, DataSource.TRT3]:
                return await self._run_pje_mock(target, source)
            elif source == DataSource.ESPAIDER:
                return await self._run_espaider_mock(target)
            else:
                return ScrapingResult(source=source, success=False, error="Scraper não implementado")
        except Exception as e:
            logger.error(f"Erro fatal no scraper {source}: {e}")
            return ScrapingResult(source=source, success=False, error=str(e))

    # --- Mocks e Wrappers ---
    async def _run_instagram(self, username: str, creds: Dict[str, str]) -> ScrapingResult:
        return ScrapingResult(source=DataSource.INSTAGRAM, success=True, data={"status": "extracted"})

    async def _run_pje_mock(self, cnj: str, source: DataSource) -> ScrapingResult:
        await asyncio.sleep(1)
        related = ["5000123-45.2024.8.13.0000"] if cnj.endswith("0000") else []
        return ScrapingResult(
            source=source,
            success=True,
            data={"processo": cnj, "status": "ATIVO", "valor": 50000.00},
            related_processes=related
        )

    async def _run_espaider_mock(self, cnj: str) -> ScrapingResult:
        await asyncio.sleep(0.5)
        return ScrapingResult(source=DataSource.ESPAIDER, success=True, data={"cliente": "Borrachas Vipal S.A."})

    # --- Regras de Negócio e Persistência ---

    def _generate_next_pasta(self, cliente_cod: str, modulo_cod: str) -> str:
        """
        Gera pasta no formato: {AAAA}.{B}.{CCCCC}
        Ex: 0001.3.00001
        """
        pattern = f"{cliente_cod}.{modulo_cod}.%"
        last_processo = self.db.query(Processo)\
            .filter(Processo.pasta.like(pattern))\
            .order_by(Processo.pasta.desc())\
            .first()
        
        if last_processo:
            try:
                # Pega o último segmento e incrementa
                last_seq = int(last_processo.pasta.split('.')[-1])
                next_seq = last_seq + 1
            except ValueError:
                next_seq = 1
        else:
            next_seq = 1
            
        return f"{cliente_cod}.{modulo_cod}.{next_seq:05d}"

    def _save_to_db(self, request: ScrapingRequest, results: List[ScrapingResult]):
        try:
            cnj = request.target_id
            processo = self.db.query(Processo).filter(Processo.numero_principal == cnj).first()
            
            if not processo:
                # Aplica regra de geração de pasta com Código Módulo
                nova_pasta = self._generate_next_pasta(request.cliente_cod, request.modulo_cod)
                logger.info(f"🆕 Gerando nova pasta: {nova_pasta} (Cliente: {request.cliente_cod})")
                
                processo = Processo(
                    numero_principal=cnj, 
                    pasta=nova_pasta
                )
                self.db.add(processo)
            
            # Atualiza valor e metadados
            for res in results:
                if res.success and res.data and "valor" in res.data:
                    processo.valor_causa = res.data["valor"]
            
            extras = {}
            if isinstance(processo.numeros_extra, dict):
                 extras = processo.numeros_extra

            for res in results:
                if res.success:
                    extras[res.source] = res.data
            
            processo.numeros_extra = extras
            
            self.db.commit()
            logger.info(f"💾 Processo {cnj} salvo/atualizado na pasta {processo.pasta}")
            
        except Exception as e:
            logger.error(f"Erro ao salvar no banco: {e}")
            self.db.rollback()
        finally:
            self.db.close()
