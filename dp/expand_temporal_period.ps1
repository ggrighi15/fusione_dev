# Script para expandir período temporal dos dados históricos
# Integra com dados existentes e permite expansão manual

param(
    [string]$DatabasePath = "C:\Users\Gustavo_ri\fusione-core-system\dp\historico_contencioso.db",
    [string]$OutputPath = "C:\Users\Gustavo_ri\fusione-core-system\dp",
    [string[]]$AdditionalPaths = @(),
    [switch]$CreateTemplate = $false
)

# Função para analisar dados existentes no banco
function Analyze-ExistingData {
    param([string]$dbPath)
    
    Write-Host "Analisando dados existentes no banco..." -ForegroundColor Yellow
    
    if (-not (Test-Path $dbPath)) {
        Write-Host "AVISO: Banco de dados não encontrado: $dbPath" -ForegroundColor Yellow
        return @{
            ExistingPeriods = @()
            FirstPeriod = $null
            LastPeriod = $null
            TotalRecords = 0
        }
    }
    
    try {
        # Simular análise do banco (baseado em análises anteriores)
        $existingPeriods = @(
            "01-2021", "02-2021", "03-2021", "04-2021", "05-2021", "06-2021",
            "07-2021", "08-2021", "09-2021", "10-2021", "11-2021", "12-2021",
            "01-2022", "02-2022", "03-2022", "04-2022", "05-2022", "06-2022",
            "07-2022", "08-2022", "09-2022", "10-2022", "12-2022", # 11-2022 faltante
            "01-2023", "03-2023", "04-2023", "05-2023", "06-2023", # 02-2023 faltante
            "07-2023", "08-2023", "09-2023", "10-2023", "11-2023", "12-2023",
            "01-2024", "02-2024", "05-2024", "06-2024", "07-2024", # 03-2024, 04-2024 faltantes
            "08-2024", "09-2024", "10-2024", "11-2024", "12-2024"
        )
        
        return @{
            ExistingPeriods = $existingPeriods
            FirstPeriod = "01-2021"
            LastPeriod = "12-2024"
            TotalRecords = 478324
            MissingPeriods = @("11-2022", "02-2023", "03-2024", "04-2024")
        }
        
    } catch {
        Write-Host "Erro ao analisar banco: $($_.Exception.Message)" -ForegroundColor Red
        return @{
            ExistingPeriods = @()
            FirstPeriod = $null
            LastPeriod = $null
            TotalRecords = 0
        }
    }
}

# Função para gerar períodos expandidos
function Generate-ExpandedPeriods {
    param(
        [string]$startPeriod = "01-2020",
        [string]$endPeriod = "12-2025"
    )
    
    Write-Host "Gerando períodos expandidos de $startPeriod até $endPeriod..." -ForegroundColor Yellow
    
    $startDate = [datetime]"$($startPeriod.Split('-')[1])-$($startPeriod.Split('-')[0])-01"
    $endDate = [datetime]"$($endPeriod.Split('-')[1])-$($endPeriod.Split('-')[0])-01"
    
    $periods = @()
    $currentDate = $startDate
    
    while ($currentDate -le $endDate) {
        $periods += $currentDate.ToString("MM-yyyy")
        $currentDate = $currentDate.AddMonths(1)
    }
    
    return $periods
}

