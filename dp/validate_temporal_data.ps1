# Script para validar dados temporais do historico_contencioso.db
# Validacao de dados confiaveis desde 2021

$ErrorActionPreference = "Stop"

# Configuracoes
$DbPath = "G:\Meu Drive\fusione\sql\historico_contencioso.db"
$ValidationReportPath = "./relatorio_validacao_temporal.md"
$StartYear = 2021
$EndYear = 2024

Write-Host "[INFO] Iniciando validacao de dados temporais desde $StartYear..." -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray

# Funcao para gerar sequencia completa de meses
function Get-ExpectedMonthSequence {
    param(
        [int]$StartYear,
        [int]$EndYear
    )
    
    $expectedMonths = @()
    
    for ($year = $StartYear; $year -le $EndYear; $year++) {
        for ($month = 1; $month -le 12; $month++) {
            $expectedMonths += [PSCustomObject]@{
                Year = $year
                Month = $month
                TableName = "{0:D2}_{1}" -f $month, $year
                DateKey = "{0:D4}-{1:D2}" -f $year, $month
                MonthName = (Get-Date -Year $year -Month $month -Day 1).ToString("MMMM yyyy")
            }
        }
    }
    
    return $expectedMonths
}

# Funcao para extrair tabelas temporais do banco
function Get-DetectedTables {
    try {
        # Ler arquivo binario e buscar padroes MM_AAAA
        $content = Get-Content -Path $DbPath -Raw -Encoding Byte
        $stringContent = [System.Text.Encoding]::ASCII.GetString($content)
        
        # Buscar padroes MM_AAAA
        $tablePattern = '\b\d{2}_\d{4}\b'
        $matches = [regex]::Matches($stringContent, $tablePattern)
        
        $detectedTables = @()
        foreach ($match in $matches) {
            $tableName = $match.Value
            if ($tableName -match '^(\d{2})_(\d{4})$' -and $detectedTables.TableName -notcontains $tableName) {
                $month = [int]$matches[1]
                $year = [int]$matches[2]
                
                # Validar mes e ano
                if ($month -ge 1 -and $month -le 12 -and $year -ge 2020 -and $year -le 2030) {
                    $detectedTables += [PSCustomObject]@{
                        TableName = $tableName
                        Year = $year
                        Month = $month
                        DateKey = "{0:D4}-{1:D2}" -f $year, $month
                        MonthName = (Get-Date -Year $year -Month $month -Day 1).ToString("MMMM yyyy")
                        InTargetPeriod = ($year -ge $StartYear -and $year -le $EndYear)
                    }
                }
            }
        }
        
        # Remover duplicatas e ordenar
        $detectedTables = $detectedTables | Sort-Object -Property TableName -Unique | Sort-Object DateKey
        
        Write-Host "[OK] Detectadas $($detectedTables.Count) tabelas temporais validas" -ForegroundColor Green
        return $detectedTables
    }
    catch {
        Write-Host "[ERROR] Erro ao detectar tabelas: $($_.Exception.Message)" -ForegroundColor Red
        return @()
    }
}

# Funcao para identificar lacunas temporais
function Get-TemporalGaps {
    param(
        [array]$ExpectedMonths,
        [array]$DetectedTables
    )
    
    $gaps = @()
    $detectedDateKeys = $DetectedTables | Where-Object { $_.InTargetPeriod } | Select-Object -ExpandProperty DateKey
    
    foreach ($expected in $ExpectedMonths) {
        if ($detectedDateKeys -notcontains $expected.DateKey) {
            $gaps += $expected
        }
    }
    
    Write-Host "[INFO] Identificadas $($gaps.Count) lacunas temporais" -ForegroundColor Yellow
    return $gaps
}

# Funcao para analisar cobertura temporal
function Get-TemporalCoverage {
    param(
        [array]$ExpectedMonths,
        [array]$DetectedTables
    )
    
    $targetPeriodTables = $DetectedTables | Where-Object { $_.InTargetPeriod }
    $totalExpected = $ExpectedMonths.Count
    $totalDetected = $targetPeriodTables.Count
    $coveragePercent = if ($totalExpected -gt 0) { [math]::Round(($totalDetected / $totalExpected) * 100, 2) } else { 0 }
    
    return [PSCustomObject]@{
        TotalExpected = $totalExpected
        TotalDetected = $totalDetected
        MissingCount = $totalExpected - $totalDetected
        CoveragePercent = $coveragePercent
        IsComplete = ($totalDetected -eq $totalExpected)
    }
}

