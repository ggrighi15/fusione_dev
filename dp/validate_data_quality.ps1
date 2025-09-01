# Script de Validacao de Qualidade dos Dados Historicos
# Validacao de integridade e confiabilidade dos dados desde 2021

$ErrorActionPreference = "Stop"

# Configuracoes
$DbPath = "G:\Meu Drive\fusione\sql\historico_contencioso.db"
$ConsolidatedDbPath = "./historico_consolidado_2021_2024.db"
$QualityReportPath = "./relatorio_qualidade_dados.md"
$ValidationLogPath = "./validacao_qualidade.log"

# Metricas de qualidade
$QualityMetrics = @{
    TotalTables = 0
    TotalRecords = 0
    ValidRecords = 0
    InvalidRecords = 0
    DuplicateRecords = 0
    MissingValues = 0
    DataInconsistencies = 0
    QualityScore = 0.0
}

# Tabelas detectadas (baseado na validacao temporal)
$DetectedTables = @(
    "01_2021", "02_2021", "03_2021", "04_2021", "05_2021", "06_2021",
    "07_2021", "08_2021", "09_2021", "10_2021", "11_2021", "12_2021",
    "01_2022", "02_2022", "03_2022", "04_2022", "05_2022", "06_2022",
    "07_2022", "08_2022", "09_2022", "10_2022", "12_2022",
    "01_2023", "03_2023", "04_2023", "05_2023", "06_2023", "07_2023",
    "08_2023", "09_2023", "10_2023", "11_2023", "12_2023",
    "01_2024", "02_2024", "05_2024", "06_2024", "07_2024", "08_2024",
    "09_2024", "10_2024", "11_2024", "12_2024"
)

Write-Host "[INFO] Iniciando validacao de qualidade dos dados historicos..." -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Gray

# Funcao para log de validacao
function Write-ValidationLog {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    
    # Escrever no console
    switch ($Level) {
        "ERROR" { Write-Host "[ERROR] $Message" -ForegroundColor Red }
        "WARN" { Write-Host "[WARN] $Message" -ForegroundColor Yellow }
        "OK" { Write-Host "[OK] $Message" -ForegroundColor Green }
        default { Write-Host "[INFO] $Message" -ForegroundColor White }
    }
    
    # Adicionar ao log
    $logEntry | Out-File -FilePath $ValidationLogPath -Append -Encoding UTF8
}

# Funcao para verificar dependencias
function Test-ValidationDependencies {
    Write-ValidationLog "Verificando dependencias para validacao..."
    
    # Verificar arquivo fonte
    if (-not (Test-Path $DbPath)) {
        Write-ValidationLog "Banco fonte nao encontrado: $DbPath" "ERROR"
        return $false
    }
    
    $fileInfo = Get-Item $DbPath
    Write-ValidationLog "Banco fonte encontrado: $($fileInfo.Length.ToString('N0')) bytes" "OK"
    
    return $true
}

# Funcao para analisar estrutura das tabelas
function Test-TableStructure {
    Write-ValidationLog "Analisando estrutura das tabelas..."
    
    $structureIssues = @()
    $expectedColumns = @("pasta", "situacao", "categoria", "polo", "risco", "valor_analisado", "valor_analisado_atualizado", "objeto")
    
    try {
        # Ler conteudo do banco para analise de estrutura
        $dbContent = Get-Content -Path $DbPath -Raw -Encoding Byte
        $contentText = [System.Text.Encoding]::UTF8.GetString($dbContent)
        
        foreach ($table in $DetectedTables) {
            $tableFound = $contentText -match $table
            
            if ($tableFound) {
                Write-ValidationLog "Tabela ${table} - estrutura detectada" "OK"
            } else {
                $structureIssues += "Tabela ${table} - estrutura nao detectada"
                Write-ValidationLog "Tabela ${table} - estrutura nao detectada" "WARN"
            }
        }
        
        # Verificar colunas esperadas
        foreach ($column in $expectedColumns) {
            $columnFound = $contentText -match $column
            if (-not $columnFound) {
                $structureIssues += "Coluna '$column' nao encontrada em algumas tabelas"
                Write-ValidationLog "Coluna '$column' nao encontrada" "WARN"
            }
        }
        
        return $structureIssues
    }
    catch {
        Write-ValidationLog "Erro ao analisar estrutura: $($_.Exception.Message)" "ERROR"
        return @("Erro na analise de estrutura")
    }
}

