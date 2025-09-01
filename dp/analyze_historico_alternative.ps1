# Script alternativo para analisar historico_contencioso.db
# Analise de dados confiaveis desde 2021 usando abordagem alternativa

$ErrorActionPreference = "Stop"

# Configuracoes
$DbPath = "G:\Meu Drive\fusione\sql\historico_contencioso.db"
$ReportPath = "./relatorio_estrutura_historico_db.md"
$TempDir = "./temp_analysis"

Write-Host "[INFO] Iniciando analise alternativa do historico_contencioso.db..." -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray

# Funcao para verificar se o arquivo existe
function Test-DatabaseFile {
    if (-not (Test-Path $DbPath)) {
        Write-Host "[ERROR] Banco nao encontrado: $DbPath" -ForegroundColor Red
        return $false
    }
    
    $fileInfo = Get-Item $DbPath
    Write-Host "[OK] Banco encontrado: $DbPath" -ForegroundColor Green
    Write-Host "[INFO] Tamanho: $($fileInfo.Length.ToString('N0')) bytes" -ForegroundColor White
    Write-Host "[INFO] Modificado em: $($fileInfo.LastWriteTime)" -ForegroundColor White
    return $true
}

# Funcao para tentar usar DB Browser for SQLite via linha de comando
function Test-DBBrowserCLI {
    $possiblePaths = @(
        "C:\Program Files\DB Browser for SQLite\DB Browser for SQLite.exe",
        "C:\Program Files (x86)\DB Browser for SQLite\DB Browser for SQLite.exe",
        "sqlitebrowser.exe",
        "db4s.exe"
    )
    
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            Write-Host "[OK] DB Browser encontrado: $path" -ForegroundColor Green
            return $path
        }
    }
    
    try {
        $null = Get-Command sqlitebrowser -ErrorAction Stop
        Write-Host "[OK] sqlitebrowser disponivel no PATH" -ForegroundColor Green
        return "sqlitebrowser"
    }
    catch {
        Write-Host "[WARN] DB Browser nao encontrado" -ForegroundColor Yellow
        return $null
    }
}

# Funcao para analisar arquivo usando strings (busca por padroes)
function Get-TableNamesFromStrings {
    Write-Host "[INFO] Extraindo nomes de tabelas usando analise de strings..." -ForegroundColor Cyan
    
    try {
        # Usar Select-String para encontrar padroes de tabelas MM_AAAA
        $content = Get-Content -Path $DbPath -Raw -Encoding Byte
        $stringContent = [System.Text.Encoding]::ASCII.GetString($content)
        
        # Buscar padroes MM_AAAA
        $tablePattern = '\b\d{2}_\d{4}\b'
        $matches = [regex]::Matches($stringContent, $tablePattern)
        
        $tables = @()
        foreach ($match in $matches) {
            $tableName = $match.Value
            if ($tableName -match '^\d{2}_\d{4}$' -and $tables -notcontains $tableName) {
                $tables += $tableName
            }
        }
        
        $tables = $tables | Sort-Object -Unique
        Write-Host "[OK] Encontradas $($tables.Count) tabelas temporais potenciais" -ForegroundColor Green
        
        return $tables
    }
    catch {
        Write-Host "[ERROR] Erro na analise de strings: $($_.Exception.Message)" -ForegroundColor Red
        return @()
    }
}

# Funcao para analisar tabelas temporais
function Get-TemporalTablesAnalysis {
    param([array]$TableNames)
    
    $temporalTables = @()
    
    foreach ($tableName in $TableNames) {
        if ($tableName -match '^(\d{2})_(\d{4})$') {
            $month = [int]$matches[1]
            $year = [int]$matches[2]
            
            # Validar mes e ano
            if ($month -ge 1 -and $month -le 12 -and $year -ge 2020 -and $year -le 2030) {
                $temporalTables += [PSCustomObject]@{
                    Name = $tableName
                    Month = $month
                    Year = $year
                    DateKey = "{0:D4}-{1:D2}" -f $year, $month
                    Since2021 = $year -ge 2021
                }
            }
        }
    }
    
    # Ordenar por data
    $temporalTables = $temporalTables | Sort-Object DateKey
    
    Write-Host "[INFO] Tabelas temporais validas: $($temporalTables.Count)" -ForegroundColor Cyan
    return $temporalTables
}