# Funcao para analisar cobertura por ano
function Get-YearlyCoverage {
    param(
        [array]$ExpectedMonths,
        [array]$DetectedTables
    )
    
    $yearlyCoverage = @()
    $targetPeriodTables = $DetectedTables | Where-Object { $_.InTargetPeriod }
    
    for ($year = $StartYear; $year -le $EndYear; $year++) {
        $expectedForYear = $ExpectedMonths | Where-Object { $_.Year -eq $year }
        $detectedForYear = $targetPeriodTables | Where-Object { $_.Year -eq $year }
        
        $yearCoverage = if ($expectedForYear.Count -gt 0) { 
            [math]::Round(($detectedForYear.Count / $expectedForYear.Count) * 100, 2) 
        } else { 0 }
        
        $yearlyCoverage += [PSCustomObject]@{
            Year = $year
            Expected = $expectedForYear.Count
            Detected = $detectedForYear.Count
            Missing = $expectedForYear.Count - $detectedForYear.Count
            CoveragePercent = $yearCoverage
            IsComplete = ($detectedForYear.Count -eq $expectedForYear.Count)
        }
    }
    
    return $yearlyCoverage
}

# Funcao para gerar relatorio de validacao
function New-ValidationReport {
    param(
        [array]$ExpectedMonths,
        [array]$DetectedTables,
        [array]$TemporalGaps,
        [object]$Coverage,
        [array]$YearlyCoverage
    )
    
    $report = @()
    $report += "# Relatorio de Validacao Temporal - historico_contencioso.db"
    $report += "## Gerado em: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    $report += "## Periodo analisado: $StartYear-$EndYear"
    $report += ""
    
    # Status geral
    $statusIcon = if ($Coverage.IsComplete) { "✅" } else { "⚠️" }
    $report += "## STATUS GERAL $statusIcon"
    $report += ""
    $report += "- **Cobertura temporal**: $($Coverage.CoveragePercent)% ($($Coverage.TotalDetected)/$($Coverage.TotalExpected) meses)"
    $report += "- **Periodo**: $(($ExpectedMonths | Select-Object -First 1).DateKey) a $(($ExpectedMonths | Select-Object -Last 1).DateKey)"
    $report += "- **Lacunas identificadas**: $($Coverage.MissingCount) meses"
    $report += "- **Status**: $(if ($Coverage.IsComplete) { 'COMPLETO' } else { 'INCOMPLETO' })"
    $report += ""
    
    # Cobertura por ano
    $report += "## COBERTURA POR ANO"
    $report += ""
    $report += "| Ano | Detectadas | Esperadas | Faltando | Cobertura | Status |"
    $report += "|-----|------------|-----------|----------|-----------|--------|"
    
    foreach ($yearData in $YearlyCoverage) {
        $yearStatus = if ($yearData.IsComplete) { "✅ Completo" } else { "⚠️ Incompleto" }
        $report += "| $($yearData.Year) | $($yearData.Detected) | $($yearData.Expected) | $($yearData.Missing) | $($yearData.CoveragePercent)% | $yearStatus |"
    }
    
    $report += ""
    
    # Tabelas detectadas no periodo alvo
    $targetTables = $DetectedTables | Where-Object { $_.InTargetPeriod } | Sort-Object DateKey
    if ($targetTables.Count -gt 0) {
        $report += "## TABELAS DETECTADAS ($($targetTables.Count))"
        $report += ""
        $report += "| Tabela | Data | Mes/Ano | Status |"
        $report += "|--------|------|---------|--------|"
        
        foreach ($table in $targetTables) {
            $report += "| $($table.TableName) | $($table.DateKey) | $($table.MonthName) | ✅ Detectada |"
        }
        $report += ""
    }
    
    # Lacunas temporais
    if ($TemporalGaps.Count -gt 0) {
        $report += "## LACUNAS TEMPORAIS ($($TemporalGaps.Count))"
        $report += ""
        $report += "| Periodo Faltante | Data | Mes/Ano | Impacto |"
        $report += "|------------------|------|---------|----------|"
        
        foreach ($gap in $TemporalGaps) {
            $impact = "Dados ausentes"
            $report += "| $($gap.TableName) | $($gap.DateKey) | $($gap.MonthName) | $impact |"
        }
        $report += ""
        
        # Agrupar lacunas por ano
        $gapsByYear = $TemporalGaps | Group-Object Year
        $report += "### Lacunas por Ano"
        $report += ""
        foreach ($yearGroup in $gapsByYear) {
            $report += "- **$($yearGroup.Name)**: $($yearGroup.Count) meses faltando"
            $missingMonths = $yearGroup.Group | ForEach-Object { $_.Month } | Sort-Object
            $report += "  - Meses: $($missingMonths -join ', ')"
        }
        $report += ""
    }
    
    # Tabelas fora do periodo alvo
    $outsideTables = $DetectedTables | Where-Object { -not $_.InTargetPeriod } | Sort-Object DateKey
    if ($outsideTables.Count -gt 0) {
        $report += "## TABELAS FORA DO PERIODO ALVO ($($outsideTables.Count))"
        $report += ""
        $report += "| Tabela | Data | Mes/Ano | Observacao |"
        $report += "|--------|------|---------|------------|"
        
        foreach ($table in $outsideTables) {
            $obs = if ($table.Year -lt $StartYear) { "Anterior ao periodo" } else { "Posterior ao periodo" }
            $report += "| $($table.TableName) | $($table.DateKey) | $($table.MonthName) | $obs |"
        }
        $report += ""
    }
    
    # Recomendacoes
    $report += "## RECOMENDACOES"
    $report += ""
    
    if ($Coverage.IsComplete) {
        $report += "### ✅ Dados Completos Detectados"
        $report += "1. **Validar conteudo** das $($targetTables.Count) tabelas"
        $report += "2. **Verificar integridade** dos dados em cada tabela"
        $report += "3. **Implementar ETL** para consolidacao"
        $report += "4. **Criar backup** antes de modificacoes"
        $report += "5. **Estabelecer monitoramento** continuo"
    } else {
        $report += "### ⚠️ Lacunas Identificadas"
        $report += "1. **Prioridade Alta**: Recuperar dados dos $($Coverage.MissingCount) meses faltantes"
        $report += "2. **Investigar fontes** alternativas para os periodos em falta"
        $report += "3. **Validar qualidade** dos dados existentes"
        $report += "4. **Documentar lacunas** conhecidas"
        $report += "5. **Implementar alertas** para prevenir futuras lacunas"
        
        if ($TemporalGaps.Count -gt 0) {
            $criticalYears = $gapsByYear | Where-Object { $_.Count -gt 6 } | Select-Object -ExpandProperty Name
            if ($criticalYears.Count -gt 0) {
                $report += "6. **Atencao especial** aos anos com muitas lacunas: $($criticalYears -join ', ')"
            }
        }
    }
    
    $report += ""
    
    # Proximos passos
    $report += "## PROXIMOS PASSOS"
    $report += ""
    $report += "1. **Instalar SQLite tools** para analise detalhada do conteudo"
    $report += "2. **Validar estrutura** das tabelas detectadas"
    $report += "3. **Verificar consistencia** dos dados entre tabelas"
    $report += "4. **Implementar processo ETL** para consolidacao"
    $report += "5. **Criar tabelas consolidadas** no formato mm-aaaa"
    $report += "6. **Estabelecer pipeline** de validacao continua"
    
    if ($Coverage.MissingCount -gt 0) {
        $report += "7. **Recuperar dados faltantes** dos $($Coverage.MissingCount) meses"
    }
    
    # Salvar relatorio
    $report | Out-File -FilePath $ValidationReportPath -Encoding UTF8
    
    Write-Host "[OK] Relatorio de validacao salvo em: $ValidationReportPath" -ForegroundColor Green
    return $report
}

