# Script de Migração e Limpeza FusionCore
# Execute este script para aplicar as correções na raiz do repositório

$ErrorActionPreference = "Stop"
$RootPath = "C:\fusionecore-suite"

Write-Host "Iniciando Migração do FusionCore..." -ForegroundColor Cyan

# 1. Criar diretórios de destino se não existirem
$ScraperDir = Join-Path $RootPath "fc_core\automation\scrapers"
$DocsDir = Join-Path $RootPath "docs"

if (-not (Test-Path $ScraperDir)) {
    New-Item -ItemType Directory -Path $ScraperDir -Force | Out-Null
    Write-Host "Criado diretório: $ScraperDir" -ForegroundColor Green
}

if (-not (Test-Path $DocsDir)) {
    New-Item -ItemType Directory -Path $DocsDir -Force | Out-Null
    Write-Host "Criado diretório: $DocsDir" -ForegroundColor Green
}

# 2. Mover arquivos consolidados
Copy-Item -Path "instagram_scraper.py" -Destination (Join-Path $ScraperDir "instagram_scraper.py") -Force
Write-Host "Migrado: instagram_scraper.py" -ForegroundColor Green

Copy-Item -Path "MIGRATION_LOG.md" -Destination (Join-Path $DocsDir "MIGRATION_LOG.md") -Force
Write-Host "Criado log: MIGRATION_LOG.md" -ForegroundColor Green

# 3. Atualizar .gitignore na raiz
$GitIgnorePath = Join-Path $RootPath ".gitignore"
$IgnoreContent = @"
__pycache__/
*.py[cod]
.Python
*.so
build/
dist/
*.egg-info/
.venv/
venv/
ENV/
node_modules/
.pnpm-debug.log*
.vscode/
.idea/
.DS_Store
Thumbs.db
outputs/
logs/
temp/
_archive/
*.sqlite
*.db
.env
.env.local
docker/*/data/
*.bak
*.backup

# Lixo e Backups antigos
backups/
apps/dev/extracted_*
projeto_instagram_congelado/
_outros_scripts/
.cursor/
"@

Set-Content -Path $GitIgnorePath -Value $IgnoreContent
Write-Host "Atualizado: .gitignore (adicionadas pastas de lixo)" -ForegroundColor Green

# 4. Limpeza de Pastas de Lixo
Write-Host "`nDeseja remover as pastas de lixo identificadas na auditoria? (backups, extracted, etc)" -ForegroundColor Yellow
$response = Read-Host "Digite 'S' para sim ou qualquer tecla para pular"

if ($response -eq 'S') {
    $TrashPaths = @(
        "backups\modules-20251227-124605",
        "apps\dev\extracted_20250928_161022",
        "projeto_instagram_congelado",
        "_outros_scripts"
    )

    foreach ($path in $TrashPaths) {
        $fullPath = Join-Path $RootPath $path
        if (Test-Path $fullPath) {
            Remove-Item -Path $fullPath -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "Removido: $path" -ForegroundColor Red
        } else {
            Write-Host "Nao encontrado (ja limpo): $path" -ForegroundColor Gray
        }
    }
}

Write-Host "`nMigração concluída com sucesso!" -ForegroundColor Green
