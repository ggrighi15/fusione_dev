import logging
import asyncio
from typing import List, Dict, Any, Optional, Set
from enum import Enum
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from fc_core.core.database import SessionLocal
from fc_core.core.models import Processo
from fc_core.core.filiais import FilialManager
from fc_core.automation.scrapers.scraper_factory import ScraperFactory

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
    # Adicionando suporte genérico
    GENERIC_COURT = "court" 


class ClientCode(str, Enum):
    VIPAL = "0001" # Borrachas Vipal S.A.
    INTERNO = "0000"

class ModuleCode(str, Enum):
    CONTENCIOSO = "3"
    CONSULTIVO = "2"
    SOCIETARIO = "5"
    MARCAS_PATENTES = "7"
    DIVERSOS = "9"

class ScrapingRequest(BaseModel):
    target_id: str  # CNJ Principal
    sources: List[DataSource]
    fetch_related: bool = False  # Buscar apensos/dependentes?
    credentials: Optional[Dict[str, Dict[str, str]]] = None
    # Contexto opcional para forçar um cliente/módulo
    client_code: Optional[str] = None 
    module_code: Optional[str] = None

class ScrapingResult(BaseModel):
    source: DataSource
    success: bool
    data: Optional[Dict[str, Any]] = None
    related_processes: List[str] = [] # Lista de CNJs descobertos (apensos)
    error: Optional[str] = None