# Funcao principal
function Main {
    try {
        # Verificar arquivo do banco
        if (-not (Test-Path $DbPath)) {
            Write-Host "[ERROR] Banco nao encontrado: $DbPath" -ForegroundColor Red
            return
        }
        
        $fileInfo = Get-Item $DbPath
        Write-Host "[OK] Banco encontrado: $($fileInfo.Length.ToString('N0')) bytes" -ForegroundColor Green
        
        # Gerar sequencia esperada de meses
        Write-Host "[INFO] Gerando sequencia esperada para $StartYear-$EndYear..." -ForegroundColor Cyan
        $expectedMonths = Get-ExpectedMonthSequence -StartYear $StartYear -EndYear $EndYear
        Write-Host "[INFO] Esperados $($expectedMonths.Count) meses no periodo" -ForegroundColor White
        
        # Detectar tabelas existentes
        Write-Host "[INFO] Detectando tabelas temporais..." -ForegroundColor Cyan
        $detectedTables = Get-DetectedTables
        
        if ($detectedTables.Count -eq 0) {
            Write-Host "[ERROR] Nenhuma tabela temporal detectada" -ForegroundColor Red
            return
        }
        
        # Filtrar tabelas no periodo alvo
        $targetTables = $detectedTables | Where-Object { $_.InTargetPeriod }
        Write-Host "[INFO] Tabelas no periodo ${StartYear}-${EndYear}: $($targetTables.Count)" -ForegroundColor White
        
        # Identificar lacunas
        Write-Host "[INFO] Identificando lacunas temporais..." -ForegroundColor Cyan
        $temporalGaps = Get-TemporalGaps -ExpectedMonths $expectedMonths -DetectedTables $detectedTables
        
        # Calcular cobertura
        Write-Host "[INFO] Calculando cobertura temporal..." -ForegroundColor Cyan
        $coverage = Get-TemporalCoverage -ExpectedMonths $expectedMonths -DetectedTables $detectedTables
        $yearlyCoverage = Get-YearlyCoverage -ExpectedMonths $expectedMonths -DetectedTables $detectedTables
        
        # Exibir resultados
        Write-Host "`n[RESULTADO] Cobertura temporal: $($coverage.CoveragePercent)%" -ForegroundColor $(if ($coverage.IsComplete) { 'Green' } else { 'Yellow' })
        Write-Host "[INFO] Tabelas detectadas: $($coverage.TotalDetected)/$($coverage.TotalExpected)" -ForegroundColor White
        
        if ($temporalGaps.Count -gt 0) {
            Write-Host "[WARN] Lacunas encontradas: $($temporalGaps.Count) meses" -ForegroundColor Yellow
            
            # Mostrar algumas lacunas
            $sampleGaps = $temporalGaps | Select-Object -First 5
            foreach ($gap in $sampleGaps) {
                Write-Host "   - $($gap.TableName) ($($gap.DateKey))" -ForegroundColor Red
            }
            
            if ($temporalGaps.Count -gt 5) {
                Write-Host "   ... e mais $($temporalGaps.Count - 5) lacunas" -ForegroundColor Red
            }
        } else {
            Write-Host "[OK] Nenhuma lacuna temporal detectada!" -ForegroundColor Green
        }
        
        # Gerar relatorio
        Write-Host "`n[INFO] Gerando relatorio de validacao..." -ForegroundColor Cyan
        New-ValidationReport -ExpectedMonths $expectedMonths -DetectedTables $detectedTables -TemporalGaps $temporalGaps -Coverage $coverage -YearlyCoverage $yearlyCoverage
        
        Write-Host "`n[OK] Validacao temporal concluida!" -ForegroundColor Green
        
        # Resumo final
        $status = if ($coverage.IsComplete) { "DADOS COMPLETOS" } else { "LACUNAS DETECTADAS" }
        Write-Host "[RESUMO] $status - Cobertura: $($coverage.CoveragePercent)%" -ForegroundColor $(if ($coverage.IsComplete) { 'Green' } else { 'Yellow' })
        
    }
    catch {
        Write-Host "[ERROR] Erro durante a validacao: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Stack Trace: $($_.ScriptStackTrace)" -ForegroundColor Red
    }
}

# Executar funcao principal
Main