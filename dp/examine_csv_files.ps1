# Script para examinar arquivos CSV do contencioso
# Analisa estrutura e conteúdo dos principais arquivos CSV

Write-Host "=== EXAME DETALHADO DE ARQUIVOS CSV ===" -ForegroundColor Cyan
Write-Host "Analisando estrutura e conteúdo dos arquivos CSV..." -ForegroundColor Green

# Definir caminhos e arquivos prioritários
$basePath = "G:\Meu Drive\fusione"
$dpPath = $PSScriptRoot
$reportPath = Join-Path $dpPath "relatorio_csv_detalhado.md"

# Arquivos CSV prioritários baseados na análise anterior
$priorityCSVFiles = @(
    # Arquivos específicos mencionados
    "$basePath\02-2025.csv",
    "$basePath\2025-07-12T00-19_export.csv",
    "$basePath\2025-07-12T00-19_export06.csv",
    "$basePath\2025-07-12T00-20_exportmarangoni.csv",
    
    # Arquivos do csv_exports
    "$basePath\csv_exports\Categoria.csv",
    "$basePath\csv_exports\db_clientes.csv",
    "$basePath\csv_exports\db_Consolidated_Final.csv",
    
    # Arquivos do data_base
    "$basePath\data_base\fr_FR.csv"
)

# Função para analisar arquivo CSV
function Analyze-CSVFile {
    param(
        [string]$filePath,
        [string]$fileName
    )
    
    if (-not (Test-Path $filePath)) {
        return @{
            Status = "Não encontrado"
            Size = 0
            LastModified = $null
            LineCount = 0
            ColumnCount = 0
            Headers = @()
            SampleData = @()
        }
    }
    
    try {
        $fileInfo = Get-Item $filePath
        $sizeKB = [math]::Round($fileInfo.Length / 1KB, 2)
        $sizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
        
        # Ler primeiras linhas para análise
        $firstLines = Get-Content $filePath -TotalCount 10 -ErrorAction SilentlyContinue
        
        if ($firstLines.Count -eq 0) {
            return @{
                Status = "Arquivo vazio"
                Size = $sizeKB
                LastModified = $fileInfo.LastWriteTime
                LineCount = 0
                ColumnCount = 0
                Headers = @()
                SampleData = @()
            }
        }
        
        # Detectar separador
        $separator = ','
        $firstLine = $firstLines[0]
        if ($firstLine -match ';') {
            $separatorCount = ($firstLine.ToCharArray() | Where-Object { $_ -eq ';' }).Count
            $commaCount = ($firstLine.ToCharArray() | Where-Object { $_ -eq ',' }).Count
            if ($separatorCount -gt $commaCount) {
                $separator = ';'
            }
        }
        
        # Analisar cabeçalhos
        $headers = $firstLine -split $separator | ForEach-Object { $_.Trim('"').Trim() }
        $columnCount = $headers.Count
        
        # Contar linhas (estimativa baseada no tamanho para arquivos grandes)
        if ($sizeMB -gt 10) {
            # Para arquivos grandes, estimar baseado no tamanho
            $avgLineLength = if ($firstLines.Count -gt 1) {
                ($firstLines[1..($firstLines.Count-1)] | Measure-Object -Property Length -Average).Average
            } else { 100 }
            $estimatedLines = [math]::Round($fileInfo.Length / $avgLineLength)
        } else {
            # Para arquivos menores, contar linhas reais
            $allLines = Get-Content $filePath -ErrorAction SilentlyContinue
            $estimatedLines = $allLines.Count
        }
        
        # Amostra de dados (primeiras 3 linhas após cabeçalho)
        $sampleData = @()
        if ($firstLines.Count -gt 1) {
            for ($i = 1; $i -lt [math]::Min(4, $firstLines.Count); $i++) {
                $sampleData += $firstLines[$i]
            }
        }
        
        return @{
            Status = "Encontrado"
            Size = $sizeKB
            SizeMB = $sizeMB
            LastModified = $fileInfo.LastWriteTime
            LineCount = $estimatedLines
            ColumnCount = $columnCount
            Headers = $headers
            SampleData = $sampleData
            Separator = $separator
            Path = $filePath
        }
        
    } catch {
        return @{
            Status = "Erro na leitura"
            Size = 0
            LastModified = $null
            LineCount = 0
            ColumnCount = 0
            Headers = @()
            SampleData = @()
            Error = $_.Exception.Message
        }
    }
}

