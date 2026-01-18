import asyncio
import sys
import os
from pathlib import Path

# Configuração de ambiente
PROJECT_ROOT = Path("C:/fusionecore-suite")
sys.path.append(str(PROJECT_ROOT))
os.chdir(PROJECT_ROOT)

from fc_core.automation.orchestrator import Orchestrator, ScrapingRequest, DataSource
from fc_core.core.database import SessionLocal
from fc_core.core.models import Processo

async def main():
    print(">>> 1. Iniciando Orquestrador...")
    orch = Orchestrator()
    
    # Processo terminado em 0000 vai disparar descoberta de apenso (regra mock)
    cnj_teste = "1234567-89.2024.8.13.0000" 
    
    req = ScrapingRequest(
        target_id=cnj_teste,
        sources=[DataSource.PJE, DataSource.ESPAIDER, DataSource.TRT3],
        fetch_related=True
    )
    
    print(f">>> 2. Executando pipeline para {cnj_teste}...")
    result = await orch.run_pipeline(req)
    
    print("\n>>> 3. Resultado da Execução:")
    print(f"Alvo: {result['main_target']}")
    print(f"Apensos Descobertos: {result['discovered_related']}")
    
    print("\n>>> 4. Verificando Persistência no Banco...")
    db = SessionLocal()
    proc = db.query(Processo).filter(Processo.numero_principal == cnj_teste).first()
    
    if proc:
        print(f"✅ Processo salvo no banco!")
        print(f"   ID: {proc.id}")
        print(f"   Pasta: {proc.pasta}")
        print(f"   Valor: {proc.valor_causa}")
        print(f"   Dados Extras (JSON): {list(proc.numeros_extra.keys()) if proc.numeros_extra else 'None'}")
    else:
        print("❌ Processo NÃO encontrado no banco!")
    
    db.close()

if __name__ == "__main__":
    asyncio.run(main())
