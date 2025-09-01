# Script para examinar arquivos de banco de dados e SQL do contencioso
# Analisa estrutura e metadados dos principais arquivos DB e SQL encontrados

Write-Host "=== EXAME DETALHADO DE ARQUIVOS DB/SQL ===" -ForegroundColor Cyan
Write-Host "Analisando estrutura dos bancos de dados e scripts SQL..." -ForegroundColor Green

# Definir caminhos e arquivos prioritários baseados na análise anterior
$basePath = "G:\Meu Drive\fusione"
$dpPath = $PSScriptRoot
$reportPath = Join-Path $dpPath "relatorio_db_sql_detalhado.md"

# Arquivos DB prioritários encontrados na análise anterior
$priorityDBFiles = @(
    # Bancos de dados principais do contencioso (pasta sql)
    "$basePath\sql\fusione_consolidado.db",
    "$basePath\sql\historico_contencioso.db",
    "$basePath\sql\dados_contencioso.db",
    "$basePath\sql\dados_contencioso_final.db",
    "$basePath\sql\contencioso.db",
    "$basePath\sql\sistema_juridico.db",
    "$basePath\sql\historico_contencioso_novo.db",
    "$basePath\sql\dados_planilhas.db",
    "$basePath\sql\dados_planilhas_backup.db",
    "$basePath\sql\relacionamento_contencioso.db",
    "$basePath\sql\historico_contencioso_corrigido_backup_20250518_000852.db",
    "$basePath\sql\temp.db",
    "$basePath\sql\consolidated_data.db",
    "$basePath\sql\database.db",
    "$basePath\sql\historico_consolidado.db",
    # Outros bancos encontrados
    "$basePath\data_base\historico_contencioso.db",
    "$basePath\data_base\dados_contencioso.db",
    "$basePath\data_base\sistema_juridico.db",
    "$basePath\data_base\historico_contencioso_novo.db",
    "$basePath\data_base\relacionamento_contencioso.db"
)

# Arquivos SQL prioritários encontrados
$prioritySQLFiles = @(
    "$basePath\sql\contencioso.sql",
    "$basePath\sql\contencioso_06_2025.sql",
    "$basePath\sql\contencioso_dump.sql",
    "$basePath\sql\contencioso_marangoni.sql",
    "$basePath\sql\bd.sql",
    "$basePath\sql\BDContencioso.sql",
    "$basePath\sql\contencioso_06_2025_limpo.sql",
    "$basePath\sql\contencioso_06_2025_VALIDO.sql",
    "$basePath\sql\fusione.sql",
    "$basePath\sql\Backup_Primeiro_BDMySQL.sql",
    "$basePath\sql\BDDJUR.sql",
    "$basePath\sql\BDJur.sql",
    "$basePath\data_base\msgstore.db.schema.sql",
    "$basePath\data_base\test-database.sql"
)

# Função para analisar arquivo de banco de dados
function Analyze-DatabaseFile {
    param(
        [string]$filePath,
        [string]$fileName
    )
    
    if (-not (Test-Path $filePath)) {
        return @{
            Status = "Não encontrado"
            Size = 0
            LastModified = $null
            Type = "Database"
        }
    }
    
    try {
        $fileInfo = Get-Item $filePath
        $sizeKB = [math]::Round($fileInfo.Length / 1KB, 2)
        $sizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
        $sizeGB = [math]::Round($fileInfo.Length / 1GB, 2)
        
        # Determinar se é um banco significativo baseado no tamanho
        $significance = if ($sizeGB -gt 1) { "Muito Alto" }
                       elseif ($sizeMB -gt 100) { "Alto" }
                       elseif ($sizeMB -gt 10) { "Médio" }
                       elseif ($sizeMB -gt 1) { "Baixo" }
                       else { "Mínimo" }
        
        # Tentar identificar se é SQLite
        $isSQLite = $false
        try {
            $header = [System.IO.File]::ReadAllBytes($filePath) | Select-Object -First 16
            $headerString = [System.Text.Encoding]::ASCII.GetString($header)
            if ($headerString.StartsWith("SQLite format 3")) {
                $isSQLite = $true
            }
        } catch {
            # Ignorar erro de leitura do header
        }
        
        return @{
            Status = "Encontrado"
            Size = $sizeKB
            SizeMB = $sizeMB
            SizeGB = $sizeGB
            LastModified = $fileInfo.LastWriteTime
            Type = "Database"
            Significance = $significance
            Path = $filePath
            IsSQLite = $isSQLite
        }
        
    } catch {
        return @{
            Status = "Erro na leitura"
            Size = 0
            LastModified = $null
            Type = "Database"
            Error = $_.Exception.Message
        }
    }
}

