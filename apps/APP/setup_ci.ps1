# Script para configurar CI/CD
$ErrorActionPreference = "Stop"
$RootPath = "C:\fusionecore-suite"
$WorkflowDir = Join-Path $RootPath ".github\workflows"

# 1. Criar diretório .github/workflows
if (-not (Test-Path $WorkflowDir)) {
    New-Item -ItemType Directory -Path $WorkflowDir -Force | Out-Null
    Write-Host "Criado diretório: $WorkflowDir" -ForegroundColor Green
}

# 2. Mover arquivo CI
Copy-Item -Path "ci.yml" -Destination (Join-Path $WorkflowDir "ci.yml") -Force
Write-Host "Workflow ci.yml instalado." -ForegroundColor Green

# 3. Commit e Push
Set-Location $RootPath
git add .github/workflows/ci.yml
git commit -m "feat: add github actions ci workflow"
git push origin main
Write-Host "CI/CD configurado e enviado para o GitHub!" -ForegroundColor Green
