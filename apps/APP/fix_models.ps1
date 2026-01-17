# Script para corrigir models.py
$ErrorActionPreference = "Stop"

Write-Host "Corrigindo fc_core/core/models.py..." -ForegroundColor Cyan
Copy-Item -Path "models.py" -Destination "C:\fusionecore-suite\fc_core\core\models.py" -Force
Write-Host "Arquivo models.py atualizado!" -ForegroundColor Green

# Remove banco antigo para recriar com schema novo
if (Test-Path "C:\fusionecore-suite\fusionecore.db") {
    Remove-Item "C:\fusionecore-suite\fusionecore.db" -Force
    Write-Host "Banco de dados SQLite antigo removido." -ForegroundColor Yellow
}

Write-Host "Correção concluída." -ForegroundColor Green