# Funcao para estimar dados baseado no tamanho do arquivo
function Get-EstimatedRecords {
    param([string]$TableName, [long]$FileSize)
    
    # Estimativa baseada no tamanho do arquivo e numero de tabelas
    # Assumindo distribuicao uniforme e tamanho medio de registro
    $avgRecordSize = 200  # bytes por registro (estimativa)
    $tableCount = 50      # numero estimado de tabelas
    
    $estimatedRecords = [math]::Round(($FileSize / $tableCount) / $avgRecordSize)
    
    return [math]::Max(0, $estimatedRecords)
}

# Funcao para gerar relatorio baseado em analise alternativa
function New-AlternativeReport {
    param(
        [array]$TemporalTables,
        [long]$FileSize
    )
    
    $report = @()
    $report += "# Relatorio de Estrutura - historico_contencioso.db (Analise Alternativa)"
    $report += "## Gerado em: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    $report += "## Metodo: Analise de strings e estimativas"
    $report += ""
    
    # Filtrar dados desde 2021
    $data2021Plus = $TemporalTables | Where-Object { $_.Since2021 }
    
    # Resumo executivo
    $report += "## RESUMO EXECUTIVO"
    $report += ""
    $report += "- **Tamanho do arquivo**: $($FileSize.ToString('N0')) bytes"
    $report += "- **Tabelas temporais encontradas**: $($TemporalTables.Count)"
    $report += "- **Tabelas desde 2021**: $($data2021Plus.Count)"
    
    if ($data2021Plus.Count -gt 0) {
        $years = $data2021Plus | Select-Object -ExpandProperty Year -Unique | Sort-Object
        $minDate = ($data2021Plus | Sort-Object DateKey | Select-Object -First 1).DateKey
        $maxDate = ($data2021Plus | Sort-Object DateKey | Select-Object -Last 1).DateKey
        
        # Estimativa de registros
        $estimatedTotal = 0
        foreach ($table in $data2021Plus) {
            $estimated = Get-EstimatedRecords -TableName $table.Name -FileSize $FileSize
            $table | Add-Member -NotePropertyName "EstimatedRecords" -NotePropertyValue $estimated
            $estimatedTotal += $estimated
        }
        
        $report += "- **Registros estimados desde 2021**: $($estimatedTotal.ToString('N0'))"
        $report += "- **Periodo coberto**: $minDate a $maxDate"
        $report += "- **Anos disponiveis**: $($years -join ', ')"
    }
    
    $report += ""
    
    # Tabelas temporais detalhadas
    $report += "## TABELAS TEMPORAIS DESDE 2021"
    $report += ""
    
    if ($data2021Plus.Count -gt 0) {
        $report += "| Tabela | Data | Registros Estimados | Status |"
        $report += "|--------|------|---------------------|--------|"
        
        foreach ($table in $data2021Plus) {
            $status = "Detectada"
            $records = if ($table.EstimatedRecords) { $table.EstimatedRecords.ToString('N0') } else { "N/A" }
            $report += "| $($table.Name) | $($table.DateKey) | $records | $status |"
        }
    } else {
        $report += "Nenhuma tabela temporal desde 2021 foi detectada."
    }
    
    $report += ""
    
    # Analise por ano
    if ($data2021Plus.Count -gt 0) {
        $report += "## ANALISE POR ANO"
        $report += ""
        
        $yearsSummary = $data2021Plus | Group-Object Year | ForEach-Object {
            $yearRecords = ($_.Group | Measure-Object -Property EstimatedRecords -Sum).Sum
            [PSCustomObject]@{
                Year = $_.Name
                Tables = $_.Count
                EstimatedRecords = $yearRecords
            }
        } | Sort-Object Year
        
        $report += "| Ano | Tabelas | Registros Estimados |"
        $report += "|-----|---------|--------------------|"
        
        foreach ($yearData in $yearsSummary) {
            $report += "| $($yearData.Year) | $($yearData.Tables) | $($yearData.EstimatedRecords.ToString('N0')) |"
        }
    }
    
    $report += ""
    
    # Recomendacoes
    $report += "## RECOMENDACOES PARA DADOS CONFIAVEIS DESDE 2021"
    $report += ""
    
    if ($data2021Plus.Count -gt 0) {
        $minDate = ($data2021Plus | Sort-Object DateKey | Select-Object -First 1).DateKey
        $maxDate = ($data2021Plus | Sort-Object DateKey | Select-Object -Last 1).DateKey
        $totalEstimated = ($data2021Plus | Measure-Object -Property EstimatedRecords -Sum).Sum
        
        $report += "1. **Periodo Identificado**: $minDate a $maxDate"
        $report += "2. **Instalar SQLite tools** para analise detalhada"
        $report += "3. **Validar estrutura** das $($data2021Plus.Count) tabelas detectadas"
        $report += "4. **Implementar ETL** para consolidar dados historicos"
        $report += "5. **Criar backup** antes de modificacoes"
        $report += "6. **Estabelecer pipeline** para dados futuros"
        $report += "7. **Validar integridade** dos ~$($totalEstimated.ToString('N0')) registros estimados"
    } else {
        $report += "1. **Nenhuma tabela desde 2021 detectada**"
        $report += "2. **Verificar estrutura do banco** com ferramentas adequadas"
        $report += "3. **Considerar importacao** de dados historicos"
    }
    
    $report += ""
    $report += "## PROXIMOS PASSOS"
    $report += ""
    $report += "1. Instalar SQLite3 ou DB Browser for SQLite"
    $report += "2. Executar analise detalhada das tabelas"
    $report += "3. Validar estrutura e conteudo dos dados"
    $report += "4. Implementar processo de ETL"
    $report += "5. Criar tabelas consolidadas no formato mm-aaaa"
    
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
        
        $fileInfo = Get-Item $DbPath
        $fileSize = $fileInfo.Length
        
        # Tentar DB Browser
        $dbBrowser = Test-DBBrowserCLI
        
        # Analise alternativa usando strings
        Write-Host "[INFO] Executando analise alternativa..." -ForegroundColor Cyan
        $tableNames = Get-TableNamesFromStrings
        
        if ($tableNames.Count -eq 0) {
            Write-Host "[WARN] Nenhuma tabela temporal detectada" -ForegroundColor Yellow
            
            # Criar relatorio basico
            $basicReport = @(
                "# Relatorio Basico - historico_contencioso.db",
                "## Gerado em: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
                "",
                "## INFORMACOES DO ARQUIVO",
                "- **Caminho**: $DbPath",
                "- **Tamanho**: $($fileSize.ToString('N0')) bytes",
                "- **Modificado**: $($fileInfo.LastWriteTime)",
                "",
                "## STATUS",
                "- Arquivo SQLite detectado",
                "- Nenhuma tabela temporal MM_AAAA encontrada na analise de strings",
                "- Requer ferramentas SQLite para analise completa",
                "",
                "## RECOMENDACOES",
                "1. Instalar SQLite3 ou DB Browser for SQLite",
                "2. Executar analise detalhada da estrutura",
                "3. Verificar se o arquivo contem dados validos"
            )
            
            $basicReport | Out-File -FilePath $ReportPath -Encoding UTF8
            Write-Host "[OK] Relatorio basico salvo em: $ReportPath" -ForegroundColor Green
            return
        }
        
        # Analisar tabelas temporais
        $temporalTables = Get-TemporalTablesAnalysis -TableNames $tableNames
        
        # Filtrar dados desde 2021
        $data2021Plus = $temporalTables | Where-Object { $_.Since2021 }
        
        if ($data2021Plus.Count -eq 0) {
            Write-Host "[WARN] Nenhuma tabela desde 2021 encontrada" -ForegroundColor Yellow
            
            # Mostrar todas as tabelas encontradas
            if ($temporalTables.Count -gt 0) {
                Write-Host "[INFO] Tabelas temporais disponiveis:" -ForegroundColor Yellow
                foreach ($table in $temporalTables) {
                    Write-Host "   - $($table.Name) ($($table.DateKey))" -ForegroundColor White
                }
            }
        } else {
            Write-Host "[RESULT] Tabelas desde 2021 detectadas: $($data2021Plus.Count)" -ForegroundColor Green
            
            $years = $data2021Plus | Select-Object -ExpandProperty Year -Unique | Sort-Object
            Write-Host "[INFO] Anos cobertos: $($years -join ', ')" -ForegroundColor White
            
            # Mostrar tabelas encontradas
            foreach ($table in $data2021Plus) {
                Write-Host "   - $($table.Name) ($($table.DateKey))" -ForegroundColor Cyan
            }
        }
        
        # Gerar relatorio
        New-AlternativeReport -TemporalTables $temporalTables -FileSize $fileSize
        
        Write-Host "`n[OK] Analise alternativa concluida!" -ForegroundColor Green
        Write-Host "[INFO] Para analise completa, instale SQLite3 ou DB Browser" -ForegroundColor Yellow
        
    }
    catch {
        Write-Host "[ERROR] Erro durante a analise: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Stack Trace: $($_.ScriptStackTrace)" -ForegroundColor Red
    }
}

# Executar funcao principal
Main