# Script para analisar relatórios de contingências do OneDrive
# e expandir período temporal dos dados históricos

param(
    [string]$OneDrivePath = "C:\Users\Gustavo_ri\OneDrive - BORRACHAS VIPAL S A\Relatórios Contingências",
    [string]$OutputPath = "C:\Users\Gustavo_ri\fusione-core-system\dp"
)

# Função para extrair período mm-aaaa de nomes de arquivos
function Extract-PeriodFromFilename {
    param([string]$filename)
    
    # Padrões comuns para mm-aaaa ou mm/aaaa ou mm_aaaa
    $patterns = @(
        '(\d{2})[-_](\d{4})',  # 01-2024, 01_2024
        '(\d{2})\/(\d{4})',    # 01/2024
        '(\d{1,2})[-_](\d{4})', # 1-2024, 1_2024
        '(\d{1,2})\/(\d{4})',   # 1/2024
        '(\d{4})[-_](\d{2})',   # 2024-01, 2024_01
        '(\d{4})\/(\d{2})',     # 2024/01
        '(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[-_](\d{4})', # jan-2024
        '(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)[-_](\d{4})' # janeiro-2024
    )
    
    foreach ($pattern in $patterns) {
        if ($filename -match $pattern) {
            $month = $matches[1]
            $year = $matches[2]
            
            # Converter nomes de meses para números
            $monthMap = @{
                'jan' = '01'; 'janeiro' = '01'
                'fev' = '02'; 'fevereiro' = '02'
                'mar' = '03'; 'março' = '03'
                'abr' = '04'; 'abril' = '04'
                'mai' = '05'; 'maio' = '05'
                'jun' = '06'; 'junho' = '06'
                'jul' = '07'; 'julho' = '07'
                'ago' = '08'; 'agosto' = '08'
                'set' = '09'; 'setembro' = '09'
                'out' = '10'; 'outubro' = '10'
                'nov' = '11'; 'novembro' = '11'
                'dez' = '12'; 'dezembro' = '12'
            }
            
            if ($monthMap.ContainsKey($month.ToLower())) {
                $month = $monthMap[$month.ToLower()]
            }
            
            # Garantir formato mm
            if ($month.Length -eq 1) {
                $month = "0$month"
            }
            
            # Verificar se é padrão aaaa-mm (inverter)
            if ($pattern -match '\d{4}') {
                if ($matches[1].Length -eq 4) {
                    return "$($matches[2].PadLeft(2,'0'))-$($matches[1])"
                }
            }
            
            return "$month-$year"
        }
    }
    
    return $null
}

# Função para analisar estrutura de diretórios
function Analyze-DirectoryStructure {
    param([string]$path)
    
    Write-Host "Analisando estrutura do diretório: $path" -ForegroundColor Green
    
    if (-not (Test-Path $path)) {
        Write-Host "ERRO: Diretório não encontrado: $path" -ForegroundColor Red
        return @()
    }
    
    $files = @()
    $directories = @()
    
    try {
        # Buscar arquivos recursivamente
        $allFiles = Get-ChildItem -Path $path -Recurse -File -ErrorAction SilentlyContinue
        
        foreach ($file in $allFiles) {
            $period = Extract-PeriodFromFilename $file.Name
            
            $fileInfo = [PSCustomObject]@{
                FullPath = $file.FullName
                Name = $file.Name
                Directory = $file.Directory.FullName
                Extension = $file.Extension
                Size = $file.Length
                LastModified = $file.LastWriteTime
                Period = $period
                RelativePath = $file.FullName.Replace($path, "")
            }
            
            $files += $fileInfo
        }
        
        # Buscar subdiretórios
        $allDirs = Get-ChildItem -Path $path -Recurse -Directory -ErrorAction SilentlyContinue
        
        foreach ($dir in $allDirs) {
            $dirPeriod = Extract-PeriodFromFilename $dir.Name
            
            $dirInfo = [PSCustomObject]@{
                FullPath = $dir.FullName
                Name = $dir.Name
                Parent = $dir.Parent.FullName
                Period = $dirPeriod
                FileCount = (Get-ChildItem -Path $dir.FullName -File -ErrorAction SilentlyContinue).Count
                RelativePath = $dir.FullName.Replace($path, "")
            }
            
            $directories += $dirInfo
        }
        
    } catch {
        Write-Host "ERRO ao acessar diretório: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    return @{
        Files = $files
        Directories = $directories
        TotalFiles = $files.Count
        TotalDirectories = $directories.Count
    }
}

