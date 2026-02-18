import asyncio
import sys
import os
sys.path.append('C:/fusionecore-suite')

from fc_core.automation.orchestrator import Orchestrator, ScrapingRequest, DataSource

async def main():
    orch = Orchestrator()
    req = ScrapingRequest(
        target_id="1234567-89.2024.8.13.0000",
        sources=[DataSource.PJE, DataSource.ESPAIDER],
        credentials={}
    )
    
    print(">>> Iniciando Pipeline...")
    results = await orch.run_pipeline(req)
    
    print("\n>>> Resultados:")
    for res in results:
        print(f"[{res.source.upper()}] Sucesso: {res.success} | Dados: {res.data}")

if __name__ == "__main__":
    asyncio.run(main())