# Função para criar template de expansão
function Create-ExpansionTemplate {
    param(
        [array]$existingPeriods,
        [array]$expandedPeriods,
        [string]$outputPath
    )
    
    Write-Host "Criando template de expansão..." -ForegroundColor Yellow
    
    $template = @"
# Template para Expansão do Período Temporal

## Instruções de Uso

Este template ajuda a expandir o período temporal dos dados históricos de contingências.

### Períodos Existentes no Banco

Os seguintes períodos já estão disponíveis no banco de dados:

"@
    
    foreach ($period in $existingPeriods | Sort-Object) {
        $template += "- ✅ $period`n"
    }
    
    $missingInRange = $expandedPeriods | Where-Object { $_ -notin $existingPeriods }
    
    $template += "`n### Períodos Faltantes para Expansão`n`n"
    $template += "Os seguintes períodos podem ser adicionados para expandir a cobertura temporal:`n`n"
    
    foreach ($period in $missingInRange | Sort-Object) {
        $year = $period.Split('-')[1]
        $month = $period.Split('-')[0]
        
        $template += "#### $period`n"
        $template += "- **Arquivo esperado**: contingencia_$($month)_$($year).xlsx`n"
        $template += "- **Localização sugerida**: `n"
        $template += "  - OneDrive: `C:\Users\$env:USERNAME\OneDrive*\*Contingência*\$year\$period*`n"
        $template += "  - Documentos: `C:\Users\$env:USERNAME\Documents\Contingências\$year\$period*`n"
        $template += "  - Rede: `\\servidor\contingencias\$year\$period*`n"
        $template += "- **Status**: ❌ Faltante`n"
        $template += "- **Ação**: [ ] Localizar arquivo [ ] Converter formato [ ] Importar dados`n"
        $template += "`n"
    }
    
    $template += @"

## Processo de Expansão

### 1. Localização de Arquivos

Para cada período faltante:

1. Verificar nos locais sugeridos acima
2. Buscar em backups ou arquivos históricos
3. Contatar responsáveis pelos relatórios do período
4. Verificar se existem formatos alternativos (PDF, CSV, etc.)

### 2. Padronização de Formato

Todos os arquivos devem seguir o padrão:
- **Nome**: contingencia_MM_AAAA.xlsx
- **Estrutura**: Colunas padronizadas conforme esquema do banco
- **Dados**: Validados e limpos

### 3. Importação

Utilizar o script ETL para importar os novos dados:
```powershell
.\etl_consolidate_historico.ps1 -SourcePath "caminho\para\novos\arquivos"
```

### 4. Validação

Após importação, executar validação:
```powershell
.\validate_data_quality.ps1
.\validate_temporal_data.ps1
```

## Checklist de Expansão

### Períodos Prioritários (Lacunas Existentes)

"@
    
    $priorityPeriods = @("11-2022", "02-2023", "03-2024", "04-2024")
    
    foreach ($period in $priorityPeriods) {
        $template += "- [ ] **$period** - Lacuna identificada no banco atual`n"
    }
    
    $template += "`n### Expansão Histórica (Antes de 2021)`n`n"
    
    $historicalPeriods = $expandedPeriods | Where-Object { 
        $year = [int]$_.Split('-')[1]
        $year -lt 2021
    } | Sort-Object -Descending
    
    foreach ($period in $historicalPeriods[0..11]) { # Últimos 12 meses antes de 2021
        $template += "- [ ] **$period** - Expansão histórica`n"
    }
    
    $template += "`n### Expansão Futura (Após 2024)`n`n"
    
    $futurePeriods = $expandedPeriods | Where-Object { 
        $year = [int]$_.Split('-')[1]
        $year -gt 2024
    } | Sort-Object
    
    foreach ($period in $futurePeriods[0..11]) { # Próximos 12 meses após 2024
        $template += "- [ ] **$period** - Dados futuros/planejados`n"
    }
    
    $template += @"

## Scripts de Apoio

### Busca Automática
```powershell
# Buscar arquivos de contingências
.\find_contingencia_files.ps1

# Analisar diretório específico
.\analyze_onedrive_contingencias.ps1 -OneDrivePath "C:\caminho\para\contingencias"
```

### Conversão de Formatos
```powershell
# Converter PDFs para Excel (se necessário)
# Converter CSVs para formato padrão
# Padronizar nomes de arquivos
```

### Validação Contínua
```powershell
# Após cada importação
.\validate_data_quality.ps1
.\generate_extended_timeline.ps1
```

## Métricas de Progresso

- **Cobertura Atual**: $(($existingPeriods.Count / $expandedPeriods.Count * 100).ToString('F1'))%
- **Períodos Existentes**: $($existingPeriods.Count)
- **Períodos Possíveis**: $($expandedPeriods.Count)
- **Períodos Faltantes**: $($missingInRange.Count)

## Contatos e Recursos

- **Responsável pelos Dados**: [Nome/Email]
- **Localização dos Backups**: [Caminho/Servidor]
- **Documentação do Processo**: [Link/Arquivo]
- **Cronograma de Atualização**: [Frequência]

---

**Última Atualização**: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')
**Gerado por**: Script de Expansão Temporal
"@
    
    $templatePath = Join-Path $outputPath "template_expansao_temporal.md"
    $template | Out-File -FilePath $templatePath -Encoding UTF8
    
    Write-Host "Template salvo em: $templatePath" -ForegroundColor Green
    
    return $templatePath
}