# Função para gerar relatório de períodos encontrados
function Generate-PeriodReport {
    param($analysisResult)
    
    Write-Host "Gerando relatório de períodos encontrados..." -ForegroundColor Yellow
    
    $periodsFromFiles = $analysisResult.Files | Where-Object { $_.Period } | Select-Object Period -Unique
    $periodsFromDirs = $analysisResult.Directories | Where-Object { $_.Period } | Select-Object Period -Unique
    
    $allPeriods = @()
    $allPeriods += $periodsFromFiles.Period
    $allPeriods += $periodsFromDirs.Period
    $allPeriods = $allPeriods | Sort-Object -Unique
    
    $report = @"
# Relatório de Análise - Relatórios Contingências OneDrive

## Resumo da Análise
- **Data da Análise**: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')
- **Diretório Analisado**: $OneDrivePath
- **Total de Arquivos**: $($analysisResult.TotalFiles)
- **Total de Diretórios**: $($analysisResult.TotalDirectories)
- **Períodos Identificados**: $($allPeriods.Count)

## Períodos Encontrados (mm-aaaa)

"@
    
    foreach ($period in $allPeriods) {
        $filesInPeriod = $analysisResult.Files | Where-Object { $_.Period -eq $period }
        $dirsInPeriod = $analysisResult.Directories | Where-Object { $_.Period -eq $period }
        
        $report += "### $period`n"
        $report += "- **Arquivos**: $($filesInPeriod.Count)`n"
        $report += "- **Diretórios**: $($dirsInPeriod.Count)`n"
        
        if ($filesInPeriod.Count -gt 0) {
            $report += "- **Tipos de Arquivo**: $($filesInPeriod.Extension | Sort-Object -Unique | ForEach-Object { $_.ToUpper() }) -join ', ')`n"
            $report += "- **Tamanho Total**: $(($filesInPeriod | Measure-Object Size -Sum).Sum / 1MB | ForEach-Object { '{0:N2} MB' -f $_ })`n"
        }
        
        $report += "`n"
    }
    
    # Análise de lacunas temporais
    $report += "## Análise de Lacunas Temporais`n`n"
    
    if ($allPeriods.Count -gt 0) {
        $sortedPeriods = $allPeriods | Sort-Object {
            $parts = $_.Split('-')
            [datetime]"$($parts[1])-$($parts[0])-01"
        }
        
        $firstPeriod = $sortedPeriods[0]
        $lastPeriod = $sortedPeriods[-1]
        
        $report += "- **Primeiro Período**: $firstPeriod`n"
        $report += "- **Último Período**: $lastPeriod`n"
        
        # Calcular períodos esperados
        $firstDate = [datetime]"$($firstPeriod.Split('-')[1])-$($firstPeriod.Split('-')[0])-01"
        $lastDate = [datetime]"$($lastPeriod.Split('-')[1])-$($lastPeriod.Split('-')[0])-01"
        
        $expectedPeriods = @()
        $currentDate = $firstDate
        
        while ($currentDate -le $lastDate) {
            $expectedPeriods += $currentDate.ToString("MM-yyyy")
            $currentDate = $currentDate.AddMonths(1)
        }
        
        $missingPeriods = $expectedPeriods | Where-Object { $_ -notin $allPeriods }
        
        $report += "- **Períodos Esperados**: $($expectedPeriods.Count)`n"
        $report += "- **Períodos Encontrados**: $($allPeriods.Count)`n"
        $report += "- **Períodos Faltantes**: $($missingPeriods.Count)`n"
        
        if ($missingPeriods.Count -gt 0) {
            $report += "`n### Períodos Faltantes:`n"
            foreach ($missing in $missingPeriods) {
                $report += "- $missing`n"
            }
        }
    }
    
    # Detalhes por extensão de arquivo
    $report += "`n## Análise por Tipo de Arquivo`n`n"
    
    $extensionStats = $analysisResult.Files | Group-Object Extension | Sort-Object Count -Descending
    
    foreach ($ext in $extensionStats) {
        $totalSize = ($ext.Group | Measure-Object Size -Sum).Sum
        $report += "### $($ext.Name.ToUpper())`n"
        $report += "- **Quantidade**: $($ext.Count)`n"
        $report += "- **Tamanho Total**: $($totalSize / 1MB | ForEach-Object { '{0:N2} MB' -f $_ })`n"
        $report += "- **Períodos**: $(($ext.Group | Where-Object { $_.Period } | Select-Object Period -Unique).Count)`n"
        $report += "`n"
    }
    
    return $report
}

