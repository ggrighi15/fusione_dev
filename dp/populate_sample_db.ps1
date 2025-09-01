# Script para popular um banco de exemplo usando DB Browser for SQLite
# Este script demonstra como usar os bancos criados

Write-Host "=== POPULANDO BANCO DE EXEMPLO ===" -ForegroundColor Cyan

$dpPath = $PSScriptRoot
$sampleDb = Join-Path $dpPath "fusione_core.db"
$sqlScript = Join-Path $dpPath "create_fusione_databases.sql"

# Verificar se SQLite esta disponivel
try {
    $null = sqlite3 -version
    Write-Host "SQLite encontrado! Populando banco de exemplo..." -ForegroundColor Green
    
    # Popular o banco fusione_core.db como exemplo
    Write-Host "Executando script SQL em fusione_core.db..." -ForegroundColor Yellow
    & sqlite3 $sampleDb ".read $sqlScript"
    
    # Verificar se foi populado
    $tableCount = & sqlite3 $sampleDb "SELECT COUNT(*) FROM sqlite_master WHERE type='table';"
    Write-Host "Banco populado com $tableCount tabelas!" -ForegroundColor Green
    
    # Mostrar algumas tabelas criadas
    Write-Host "`nTabelas criadas:" -ForegroundColor Cyan
    & sqlite3 $sampleDb "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
    
    Write-Host "`nExemplo de dados na tabela usuarios:" -ForegroundColor Cyan
    & sqlite3 $sampleDb "SELECT id, nome, email FROM usuarios LIMIT 3;"
    
} catch {
    Write-Host "SQLite nao encontrado. Use o DB Browser for SQLite:" -ForegroundColor Yellow
    Write-Host "1. Abra o DB Browser for SQLite" -ForegroundColor White
    Write-Host "2. Arquivo > Abrir Banco de Dados > fusione_core.db" -ForegroundColor White
    Write-Host "3. Arquivo > Executar SQL" -ForegroundColor White
    Write-Host "4. Abra o arquivo create_fusione_databases.sql" -ForegroundColor White
    Write-Host "5. Execute o script" -ForegroundColor White
}

Write-Host "`nPara popular os outros bancos, repita o processo para cada arquivo .db" -ForegroundColor Yellow
Write-Host "Pronto para conectar com Power BI ou outras aplicacoes!" -ForegroundColor Green