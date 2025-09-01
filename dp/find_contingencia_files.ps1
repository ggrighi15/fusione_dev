# Script para localizar arquivos de contingências e expandir período temporal
# Busca em múltiplos locais possíveis

param(
    [string[]]$SearchPaths = @(
        "C:\Users\$env:USERNAME\OneDrive*\*Contingência*",
        "C:\Users\$env:USERNAME\OneDrive*\*Relatório*",
        "C:\Users\$env:USERNAME\Documents\*Contingência*",
        "C:\Users\$env:USERNAME\Desktop\*Contingência*",
        "C:\Users\$env:USERNAME\Downloads\*Contingência*"
    ),
    [string]$OutputPath = "C:\Users\Gustavo_ri\fusione-core-system\dp"
)

# Função para extrair período mm-aaaa de nomes de arquivos
function Extract-PeriodFromFilename {
    param([string]$filename)
    
    # Padrões comuns para mm-aaaa
    $patterns = @(
        '(\d{2})[-_\.](\d{4})',     # 01-2024, 01_2024, 01.2024
        '(\d{1,2})[-_\.](\d{4})',   # 1-2024, 1_2024, 1.2024
        '(\d{4})[-_\.](\d{2})',     # 2024-01, 2024_01, 2024.01
        '(\d{4})(\d{2})',           # 202401
        '(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[-_\.]?(\d{4})', # jan2024, jan-2024
        '(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)[-_\.]?(\d{4})', # janeiro2024
        '(\d{1,2})[-_\.]?(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[-_\.]?(\d{4})', # 15jan2024
        'contingencia[-_\.]?(\d{2})[-_\.]?(\d{4})', # contingencia_01_2024
        'relatorio[-_\.]?(\d{2})[-_\.]?(\d{4})'     # relatorio_01_2024
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
            
            # Verificar se é padrão aaaa-mm (inverter)
            if ($month.Length -eq 4 -and $year.Length -eq 2) {
                $temp = $month
                $month = $year
                $year = $temp
            }
            
            # Garantir formato mm
            if ($month.Length -eq 1) {
                $month = "0$month"
            }
            
            # Verificar se ano é válido (entre 2020 e 2030)
            if ([int]$year -ge 2020 -and [int]$year -le 2030) {
                return "$month-$year"
            }
        }
    }
    
    return $null
}

