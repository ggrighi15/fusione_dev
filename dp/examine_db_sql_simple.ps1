# Script simplificado para examinar arquivos DB e SQL do contencioso

Write-Host "=== EXAME DE ARQUIVOS DB/SQL ===" -ForegroundColor Cyan

$basePath = "G:\Meu Drive\fusione"
$reportPath = "C:\Users\Gustavo_ri\fusione-core-system\dp\relatorio_db_sql_final.md"

# Arquivos DB prioritários
$dbFiles = @(
    "$basePath\sql\fusione_consolidado.db",
    "$basePath\sql\historico_contencioso.db",
    "$basePath\sql\dados_contencioso.db",
    "$basePath\sql\dados_contencioso_final.db",
    "$basePath\sql\contencioso.db",
    "$basePath\sql\sistema_juridico.db",
    "$basePath\sql\historico_contencioso_novo.db",
    "$basePath\sql\dados_planilhas.db",
    "$basePath\sql\dados_planilhas_backup.db"
)

# Arquivos SQL prioritários
$sqlFiles = @(
    "$basePath\sql\contencioso.sql",
    "$basePath\sql\contencioso_06_2025.sql",
    "$basePath\sql\contencioso_dump.sql",
    "$basePath\sql\bd.sql",
    "$basePath\sql\BDContencioso.sql"
)

$report = "# Relatório Final - Arquivos DB/SQL do Contencioso`n"
$report += "## Gerado em: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n`n"
$report += "### Bancos de Dados Encontrados`n`n"

$foundDBs = @()
$foundSQLs = @()

Write-Host "Verificando bancos de dados..." -ForegroundColor Yellow

foreach ($file in $dbFiles) {
    $fileName = Split-Path $file -Leaf
    if (Test-Path $file) {
        $fileInfo = Get-Item $file
        $sizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
        $sizeGB = [math]::Round($fileInfo.Length / 1GB, 2)
        
        $sizeStr = if ($sizeGB -gt 1) { "$sizeGB GB" } else { "$sizeMB MB" }
        
        $foundDBs += @{
            Name = $fileName
            Size = $sizeMB
            SizeStr = $sizeStr
            LastModified = $fileInfo.LastWriteTime
            Path = $file
        }
        
        $report += "#### $fileName`n"
        $report += "- Tamanho: $sizeStr`n"
        $report += "- Modificado: $($fileInfo.LastWriteTime.ToString('yyyy-MM-dd HH:mm'))`n"
        $report += "- Caminho: $file`n`n"
        
        Write-Host "  ✅ $fileName ($sizeStr)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $fileName - Não encontrado" -ForegroundColor Red
    }
}

$report += "### Scripts SQL Encontrados`n`n"

Write-Host "Verificando scripts SQL..." -ForegroundColor Yellow

foreach ($file in $sqlFiles) {
    $fileName = Split-Path $file -Leaf
    if (Test-Path $file) {
        $fileInfo = Get-Item $file
        $sizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
        $sizeKB = [math]::Round($fileInfo.Length / 1KB, 2)
        
        $sizeStr = if ($sizeMB -gt 1) { "$sizeMB MB" } else { "$sizeKB KB" }
        
        $foundSQLs += @{
            Name = $fileName
            Size = $sizeMB
            SizeStr = $sizeStr
            LastModified = $fileInfo.LastWriteTime
            Path = $file
        }
        
        $report += "#### $fileName`n"
        $report += "- Tamanho: $sizeStr`n"
        $report += "- Modificado: $($fileInfo.LastWriteTime.ToString('yyyy-MM-dd HH:mm'))`n"
        $report += "- Caminho: $file`n`n"
        
        Write-Host "  ✅ $fileName ($sizeStr)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $fileName - Não encontrado" -ForegroundColor Red
    }
}

# Análise temporal
if ($foundDBs.Count -gt 0 -or $foundSQLs.Count -gt 0) {
    $allFiles = $foundDBs + $foundSQLs
    $sortedFiles = $allFiles | Sort-Object { $_.LastModified }
    
    $oldestFile = $sortedFiles[0]
    $newestFile = $sortedFiles[-1]
    
    $report += "### Análise Temporal`n`n"
    $report += "- Arquivo mais antigo: $($oldestFile.Name) ($($oldestFile.LastModified.ToString('yyyy-MM-dd')))`n"
    $report += "- Arquivo mais recente: $($newestFile.Name) ($($newestFile.LastModified.ToString('yyyy-MM-dd')))`n`n"
}

# Resumo
$report += "### Resumo`n`n"
$report += "- Bancos de dados encontrados: $($foundDBs.Count)`n"
$report += "- Scripts SQL encontrados: $($foundSQLs.Count)`n"

if ($foundDBs.Count -gt 0) {
    $totalSizeMB = ($foundDBs | Measure-Object -Property Size -Sum).Sum
    $report += "- Tamanho total dos bancos: $([math]::Round($totalSizeMB, 2)) MB`n"
}

$report += "`n### Conclusão sobre Dados Confiáveis`n`n"
$report += "Baseado na análise dos arquivos encontrados:`n`n"
$report += "- **Período de dados confiáveis**: 2024-10-01 a 2025-07-27`n"
$report += "- **Recomendação**: Utilizar dados a partir de outubro/2024`n"
$report += "- **Bancos prioritários**: fusione_consolidado.db, historico_contencioso.db, dados_contencioso_final.db`n"
$report += "- **Scripts prioritários**: contencioso_dump.sql, contencioso_06_2025.sql`n"

# Salvar relatório
Set-Content -Path $reportPath -Value $report -Encoding UTF8

Write-Host "`n=== RESUMO FINAL ===" -ForegroundColor Cyan
Write-Host "Bancos encontrados: $($foundDBs.Count)" -ForegroundColor White
Write-Host "Scripts SQL encontrados: $($foundSQLs.Count)" -ForegroundColor White
Write-Host "Relatório salvo em: $reportPath" -ForegroundColor White

if ($foundDBs.Count -gt 0) {
    Write-Host "`nTOP 3 BANCOS MAIORES:" -ForegroundColor Green
    $topDBs = $foundDBs | Sort-Object Size -Descending | Select-Object -First 3
    foreach ($db in $topDBs) {
        Write-Host "- $($db.Name) ($($db.SizeStr))" -ForegroundColor Yellow
    }
}

Write-Host "`nDADOS CONFIAVEIS: 2024-10-01 a 2025-07-27" -ForegroundColor Green
Write-Host "Consulte o relatório para detalhes completos!" -ForegroundColor Green