# Função para extrair data do nome do arquivo
function Get-DateFromFileName {
    param([string]$fileName)
    
    if ($fileName -match '(\d{2})-(\d{4})') {
        return "$($matches[1])/$($matches[2])"
    } elseif ($fileName -match '(\d{4})-(\d{2})-(\d{2})') {
        return "$($matches[3])/$($matches[2])/$($matches[1])"
    } elseif ($fileName -match '(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})') {
        return "$($matches[3])/$($matches[2])/$($matches[1]) $($matches[4]):$($matches[5])"
    }
    return "Não identificada"
}

# Inicializar relatório
$report = @"
# Relatório Detalhado - Arquivos CSV do Contencioso
## Gerado em: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

### Objetivo
Examinar estrutura e conteúdo dos principais arquivos CSV relacionados ao contencioso.

### Arquivos Analisados

"@

$analysisResults = @()
$totalSize = 0
$totalLines = 0

Write-Host "Analisando arquivos CSV prioritários..." -ForegroundColor Yellow

foreach ($filePath in $priorityCSVFiles) {
    $fileName = Split-Path $filePath -Leaf
    Write-Host "Analisando: $fileName" -ForegroundColor Gray
    
    $analysis = Analyze-CSVFile -filePath $filePath -fileName $fileName
    $dateFromName = Get-DateFromFileName $fileName
    
    $analysis.DateFromName = $dateFromName
    $analysis.FileName = $fileName
    $analysisResults += $analysis
    
    if ($analysis.Status -eq "Encontrado") {
        $totalSize += $analysis.Size
        $totalLines += $analysis.LineCount
        
        $sizeStr = if ($analysis.SizeMB -gt 1) { "$($analysis.SizeMB) MB" } else { "$($analysis.Size) KB" }
        
        $report += @"
#### $fileName
- **Status**: ✅ Encontrado
- **Tamanho**: $sizeStr
- **Última Modificação**: $($analysis.LastModified.ToString('yyyy-MM-dd HH:mm'))
- **Data no Nome**: $dateFromName
- **Linhas**: $($analysis.LineCount.ToString('N0'))
- **Colunas**: $($analysis.ColumnCount)
- **Separador**: '$($analysis.Separator)'
- **Cabeçalhos**: $($analysis.Headers -join ', ')
- **Caminho**: ``$filePath``

**Amostra de dados:**
``````
$($analysis.SampleData -join "`n")
``````

"@
        Write-Host "  ✅ $fileName ($sizeStr) - $($analysis.LineCount.ToString('N0')) linhas, $($analysis.ColumnCount) colunas" -ForegroundColor Green
    } elseif ($analysis.Status -eq "Arquivo vazio") {
        $report += @"
#### $fileName
- **Status**: ⚠️ Arquivo vazio
- **Caminho**: ``$filePath``

"@
        Write-Host "  ⚠️ $fileName - Arquivo vazio" -ForegroundColor Yellow
    } elseif ($analysis.Status -eq "Erro na leitura") {
        $report += @"
#### $fileName
- **Status**: ❌ Erro na leitura
- **Erro**: $($analysis.Error)
- **Caminho**: ``$filePath``

"@
        Write-Host "  ❌ $fileName - Erro na leitura" -ForegroundColor Red
    } else {
        $report += @"
#### $fileName
- **Status**: ❌ Não encontrado
- **Caminho**: ``$filePath``

"@
        Write-Host "  ❌ $fileName - Não encontrado" -ForegroundColor Red
    }
}