# Funcao para estimar qualidade dos dados
function Test-DataQuality {
    Write-ValidationLog "Estimando qualidade dos dados..."
    
    try {
        # Ler conteudo do banco
        $dbContent = Get-Content -Path $DbPath -Raw -Encoding Byte
        $contentText = [System.Text.Encoding]::UTF8.GetString($dbContent)
        
        # Estimar registros totais
        $estimatedRecords = 0
        $validPatterns = 0
        $invalidPatterns = 0
        
        # Procurar por padroes de dados validos
        $validDataPatterns = @(
            "\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}",  # Padrao de numero de processo
            "R\$\s*\d+[.,]\d{2}",                      # Padrao de valor monetario
            "(ATIVO|PASSIVO)",                          # Padrao de polo
            "(PROVAVEL|POSSIVEL|REMOTO)",               # Padrao de risco
            "(PROCEDENTE|IMPROCEDENTE|PARCIAL)"         # Padrao de situacao
        )
        
        foreach ($pattern in $validDataPatterns) {
            $matches = [regex]::Matches($contentText, $pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
            $validPatterns += $matches.Count
        }
        
        # Procurar por padroes problematicos
        $invalidDataPatterns = @(
            "NULL",
            "\s{10,}",  # Espacos excessivos
            "[^\x20-\x7E\xC0-\xFF]",  # Caracteres especiais problematicos
            "^\s*$"     # Linhas vazias
        )
        
        foreach ($pattern in $invalidDataPatterns) {
            $matches = [regex]::Matches($contentText, $pattern)
            $invalidPatterns += $matches.Count
        }
        
        # Estimar registros baseado em padroes
        $estimatedRecords = [math]::Max(1, [math]::Floor($validPatterns / $validDataPatterns.Count))
        
        # Atualizar metricas
        $QualityMetrics.TotalTables = $DetectedTables.Count
        $QualityMetrics.TotalRecords = $estimatedRecords
        $QualityMetrics.ValidRecords = $validPatterns
        $QualityMetrics.InvalidRecords = $invalidPatterns
        $QualityMetrics.MissingValues = ($contentText -split "NULL").Count - 1
        
        # Calcular score de qualidade
        if ($validPatterns -gt 0) {
            $QualityMetrics.QualityScore = [math]::Round(($validPatterns / ($validPatterns + $invalidPatterns)) * 100, 2)
        }
        
        Write-ValidationLog "Registros estimados: $estimatedRecords" "INFO"
        Write-ValidationLog "Padroes validos encontrados: $validPatterns" "OK"
        Write-ValidationLog "Padroes problematicos: $invalidPatterns" "WARN"
        Write-ValidationLog "Score de qualidade: $($QualityMetrics.QualityScore)%" "INFO"
        
        return $true
    }
    catch {
        Write-ValidationLog "Erro na analise de qualidade: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

# Funcao para validar consistencia temporal
function Test-TemporalConsistency {
    Write-ValidationLog "Validando consistencia temporal..."
    
    $temporalIssues = @()
    
    try {
        # Verificar sequencia temporal
        $sortedTables = $DetectedTables | Sort-Object {
            if ($_ -match '^(\d{2})_(\d{4})$') {
                "$($matches[2])-$($matches[1])"
            }
        }
        
        $expectedSequence = @()
        for ($year = 2021; $year -le 2024; $year++) {
            for ($month = 1; $month -le 12; $month++) {
                $monthStr = $month.ToString("00")
                $expectedSequence += "${monthStr}_${year}"
            }
        }
        
        # Identificar lacunas
        $missingTables = $expectedSequence | Where-Object { $_ -notin $DetectedTables }
        
        foreach ($missing in $missingTables) {
            $temporalIssues += "Lacuna temporal: $missing"
            Write-ValidationLog "Lacuna temporal identificada: $missing" "WARN"
        }
        
        # Calcular cobertura temporal
        $coverage = [math]::Round(($DetectedTables.Count / $expectedSequence.Count) * 100, 2)
        Write-ValidationLog "Cobertura temporal: $coverage% ($($DetectedTables.Count)/$($expectedSequence.Count))" "INFO"
        
        return $temporalIssues
    }
    catch {
        Write-ValidationLog "Erro na validacao temporal: $($_.Exception.Message)" "ERROR"
        return @("Erro na validacao temporal")
    }
}

# Funcao para gerar relatorio de qualidade
function New-QualityReport {
    param(
        [array]$StructureIssues,
        [array]$TemporalIssues,
        [bool]$QualityAnalysisSuccess
    )
    
    Write-ValidationLog "Gerando relatorio de qualidade..."
    
    $report = @()
    $report += "# Relatorio de Qualidade dos Dados Historicos"
    $report += "## Gerado em: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    $report += ""
    
    # Status geral
    $overallStatus = if ($QualityAnalysisSuccess -and $StructureIssues.Count -eq 0 -and $TemporalIssues.Count -eq 0) { "EXCELENTE" }
                    elseif ($QualityAnalysisSuccess -and ($StructureIssues.Count + $TemporalIssues.Count) -le 5) { "BOM" }
                    elseif ($QualityAnalysisSuccess) { "REGULAR" }
                    else { "PROBLEMATICO" }
    
    $statusIcon = switch ($overallStatus) {
        "EXCELENTE" { "OK" }
        "BOM" { "OK" }
        "REGULAR" { "ATENCAO" }
        "PROBLEMATICO" { "ERRO" }
    }
    
    $report += "## STATUS GERAL DA QUALIDADE [$statusIcon]"
    $report += ""
    $report += "- **Status**: $overallStatus"
    $report += "- **Score de Qualidade**: $($QualityMetrics.QualityScore)%"
    $report += "- **Banco analisado**: $DbPath"
    $report += "- **Periodo**: 2021-01 a 2024-12"
    $report += "- **Tabelas analisadas**: $($QualityMetrics.TotalTables)"
    $report += "- **Registros estimados**: $($QualityMetrics.TotalRecords.ToString('N0'))"
    $report += ""
    
    # Metricas detalhadas
    $report += "## METRICAS DE QUALIDADE"
    $report += ""
    $report += "| Metrica | Valor | Status |"
    $report += "|---------|-------|--------|"
    $report += "| Tabelas Processadas | $($QualityMetrics.TotalTables) | $(if ($QualityMetrics.TotalTables -ge 40) { 'OK' } else { 'ATENCAO' }) |"
    $report += "| Registros Estimados | $($QualityMetrics.TotalRecords.ToString('N0')) | $(if ($QualityMetrics.TotalRecords -gt 100000) { 'OK' } else { 'ATENCAO' }) |"
    $report += "| Padroes Validos | $($QualityMetrics.ValidRecords.ToString('N0')) | $(if ($QualityMetrics.ValidRecords -gt 1000) { 'OK' } else { 'ATENCAO' }) |"
    $report += "| Problemas Detectados | $($QualityMetrics.InvalidRecords.ToString('N0')) | $(if ($QualityMetrics.InvalidRecords -lt 100) { 'OK' } else { 'ATENCAO' }) |"
    $report += "| Valores Nulos | $($QualityMetrics.MissingValues.ToString('N0')) | $(if ($QualityMetrics.MissingValues -lt 50) { 'OK' } else { 'ATENCAO' }) |"
    $report += "| Score Geral | $($QualityMetrics.QualityScore)% | $(if ($QualityMetrics.QualityScore -ge 80) { 'OK' } elseif ($QualityMetrics.QualityScore -ge 60) { 'ATENCAO' } else { 'ERRO' }) |"
    $report += ""
    
    # Problemas de estrutura
    if ($StructureIssues.Count -gt 0) {
        $report += "## PROBLEMAS DE ESTRUTURA ($($StructureIssues.Count))"
        $report += ""
        foreach ($issue in $StructureIssues) {
            $report += "- $issue"
        }
        $report += ""
    }
    
    # Problemas temporais
    if ($TemporalIssues.Count -gt 0) {
        $report += "## PROBLEMAS TEMPORAIS ($($TemporalIssues.Count))"
        $report += ""
        foreach ($issue in $TemporalIssues) {
            $report += "- $issue"
        }
        $report += ""
    }
    
    # Recomendacoes
    $report += "## RECOMENDACOES"
    $report += ""
    
    if ($overallStatus -eq "EXCELENTE") {
        $report += "1. **Manter qualidade atual** dos dados"
        $report += "2. **Implementar monitoramento continuo** de qualidade"
        $report += "3. **Documentar processos** de manutencao"
    } elseif ($overallStatus -eq "BOM") {
        $report += "1. **Corrigir problemas menores** identificados"
        $report += "2. **Implementar validacoes automaticas**"
        $report += "3. **Monitorar qualidade regularmente**"
    } elseif ($overallStatus -eq "REGULAR") {
        $report += "1. **Priorizar correcao** dos problemas identificados"
        $report += "2. **Implementar processo ETL** robusto"
        $report += "3. **Validar dados** antes da consolidacao"
        $report += "4. **Recuperar dados** dos periodos faltantes"
    } else {
        $report += "1. **URGENTE: Revisar processo** de coleta de dados"
        $report += "2. **Implementar validacoes rigorosas**"
        $report += "3. **Recuperar/corrigir dados** problematicos"
        $report += "4. **Estabelecer controle de qualidade**"
    }
    
    # Proximos passos
    $report += ""
    $report += "## PROXIMOS PASSOS"
    $report += ""
    $report += "1. **Executar script ETL** para consolidacao"
    $report += "2. **Implementar validacoes** no processo de carga"
    $report += "3. **Criar alertas** para problemas de qualidade"
    $report += "4. **Estabelecer metricas** de monitoramento"
    $report += "5. **Documentar padroes** de qualidade esperados"
    
    # Comandos uteis
    $report += ""
    $report += "## COMANDOS DE VALIDACAO"
    $report += ""
    $report += "### Verificar dados consolidados"
    $report += "sqlite3 $ConsolidatedDbPath"
    $report += "SELECT COUNT(*) as total_registros FROM fato_contingencias_consolidado;"
    $report += ""
    $report += "### Verificar qualidade por competencia"
    $report += "sqlite3 $ConsolidatedDbPath"
    $report += "SELECT competencia, COUNT(*) as registros, COUNT(DISTINCT pasta) as pastas_unicas FROM fato_contingencias_consolidado GROUP BY competencia ORDER BY competencia;"
    
    # Salvar relatorio
    $report | Out-File -FilePath $QualityReportPath -Encoding UTF8
    
    Write-ValidationLog "Relatorio de qualidade salvo em: $QualityReportPath" "OK"
    return $report
}

# Funcao principal
function Main {
    try {
        Write-ValidationLog "Iniciando validacao de qualidade dos dados historicos..."
        Write-ValidationLog "Periodo de analise: 2021-01 a 2024-12"
        Write-ValidationLog "Tabelas a analisar: $($DetectedTables.Count)"
        
        # Limpar log anterior
        if (Test-Path $ValidationLogPath) {
            Remove-Item $ValidationLogPath -Force
        }
        
        # Verificar dependencias
        if (-not (Test-ValidationDependencies)) {
            return
        }
        
        # Analisar estrutura das tabelas
        $structureIssues = Test-TableStructure
        
        # Validar qualidade dos dados
        $qualitySuccess = Test-DataQuality
        
        # Validar consistencia temporal
        $temporalIssues = Test-TemporalConsistency
        
        # Gerar relatorio
        Write-ValidationLog "Gerando relatorio final de qualidade..."
        New-QualityReport -StructureIssues $structureIssues -TemporalIssues $temporalIssues -QualityAnalysisSuccess $qualitySuccess
        
        # Resultado final
        $totalIssues = $structureIssues.Count + $temporalIssues.Count
        
        if ($qualitySuccess -and $totalIssues -eq 0) {
            Write-ValidationLog "Validacao concluida: DADOS COM EXCELENTE QUALIDADE" "OK"
        } elseif ($qualitySuccess -and $totalIssues -le 5) {
            Write-ValidationLog "Validacao concluida: DADOS COM BOA QUALIDADE ($totalIssues problemas menores)" "OK"
        } elseif ($qualitySuccess) {
            Write-ValidationLog "Validacao concluida: DADOS COM QUALIDADE REGULAR ($totalIssues problemas identificados)" "WARN"
        } else {
            Write-ValidationLog "Validacao concluida: DADOS COM PROBLEMAS DE QUALIDADE" "ERROR"
        }
        
        Write-ValidationLog "Score de qualidade final: $($QualityMetrics.QualityScore)%"
        Write-ValidationLog "Relatorio salvo em: $QualityReportPath"
        Write-ValidationLog "Log detalhado em: $ValidationLogPath"
        
    }
    catch {
        Write-ValidationLog "Erro durante validacao: $($_.Exception.Message)" "ERROR"
    }
}

# Executar funcao principal
Main