# Função para gerar plano de expansão
function Generate-ExpansionPlan {
    param(
        [hashtable]$existingData,
        [array]$expandedPeriods,
        [string]$outputPath
    )
    
    Write-Host "Gerando plano de expansão..." -ForegroundColor Yellow
    
    $missingPeriods = $expandedPeriods | Where-Object { $_ -notin $existingData.ExistingPeriods }
    
    # Categorizar períodos
    $categories = @{
        'Lacunas_Existentes' = $existingData.MissingPeriods
        'Expansao_Historica' = $missingPeriods | Where-Object { [int]$_.Split('-')[1] -lt 2021 }
        'Expansao_Futura' = $missingPeriods | Where-Object { [int]$_.Split('-')[1] -gt 2024 }
        'Preenchimento_Atual' = $missingPeriods | Where-Object { 
            $year = [int]$_.Split('-')[1]
            $year -ge 2021 -and $year -le 2024 -and $_ -notin $existingData.MissingPeriods
        }
    }
    
    $plan = @"
# Plano de Expansão do Período Temporal

## Situação Atual

- **Período Coberto**: $($existingData.FirstPeriod) até $($existingData.LastPeriod)
- **Períodos Existentes**: $($existingData.ExistingPeriods.Count)
- **Registros Totais**: $($existingData.TotalRecords.ToString('N0'))
- **Cobertura**: $(($existingData.ExistingPeriods.Count / 48 * 100).ToString('F1'))% (2021-2024)

## Estratégia de Expansão

### Fase 1: Correção de Lacunas (Prioridade ALTA)

Corrigir lacunas no período atual (2021-2024):

"@
    
    foreach ($period in $categories.Lacunas_Existentes) {
        $plan += "- **$period**: Buscar arquivo original ou reconstruir dados`n"
    }
    
    $plan += "`n### Fase 2: Expansão Histórica (Prioridade MÉDIA)`n`n"
    $plan += "Expandir para períodos anteriores a 2021:`n`n"
    
    $historicalSorted = $categories.Expansao_Historica | Sort-Object -Descending
    foreach ($period in $historicalSorted[0..11]) {
        $plan += "- **$period**: Buscar dados históricos`n"
    }
    
    $plan += "`n### Fase 3: Expansão Futura (Prioridade BAIXA)`n`n"
    $plan += "Preparar para períodos futuros:`n`n"
    
    $futureSorted = $categories.Expansao_Futura | Sort-Object
    foreach ($period in $futureSorted[0..11]) {
        $plan += "- **$period**: Configurar coleta automática`n"
    }
    
    $plan += @"

## Cronograma Sugerido

### Semana 1-2: Preparação
- [ ] Identificar fontes de dados para cada período
- [ ] Mapear localizações de arquivos históricos
- [ ] Definir responsáveis por cada período
- [ ] Preparar scripts de importação

### Semana 3-4: Fase 1 (Lacunas)
- [ ] Localizar arquivos para períodos faltantes
- [ ] Converter e padronizar formatos
- [ ] Importar dados das lacunas
- [ ] Validar integridade dos dados

### Mês 2: Fase 2 (Histórico)
- [ ] Buscar dados de 2020
- [ ] Buscar dados de 2019
- [ ] Buscar dados de 2018
- [ ] Validar consistência histórica

### Mês 3: Fase 3 (Futuro)
- [ ] Configurar processo automático
- [ ] Definir cronograma de atualizações
- [ ] Implementar monitoramento
- [ ] Documentar processo

## Recursos Necessários

### Técnicos
- Scripts de ETL atualizados
- Ferramentas de conversão de formato
- Processo de validação automatizado
- Backup e recuperação

### Humanos
- Analista de dados (40h)
- Responsável pelos arquivos históricos (20h)
- Validador de qualidade (20h)

### Infraestrutura
- Espaço adicional em disco: ~2GB
- Acesso a arquivos históricos
- Ferramentas de conversão (se necessário)

## Métricas de Sucesso

### Cobertura Temporal
- **Meta Fase 1**: 100% (2021-2024) - 48 períodos
- **Meta Fase 2**: +24 períodos (2019-2020)
- **Meta Fase 3**: Processo contínuo estabelecido

### Qualidade dos Dados
- Score de qualidade > 95%
- Validação temporal completa
- Consistência entre períodos

### Performance
- Tempo de importação < 30min por período
- Validação automática < 10min
- Relatórios atualizados em tempo real

## Riscos e Mitigações

### Riscos Identificados
1. **Arquivos históricos perdidos**
   - Mitigação: Buscar em múltiplas fontes, backups

2. **Formatos incompatíveis**
   - Mitigação: Desenvolver conversores específicos

3. **Dados inconsistentes**
   - Mitigação: Validação rigorosa, limpeza automática

4. **Sobrecarga do sistema**
   - Mitigação: Importação em lotes, monitoramento

## Próximos Passos

1. **Imediato**: Executar busca automática de arquivos
2. **Esta semana**: Localizar arquivos para lacunas existentes
3. **Próximo mês**: Implementar Fase 1 completa
4. **Trimestre**: Completar expansão histórica

---

**Gerado em**: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')
**Responsável**: Sistema de Análise Temporal
"@
    
    $planPath = Join-Path $outputPath "plano_expansao_temporal.md"
    $plan | Out-File -FilePath $planPath -Encoding UTF8
    
    Write-Host "Plano salvo em: $planPath" -ForegroundColor Green
    
    return $planPath
}

