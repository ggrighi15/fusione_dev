# Script ETL para consolidar dados historicos do historico_contencioso.db
# Consolidacao de dados confiaveis desde 2021

$ErrorActionPreference = "Stop"

# Configuracoes
$DbPath = "G:\Meu Drive\fusione\sql\historico_contencioso.db"
$OutputDbPath = "./historico_consolidado_2021_2024.db"
$ETLReportPath = "./relatorio_etl_consolidacao.md"
$BackupPath = "./backup_historico_$(Get-Date -Format 'yyyyMMdd_HHmmss').db"

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

# Lacunas identificadas
$MissingTables = @(
    "11_2022", "02_2023", "03_2024", "04_2024"
)

Write-Host "[INFO] Iniciando processo ETL para consolidacao de dados historicos..." -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Gray

# Funcao para verificar dependencias
function Test-Dependencies {
    Write-Host "[INFO] Verificando dependencias..." -ForegroundColor Cyan
    
    # Verificar arquivo fonte
    if (-not (Test-Path $DbPath)) {
        Write-Host "[ERROR] Banco fonte nao encontrado: $DbPath" -ForegroundColor Red
        return $false
    }
    
    $fileInfo = Get-Item $DbPath
    Write-Host "[OK] Banco fonte encontrado: $($fileInfo.Length.ToString('N0')) bytes" -ForegroundColor Green
    
    return $true
}