class Orchestrator:
    """
    Orquestrador Inteligente: Busca, Descobre e Consolida.
    """
    
    def __init__(self, db: Session = None):
        self.db = db or SessionLocal()
        self.filial_manager = FilialManager() # Carrega dados de clientes.json

    async def run_pipeline(self, request: ScrapingRequest) -> Dict[str, Any]:
        logger.info(f"🚀 Pipeline iniciado para {request.target_id} | Fontes: {request.sources}")
        
        # 1. Executa extração paralela nas fontes solicitadas
        tasks = []
        for source in request.sources:
            tasks.append(self._dispatch_scraper(source, request.target_id, request.credentials))
        
        results = await asyncio.gather(*tasks)
        
        # 2. Consolidação e Descoberta de Novos Alvos
        consolidated_data = {
            "main_target": request.target_id,
            "sources_results": [],
            "discovered_related": set()
        }

        for res in results:
            consolidated_data["sources_results"].append(res.dict())
            if res.success and res.related_processes:
                consolidated_data["discovered_related"].update(res.related_processes)

        # 3. Persistência no Banco
        self._save_to_db(request.target_id, results, request.client_code, request.module_code)
        
        # 4. Recursividade
        if request.fetch_related and consolidated_data["discovered_related"]:
            new_targets = consolidated_data["discovered_related"] - {request.target_id}
            if new_targets:
                logger.info(f"🔍 Descobertos {len(new_targets)} processos relacionados.")
                consolidated_data["related_pipeline_triggered"] = list(new_targets)

        consolidated_data["discovered_related"] = list(consolidated_data["discovered_related"])
        return consolidated_data

    async def _dispatch_scraper(self, source: DataSource, target: str, creds: Optional[Dict] = None) -> ScrapingResult:
        """Roteia para o scraper correto"""
        creds = creds or {}
        try:
            if source == DataSource.INSTAGRAM:
                return await self._run_instagram(target, creds.get("instagram", {}))
            
            # Tenta usar a Factory para fontes jurídicas
            # Se source for um enum conhecido (PJE, TJMG), converte para string
            source_key = source.value if isinstance(source, Enum) else str(source)
            
            # Se for mock específico mantemos (opcional, pode ser removido se a factory cobrir tudo)
            if source == DataSource.ESPAIDER:
                 return await self._run_espaider_mock(target)

            # Executa Scraper Genérico via Factory
            return await self._run_legal_scraper(source_key, target, creds.get(source_key, {}))

        except Exception as e:
            logger.error(f"Erro fatal no scraper {source}: {e}")
            return ScrapingResult(source=source, success=False, error=str(e))

    async def _run_legal_scraper(self, source_key: str, cnj: str, creds: Dict[str, str]) -> ScrapingResult:
        """Executa qualquer scraper jurídico suportado pela Factory"""
        def _run():
            scraper = ScraperFactory.create(source_key, headless=True)
            if not scraper:
                return {"success": False, "error": f"Scraper não encontrado para {source_key}"}
            return scraper.executar(cnj, creds)
        
        try:
            loop = asyncio.get_event_loop()
            result_data = await loop.run_in_executor(None, _run)
            
            # Mapeia resultado genérico para ScrapingResult
            if result_data.get("success"):
                data = result_data.get("processo", {})
                if "movimentacoes" in result_data:
                    data["movimentacoes_count"] = len(result_data["movimentacoes"])
                    data["movimentacoes"] = result_data["movimentacoes"] # Opcional: Salvar movs
                
                return ScrapingResult(
                    source=source_key,
                    success=True,
                    data=data
                )
            else:
                return ScrapingResult(
                    source=source_key,
                    success=False,
                    error=result_data.get("error", "Erro desconhecido")
                )
        except Exception as e:
             return ScrapingResult(source=source_key, success=False, error=f"Exception: {str(e)}")

    async def _run_instagram(self, username: str, creds: Dict[str, str]) -> ScrapingResult:
        return ScrapingResult(source=DataSource.INSTAGRAM, success=True, data={"status": "extracted", "posts": 42})

    # Removidos métodos específicos antigos (PJe Real/Mock) em favor do _run_legal_scraper genérico
    
    async def _run_espaider_mock(self, cnj: str) -> ScrapingResult:
        await asyncio.sleep(0.5)
        return ScrapingResult(source=DataSource.ESPAIDER, success=True, data={"pasta": "9999", "cliente": "Borrachas Vipal S.A."})

    def _generate_next_pasta(self, cliente_cod: str, modulo_cod: str) -> str:
        """
        Gera a próxima pasta no formato: CLIENTE.MODULO.SEQUENCIAL (ex: 0001.3.00001)
        """
        pattern = f"{cliente_cod}.{modulo_cod}.%"
        
        # Busca a maior pasta existente com esse prefixo
        # Assumindo que o campo 'pasta' no banco segue esse padrão
        last_process = self.db.query(Processo).filter(Processo.pasta.like(pattern)).order_by(Processo.pasta.desc()).first()
        
        if last_process:
            try:
                # Extrai o sequencial (última parte)
                last_seq = int(last_process.pasta.split('.')[-1])
                next_seq = last_seq + 1
            except ValueError:
                next_seq = 1
        else:
            next_seq = 1
            
        return f"{cliente_cod}.{modulo_cod}.{next_seq:05d}"

    def _identify_client_info(self, results: List[ScrapingResult]) -> tuple[str, str]:
        """Retorna (codigo_cliente, nome_cliente)"""
        
        # 1. Procura por CNPJs ou Nomes nas partes encontradas
        for res in results:
            if res.success and res.data:
                parties = [res.data.get("parte_autora"), res.data.get("parte_reu"), res.data.get("cliente")]
                for party in parties:
                    if party:
                        filial = self.filial_manager.get_by_name(party)
                        if filial:
                            return (self.filial_manager.get_client_code(filial), filial.nome)
        
        # Default
        return (ClientCode.VIPAL.value, "Borrachas Vipal S.A.")

    def _save_to_db(self, cnj: str, results: List[ScrapingResult], force_client: str = None, force_module: str = None):
        try:
            processo = self.db.query(Processo).filter(Processo.numero_principal == cnj).first()
            
            client_code, client_name = self._identify_client_info(results)
            if force_client:
                client_code = force_client
                # Se forçou código, tenta achar nome
                filial = self.filial_manager.get_by_code(force_client)
                if filial:
                    client_name = filial.nome

            if not processo:
                module_code = force_module or ModuleCode.CONTENCIOSO.value
                new_pasta = self._generate_next_pasta(client_code, module_code)
                
                processo = Processo(
                    numero_principal=cnj, 
                    pasta=new_pasta,
                    created_at=func.now()
                )
                self.db.add(processo)
                logger.info(f"🆕 Criando novo processo {cnj} na pasta {new_pasta}")
            
            # Atualiza dados consolidados
            processo.cliente = client_name
            # Default values for now, logic to extract these specifically should be added to scrapers
            processo.categoria = "Cível" # Default placeholder
            processo.polo = "Passivo" # Default placeholder (should infer from parts)
            processo.risco_atual = "Possível" # Default placeholder
            
            for res in results:
                if res.success and res.data:
                    if "valor" in res.data:
                        processo.valor_causa = res.data["valor"]
                    # Se o scraper retornar esses campos, usa eles
                    if "categoria" in res.data:
                        processo.categoria = res.data["categoria"]
                    if "polo" in res.data:
                        processo.polo = res.data["polo"]
                    if "risco" in res.data:
                        processo.risco_atual = res.data["risco"]
            
            # Atualiza JSON de metadados
            extras = {}
            if processo.numeros_extra and isinstance(processo.numeros_extra, dict):
                extras = processo.numeros_extra

            for res in results:
                if res.success:
                    extras[res.source] = res.data
            
            processo.numeros_extra = extras
            
            self.db.commit()
            logger.info(f"💾 Dados consolidados salvos no banco para {cnj}")
        except Exception as e:
            logger.error(f"Erro ao salvar no banco: {e}")
            self.db.rollback()
        finally:
            self.db.close()