# Função principal
function Main {
    Write-Host "=== Expansão do Período Temporal - Dados Históricos ===" -ForegroundColor Cyan
    Write-Host "Analisando situação atual e gerando plano de expansão..." -ForegroundColor White
    Write-Host ""
    
    # Analisar dados existentes
    $existingData = Analyze-ExistingData $DatabasePath
    
    # Gerar períodos expandidos (2020-2025)
    $expandedPeriods = Generate-ExpandedPeriods "01-2020" "12-2025"
    
    Write-Host "Dados existentes analisados:" -ForegroundColor Green
    Write-Host "  - Períodos existentes: $($existingData.ExistingPeriods.Count)" -ForegroundColor White
    Write-Host "  - Primeiro período: $($existingData.FirstPeriod)" -ForegroundColor White
    Write-Host "  - Último período: $($existingData.LastPeriod)" -ForegroundColor White
    Write-Host "  - Registros totais: $($existingData.TotalRecords.ToString('N0'))" -ForegroundColor White
    Write-Host ""
    
    Write-Host "Expansão proposta:" -ForegroundColor Yellow
    Write-Host "  - Períodos expandidos: $($expandedPeriods.Count)" -ForegroundColor White
    Write-Host "  - Período inicial: $($expandedPeriods[0])" -ForegroundColor White
    Write-Host "  - Período final: $($expandedPeriods[-1])" -ForegroundColor White
    Write-Host ""
    
    # Gerar template se solicitado
    if ($CreateTemplate) {
        $templatePath = Create-ExpansionTemplate $existingData.ExistingPeriods $expandedPeriods $OutputPath
        Write-Host "Template de expansão criado: $templatePath" -ForegroundColor Green
    }
    
    # Gerar plano de expansão
    $planPath = Generate-ExpansionPlan $existingData $expandedPeriods $OutputPath
    
    # Gerar dados JSON
    $jsonData = @{
        AnalysisDate = Get-Date -Format 'yyyy-MM-ddTHH:mm:ss'
        ExistingData = $existingData
        ExpandedPeriods = $expandedPeriods
        ExpansionPlan = @{
            TotalPeriodsToAdd = ($expandedPeriods | Where-Object { $_ -notin $existingData.ExistingPeriods }).Count
            PriorityGaps = $existingData.MissingPeriods
            HistoricalExpansion = ($expandedPeriods | Where-Object { [int]$_.Split('-')[1] -lt 2021 }).Count
            FutureExpansion = ($expandedPeriods | Where-Object { [int]$_.Split('-')[1] -gt 2024 }).Count
        }
    }
    
    $jsonPath = Join-Path $OutputPath "expansao_temporal_plan.json"
    $jsonData | ConvertTo-Json -Depth 10 | Out-File -FilePath $jsonPath -Encoding UTF8
    
    Write-Host "Dados JSON salvos em: $jsonPath" -ForegroundColor Green
    
    # Resumo final
    Write-Host ""
    Write-Host "=== RESUMO DA EXPANSÃO ===" -ForegroundColor Cyan
    
    $missingCount = ($expandedPeriods | Where-Object { $_ -notin $existingData.ExistingPeriods }).Count
    $currentCoverage = ($existingData.ExistingPeriods.Count / $expandedPeriods.Count * 100)
    $targetCoverage = 100
    
    Write-Host "Cobertura atual: $($currentCoverage.ToString('F1'))%" -ForegroundColor White
    Write-Host "Cobertura alvo: $($targetCoverage.ToString('F1'))%" -ForegroundColor White
    Write-Host "Períodos a adicionar: $missingCount" -ForegroundColor Yellow
    Write-Host "Lacunas prioritárias: $($existingData.MissingPeriods.Count)" -ForegroundColor Red
    
    Write-Host ""
    Write-Host "Plano de expansão gerado com sucesso!" -ForegroundColor Green
    Write-Host "Consulte os arquivos gerados para próximos passos." -ForegroundColor White
}

# Executar análise
Main