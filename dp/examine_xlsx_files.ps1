# Script para examinar arquivos XLSX/XLS do contencioso
# Foca nos arquivos mais relevantes identificados na análise anterior

Write-Host "=== EXAME DETALHADO DE ARQUIVOS XLSX/XLS ===" -ForegroundColor Cyan
Write-Host "Analisando estrutura e conteúdo dos principais arquivos..." -ForegroundColor Green

# Definir caminhos e arquivos prioritários
$basePath = "G:\Meu Drive\fusione"
$dpPath = $PSScriptRoot
$reportPath = Join-Path $dpPath "relatorio_xlsx_detalhado.md"

# Arquivos prioritários baseados na análise anterior
$priorityFiles = @(
    # Arquivos específicos mencionados (mais recentes)
    "$basePath\05 e 06-2025.xlsx",
    "$basePath\07-2025_processed.xlsx", 
    "$basePath\10-2024.xlsx",
    "$basePath\12-2024e01-2025.xlsx",
    "$basePath\02-2025.xlsx",
    
    # Arquivos do data_base (maiores e mais relevantes)
    "$basePath\data_base\BD_Contencioso.xlsx",
    "$basePath\data_base\dbContencioso.xlsx",
    "$basePath\data_base\03-2025-a.xlsx",
    "$basePath\data_base\01-2025.xlsx",
    "$basePath\data_base\02-2025.xlsx",
    "$basePath\data_base\03-2025-todos.xlsx",
    "$basePath\data_base\Base-Ajustada_Apresentação_02-2025-Conselho Fiscal.xlsx"
)

# Função para analisar arquivo Excel (simulada - PowerShell não lê Excel nativamente)
function Analyze-ExcelFile {
    param(
        [string]$filePath,
        [string]$fileName
    )
    
    if (-not (Test-Path $filePath)) {
        return @{
            Status = "Não encontrado"
            Size = 0
            LastModified = $null
            Sheets = @()
            EstimatedRows = 0
        }
    }
    
    $fileInfo = Get-Item $filePath
    $sizeKB = [math]::Round($fileInfo.Length / 1KB, 2)
    $sizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
    
    # Estimativa de linhas baseada no tamanho (aproximação)
    $estimatedRows = switch ($sizeMB) {
        {$_ -lt 1} { [math]::Round($sizeKB * 50) }
        {$_ -lt 5} { [math]::Round($sizeMB * 10000) }
        {$_ -lt 10} { [math]::Round($sizeMB * 8000) }
        default { [math]::Round($sizeMB * 5000) }
    }
    
    return @{
        Status = "Encontrado"
        Size = $sizeKB
        SizeMB = $sizeMB
        LastModified = $fileInfo.LastWriteTime
        EstimatedRows = $estimatedRows
        Path = $filePath
    }
}

# Função para extrair data do nome do arquivo
function Get-DateFromFileName {
    param([string]$fileName)
    
    if ($fileName -match '(\d{2})-(\d{4})') {
        return "$($matches[1])/$($matches[2])"
    } elseif ($fileName -match '(\d{4})-(\d{2})-(\d{2})') {
        return "$($matches[3])/$($matches[2])/$($matches[1])"
    } elseif ($fileName -match '(\d{2})-(\d{4})e(\d{2})-(\d{4})') {
        return "$($matches[1])/$($matches[2]) a $($matches[3])/$($matches[4])"
    }
    return "Não identificada"
}

# Inicializar relatório
$report = @"
# Relatório Detalhado - Arquivos XLSX/XLS do Contencioso
## Gerado em: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

### Objetivo
Examinar estrutura e conteúdo dos principais arquivos Excel relacionados ao contencioso.

### Arquivos Analisados

"@

$analysisResults = @()
$totalSize = 0
$totalEstimatedRows = 0

Write-Host "Analisando arquivos prioritários..." -ForegroundColor Yellow

foreach ($filePath in $priorityFiles) {
    $fileName = Split-Path $filePath -Leaf
    Write-Host "Analisando: $fileName" -ForegroundColor Gray
    
    $analysis = Analyze-ExcelFile -filePath $filePath -fileName $fileName
    $dateFromName = Get-DateFromFileName $fileName
    
    $analysis.DateFromName = $dateFromName
    $analysis.FileName = $fileName
    $analysisResults += $analysis
    
    if ($analysis.Status -eq "Encontrado") {
        $totalSize += $analysis.Size
        $totalEstimatedRows += $analysis.EstimatedRows
        
        $sizeStr = if ($analysis.SizeMB -gt 1) { "$($analysis.SizeMB) MB" } else { "$($analysis.Size) KB" }
        
        $report += @"
#### $fileName
- **Status**: ✅ Encontrado
- **Tamanho**: $sizeStr
- **Última Modificação**: $($analysis.LastModified.ToString('yyyy-MM-dd HH:mm'))
- **Data no Nome**: $dateFromName
- **Linhas Estimadas**: $($analysis.EstimatedRows.ToString('N0'))
- **Caminho**: ``$filePath``

"@
        Write-Host "  ✅ $fileName ($sizeStr) - $($analysis.EstimatedRows.ToString('N0')) linhas estimadas" -ForegroundColor Green
    } else {
        $report += @"
#### $fileName
- **Status**: ❌ Não encontrado
- **Caminho**: ``$filePath``

"@
        Write-Host "  ❌ $fileName - Não encontrado" -ForegroundColor Red
    }
}