# Função para analisar arquivo SQL
function Analyze-SQLFile {
    param(
        [string]$filePath,
        [string]$fileName
    )
    
    if (-not (Test-Path $filePath)) {
        return @{
            Status = "Não encontrado"
            Size = 0
            LastModified = $null
            Type = "SQL"
            LineCount = 0
            SQLCommands = @()
        }
    }
    
    try {
        $fileInfo = Get-Item $filePath
        $sizeKB = [math]::Round($fileInfo.Length / 1KB, 2)
        $sizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
        
        # Para arquivos SQL grandes, ler apenas uma amostra
        if ($sizeMB -gt 10) {
            $sampleLines = Get-Content $filePath -TotalCount 100 -ErrorAction SilentlyContinue
            $estimatedLines = [math]::Round($fileInfo.Length / 80)  # Estimativa baseada em média de caracteres por linha
        } else {
            try {
                $allLines = Get-Content $filePath -ErrorAction SilentlyContinue
                $sampleLines = $allLines | Select-Object -First 100
                $estimatedLines = $allLines.Count
            } catch {
                $sampleLines = @()
                $estimatedLines = 0
            }
        }
        
        # Analisar comandos SQL comuns
        $sqlCommands = @()
        $content = ($sampleLines -join " ").ToUpper()
        
        if ($content -match "CREATE TABLE") { $sqlCommands += "CREATE TABLE" }
        if ($content -match "INSERT INTO") { $sqlCommands += "INSERT INTO" }
        if ($content -match "UPDATE") { $sqlCommands += "UPDATE" }
        if ($content -match "DELETE") { $sqlCommands += "DELETE" }
        if ($content -match "ALTER TABLE") { $sqlCommands += "ALTER TABLE" }
        if ($content -match "DROP TABLE") { $sqlCommands += "DROP TABLE" }
        if ($content -match "CREATE INDEX") { $sqlCommands += "CREATE INDEX" }
        if ($content -match "SELECT") { $sqlCommands += "SELECT" }
        
        # Identificar tabelas mencionadas relacionadas ao contencioso
        $contenciousTables = @()
        if ($content -match "PROCESSOS") { $contenciousTables += "processos" }
        if ($content -match "CLIENTES") { $contenciousTables += "clientes" }
        if ($content -match "ADVOGADOS") { $contenciousTables += "advogados" }
        if ($content -match "TRIBUNAIS") { $contenciousTables += "tribunais" }
        if ($content -match "CONTINGENCIAS") { $contenciousTables += "contingencias" }
        if ($content -match "AUDIENCIAS") { $contenciousTables += "audiencias" }
        if ($content -match "PETICOES") { $contenciousTables += "peticoes" }
        
        return @{
            Status = "Encontrado"
            Size = $sizeKB
            SizeMB = $sizeMB
            LastModified = $fileInfo.LastWriteTime
            Type = "SQL"
            LineCount = $estimatedLines
            SQLCommands = $sqlCommands
            ContenciousTables = $contenciousTables
            SampleContent = $sampleLines | Select-Object -First 5
            Path = $filePath
        }
        
    } catch {
        return @{
            Status = "Erro na leitura"
            Size = 0
            LastModified = $null
            Type = "SQL"
            LineCount = 0
            SQLCommands = @()
            Error = $_.Exception.Message
        }
    }
}

# Função para extrair data do nome do arquivo
function Get-DateFromFileName {
    param([string]$fileName)
    
    if ($fileName -match '(\d{2})_(\d{4})') {
        return "$($matches[1])/$($matches[2])"
    } elseif ($fileName -match '(\d{4})-(\d{2})-(\d{2})') {
        return "$($matches[3])/$($matches[2])/$($matches[1])"
    } elseif ($fileName -match '(\d{2})_2025') {
        return "$($matches[1])/2025"
    } elseif ($fileName -match '202505') {
        return "05/2025"
    } elseif ($fileName -match '06_2025') {
        return "06/2025"
    } elseif ($fileName -match '20250518') {
        return "18/05/2025"
    }
    return "Não identificada"
}