# Função para buscar arquivos de contingências
function Find-ContingenciaFiles {
    Write-Host "Buscando arquivos de contingências..." -ForegroundColor Yellow
    
    $allFiles = @()
    $foundPaths = @()
    
    foreach ($searchPath in $SearchPaths) {
        Write-Host "Buscando em: $searchPath" -ForegroundColor Cyan
        
        try {
            # Buscar diretórios que correspondem ao padrão
            $directories = Get-ChildItem -Path $searchPath -Directory -ErrorAction SilentlyContinue
            
            foreach ($dir in $directories) {
                Write-Host "  Encontrado diretório: $($dir.FullName)" -ForegroundColor Green
                $foundPaths += $dir.FullName
                
                # Buscar arquivos no diretório
                $files = Get-ChildItem -Path $dir.FullName -Recurse -File -ErrorAction SilentlyContinue |
                    Where-Object { 
                        $_.Name -match '(contingencia|relatorio|planilha|excel|csv)' -or
                        $_.Extension -match '\.(xlsx?|csv|pdf|txt)$'
                    }
                
                foreach ($file in $files) {
                    $period = Extract-PeriodFromFilename $file.Name
                    
                    $fileInfo = [PSCustomObject]@{
                        FullPath = $file.FullName
                        Name = $file.Name
                        Directory = $file.Directory.FullName
                        Extension = $file.Extension
                        Size = $file.Length
                        LastModified = $file.LastWriteTime
                        Period = $period
                        Source = $dir.FullName
                    }
                    
                    $allFiles += $fileInfo
                }
            }
        } catch {
            Write-Host "  Erro ao buscar em $searchPath : $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    # Buscar também arquivos soltos que possam ter padrão de contingência
    Write-Host "Buscando arquivos individuais..." -ForegroundColor Yellow
    
    $commonPaths = @(
        "C:\Users\$env:USERNAME\Documents",
        "C:\Users\$env:USERNAME\Desktop",
        "C:\Users\$env:USERNAME\Downloads"
    )
    
    foreach ($path in $commonPaths) {
        if (Test-Path $path) {
            try {
                $files = Get-ChildItem -Path $path -File -ErrorAction SilentlyContinue |
                    Where-Object { 
                        $_.Name -match '(contingencia|relatorio|planilha).*\d{2}.*\d{4}' -or
                        $_.Name -match '\d{2}[-_\.]\d{4}' -or
                        $_.Name -match '\d{4}[-_\.]\d{2}'
                    }
                
                foreach ($file in $files) {
                    $period = Extract-PeriodFromFilename $file.Name
                    
                    if ($period) {
                        $fileInfo = [PSCustomObject]@{
                            FullPath = $file.FullName
                            Name = $file.Name
                            Directory = $file.Directory.FullName
                            Extension = $file.Extension
                            Size = $file.Length
                            LastModified = $file.LastWriteTime
                            Period = $period
                            Source = "Individual"
                        }
                        
                        $allFiles += $fileInfo
                    }
                }
            } catch {
                Write-Host "  Erro ao buscar em $path : $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    }
    
    return @{
        Files = $allFiles
        FoundPaths = $foundPaths
        TotalFiles = $allFiles.Count
    }
}

# Função para gerar relatório expandido
function Generate-ExpandedReport {
    param($searchResult)
    
    Write-Host "Gerando relatório expandido..." -ForegroundColor Yellow
    
    $periodsFound = $searchResult.Files | Where-Object { $_.Period } | Select-Object Period -Unique | Sort-Object Period
    
    $report = @"
# Relatório de Expansão Temporal - Arquivos de Contingências

## Resumo da Busca
- **Data da Análise**: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')
- **Caminhos Encontrados**: $($searchResult.FoundPaths.Count)
- **Total de Arquivos**: $($searchResult.TotalFiles)
- **Arquivos com Período Identificado**: $($periodsFound.Count)

## Caminhos Descobertos

"@
    
    foreach ($path in $searchResult.FoundPaths) {
        $filesInPath = $searchResult.Files | Where-Object { $_.Source -eq $path }
        $report += "### $path`n"
        $report += "- **Arquivos**: $($filesInPath.Count)`n"
        $report += "- **Períodos**: $(($filesInPath | Where-Object { $_.Period } | Select-Object Period -Unique).Count)`n"
        $report += "`n"
    }
    
    $report += "## Períodos Identificados`n`n"
    
    if ($periodsFound.Count -gt 0) {
        $sortedPeriods = $periodsFound.Period | Sort-Object {
            $parts = $_.Split('-')
            [datetime]"$($parts[1])-$($parts[0])-01"
        }
        
        foreach ($period in $sortedPeriods) {
            $filesInPeriod = $searchResult.Files | Where-Object { $_.Period -eq $period }
            
            $report += "### $period`n"
            $report += "- **Arquivos**: $($filesInPeriod.Count)`n"
            $report += "- **Tipos**: $(($filesInPeriod.Extension | Sort-Object -Unique) -join ', ')`n"
            $report += "- **Tamanho Total**: $(($filesInPeriod | Measure-Object Size -Sum).Sum / 1MB | ForEach-Object { '{0:N2} MB' -f $_ })`n"
            
            foreach ($file in $filesInPeriod) {
                $report += "  - $($file.Name) ($($file.Extension)) - $($file.Source)`n"
            }
            
            $report += "`n"
        }
        
        # Análise de cobertura temporal
        $report += "## Análise de Cobertura Temporal`n`n"
        
        $firstPeriod = $sortedPeriods[0]
        $lastPeriod = $sortedPeriods[-1]
        
        $firstDate = [datetime]"$($firstPeriod.Split('-')[1])-$($firstPeriod.Split('-')[0])-01"
        $lastDate = [datetime]"$($lastPeriod.Split('-')[1])-$($lastPeriod.Split('-')[0])-01"
        
        $expectedPeriods = @()
        $currentDate = $firstDate
        
        while ($currentDate -le $lastDate) {
            $expectedPeriods += $currentDate.ToString("MM-yyyy")
            $currentDate = $currentDate.AddMonths(1)
        }
        
        $missingPeriods = $expectedPeriods | Where-Object { $_ -notin $sortedPeriods }
        
        $report += "- **Primeiro Período**: $firstPeriod`n"
        $report += "- **Último Período**: $lastPeriod`n"
        $report += "- **Períodos Esperados**: $($expectedPeriods.Count)`n"
        $report += "- **Períodos Encontrados**: $($sortedPeriods.Count)`n"
        $report += "- **Cobertura**: $(($sortedPeriods.Count / $expectedPeriods.Count * 100).ToString('F1'))%`n"
        
        if ($missingPeriods.Count -gt 0) {
            $report += "`n### Períodos Faltantes:`n"
            foreach ($missing in $missingPeriods) {
                $report += "- $missing`n"
            }
        }
        
        # Recomendações para expansão
        $report += "`n## Recomendações para Expansão do Período`n`n"
        
        if ($missingPeriods.Count -gt 0) {
            $report += "### Lacunas Identificadas`n"
            $report += "Foram identificadas $($missingPeriods.Count) lacunas temporais que podem ser preenchidas:`n`n"
            
            foreach ($missing in $missingPeriods) {
                $report += "- **$missing**: Buscar arquivos de contingências para este período`n"
            }
        }
        
        $report += "`n### Extensão do Período`n"
        $report += "Para expandir o período temporal dos dados históricos:`n`n"
        $report += "1. **Período Anterior a $firstPeriod**: Buscar dados históricos mais antigos`n"
        $report += "2. **Período Posterior a $lastPeriod**: Incluir dados mais recentes`n"
        $report += "3. **Padronização**: Converter todos os arquivos para formato consistente mm-aaaa`n"
        $report += "4. **Validação**: Verificar integridade dos dados em cada período`n"
        
    } else {
        $report += "Nenhum período foi identificado nos arquivos encontrados.`n"
    }
    
    return $report
}

# Função principal
function Main {
    Write-Host "=== Busca e Análise de Arquivos de Contingências ===" -ForegroundColor Cyan
    Write-Host "Buscando em múltiplos locais..." -ForegroundColor White
    Write-Host ""
    
    # Buscar arquivos
    $searchResult = Find-ContingenciaFiles
    
    if ($searchResult.TotalFiles -eq 0) {
        Write-Host "Nenhum arquivo de contingências foi encontrado." -ForegroundColor Red
        Write-Host "Verifique se os arquivos estão nos locais esperados ou ajuste os caminhos de busca." -ForegroundColor Yellow
        return
    }
    
    # Gerar relatório
    $report = Generate-ExpandedReport $searchResult
    
    # Salvar relatório
    $reportPath = Join-Path $OutputPath "relatorio_expansao_temporal.md"
    $report | Out-File -FilePath $reportPath -Encoding UTF8
    
    Write-Host "Relatório salvo em: $reportPath" -ForegroundColor Green
    
    # Gerar dados JSON
    $jsonData = @{
        AnalysisDate = Get-Date -Format 'yyyy-MM-ddTHH:mm:ss'
        SearchPaths = $SearchPaths
        FoundPaths = $searchResult.FoundPaths
        Summary = @{
            TotalFiles = $searchResult.TotalFiles
            FilesWithPeriod = ($searchResult.Files | Where-Object { $_.Period }).Count
            PeriodsFound = ($searchResult.Files | Where-Object { $_.Period } | Select-Object Period -Unique).Count
        }
        Files = $searchResult.Files
        Periods = ($searchResult.Files | Where-Object { $_.Period } | Select-Object Period -Unique | Sort-Object Period)
    }
    
    $jsonPath = Join-Path $OutputPath "expansao_temporal_data.json"
    $jsonData | ConvertTo-Json -Depth 10 | Out-File -FilePath $jsonPath -Encoding UTF8
    
    Write-Host "Dados JSON salvos em: $jsonPath" -ForegroundColor Green
    
    # Resumo final
    Write-Host ""
    Write-Host "=== RESUMO DA BUSCA ===" -ForegroundColor Cyan
    Write-Host "Caminhos encontrados: $($searchResult.FoundPaths.Count)" -ForegroundColor White
    Write-Host "Arquivos encontrados: $($searchResult.TotalFiles)" -ForegroundColor White
    
    $periodsFound = $searchResult.Files | Where-Object { $_.Period } | Select-Object Period -Unique
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
    Write-Host "Busca concluída com sucesso!" -ForegroundColor Green
    
    # Mostrar caminhos encontrados
    if ($searchResult.FoundPaths.Count -gt 0) {
        Write-Host ""
        Write-Host "=== CAMINHOS DESCOBERTOS ===" -ForegroundColor Cyan
        foreach ($path in $searchResult.FoundPaths) {
            Write-Host "$path" -ForegroundColor Green
        }
    }
}

# Executar busca
Main