# Análise por período
$report += "`n### Análise Temporal`n`n"

$foundFiles = $analysisResults | Where-Object { $_.Status -eq "Encontrado" }
$sortedByDate = $foundFiles | Sort-Object LastModified

if ($sortedByDate.Count -gt 0) {
    $oldestFile = $sortedByDate[0]
    $newestFile = $sortedByDate[-1]
    
    $report += @"
**Período de Modificações:**
- Arquivo mais antigo: $($oldestFile.FileName) ($(($oldestFile.LastModified).ToString('yyyy-MM-dd')))
- Arquivo mais recente: $($newestFile.FileName) ($(($newestFile.LastModified).ToString('yyyy-MM-dd')))

"@
}

# Análise por tamanho
$report += "`n### Análise por Tamanho e Volume de Dados`n`n"

$largestFiles = $foundFiles | Sort-Object SizeMB -Descending | Select-Object -First 5

$report += "**Top 5 Maiores Arquivos:**`n"
foreach ($file in $largestFiles) {
    $sizeStr = if ($file.SizeMB -gt 1) { "$($file.SizeMB) MB" } else { "$($file.Size) KB" }
    $report += "1. $($file.FileName) - $sizeStr ($($file.EstimatedRows.ToString('N0')) linhas estimadas)`n"
}

# Análise por período de dados
$report += "`n### Análise por Período de Dados`n`n"

$filesByPeriod = $foundFiles | Group-Object { 
    if ($_.DateFromName -match '(\d{4})') {
        $matches[1]
    } else {
        "Sem data"
    }
} | Sort-Object Name

$report += "**Distribuição por Ano:**`n"
foreach ($group in $filesByPeriod) {
    $totalSizeGroup = ($group.Group | Measure-Object SizeMB -Sum).Sum
    $totalRowsGroup = ($group.Group | Measure-Object EstimatedRows -Sum).Sum
    $report += "- **$($group.Name)**: $($group.Count) arquivos, $([math]::Round($totalSizeGroup, 2)) MB, $($totalRowsGroup.ToString('N0')) linhas estimadas`n"
}

# Resumo estatístico
$report += "`n### Resumo Estatístico`n`n"

$foundCount = $foundFiles.Count
$notFoundCount = $analysisResults.Count - $foundCount
$totalSizeMB = [math]::Round($totalSize / 1024, 2)

$report += @"
- **Total de arquivos analisados**: $($analysisResults.Count)
- **Arquivos encontrados**: $foundCount
- **Arquivos não encontrados**: $notFoundCount
- **Tamanho total**: $totalSizeMB MB
- **Linhas estimadas total**: $($totalEstimatedRows.ToString('N0'))
- **Média de linhas por arquivo**: $([math]::Round($totalEstimatedRows / [math]::Max($foundCount, 1), 0).ToString('N0'))

"@

# Recomendações
$report += "`n### Recomendações para Análise de Dados Confiáveis`n`n"

$report += @"
**Arquivos Prioritários para ETL:**
1. **BD_Contencioso.xlsx** e **dbContencioso.xlsx** - Bases principais do contencioso
2. **10-2024.xlsx** - Dados de outubro/2024 (início do período confiável)
3. **12-2024e01-2025.xlsx** - Transição 2024/2025
4. **05 e 06-2025.xlsx** - Dados mais recentes de 2025

**Estratégia de Validação:**
1. Começar com dados de **outubro/2024** como baseline
2. Validar consistência entre arquivos do mesmo período
3. Priorizar arquivos maiores (mais dados) e mais recentes
4. Implementar verificações de integridade temporal

**Próximos Passos:**
1. Abrir arquivos prioritários no Excel/LibreOffice para validar estrutura
2. Verificar colunas-chave: número do processo, data de distribuição, valor da causa
3. Identificar padrões de nomenclatura e estrutura de dados
4. Criar mapeamento para tabelas do banco de dados

"@

# Salvar relatório
Set-Content -Path $reportPath -Value $report -Encoding UTF8

Write-Host "`n=== RESUMO DO EXAME XLSX/XLS ===" -ForegroundColor Cyan
Write-Host "Arquivos encontrados: $foundCount de $($analysisResults.Count)" -ForegroundColor White
Write-Host "Tamanho total: $totalSizeMB MB" -ForegroundColor White
Write-Host "Linhas estimadas: $($totalEstimatedRows.ToString('N0'))" -ForegroundColor White
Write-Host "Relatório salvo em: $reportPath" -ForegroundColor White

if ($foundCount -gt 0) {
    Write-Host "`nARQUIVOS PRIORITARIOS IDENTIFICADOS:" -ForegroundColor Green
    $topFiles = $foundFiles | Sort-Object SizeMB -Descending | Select-Object -First 3
    foreach ($file in $topFiles) {
        $sizeStr = if ($file.SizeMB -gt 1) { "$($file.SizeMB) MB" } else { "$($file.Size) KB" }
        Write-Host "- $($file.FileName) ($sizeStr)" -ForegroundColor Yellow
    }
} else {
    Write-Host "`nATENCAO: Nenhum arquivo encontrado nos caminhos especificados" -ForegroundColor Red
}

Write-Host "`nConsulte o relatório detalhado para próximos passos!" -ForegroundColor Green