# Inicializar relatório
$report = @"
# Relatório Detalhado - Arquivos DB/SQL do Contencioso
## Gerado em: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

### Objetivo
Examinar estrutura e metadados dos bancos de dados e scripts SQL relacionados ao contencioso.

### Bancos de Dados Analisados

"@

$dbResults = @()
$sqlResults = @()
$totalDBSize = 0
$totalSQLSize = 0
$foundDBCount = 0
$foundSQLCount = 0

Write-Host "Analisando bancos de dados prioritários..." -ForegroundColor Yellow

foreach ($filePath in $priorityDBFiles) {
    $fileName = Split-Path $filePath -Leaf
    Write-Host "Analisando DB: $fileName" -ForegroundColor Gray
    
    $analysis = Analyze-DatabaseFile -filePath $filePath -fileName $fileName
    $dateFromName = Get-DateFromFileName $fileName
    
    $analysis.DateFromName = $dateFromName
    $analysis.FileName = $fileName
    $dbResults += $analysis
    
    if ($analysis.Status -eq "Encontrado") {
        $foundDBCount++
        $totalDBSize += $analysis.Size
        
        $sizeStr = if ($analysis.SizeGB -gt 1) { "$($analysis.SizeGB) GB" }
                  elseif ($analysis.SizeMB -gt 1) { "$($analysis.SizeMB) MB" }
                  else { "$($analysis.Size) KB" }
        
        $sqliteStr = if ($analysis.IsSQLite) { "✅ SQLite" } else { "❓ Formato desconhecido" }
        
        $report += "`n#### $fileName`n"
        $report += "- **Status**: ✅ Encontrado`n"
        $report += "- **Tamanho**: $sizeStr`n"
        $report += "- **Formato**: $sqliteStr`n"
        $report += "- **Significância**: $($analysis.Significance)`n"
        $report += "- **Última Modificação**: $($analysis.LastModified.ToString('yyyy-MM-dd HH:mm'))`n"
        $report += "- **Data no Nome**: $dateFromName`n"
        $report += "- **Caminho**: ``$filePath```n`n"
        Write-Host "  ✅ $fileName ($sizeStr) - Significância: $($analysis.Significance)" -ForegroundColor Green
    } else {
        $report += "`n#### $fileName`n"
        $report += "- **Status**: ❌ Não encontrado`n"
        $report += "- **Caminho**: ``$filePath```n`n"
        Write-Host "  ❌ $fileName - Não encontrado" -ForegroundColor Red
    }
}

$report += "`n### Scripts SQL Analisados`n`n"

Write-Host "`nAnalisando scripts SQL prioritários..." -ForegroundColor Yellow

foreach ($filePath in $prioritySQLFiles) {
    $fileName = Split-Path $filePath -Leaf
    Write-Host "Analisando SQL: $fileName" -ForegroundColor Gray
    
    $analysis = Analyze-SQLFile -filePath $filePath -fileName $fileName
    $dateFromName = Get-DateFromFileName $fileName
    
    $analysis.DateFromName = $dateFromName
    $analysis.FileName = $fileName
    $sqlResults += $analysis
    
    if ($analysis.Status -eq "Encontrado") {
        $foundSQLCount++
        $totalSQLSize += $analysis.Size
        
        $sizeStr = if ($analysis.SizeMB -gt 1) { "$($analysis.SizeMB) MB" } else { "$($analysis.Size) KB" }
        
        $report += "`n#### $fileName`n"
        $report += "- **Status**: ✅ Encontrado`n"
        $report += "- **Tamanho**: $sizeStr`n"
        $report += "- **Linhas**: $($analysis.LineCount.ToString('N0'))`n"
        $report += "- **Comandos SQL**: $($analysis.SQLCommands -join ', ')`n"
        $report += "- **Tabelas do Contencioso**: $($analysis.ContenciousTables -join ', ')`n"
        $report += "- **Última Modificação**: $($analysis.LastModified.ToString('yyyy-MM-dd HH:mm'))`n"
        $report += "- **Data no Nome**: $dateFromName`n"
        $report += "- **Caminho**: ``$filePath```n`n"
        $report += "**Amostra do conteúdo:**`n"
        $report += "``````sql`n"
        $report += "$($analysis.SampleContent -join "`n")`n"
        $report += "``````n`n"
        Write-Host "  ✅ $fileName ($sizeStr) - $($analysis.LineCount.ToString('N0')) linhas" -ForegroundColor Green
    } else {
        $report += "`n#### $fileName`n"
        $report += "- **Status**: ❌ Não encontrado`n"
        $report += "- **Caminho**: ``$filePath```n`n"
        Write-Host "  ❌ $fileName - Não encontrado" -ForegroundColor Red
    }
}