# Função principal
function Main {
    Write-Host "=== Análise de Relatórios de Contingências OneDrive ===" -ForegroundColor Cyan
    Write-Host "Diretório: $OneDrivePath" -ForegroundColor White
    Write-Host "Output: $OutputPath" -ForegroundColor White
    Write-Host ""
    
    # Verificar se o diretório existe
    if (-not (Test-Path $OneDrivePath)) {
        Write-Host "ERRO: Diretório OneDrive não encontrado: $OneDrivePath" -ForegroundColor Red
        Write-Host "Por favor, verifique o caminho e tente novamente." -ForegroundColor Yellow
        return
    }
    
    # Analisar estrutura
    $analysisResult = Analyze-DirectoryStructure $OneDrivePath
    
    # Gerar relatório
    $report = Generate-PeriodReport $analysisResult
    
    # Salvar relatório
    $reportPath = Join-Path $OutputPath "relatorio_onedrive_contingencias.md"
    $report | Out-File -FilePath $reportPath -Encoding UTF8
    
    Write-Host "Relatório salvo em: $reportPath" -ForegroundColor Green
    
    # Gerar arquivo JSON com dados estruturados
    $jsonData = @{
        AnalysisDate = Get-Date -Format 'yyyy-MM-ddTHH:mm:ss'
        SourcePath = $OneDrivePath
        Summary = @{
            TotalFiles = $analysisResult.TotalFiles
            TotalDirectories = $analysisResult.TotalDirectories
            PeriodsFound = ($analysisResult.Files + $analysisResult.Directories | Where-Object { $_.Period } | Select-Object Period -Unique).Count
        }
        Files = $analysisResult.Files
        Directories = $analysisResult.Directories
        Periods = ($analysisResult.Files + $analysisResult.Directories | Where-Object { $_.Period } | Select-Object Period -Unique | Sort-Object Period)
    }
    
    $jsonPath = Join-Path $OutputPath "onedrive_contingencias_data.json"
    $jsonData | ConvertTo-Json -Depth 10 | Out-File -FilePath $jsonPath -Encoding UTF8
    
    Write-Host "Dados JSON salvos em: $jsonPath" -ForegroundColor Green
    
    # Resumo final
    Write-Host ""
    Write-Host "=== RESUMO DA ANÁLISE ===" -ForegroundColor Cyan
    Write-Host "Arquivos encontrados: $($analysisResult.TotalFiles)" -ForegroundColor White
    Write-Host "Diretórios encontrados: $($analysisResult.TotalDirectories)" -ForegroundColor White
    
    $periodsFound = ($analysisResult.Files + $analysisResult.Directories | Where-Object { $_.Period } | Select-Object Period -Unique)
    Write-Host "Períodos identificados: $($periodsFound.Count)" -ForegroundColor White
    
    if ($periodsFound.Count -gt 0) {
        $sortedPeriods = $periodsFound.Period | Sort-Object {
            $parts = $_.Split('-')
            [datetime]"$($parts[1])-$($parts[0])-01"
        }
        Write-Host "Período mais antigo: $($sortedPeriods[0])" -ForegroundColor Yellow
        Write-Host "Período mais recente: $($sortedPeriods[-1])" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Análise concluída com sucesso!" -ForegroundColor Green
}

# Executar análise
Main