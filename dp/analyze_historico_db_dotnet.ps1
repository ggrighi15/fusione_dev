# Script PowerShell usando .NET para analisar historico_contencioso.db
# Analise de dados confiaveis desde 2021

$ErrorActionPreference = "Stop"

# Configuracoes
$DbPath = "G:\Meu Drive\fusione\sql\historico_contencioso.db"
$ReportPath = "./relatorio_estrutura_historico_db.md"

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

# Funcao para carregar assembly System.Data.SQLite
function Load-SQLiteAssembly {
    try {
        # Tentar carregar assembly do SQLite
        Add-Type -AssemblyName "System.Data.SQLite" -ErrorAction Stop
        Write-Host "[OK] Assembly System.Data.SQLite carregado" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "[WARN] System.Data.SQLite nao encontrado. Tentando alternativa..." -ForegroundColor Yellow
        
        try {
            # Tentar usar Microsoft.Data.Sqlite (mais moderno)
            Add-Type -AssemblyName "Microsoft.Data.Sqlite" -ErrorAction Stop
            Write-Host "[OK] Assembly Microsoft.Data.Sqlite carregado" -ForegroundColor Green
            return $true
        }
        catch {
            Write-Host "[ERROR] Nenhum driver SQLite encontrado" -ForegroundColor Red
            Write-Host "[INFO] Instale o SQLite .NET provider" -ForegroundColor Yellow
            return $false
        }
    }
}

# Funcao para executar query SQLite usando .NET
function Invoke-SQLiteQuery {
    param(
        [string]$Query,
        [string]$Database = $DbPath
    )
    
    try {
        $connectionString = "Data Source=$Database;Version=3;Read Only=True;"
        $connection = New-Object System.Data.SQLite.SQLiteConnection($connectionString)
        $connection.Open()
        
        $command = $connection.CreateCommand()
        $command.CommandText = $Query
        
        $adapter = New-Object System.Data.SQLite.SQLiteDataAdapter($command)
        $dataSet = New-Object System.Data.DataSet
        $adapter.Fill($dataSet)
        
        $connection.Close()
        
        return $dataSet.Tables[0]
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
    
    foreach ($tableName in $AllTables) {
        if ($tableName -match '^\d{2}_\d{4}$') {
            $parts = $tableName.Split('_')
            $month = [int]$parts[0]
            $year = [int]$parts[1]
            
            $temporalTables += [PSCustomObject]@{
                Name = $tableName
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
        $countQuery = "SELECT COUNT(*) as total FROM [$($table.Name)]"
        $result = Invoke-SQLiteQuery -Query $countQuery
        
        if ($result -ne $null -and $result.Rows.Count -gt 0) {
            $recordCount = [int]$result.Rows[0]["total"]
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
        $report += "- **Periodo coberto**: $minDate a $maxDate"
        $report += "- **Anos disponiveis**: $($years -join ', ')"
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
        $report += "| Posicao | Tabela | Data | Registros |"
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
        $report += "5. **Criar tabelas consolidadas** no formato mm-aaaa"
        $report += "6. **Estabelecer pipeline de dados** para atualizacoes futuras"
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
        
        # Carregar assembly SQLite
        $hasSQLite = Load-SQLiteAssembly
        
        if (-not $hasSQLite) {
            Write-Host "[ERROR] Nao e possivel analisar o banco sem driver SQLite" -ForegroundColor Red
            Write-Host "[INFO] Tentando analise basica do arquivo..." -ForegroundColor Yellow
            
            # Informacoes basicas do arquivo
            $fileInfo = Get-Item $DbPath
            Write-Host "[INFO] Tamanho do arquivo: $($fileInfo.Length.ToString('N0')) bytes" -ForegroundColor White
            Write-Host "[INFO] Data de modificacao: $($fileInfo.LastWriteTime)" -ForegroundColor White
            return
        }
        
        # Obter todas as tabelas
        Write-Host "[INFO] Obtendo lista de tabelas..." -ForegroundColor Cyan
        $tablesQuery = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        $tablesResult = Invoke-SQLiteQuery -Query $tablesQuery
        
        if ($tablesResult -eq $null -or $tablesResult.Rows.Count -eq 0) {
            Write-Host "[ERROR] Nenhuma tabela encontrada no banco" -ForegroundColor Red
            return
        }
        
        # Extrair nomes das tabelas
        $allTables = @()
        foreach ($row in $tablesResult.Rows) {
            $allTables += $row["name"]
        }
        
        Write-Host "[OK] Total de tabelas encontradas: $($allTables.Count)" -ForegroundColor Green
        
        # Identificar tabelas temporais
        $temporalTables = Get-TemporalTables -AllTables $allTables
        
        # Analisar dados desde 2021
        $data2021Plus = $temporalTables | Where-Object { $_.Year -ge 2021 }
        
        if ($data2021Plus.Count -eq 0) {
            Write-Host "[WARN] Nenhuma tabela temporal desde 2021 encontrada" -ForegroundColor Red
            
            # Mostrar todas as tabelas temporais encontradas
            if ($temporalTables.Count -gt 0) {
                Write-Host "[INFO] Tabelas temporais disponiveis:" -ForegroundColor Yellow
                foreach ($table in $temporalTables) {
                    Write-Host "   - $($table.Name) ($($table.DateKey))" -ForegroundColor White
                }
            }
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