# Análise temporal
$report += "`n### Análise Temporal`n`n"

$foundDBs = $dbResults | Where-Object { $_.Status -eq "Encontrado" }
$foundSQLs = $sqlResults | Where-Object { $_.Status -eq "Encontrado" }
$allFound = $foundDBs + $foundSQLs

if ($allFound.Count -gt 0) {
    $sortedByDate = $allFound | Sort-Object LastModified
    $oldestFile = $sortedByDate[0]
    $newestFile = $sortedByDate[-1]
    
    $report += @"
**Período de Modificações:**
- Arquivo mais antigo: $($oldestFile.FileName) ($(($oldestFile.LastModified).ToString('yyyy-MM-dd')))
- Arquivo mais recente: $($newestFile.FileName) ($(($newestFile.LastModified).ToString('yyyy-MM-dd')))

**Distribuição Temporal:**
"@
    
    # Agrupar por ano-mês
    $monthlyGroups = $allFound | Group-Object { $_.LastModified.ToString('yyyy-MM') } | Sort-Object Name
    foreach ($group in $monthlyGroups) {
        $report += "- $($group.Name): $($group.Count) arquivo(s)`n"
    }
}

# Análise por significância (bancos de dados)
$report += "`n### Análise por Significância dos Bancos`n`n"

$significanceGroups = $foundDBs | Group-Object Significance | Sort-Object Name
foreach ($group in $significanceGroups) {
    $totalSizeGroup = ($group.Group | Measure-Object SizeMB -Sum).Sum
    $report += "- **$($group.Name)**: $($group.Count) banco(s), $([math]::Round($totalSizeGroup, 2)) MB total`n"
    
    # Listar os bancos de cada grupo
    foreach ($db in $group.Group) {
        $sizeStr = if ($db.SizeGB -gt 1) { "$($db.SizeGB) GB" }
                  elseif ($db.SizeMB -gt 1) { "$($db.SizeMB) MB" }
                  else { "$($db.Size) KB" }
        $report += "  - $($db.FileName) ($sizeStr)`n"
    }
    $report += "`n"
}

# Resumo estatístico
$report += "`n### Resumo Estatístico`n`n"

$totalDBSizeMB = [math]::Round($totalDBSize / 1024, 2)
$totalSQLSizeMB = [math]::Round($totalSQLSize / 1024, 2)

$report += @"
**Bancos de Dados:**
- Total analisado: $($dbResults.Count)
- Encontrados: $foundDBCount
- Tamanho total: $totalDBSizeMB MB

**Scripts SQL:**
- Total analisado: $($sqlResults.Count)
- Encontrados: $foundSQLCount
- Tamanho total: $totalSQLSizeMB MB

**Período de Dados:**
- Baseado nas modificações dos arquivos encontrados
- Dados mais antigos: $(if ($allFound.Count -gt 0) { ($allFound | Sort-Object LastModified)[0].LastModified.ToString('yyyy-MM-dd') } else { 'N/A' })
- Dados mais recentes: $(if ($allFound.Count -gt 0) { ($allFound | Sort-Object LastModified)[-1].LastModified.ToString('yyyy-MM-dd') } else { 'N/A' })

"@

# Recomendações
$report += "`n### Recomendações para Análise de Dados Confiáveis`n`n"

# Identificar os bancos mais importantes
$topDBs = $foundDBs | Sort-Object SizeMB -Descending | Select-Object -First 5
$topSQLs = $foundSQLs | Sort-Object SizeMB -Descending | Select-Object -First 5

$report += @"
**Bancos de Dados Prioritários (por tamanho):**
"@

foreach ($db in $topDBs) {
    $sizeStr = if ($db.SizeGB -gt 1) { "$($db.SizeGB) GB" }
              elseif ($db.SizeMB -gt 1) { "$($db.SizeMB) MB" }
              else { "$($db.Size) KB" }
    $report += "$($topDBs.IndexOf($db) + 1). **$($db.FileName)** - $sizeStr (Significância: $($db.Significance))`n"
}

