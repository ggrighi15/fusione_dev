# Script para atualizar .gitignore reforçado
$ErrorActionPreference = "Stop"
$GitIgnorePath = "C:\fusionecore-suite\.gitignore"

$IgnoreContent = @"
# Python
__pycache__/
*.py[cod]
.Python
*.so
.venv/
venv/
ENV/
.env
.env.local
.env.*

# Node
node_modules/
.pnpm-debug.log*
npm-debug.log*

# IDE
.vscode/
.idea/
*.swp
*.swo
.cursorignore
.cursorindexingignore
*.code-workspace

# Build / Dist
build/
dist/
*.egg-info/

# Logs e Temporários
logs/
outputs/
temp/
*.log
*.tmp
*.bak
*.backup
_archive/
_archives/

# Dados e Arquivos Grandes
*.zip
*.rar
*.7z
*.tar.gz
*.sqlite
*.db
*.csv
*.xlsx
*.xls
*.json
*.txt
*.md
!README.md
!docs/**/*.md

# Pastas de Lixo Específicas Detectadas
backups/
apps/dev/extracted_*
projeto_instagram_congelado/
_outros_scripts/
extracted_data/
pastes/
temp_*/
sigejup-extracted/
legacy_workspaces/

# Docker
docker/*/data/
"@

Set-Content -Path $GitIgnorePath -Value $IgnoreContent
Write-Host ".gitignore reforçado com sucesso!" -ForegroundColor Green
