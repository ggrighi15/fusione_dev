# Script para analisar dados do Google Drive Fusione
# Identifica desde quando temos dados confiaveis para o banco de dados do contencioso

Write-Host "=== ANALISE DE DADOS FUSIONE - GOOGLE DRIVE ===" -ForegroundColor Cyan
Write-Host "Analisando arquivos para identificar dados confiaveis do contencioso..." -ForegroundColor Green

# Definir caminhos base
$basePath = "G:\Meu Drive\fusione"
$dpPath = $PSScriptRoot
$reportPath = Join-Path $dpPath "relatorio_dados_contencioso.md"

# Funcao para extrair data de nome de arquivo
function Get-DateFromFileName {
    param([string]$fileName)
    
    # Padroes de data comuns
    $patterns = @(
        '(\d{2})-(\d{4})',           # MM-YYYY
        '(\d{4})-(\d{2})-(\d{2})',   # YYYY-MM-DD
        '(\d{2})-(\d{4})e(\d{2})-(\d{4})', # MM-YYYYeMM-YYYY
        '(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})', # YYYY-MM-DDTHH-MM
        '(\d{1,2})\.(\d{4})\.(\d{1,2})', # M.YYYY.M
        '(\d{2})(\d{4})'             # MMYYYY
    )
    
    foreach ($pattern in $patterns) {
        if ($fileName -match $pattern) {
            return $matches[0]
        }
    }
    return $null
}

# Funcao para verificar se arquivo existe
function Test-PathSafe {
    param([string]$path)
    try {
        return Test-Path $path
    } catch {
        return $false
    }
}

# Lista de caminhos para analisar
$pathsToAnalyze = @(
    "$basePath\dados\Modulo Contencioso",
    "$basePath\dados\contencioso_ddl_etl_package_v2",
    "$basePath\dados\csv_exports",
    "$basePath\csv_exports",
    "$basePath\data_base",
    "$basePath\DW",
    "$basePath\painel_contencioso_propulsor",
    "$basePath\painel_juridico",
    "$basePath\sql"
)

# Extensoes de arquivo para analisar
$extensions = @('*.xlsx', '*.xls', '*.csv', '*.db', '*.sql', '*.sqlite', '*.sqlite3')

# Inicializar relatorio
$report = @"
# Relatório de Análise de Dados - Contencioso Fusione
## Gerado em: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

### Objetivo
Identificar desde quando temos dados confiáveis para o banco de dados do contencioso.

### Arquivos Analisados

"@

$filesFound = @()
$datePattern = @()

Write-Host "Analisando caminhos especificados..." -ForegroundColor Yellow

