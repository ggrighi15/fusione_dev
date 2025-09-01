# Script PowerShell para criar banco de dados SQLite de contingências
# Este script cria um banco com dados de exemplo para teste no Power BI

Write-Host "Criando banco de dados SQLite de contingências..." -ForegroundColor Green

# Verificar se o sqlite3 está disponível
$sqliteAvailable = $false
try {
    $null = sqlite3 -version
    $sqliteAvailable = $true
    Write-Host "SQLite3 encontrado no sistema." -ForegroundColor Green
} catch {
    Write-Host "SQLite3 não encontrado. Tentando baixar..." -ForegroundColor Yellow
}

# Se SQLite não estiver disponível, tentar baixar
if (-not $sqliteAvailable) {
    try {
        # Criar diretório temporário
        $tempDir = "$env:TEMP\sqlite_temp"
        if (Test-Path $tempDir) {
            Remove-Item $tempDir -Recurse -Force
        }
        New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
        
        # URL do SQLite para Windows
        $sqliteUrl = "https://www.sqlite.org/2024/sqlite-tools-win-x64-3450100.zip"
        $zipPath = "$tempDir\sqlite-tools.zip"
        
        Write-Host "Baixando SQLite..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri $sqliteUrl -OutFile $zipPath
        
        # Extrair o arquivo
        Expand-Archive -Path $zipPath -DestinationPath $tempDir -Force
        
        # Encontrar o executável sqlite3.exe
        $sqliteExe = Get-ChildItem -Path $tempDir -Name "sqlite3.exe" -Recurse | Select-Object -First 1
        if ($sqliteExe) {
            $sqlitePath = Join-Path $tempDir $sqliteExe.DirectoryName "sqlite3.exe"
            Copy-Item $sqlitePath -Destination "./sqlite3.exe"
            $sqliteCommand = "./sqlite3.exe"
            Write-Host "SQLite baixado com sucesso." -ForegroundColor Green
        } else {
            throw "Não foi possível encontrar sqlite3.exe no arquivo baixado."
        }
        
        # Limpar arquivos temporários
        Remove-Item $tempDir -Recurse -Force
    } catch {
        Write-Host "Erro ao baixar SQLite: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Por favor, instale o SQLite manualmente ou use o DB Browser for SQLite." -ForegroundColor Yellow
        exit 1
    }
} else {
    $sqliteCommand = "sqlite3"
}

# Criar o banco de dados
$dbPath = "./historico_contencioso.db"
$sqlPath = "./create_sample_db.sql"

try {
    Write-Host "Executando script SQL..." -ForegroundColor Yellow
    
    # Executar o script SQL
    & $sqliteCommand $dbPath ".read $sqlPath"
    
    if (Test-Path $dbPath) {
        Write-Host "Banco de dados criado com sucesso: $dbPath" -ForegroundColor Green
        
        # Verificar se os dados foram inseridos
        $result = & $sqliteCommand $dbPath "SELECT COUNT(*) FROM fato_contingencias;"
        Write-Host "Total de registros inseridos: $result" -ForegroundColor Green
        
        Write-Host "`nBanco de dados pronto para uso no Power BI!" -ForegroundColor Cyan
        Write-Host "Localização: $(Resolve-Path $dbPath)" -ForegroundColor Cyan
        
    } else {
        Write-Host "Erro: Banco de dados não foi criado." -ForegroundColor Red
    }
    
} catch {
    Write-Host "Erro ao criar banco de dados: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Você pode usar o DB Browser for SQLite para executar o script manualmente." -ForegroundColor Yellow
}

# Limpar arquivo sqlite3.exe se foi baixado
if (Test-Path "./sqlite3.exe") {
    Remove-Item "./sqlite3.exe" -Force
}

Write-Host "`nPressione qualquer tecla para continuar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")