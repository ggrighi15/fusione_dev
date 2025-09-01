# Script PowerShell para analisar estrutura do historico_contencioso.db
# Analise de dados confiaveis desde 2021

$ErrorActionPreference = "Stop"

# Configuracoes
$DbPath = "G:\Meu Drive\fusione\sql\historico_contencioso.db"
$ReportPath = "./relatorio_estrutura_historico_db.md"
$SqlitePath = "sqlite3.exe"

Write-Host "[INFO] Iniciando analise da estrutura do historico_contencioso.db..." -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray

# Funcao para verificar se o arquivo existe
function Test-DatabaseFile {
    if (-not (Test-Path $DbPath)) {
        Write-Host "[ERROR] Banco nao encontrado: $DbPath" -ForegroundColor Red
        return $false
    }
    Write-Host "[OK] Banco encontrado: $DbPath" -ForegroundColor Green
    return $true
}

# Funcao para verificar se sqlite3 esta disponivel
function Test-SqliteCommand {
    try {
        $null = Get-Command sqlite3 -ErrorAction Stop
        Write-Host "[OK] SQLite3 disponivel" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "[WARN] SQLite3 nao encontrado. Tentando usar caminho alternativo..." -ForegroundColor Yellow
        
        # Tentar caminhos comuns do SQLite
        $commonPaths = @(
            "C:\sqlite\sqlite3.exe",
            "C:\Program Files\SQLite\sqlite3.exe",
            "C:\Tools\sqlite3.exe"
        )
        
        foreach ($path in $commonPaths) {
            if (Test-Path $path) {
                $script:SqlitePath = $path
                Write-Host "[OK] SQLite3 encontrado em: $path" -ForegroundColor Green
                return $true
            }
        }
        
        Write-Host "[ERROR] SQLite3 nao encontrado. Usando analise alternativa..." -ForegroundColor Red
        return $false
    }
}