foreach ($path in $pathsToAnalyze) {
    Write-Host "Verificando: $path" -ForegroundColor Gray
    
    if (Test-PathSafe $path) {
        Write-Host "  Caminho encontrado!" -ForegroundColor Green
        $report += "`n#### $path`n`n"
        
        foreach ($ext in $extensions) {
            try {
                $files = Get-ChildItem -Path $path -Filter $ext -Recurse -ErrorAction SilentlyContinue
                
                foreach ($file in $files) {
                    $dateFromName = Get-DateFromFileName $file.Name
                    $fileInfo = @{
                        Path = $file.FullName
                        Name = $file.Name
                        Size = [math]::Round($file.Length / 1KB, 2)
                        LastWrite = $file.LastWriteTime
                        DateFromName = $dateFromName
                        Extension = $file.Extension
                    }
                    $filesFound += $fileInfo
                    
                    $sizeStr = if ($fileInfo.Size -gt 1024) { "$([math]::Round($fileInfo.Size / 1024, 2)) MB" } else { "$($fileInfo.Size) KB" }
                    $report += "- **$($file.Name)** ($sizeStr) - Modificado: $($file.LastWriteTime.ToString('yyyy-MM-dd'))"
                    if ($dateFromName) {
                        $report += " - Data no nome: $dateFromName"
                    }
                    $report += "`n"
                }
            } catch {
                Write-Host "  Erro ao acessar $ext em $path" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "  Caminho nao encontrado" -ForegroundColor Red
        $report += "`n#### $path - **NAO ENCONTRADO**`n`n"
    }
}

# Analisar arquivos especificos mencionados
Write-Host "`nAnalisando arquivos especificos mencionados..." -ForegroundColor Yellow

$specificFiles = @(
    "$basePath\02-2025.csv",
    "$basePath\02-2025.txt",
    "$basePath\02-2025.xlsx",
    "$basePath\05 e 06-2025.xlsx",
    "$basePath\07-2025_processed.xlsx",
    "$basePath\10-2024.xlsx",
    "$basePath\12-2024e01-2025.xlsx",
    "$basePath\2025-07-12T00-19_export.csv",
    "$basePath\2025-07-12T00-19_export06.csv",
    "$basePath\2025-07-12T00-20_exportmarangoni.csv"
)

$report += "`n### Arquivos Específicos Mencionados`n`n"

foreach ($file in $specificFiles) {
    if (Test-PathSafe $file) {
        $fileObj = Get-Item $file
        $dateFromName = Get-DateFromFileName $fileObj.Name
        $size = [math]::Round($fileObj.Length / 1KB, 2)
        $sizeStr = if ($size -gt 1024) { "$([math]::Round($size / 1024, 2)) MB" } else { "$size KB" }
        
        $filesFound += @{
            Path = $fileObj.FullName
            Name = $fileObj.Name
            Size = $size
            LastWrite = $fileObj.LastWriteTime
            DateFromName = $dateFromName
            Extension = $fileObj.Extension
        }
        
        $report += "- **$($fileObj.Name)** ($sizeStr) - Modificado: $($fileObj.LastWriteTime.ToString('yyyy-MM-dd'))"
        if ($dateFromName) {
            $report += " - Data no nome: $dateFromName"
        }
        $report += "`n"
        
        Write-Host "  Encontrado: $($fileObj.Name)" -ForegroundColor Green
    } else {
        $report += "- **$(Split-Path $file -Leaf)** - **NAO ENCONTRADO**`n"
        Write-Host "  Nao encontrado: $(Split-Path $file -Leaf)" -ForegroundColor Red
    }
}

# Analise temporal
$report += "`n### Análise Temporal dos Dados`n`n"

# Extrair datas dos nomes de arquivos
$datesFromNames = $filesFound | Where-Object { $_.DateFromName } | ForEach-Object {
    try {
        # Tentar converter diferentes formatos de data
        $dateStr = $_.DateFromName
        if ($dateStr -match '(\d{2})-(\d{4})') {
            # MM-YYYY
            $month = [int]$matches[1]
            $year = [int]$matches[2]
            return [DateTime]::new($year, $month, 1)
        } elseif ($dateStr -match '(\d{4})-(\d{2})-(\d{2})') {
            # YYYY-MM-DD
            return [DateTime]::ParseExact($dateStr.Substring(0,10), 'yyyy-MM-dd', $null)
        } elseif ($dateStr -match '(\d{2})-(\d{4})e(\d{2})-(\d{4})') {
            # MM-YYYYeMM-YYYY (pegar a primeira data)
            $month = [int]$matches[1]
            $year = [int]$matches[2]
            return [DateTime]::new($year, $month, 1)
        }
    } catch {
        return $null
    }
} | Where-Object { $_ -ne $null } | Sort-Object

# Datas de modificacao
$modificationDates = $filesFound | ForEach-Object { $_.LastWrite } | Sort-Object

if ($datesFromNames.Count -gt 0) {
    $earliestNameDate = $datesFromNames[0]
    $latestNameDate = $datesFromNames[-1]
    $report += "**Período baseado em nomes de arquivos:**`n"
    $report += "- Data mais antiga: $($earliestNameDate.ToString('yyyy-MM-dd'))`n"
    $report += "- Data mais recente: $($latestNameDate.ToString('yyyy-MM-dd'))`n`n"
}

if ($modificationDates.Count -gt 0) {
    $earliestModDate = $modificationDates[0]
    $latestModDate = $modificationDates[-1]
    $report += "**Período baseado em datas de modificação:**`n"
    $report += "- Modificação mais antiga: $($earliestModDate.ToString('yyyy-MM-dd'))`n"
    $report += "- Modificação mais recente: $($latestModDate.ToString('yyyy-MM-dd'))`n`n"
}

# Resumo por tipo de arquivo
$report += "`n### Resumo por Tipo de Arquivo`n`n"
$groupedByExt = $filesFound | Group-Object Extension
foreach ($group in $groupedByExt) {
    $totalSize = ($group.Group | Measure-Object Size -Sum).Sum
    $sizeStr = if ($totalSize -gt 1024) { "$([math]::Round($totalSize / 1024, 2)) MB" } else { "$totalSize KB" }
    $report += "- **$($group.Name)**: $($group.Count) arquivos ($sizeStr)`n"
}

# Conclusoes
$report += "`n### Conclusões e Recomendações`n`n"

if ($datesFromNames.Count -gt 0) {
    $report += "**Dados Confiáveis Identificados:**`n"
    $report += "- Período com dados: $($earliestNameDate.ToString('MMMM yyyy')) até $($latestNameDate.ToString('MMMM yyyy'))`n"
    $report += "- Total de arquivos com dados temporais: $($datesFromNames.Count)`n"
    $report += "- Recomendação: Usar dados a partir de $($earliestNameDate.ToString('yyyy-MM-dd')) para análises confiáveis`n`n"
} else {
    $report += "**Atenção:** Não foram encontradas datas claras nos nomes dos arquivos.`n"
    $report += "Recomenda-se análise manual dos conteúdos para determinar período de dados confiáveis.`n`n"
}

$report += "**Próximos Passos:**`n"
$report += "1. Analisar conteúdo dos arquivos maiores para validar qualidade dos dados`n"
$report += "2. Verificar consistência temporal entre diferentes fontes`n"
$report += "3. Implementar processo de ETL para consolidar dados históricos`n"
$report += "4. Criar backup dos dados identificados como confiáveis`n"

# Salvar relatorio
Set-Content -Path $reportPath -Value $report -Encoding UTF8

Write-Host "`n=== RESUMO DA ANALISE ===" -ForegroundColor Cyan
Write-Host "Arquivos encontrados: $($filesFound.Count)" -ForegroundColor White
Write-Host "Arquivos com datas: $($datesFromNames.Count)" -ForegroundColor White
Write-Host "Relatorio salvo em: $reportPath" -ForegroundColor White

if ($datesFromNames.Count -gt 0) {
    Write-Host "`nPERIODO DE DADOS CONFIAVEIS:" -ForegroundColor Green
    Write-Host "De: $($earliestNameDate.ToString('yyyy-MM-dd'))" -ForegroundColor Yellow
    Write-Host "Ate: $($latestNameDate.ToString('yyyy-MM-dd'))" -ForegroundColor Yellow
} else {
    Write-Host "`nATENCAO: Analise manual necessaria" -ForegroundColor Red
}

Write-Host "`nConsulte o relatorio completo para detalhes!" -ForegroundColor Green