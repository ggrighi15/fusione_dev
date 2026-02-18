# Relatorio de Migracao Operacional do Aggregatto

## Sumario executivo

A migracao de `C:\fusionecore-suite` para `C:\Aggregatto\Core` foi consolidada e entrou em fase de estabilizacao operacional com:

- Core oficial como clone Git valido em `C:\Aggregatto\Core`
- Backup preservado em `C:\Aggregatto\Core_backup_20260218_040205`
- Ambiente Python padronizado em `C:\Aggregatto\.venv` com `pip check` limpo
- ETL Outlook para anexos e consolidado mestre funcionando
- Circularizacao (`.msg`/`.pst`) com `schema.sql`, dedupe e alerta `ZERO_DOCS_ALERT`
- CI ajustado e validado no PR #5

Estado atual no GitHub:

- PR: `https://github.com/ggrighi15/fusione_dev/pull/5`
- Branch: `feat/aggregatto-core-consolidation`
- CI verde nos checks exigidos
- Bloqueio remanescente: `REVIEW_REQUIRED` (politica de aprovacao)

Contagens operacionais finais:

- Automacoes: `52` (`49 ready`, `1 blocked`, `2 deprecated`)
- Termos legados (scan atual):
  - `fusione/fusionecore`: `48`
  - `propulsor`: `0`
  - `espaider`: `31`

## Evidencias de transferencia e integridade

Contrato operacional de diretorios:

- `C:\Aggregatto`
- `C:\Aggregatto\Core`
- `C:\Aggregatto\data\emails`
- `C:\Aggregatto\docs\espaider_anexos`
- `C:\Aggregatto\outputs`

Estrutura top-level observada em `C:\Aggregatto\Core`:

- Pastas: `.github`, `apps`, `fc_core`, `fc_circularizacao`, `pages`, `requirements`, `scripts`, `tests`, `utils`
- Arquivos: `.gitignore`, `app.py`, `README.md`, `render.yaml`, `requirements.txt`

Observacao:

- Existe legado fora do canone em `C:\Aggregatto\ag_core\...`; manter isolado ate limpeza final controlada.

## Robocopy seguro (preview e apply)

### Preview

```powershell
$src = "C:\fusionecore-suite"
$dst = "C:\Aggregatto\Core"
$logDir = Join-Path $dst "_migration_logs"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$log = Join-Path $logDir ("preview_" + (Get-Date -Format "yyyyMMdd_HHmmss") + ".log")

$xd = @(".git","node_modules",".venv","venv","__pycache__", ".pytest_cache",".mypy_cache",".ruff_cache",".cache","dist","build","coverage","outputs",".next")
$xf = @("*.pyc","*.pyo","*.tmp","desktop.ini")

$roboArgs = @($src,$dst,"/E","/L","/COPY:DAT","/DCOPY:DAT","/R:1","/W:1","/XJ","/NP","/TEE",("/LOG:"+$log))
foreach($d in $xd){ $roboArgs += @("/XD",(Join-Path $src $d)) }
foreach($f in $xf){ $roboArgs += @("/XF",$f) }

& robocopy @roboArgs
"LOG=$log"
"ROBOCOPY_EXIT=$LASTEXITCODE"
```

### Apply

```powershell
$src = "C:\fusionecore-suite"
$dst = "C:\Aggregatto\Core"
$logDir = Join-Path $dst "_migration_logs"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$log = Join-Path $logDir ("transfer_" + (Get-Date -Format "yyyyMMdd_HHmmss") + ".log")

$xd = @(".git","node_modules",".venv","venv","__pycache__", ".pytest_cache",".mypy_cache",".ruff_cache",".cache","dist","build","coverage","outputs",".next")
$xf = @("*.pyc","*.pyo","*.tmp","desktop.ini")

$roboArgs = @($src,$dst,"/E","/COPY:DAT","/DCOPY:DAT","/R:1","/W:1","/XJ","/NP","/TEE",("/LOG:"+$log))
foreach($d in $xd){ $roboArgs += @("/XD",(Join-Path $src $d)) }
foreach($f in $xf){ $roboArgs += @("/XF",$f) }

& robocopy @roboArgs
$code = $LASTEXITCODE
"LOG=$log"
"ROBOCOPY_EXIT=$code"
if($code -gt 7){ throw "Robocopy falhou com exit code $code (ver log)." }
```

## Mapa de automacoes

Artefatos gerados:

- `C:\Aggregatto\outputs\automation\automation_map.json`
- `C:\Aggregatto\outputs\automation\automation_map.md`
- `C:\Aggregatto\outputs\automation\installers_precheck.json`

Resumo:

- `49` ready
- `1` blocked (`install_frontend.ps1` intencional)
- `2` deprecated (`install_orchestrator*.ps1`)

## ETL Outlook e consolidacao

Scripts canonicos:

- `C:\Aggregatto\Core\scripts\automacao_aggregatto.py`
- `C:\Aggregatto\automacao_aggregatto.py`

Saidas:

- anexos: `C:\Aggregatto\docs\espaider_anexos\`
- consolidado: `C:\Aggregatto\docs\aggregatto_master_report.csv`
- logs: `C:\Aggregatto\outputs\automation\outlook_etl_run.json`

## Circularizacao robusta

Arquivos chave:

- `C:\Aggregatto\Core\fc_circularizacao\data\schema.sql`
- `C:\Aggregatto\Core\fc_circularizacao\src\init_db.py`
- `C:\Aggregatto\Core\fc_circularizacao\src\run_cycle.py`
- `C:\Aggregatto\Core\fc_circularizacao\src\ingest_eml.py`
- `C:\Aggregatto\Core\fc_circularizacao\src\report_status.py`

Comportamento esperado:

- dedupe por fingerprint
- issue `DUPLICATE_MESSAGE` em duplicatas
- issue `ZERO_DOCS_ALERT` quando detectar padrao "0 doc/0 processos"

## Namespace e padronizacao

Decisao atual:

- namespace canonico de execucao: `fc_core`
- migracao global para `ag_core` fica para fase dedicada

Risco principal residual:

- coexistencia parcial de caminhos/nomes legados fora do Core oficial

## Ambiente Python e requirements

Baseline operacional:

- Python `3.11`
- Venv padrao: `C:\Aggregatto\.venv`
- `pip check`: sem dependencias quebradas

Requirements em camadas:

- `requirements/base.txt`
- `requirements/automation.txt`
- `requirements/circularizacao.txt`
- `requirements/dev.txt`
- `requirements.txt` agregador

Regra importante de cross-platform:

- `pywin32` restrito a Windows em `requirements/automation.txt`

## Git, CI e merge

Estado atual:

- Branch limpa local/remota
- Checks obrigatorios passando
- PR bloqueado apenas por review

Comandos apos aprovacao:

```powershell
gh pr merge 5 --repo ggrighi15/fusione_dev --squash --delete-branch
```

## Checklist final

- [x] Core oficial em clone Git valido
- [x] Backup datado preservado
- [x] Venv padrao e `pip check` ok
- [x] ETL Outlook gerando consolidado
- [x] Circularizacao com schema + dedupe + alertas
- [x] CI ajustado e verde
- [ ] Aprovar PR #5 e concluir merge