# Funcao para executar comando SQLite
function Invoke-SqliteCommand {
    param(
        [string]$Query,
        [string]$Database = $DbPath
    )
    
    try {
        $result = & $SqlitePath $Database $Query
        return $result
    }
    catch {
        Write-Host "[ERROR] Erro ao executar query: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Funcao para analisar tabelas temporais
function Get-TemporalTables {
    param([array]$AllTables)
    
    $temporalTables = @()
    
    foreach ($table in $AllTables) {
        if ($table -match '^\d{2}_\d{4}$') {
            $parts = $table.Split('_')
            $month = [int]$parts[0]
            $year = [int]$parts[1]
            
            $temporalTables += [PSCustomObject]@{
                Name = $table
                Month = $month
                Year = $year
                DateKey = "{0:D4}-{1:D2}" -f $year, $month
            }
        }
    }
    
    # Ordenar por data
    $temporalTables = $temporalTables | Sort-Object DateKey
    
    Write-Host "[INFO] Tabelas temporais encontradas: $($temporalTables.Count)" -ForegroundColor Cyan
    return $temporalTables
}

# Funcao para analisar dados desde 2021
function Get-DataSince2021 {
    param([array]$TemporalTables)
    
    $data2021Plus = $TemporalTables | Where-Object { $_.Year -ge 2021 }
    
    $coverage = @()
    
    foreach ($table in $data2021Plus) {
        Write-Host "[INFO] Analisando tabela: $($table.Name)" -ForegroundColor Yellow
        
        # Contar registros
        $countQuery = "SELECT COUNT(*) FROM [$($table.Name)];"
        $count = Invoke-SqliteCommand -Query $countQuery
        
        if ($count -ne $null) {
            $recordCount = [int]$count[0]
        } else {
            $recordCount = 0
        }
        
        $coverage += [PSCustomObject]@{
            Table = $table.Name
            Date = $table.DateKey
            Year = $table.Year
            Month = $table.Month
            Records = $recordCount
            HasData = $recordCount -gt 0
        }
    }
    
    return $coverage
}

# Funcao para gerar relatorio
function New-StructureReport {
    param(
        [array]$AllTables,
        [array]$TemporalTables,
        [array]$Coverage
    )
    
    $report = @()
    $report += "# Relatorio de Estrutura - historico_contencioso.db"
    $report += "## Gerado em: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    $report += ""
    
    # Resumo executivo
    $report += "## RESUMO EXECUTIVO"
    $report += ""
    $report += "- **Total de tabelas**: $($AllTables.Count)"
    $report += "- **Tabelas temporais (MM_AAAA)**: $($TemporalTables.Count)"
    $report += "- **Tabelas desde 2021**: $($Coverage.Count)"
    
    if ($Coverage.Count -gt 0) {
        $totalRecords = ($Coverage | Measure-Object -Property Records -Sum).Sum
        $years = $Coverage | Select-Object -ExpandProperty Year -Unique | Sort-Object
        $minDate = ($Coverage | Sort-Object Date | Select-Object -First 1).Date
        $maxDate = ($Coverage | Sort-Object Date | Select-Object -Last 1).Date
        
        $report += "- **Total de registros desde 2021**: $($totalRecords.ToString('N0'))"
        $report += "- **Período coberto**: $minDate a $maxDate"
        $report += "- **Anos disponíveis**: $($years -join ', ')"
    }
    
    $report += ""
    
    # Tabelas temporais detalhadas
    $report += "## TABELAS TEMPORAIS (MM_AAAA)"
    $report += ""
    
    if ($Coverage.Count -gt 0) {
        $report += "| Tabela | Data | Registros | Status |"
        $report += "|--------|------|-----------|--------|"
        
        foreach ($item in $Coverage) {
            $status = if ($item.HasData) { "Com dados" } else { "Vazia" }
            $report += "| $($item.Table) | $($item.Date) | $($item.Records.ToString('N0')) | $status |"
        }
    }
    
    $report += ""
    
    # Dados desde 2021
    $report += "## DADOS CONFIAVEIS DESDE 2021"
    $report += ""
    
    if ($Coverage.Count -gt 0) {
        # Por ano
        $yearsSummary = $Coverage | Group-Object Year | ForEach-Object {
            [PSCustomObject]@{
                Year = $_.Name
                Tables = $_.Count
                Records = ($_.Group | Measure-Object -Property Records -Sum).Sum
            }
        } | Sort-Object Year
        
        $report += "### Resumo por Ano:"
        $report += ""
        $report += "| Ano | Tabelas | Registros |"
        $report += "|-----|---------|-----------||"
        
        foreach ($yearData in $yearsSummary) {
            $report += "| $($yearData.Year) | $($yearData.Tables) | $($yearData.Records.ToString('N0')) |"
        }
        
        $report += ""
        
        # Top 10 tabelas
        $topTables = $Coverage | Sort-Object Records -Descending | Select-Object -First 10
        
        $report += "### Top 10 Tabelas com Mais Dados:"
        $report += ""
        $report += "| Posição | Tabela | Data | Registros |"
        $report += "|---------|--------|------|-----------||"
        
        for ($i = 0; $i -lt $topTables.Count; $i++) {
            $item = $topTables[$i]
            $position = $i + 1
            $report += "| $position | $($item.Table) | $($item.Date) | $($item.Records.ToString('N0')) |"
        }
    }
    
    $report += ""
    
    # Recomendacoes
    $report += "## RECOMENDACOES"
    $report += ""
    
    if ($Coverage.Count -gt 0) {
        $minDate = ($Coverage | Sort-Object Date | Select-Object -First 1).Date
        $maxDate = ($Coverage | Sort-Object Date | Select-Object -Last 1).Date
        $totalRecords = ($Coverage | Measure-Object -Property Records -Sum).Sum
        
        $report += "1. **Periodo Confiavel Identificado**: $minDate a $maxDate"
        $report += "2. **Implementar ETL** para consolidar $($Coverage.Count) tabelas"
        $report += "3. **Priorizar tabelas** com maior volume de dados"
        $report += "4. **Validar integridade** dos $($totalRecords.ToString('N0')) registros"
    } else {
        $report += "1. **Nenhum dado desde 2021 encontrado**"
        $report += "2. **Verificar outros bancos de dados**"
        $report += "3. **Revisar estrategia de analise temporal**"
    }
    
    # Salvar relatorio
    $report | Out-File -FilePath $ReportPath -Encoding UTF8
    
    Write-Host "[OK] Relatorio salvo em: $ReportPath" -ForegroundColor Green
    return $report
}

# Funcao principal
function Main {
    try {
        # Verificar arquivo do banco
        if (-not (Test-DatabaseFile)) {
            return
        }
        
        # Verificar SQLite
        $hasSqlite = Test-SqliteCommand
        
        if (-not $hasSqlite) {
            Write-Host "[ERROR] Nao e possivel analisar o banco sem SQLite3" -ForegroundColor Red
            Write-Host "[INFO] Instale o SQLite3 ou use uma ferramenta alternativa" -ForegroundColor Yellow
            return
        }
        
        # Obter todas as tabelas
        Write-Host "[INFO] Obtendo lista de tabelas..." -ForegroundColor Cyan
        $tablesQuery = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"
        $allTables = Invoke-SqliteCommand -Query $tablesQuery
        
        if ($allTables -eq $null -or $allTables.Count -eq 0) {
            Write-Host "[ERROR] Nenhuma tabela encontrada no banco" -ForegroundColor Red
            return
        }
        
        Write-Host "[OK] Total de tabelas encontradas: $($allTables.Count)" -ForegroundColor Green
        
        # Identificar tabelas temporais
        $temporalTables = Get-TemporalTables -AllTables $allTables
        
        # Analisar dados desde 2021
        $data2021Plus = $temporalTables | Where-Object { $_.Year -ge 2021 }
        
        if ($data2021Plus.Count -eq 0) {
            Write-Host "[WARN] Nenhuma tabela temporal desde 2021 encontrada" -ForegroundColor Red
        } else {
            Write-Host "[INFO] Analisando $($data2021Plus.Count) tabelas desde 2021..." -ForegroundColor Cyan
            $coverage = Get-DataSince2021 -TemporalTables $data2021Plus
            
            # Estatisticas
            $totalRecords = ($coverage | Measure-Object -Property Records -Sum).Sum
            $years = $coverage | Select-Object -ExpandProperty Year -Unique | Sort-Object
            
            Write-Host "[RESULT] Dados desde 2021:" -ForegroundColor Green
            Write-Host "   - Tabelas: $($coverage.Count)" -ForegroundColor White
            Write-Host "   - Registros: $($totalRecords.ToString('N0'))" -ForegroundColor White
            Write-Host "   - Anos cobertos: $($years -join ', ')" -ForegroundColor White
            
            # Gerar relatorio
            New-StructureReport -AllTables $allTables -TemporalTables $temporalTables -Coverage $coverage
        }
        
        Write-Host "`n[OK] Analise concluida com sucesso!" -ForegroundColor Green
        
    }
    catch {
        Write-Host "[ERROR] Erro durante a analise: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Stack Trace: $($_.ScriptStackTrace)" -ForegroundColor Red
    }
}

# Executar funcao principal
Main