$report += "`n**Scripts SQL Prioritários (por tamanho):**`n"

foreach ($sql in $topSQLs) {
    $sizeStr = if ($sql.SizeMB -gt 1) { "$($sql.SizeMB) MB" } else { "$($sql.Size) KB" }
    $report += "$($topSQLs.IndexOf($sql) + 1). **$($sql.FileName)** - $sizeStr`n"
}

$report += @"

**Estratégia de Análise:**
1. **Priorizar bancos com significância "Muito Alto" e "Alto"**
2. **Focar nos arquivos mais recentes (2025)**
3. **Verificar integridade dos bancos SQLite maiores**
4. **Analisar scripts SQL para entender estrutura de dados**
5. **Comparar dados entre diferentes versões dos bancos**

**Período de Dados Confiáveis Identificado:**
- **Início**: $(if ($allFound.Count -gt 0) { ($allFound | Sort-Object LastModified)[0].LastModified.ToString('yyyy-MM-dd') } else { 'Não determinado' })
- **Fim**: $(if ($allFound.Count -gt 0) { ($allFound | Sort-Object LastModified)[-1].LastModified.ToString('yyyy-MM-dd') } else { 'Não determinado' })
- **Recomendação**: Dados confiáveis a partir de **2024-10-01** (baseado na análise combinada)

**Próximos Passos:**
1. **Conectar aos bancos SQLite prioritários para analisar esquemas**
2. **Executar queries de contagem de registros**
3. **Verificar consistência temporal dos dados**
4. **Identificar tabelas principais do contencioso**
5. **Validar integridade referencial entre tabelas**

"@

# Salvar relatório
Set-Content -Path $reportPath -Value $report -Encoding UTF8

Write-Host "`n=== RESUMO DO EXAME DB/SQL ===" -ForegroundColor Cyan
Write-Host "Bancos encontrados: $foundDBCount de $($dbResults.Count)" -ForegroundColor White
Write-Host "Scripts SQL encontrados: $foundSQLCount de $($sqlResults.Count)" -ForegroundColor White
Write-Host "Tamanho total DBs: $totalDBSizeMB MB" -ForegroundColor White
Write-Host "Tamanho total SQLs: $totalSQLSizeMB MB" -ForegroundColor White
Write-Host "Relatório salvo em: $reportPath" -ForegroundColor White

if ($foundDBCount -gt 0) {
    Write-Host "`nBANCOS DE DADOS PRIORITARIOS:" -ForegroundColor Green
    $topDBs = $foundDBs | Sort-Object SizeMB -Descending | Select-Object -First 3
    foreach ($db in $topDBs) {
        $sizeStr = if ($db.SizeGB -gt 1) { "$($db.SizeGB) GB" }
                  elseif ($db.SizeMB -gt 1) { "$($db.SizeMB) MB" }
                  else { "$($db.Size) KB" }
        Write-Host "- $($db.FileName) ($sizeStr) - $($db.Significance)" -ForegroundColor Yellow
    }
}

if ($foundSQLCount -gt 0) {
    Write-Host "`nSCRIPTS SQL PRIORITARIOS:" -ForegroundColor Green
    $topSQLs = $foundSQLs | Sort-Object SizeMB -Descending | Select-Object -First 3
    foreach ($sql in $topSQLs) {
        $sizeStr = if ($sql.SizeMB -gt 1) { "$($sql.SizeMB) MB" } else { "$($sql.Size) KB" }
        Write-Host "- $($sql.FileName) ($sizeStr)" -ForegroundColor Yellow
    }
}

if ($allFound.Count -gt 0) {
    $oldestDate = ($allFound | Sort-Object LastModified)[0].LastModified.ToString('yyyy-MM-dd')
    $newestDate = ($allFound | Sort-Object LastModified)[-1].LastModified.ToString('yyyy-MM-dd')
    Write-Host "`nPERIODO DE DADOS: $oldestDate a $newestDate" -ForegroundColor Cyan
    Write-Host "RECOMENDACAO: Dados confiáveis a partir de 2024-10-01" -ForegroundColor Green
}

Write-Host "`nConsulte o relatório detalhado para próximos passos!" -ForegroundColor Green