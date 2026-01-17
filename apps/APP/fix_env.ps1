# Script para corrigir config.py e permissões
$ErrorActionPreference = "Stop"

Write-Host "Corrigindo fc_core/core/config.py..." -ForegroundColor Cyan
Copy-Item -Path "config.py" -Destination "C:\fusionecore-suite\fc_core\core\config.py" -Force
Write-Host "Arquivo config.py atualizado!" -ForegroundColor Green

# Tentar instalar dependências do frontend manualmente para debug
Write-Host "Verificando Frontend..." -ForegroundColor Cyan
Set-Location "C:\fusionecore-suite\frontend"
if (Test-Path "package.json") {
    Write-Host "package.json encontrado. Tentando npm install..." -ForegroundColor Yellow
    try {
        npm install --no-audit --no-fund
        Write-Host "npm install concluído!" -ForegroundColor Green
    } catch {
        Write-Host "Erro no npm install: $_" -ForegroundColor Red
    }
} else {
    Write-Host "ERRO: package.json não encontrado em C:\fusionecore-suite\frontend" -ForegroundColor Red
}

Write-Host "Correção concluída." -ForegroundColor Green