# Análise temporal
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
$report += "`n### Análise por Volume de Dados`n`n"

$largestFiles = $foundFiles | Sort-Object SizeMB -Descending | Select-Object -First 5

$report += "**Top 5 Maiores Arquivos:**`n"
foreach ($file in $largestFiles) {
    $sizeStr = if ($file.SizeMB -gt 1) { "$($file.SizeMB) MB" } else { "$($file.Size) KB" }
    $report += "1. $($file.FileName) - $sizeStr ($($file.LineCount.ToString('N0')) linhas)`n"
}

# Análise de estrutura
$report += "`n### Análise de Estrutura de Dados`n`n"

$report += "**Padrões de Colunas Identificados:**`n"
$commonHeaders = @{}
foreach ($file in $foundFiles) {
    foreach ($header in $file.Headers) {
        if ($commonHeaders.ContainsKey($header)) {
            $commonHeaders[$header]++
        } else {
            $commonHeaders[$header] = 1
        }
    }
}

$sortedHeaders = $commonHeaders.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 10
foreach ($header in $sortedHeaders) {
    $report += "- **$($header.Key)**: presente em $($header.Value) arquivo(s)`n"
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
- **Linhas totais**: $($totalLines.ToString('N0'))
- **Média de linhas por arquivo**: $([math]::Round($totalLines / [math]::Max($foundCount, 1), 0).ToString('N0'))

"@

# Recomendações
$report += "`n### Recomendações para Análise de Dados Confiáveis`n`n"

$report += @"
**Arquivos CSV Prioritários para ETL:**
1. **db_Consolidated_Final.csv** - Base consolidada principal
2. **2025-07-12T00-19_export.csv** - Export mais recente
3. **02-2025.csv** - Dados de fevereiro/2025
4. **db_clientes.csv** - Base de clientes

**Estratégia de Processamento:**
1. Validar integridade dos separadores e encoding
2. Verificar consistência de colunas entre arquivos
3. Implementar limpeza de dados (valores nulos, duplicatas)
4. Criar mapeamento para estrutura do banco de dados

**Próximos Passos:**
1. Abrir arquivos maiores para validar estrutura completa
2. Verificar encoding (UTF-8, ANSI) para caracteres especiais
3. Identificar chaves primárias e relacionamentos
4. Criar scripts de importação para banco de dados

"@

# Salvar relatório
Set-Content -Path $reportPath -Value $report -Encoding UTF8

Write-Host "`n=== RESUMO DO EXAME CSV ===" -ForegroundColor Cyan
Write-Host "Arquivos encontrados: $foundCount de $($analysisResults.Count)" -ForegroundColor White
Write-Host "Tamanho total: $totalSizeMB MB" -ForegroundColor White
Write-Host "Linhas totais: $($totalLines.ToString('N0'))" -ForegroundColor White
Write-Host "Relatório salvo em: $reportPath" -ForegroundColor White

if ($foundCount -gt 0) {
    Write-Host "`nARQUIVOS CSV PRIORITARIOS IDENTIFICADOS:" -ForegroundColor Green
    $topFiles = $foundFiles | Sort-Object SizeMB -Descending | Select-Object -First 3
    foreach ($file in $topFiles) {
        $sizeStr = if ($file.SizeMB -gt 1) { "$($file.SizeMB) MB" } else { "$($file.Size) KB" }
        Write-Host "- $($file.FileName) ($sizeStr) - $($file.LineCount.ToString('N0')) linhas" -ForegroundColor Yellow
    }
} else {
    Write-Host "`nATENCAO: Nenhum arquivo CSV encontrado nos caminhos especificados" -ForegroundColor Red
}

Write-Host "`nConsulte o relatório detalhado para próximos passos!" -ForegroundColor Green