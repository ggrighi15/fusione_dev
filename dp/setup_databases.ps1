# Script PowerShell para configurar bancos de dados do Fusione Core System
# Este script cria os bancos SQLite necessarios para todos os modulos

Write-Host "=== FUSIONE CORE SYSTEM - SETUP DE BANCOS DE DADOS ===" -ForegroundColor Cyan
Write-Host "Configurando bancos de dados SQLite..." -ForegroundColor Green

# Definir caminhos
$dpPath = $PSScriptRoot
$rootPath = Split-Path $dpPath -Parent
$sqlScript = Join-Path $dpPath "create_fusione_databases.sql"

# Verificar se o script SQL existe
if (-not (Test-Path $sqlScript)) {
    Write-Host "ERRO: Arquivo create_fusione_databases.sql nao encontrado!" -ForegroundColor Red
    exit 1
}

# Lista de bancos de dados a serem criados
$databases = @(
    @{Name="fusione_core.db"; Description="Banco principal do sistema"},
    @{Name="fusione_pessoas.db"; Description="Modulo de pessoas e contatos"},
    @{Name="fusione_contencioso.db"; Description="Modulo de processos judiciais"},
    @{Name="fusione_contratos.db"; Description="Modulo de contratos"},
    @{Name="fusione_procuracoes.db"; Description="Modulo de procuracoes"},
    @{Name="fusione_societario.db"; Description="Modulo societario"},
    @{Name="fusione_marcas.db"; Description="Modulo de marcas e patentes"},
    @{Name="historico_contencioso.db"; Description="Dados historicos de contingencias"}
)

# Verificar se SQLite esta disponivel
$sqliteAvailable = $false
try {
    $null = sqlite3 -version
    $sqliteAvailable = $true
    $sqliteCommand = "sqlite3"
    Write-Host "SQLite encontrado no sistema" -ForegroundColor Green
} catch {
    Write-Host "SQLite nao encontrado no PATH do sistema" -ForegroundColor Yellow
}

# Se SQLite nao estiver disponivel, usar metodo alternativo
if (-not $sqliteAvailable) {
    Write-Host "Criando bancos de dados vazios para uso manual..." -ForegroundColor Yellow
    
    foreach ($db in $databases) {
        $dbPath = Join-Path $dpPath $db.Name
        
        Write-Host "Criando arquivo: $($db.Name)" -ForegroundColor Cyan
        Write-Host "   Descricao: $($db.Description)" -ForegroundColor Gray
        
        # Criar arquivo vazio
        New-Item -Path $dbPath -ItemType File -Force | Out-Null
        
        if (Test-Path $dbPath) {
            Write-Host "   Arquivo criado (use DB Browser for SQLite para executar o script SQL)" -ForegroundColor Green
        } else {
            Write-Host "   Falha na criacao" -ForegroundColor Red
        }
    }
    
    Write-Host "`nINSTRUCOES MANUAIS:" -ForegroundColor Yellow
    Write-Host "1. Instale o DB Browser for SQLite" -ForegroundColor White
    Write-Host "2. Abra cada arquivo .db criado" -ForegroundColor White
    Write-Host "3. Execute o script create_fusione_databases.sql" -ForegroundColor White
    Write-Host "4. Salve as alteracoes" -ForegroundColor White
} else {
    # Criar bancos usando SQLite
    foreach ($db in $databases) {
        $dbPath = Join-Path $dpPath $db.Name
        
        Write-Host "Criando banco: $($db.Name)" -ForegroundColor Cyan
        Write-Host "   Descricao: $($db.Description)" -ForegroundColor Gray
        
        try {
            # Executar script SQL
            & $sqliteCommand $dbPath ".read $sqlScript"
            
            if (Test-Path $dbPath) {
                # Verificar se as tabelas foram criadas
                $tableCount = & $sqliteCommand $dbPath "SELECT COUNT(*) FROM sqlite_master WHERE type='table';"
                Write-Host "   Criado com sucesso! ($tableCount tabelas)" -ForegroundColor Green
            } else {
                Write-Host "   Falha na criacao" -ForegroundColor Red
            }
        } catch {
            Write-Host "   Erro: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

# Copiar banco de contingencias existente se houver
$existingContingencias = Join-Path $rootPath "historico_contencioso.db"
if (Test-Path $existingContingencias) {
    $targetContingencias = Join-Path $dpPath "historico_contencioso.db"
    Copy-Item $existingContingencias $targetContingencias -Force
    Write-Host "Copiado banco de contingencias existente" -ForegroundColor Green
}

# Criar arquivo de configuracao
$configContent = @"
# Configuracao dos Bancos de Dados Fusione
# Gerado automaticamente em $(Get-Date)

## Bancos Criados:

"@

foreach ($db in $databases) {
    $dbPath = Join-Path $dpPath $db.Name
    if (Test-Path $dbPath) {
        $size = [math]::Round((Get-Item $dbPath).Length / 1KB, 2)
        $configContent += "- **$($db.Name)** ($size KB): $($db.Description)`n"
    }
}

$configContent += @"

## Como Conectar:

### Power BI
1. Obter Dados > Mais > Banco de Dados > SQLite
2. Selecionar o arquivo .db desejado
3. Escolher as tabelas necessarias

### DB Browser for SQLite
1. Arquivo > Abrir Banco de Dados
2. Selecionar o arquivo .db
3. Navegar pelas tabelas na aba "Estrutura do Banco de Dados"

### Aplicacoes
- String de conexao: Data Source=caminho/para/banco.db
- Driver: SQLite

## Estrutura dos Modulos:

- **fusione_core.db**: Usuarios, perfis, sessoes, auditoria
- **fusione_pessoas.db**: Pessoas fisicas/juridicas, enderecos, contatos
- **fusione_contencioso.db**: Processos, audiencias, prazos, custas
- **fusione_contratos.db**: Contratos, clausulas, partes
- **fusione_procuracoes.db**: Procuracoes, substabelecimentos
- **fusione_societario.db**: Empresas, socios, participacoes
- **fusione_marcas.db**: Marcas, patentes, prazos PI
- **historico_contencioso.db**: Dados historicos de contingencias

## Backup e Manutencao:

- Fazer backup regular dos arquivos .db
- Usar VACUUM periodicamente para otimizar
- Monitorar tamanho dos bancos

---
*Fusione Core System - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')*
"@

$configPath = Join-Path $dpPath "README_BANCOS.md"
Set-Content -Path $configPath -Value $configContent -Encoding UTF8

Write-Host "`n=== RESUMO DA CONFIGURACAO ===" -ForegroundColor Cyan
Write-Host "Pasta: $dpPath" -ForegroundColor White
Write-Host "Bancos criados: $($databases.Count)" -ForegroundColor White
Write-Host "Documentacao: README_BANCOS.md" -ForegroundColor White
Write-Host "`nConfiguracao concluida com sucesso!" -ForegroundColor Green
Write-Host "Consulte o arquivo README_BANCOS.md para instrucoes de uso" -ForegroundColor Yellow

# Listar arquivos criados
Write-Host "`nArquivos na pasta dp:" -ForegroundColor Cyan
Get-ChildItem $dpPath | ForEach-Object {
    $size = if ($_.PSIsContainer) { "<DIR>" } else { "$([math]::Round($_.Length / 1KB, 2)) KB" }
    Write-Host "   $($_.Name) - $size" -ForegroundColor Gray
}

Write-Host "`nPronto para usar com Power BI, DB Browser ou aplicacoes!" -ForegroundColor Green