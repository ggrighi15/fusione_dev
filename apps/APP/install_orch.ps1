# Script para instalar Orquestrador
$ErrorActionPreference = "Stop"

# 1. Mover Orchestrator
$DestDir = "C:\fusionecore-suite\fc_core\automation"
if (-not (Test-Path $DestDir)) {
    New-Item -ItemType Directory -Path $DestDir -Force | Out-Null
}

Copy-Item -Path "orchestrator.py" -Destination (Join-Path $DestDir "orchestrator.py") -Force
Write-Host "Orchestrator instalado em $DestDir" -ForegroundColor Green

# 2. Criar teste rápido
$TestContent = @"
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
"@

Set-Content -Path "test_orchestrator.py" -Value $TestContent
Write-Host "Teste criado: test_orchestrator.py" -ForegroundColor Green