# Funcao para criar backup
function New-DatabaseBackup {
    try {
        Write-Host "[INFO] Criando backup do banco original..." -ForegroundColor Cyan
        Copy-Item -Path $DbPath -Destination $BackupPath -Force
        
        $backupInfo = Get-Item $BackupPath
        Write-Host "[OK] Backup criado: $BackupPath ($($backupInfo.Length.ToString('N0')) bytes)" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "[ERROR] Falha ao criar backup: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Funcao para gerar SQL de consolidacao
function New-ConsolidationSQL {
    $sqlCommands = @()
    
    # Criar tabela consolidada
    $sqlCommands += @"
-- Criar tabela consolidada para dados historicos 2021-2024
CREATE TABLE IF NOT EXISTS fato_contingencias_consolidado (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pasta TEXT NOT NULL,
    situacao TEXT,
    categoria TEXT,
    polo TEXT,
    risco TEXT,
    valor_analisado REAL,
    valor_analisado_atualizado REAL,
    competencia TEXT NOT NULL,
    objeto TEXT,
    tabela_origem TEXT NOT NULL,
    data_consolidacao DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(pasta, competencia)
);

-- Criar indices para performance
CREATE INDEX IF NOT EXISTS idx_consolidado_competencia ON fato_contingencias_consolidado(competencia);
CREATE INDEX IF NOT EXISTS idx_consolidado_pasta ON fato_contingencias_consolidado(pasta);
CREATE INDEX IF NOT EXISTS idx_consolidado_tabela_origem ON fato_contingencias_consolidado(tabela_origem);
CREATE INDEX IF NOT EXISTS idx_consolidado_situacao ON fato_contingencias_consolidado(situacao);

"@
    
    # Gerar comandos INSERT para cada tabela detectada
    foreach ($tableName in $DetectedTables) {
        if ($tableName -match '^(\d{2})_(\d{4})$') {
            $month = $matches[1]
            $year = $matches[2]
            $competencia = "$year-$month"
            
            $sqlCommands += @"
-- Consolidar dados da tabela $tableName
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '$competencia' as competencia,
    TRIM(objeto) as objeto,
    '$tableName' as tabela_origem
FROM [$tableName]
WHERE pasta IS NOT NULL AND pasta != '';

"@
        }
    }
    
    # Adicionar comandos de analise
    $sqlCommands += @"
-- Criar tabela de resumo por competencia
CREATE TABLE IF NOT EXISTS resumo_competencias AS
SELECT 
    competencia,
    tabela_origem,
    COUNT(*) as total_registros,
    COUNT(DISTINCT pasta) as pastas_unicas,
    SUM(valor_analisado) as valor_total,
    SUM(valor_analisado_atualizado) as valor_atualizado_total,
    MIN(data_consolidacao) as data_consolidacao
FROM fato_contingencias_consolidado
GROUP BY competencia, tabela_origem
ORDER BY competencia;

-- Criar tabela de lacunas identificadas
CREATE TABLE IF NOT EXISTS lacunas_temporais (
    competencia TEXT PRIMARY KEY,
    tabela_esperada TEXT,
    status TEXT DEFAULT 'FALTANTE',
    observacoes TEXT
);

"@
    
    # Inserir informacoes sobre lacunas
    foreach ($missingTable in $MissingTables) {
        if ($missingTable -match '^(\d{2})_(\d{4})$') {
            $month = $matches[1]
            $year = $matches[2]
            $competencia = "$year-$month"
            
            $sqlCommands += @"
INSERT OR REPLACE INTO lacunas_temporais (competencia, tabela_esperada, observacoes)
VALUES ('$competencia', '$missingTable', 'Tabela nao encontrada no banco original');

"@
        }
    }
    
    return $sqlCommands -join "`n"
}

# Funcao para consolidacao
function Invoke-Consolidation {
    try {
        Write-Host "[INFO] Executando consolidacao..." -ForegroundColor Cyan
        
        # Gerar SQL
        $consolidationSQL = New-ConsolidationSQL
        $sqlFile = "./consolidation_script.sql"
        $consolidationSQL | Out-File -FilePath $sqlFile -Encoding UTF8
        
        Write-Host "[INFO] Script SQL gerado: $sqlFile" -ForegroundColor White
        
        # Copiar banco original para novo banco consolidado
        Copy-Item -Path $DbPath -Destination $OutputDbPath -Force
        Write-Host "[INFO] Banco copiado para: $OutputDbPath" -ForegroundColor White
        
        $outputInfo = Get-Item $OutputDbPath
        Write-Host "[OK] Banco base criado: $($outputInfo.Length.ToString('N0')) bytes" -ForegroundColor Green
        
        Write-Host "[INFO] Para completar a consolidacao, execute:" -ForegroundColor Yellow
        Write-Host "  sqlite3 $OutputDbPath < $sqlFile" -ForegroundColor White
        Write-Host "  ou use DB Browser for SQLite para executar o script" -ForegroundColor White
        
        return $true
    }
    catch {
        Write-Host "[ERROR] Erro durante consolidacao: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Funcao para gerar relatorio ETL
function New-ETLReport {
    param(
        [bool]$Success,
        [array]$ProcessedTables,
        [array]$MissingTables
    )
    
    $report = @()
    $report += "# Relatorio ETL - Consolidacao Historico Contencioso"
    $report += "## Gerado em: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    $report += ""
    
    # Status da consolidacao
    $statusIcon = if ($Success) { "OK" } else { "ERRO" }
    $report += "## STATUS DA CONSOLIDACAO [$statusIcon]"
    $report += ""
    $report += "- **Status**: $(if ($Success) { 'SUCESSO' } else { 'FALHA' })"
    $report += "- **Banco origem**: $DbPath"
    $report += "- **Banco consolidado**: $OutputDbPath"
    $report += "- **Backup criado**: $BackupPath"
    $report += "- **Tabelas processadas**: $($ProcessedTables.Count)"
    $report += "- **Lacunas identificadas**: $($MissingTables.Count)"
    $report += ""
    
    # Detalhes das tabelas processadas
    if ($ProcessedTables.Count -gt 0) {
        $report += "## TABELAS PROCESSADAS ($($ProcessedTables.Count))"
        $report += ""
        $report += "| Tabela | Competencia | Status |"
        $report += "|--------|-------------|--------|"
        
        foreach ($table in $ProcessedTables) {
            if ($table -match '^(\d{2})_(\d{4})$') {
                $month = $matches[1]
                $year = $matches[2]
                $competencia = "$year-$month"
                $report += "| $table | $competencia | Processada |"
            }
        }
        $report += ""
    }
    
    # Lacunas identificadas
    if ($MissingTables.Count -gt 0) {
        $report += "## LACUNAS IDENTIFICADAS ($($MissingTables.Count))"
        $report += ""
        $report += "| Tabela Faltante | Competencia | Impacto |"
        $report += "|-----------------|-------------|----------|"
        
        foreach ($missing in $MissingTables) {
            if ($missing -match '^(\d{2})_(\d{4})$') {
                $month = $matches[1]
                $year = $matches[2]
                $competencia = "$year-$month"
                $report += "| $missing | $competencia | Dados ausentes |"
            }
        }
        $report += ""
    }
    
    # Estrutura do banco consolidado
    $report += "## ESTRUTURA DO BANCO CONSOLIDADO"
    $report += ""
    $report += "### Tabela Principal: fato_contingencias_consolidado"
    $report += "- **id**: Chave primaria auto-incremento"
    $report += "- **pasta**: Identificador da pasta/processo"
    $report += "- **situacao**: Situacao do processo"
    $report += "- **categoria**: Categoria da contingencia"
    $report += "- **polo**: Polo ativo/passivo"
    $report += "- **risco**: Classificacao de risco"
    $report += "- **valor_analisado**: Valor original analisado"
    $report += "- **valor_analisado_atualizado**: Valor atualizado"
    $report += "- **competencia**: Periodo no formato YYYY-MM"
    $report += "- **objeto**: Objeto da acao"
    $report += "- **tabela_origem**: Tabela original dos dados"
    $report += "- **data_consolidacao**: Timestamp da consolidacao"
    $report += ""
    
    # Proximos passos
    $report += "## PROXIMOS PASSOS"
    $report += ""
    
    if ($Success) {
        $report += "1. **Executar script SQL** para completar consolidacao"
        $report += "2. **Validar dados consolidados** no banco"
        $report += "3. **Executar queries de verificacao** de integridade"
        $report += "4. **Implementar processo de atualizacao** para novos dados"
        $report += "5. **Criar views** para facilitar consultas"
        
        if ($MissingTables.Count -gt 0) {
            $report += "6. **Investigar e recuperar** dados dos $($MissingTables.Count) periodos faltantes"
        }
    } else {
        $report += "1. **Corrigir erros** identificados"
        $report += "2. **Repetir processo** apos correcoes"
        $report += "3. **Validar resultado** da consolidacao"
    }
    
    # Comandos uteis
    $report += ""
    $report += "## COMANDOS UTEIS"
    $report += ""
    $report += "### Executar consolidacao"
    $report += "sqlite3 $OutputDbPath < consolidation_script.sql"
    $report += ""
    $report += "### Verificar dados consolidados"
    $report += "SELECT competencia, COUNT(*) as total FROM fato_contingencias_consolidado GROUP BY competencia ORDER BY competencia;"
    
    # Salvar relatorio
    $report | Out-File -FilePath $ETLReportPath -Encoding UTF8
    
    Write-Host "[OK] Relatorio ETL salvo em: $ETLReportPath" -ForegroundColor Green
    return $report
}

# Funcao principal
function Main {
    try {
        Write-Host "[INFO] Iniciando processo ETL para dados historicos 2021-2024..." -ForegroundColor Cyan
        Write-Host "[INFO] Tabelas a processar: $($DetectedTables.Count)" -ForegroundColor White
        Write-Host "[INFO] Lacunas identificadas: $($MissingTables.Count)" -ForegroundColor Yellow
        
        # Verificar dependencias
        if (-not (Test-Dependencies)) {
            return
        }
        
        # Criar backup
        if (-not (New-DatabaseBackup)) {
            Write-Host "[ERROR] Falha ao criar backup - abortando processo" -ForegroundColor Red
            return
        }
        
        # Executar consolidacao
        $success = Invoke-Consolidation
        
        # Gerar relatorio
        Write-Host "`n[INFO] Gerando relatorio ETL..." -ForegroundColor Cyan
        New-ETLReport -Success $success -ProcessedTables $DetectedTables -MissingTables $MissingTables
        
        # Resultado final
        if ($success) {
            Write-Host "`n[OK] Processo ETL concluido com sucesso!" -ForegroundColor Green
            Write-Host "[INFO] Banco consolidado: $OutputDbPath" -ForegroundColor White
            Write-Host "[INFO] Backup original: $BackupPath" -ForegroundColor White
            Write-Host "[INFO] Relatorio: $ETLReportPath" -ForegroundColor White
            Write-Host "[INFO] Script SQL: consolidation_script.sql" -ForegroundColor White
            
            if ($MissingTables.Count -gt 0) {
                Write-Host "[WARN] $($MissingTables.Count) lacunas temporais identificadas" -ForegroundColor Yellow
            }
        } else {
            Write-Host "`n[ERROR] Processo ETL falhou" -ForegroundColor Red
        }
        
    }
    catch {
        Write-Host "[ERROR] Erro durante processo ETL: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Executar funcao principal
Main