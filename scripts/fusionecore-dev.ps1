param(
  [Parameter(Position = 0)]
  [ValidateSet("feature", "commit", "sync", "deploy", "test", "ai", "db", "lint", "format", "clean", "backup", "status", "help")]
  [string]$Command = "help",

  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$CliArgs,

  [switch]$Apply
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Info([string]$Message) { Write-Host $Message -ForegroundColor Cyan }
function Write-Warn([string]$Message) { Write-Host $Message -ForegroundColor Yellow }
function Write-Ok([string]$Message) { Write-Host $Message -ForegroundColor Green }
function Fail([string]$Message) { Write-Error $Message; exit 1 }

function Resolve-RepoRoot {
  $root = Resolve-Path (Join-Path $PSScriptRoot "..")
  return $root.Path
}

$RepoRoot = Resolve-RepoRoot
$DefaultProject = Join-Path $RepoRoot "fusionecore"
$ProjectPath = if (Test-Path (Join-Path $DefaultProject "package.json")) { $DefaultProject } else { $RepoRoot }
$ScriptsPath = Join-Path $RepoRoot "scripts"
$DocsPath = Join-Path $RepoRoot "docs"

function Get-Slug([string]$Raw) {
  $slug = $Raw.ToLowerInvariant()
  $slug = $slug -replace "[^a-z0-9]+", "-"
  $slug = $slug.Trim("-")
  if ([string]::IsNullOrWhiteSpace($slug)) {
    Fail "Nome invalido: $Raw"
  }
  return $slug
}

function Run-Step {
  param(
    [string]$Exe,
    [string[]]$StepArgs,
    [string]$Cwd = $ProjectPath,
    [switch]$Mutating
  )

  $cmd = "$Exe " + ($StepArgs -join " ")
  if ($Mutating -and -not $Apply) {
    Write-Warn "[dry-run] $cmd"
    return
  }

  Push-Location $Cwd
  try {
    Write-Host $cmd -ForegroundColor DarkGray
    & $Exe @StepArgs
    if ($LASTEXITCODE -ne 0) {
      Fail "Falha no comando: $cmd"
    }
  } finally {
    Pop-Location
  }
}

function Run-PwshScript {
  param(
    [string]$ScriptName,
    [string[]]$ScriptArgs
  )

  $scriptPath = Join-Path $ScriptsPath $ScriptName
  if (-not (Test-Path $scriptPath)) {
    Fail "Script nao encontrado: $scriptPath"
  }

  $pwshArgs = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $scriptPath
  ) + $ScriptArgs

  Run-Step -Exe "powershell" -StepArgs $pwshArgs -Cwd $RepoRoot
}

function Ensure-GitRepo {
  Push-Location $ProjectPath
  try {
    & git rev-parse --is-inside-work-tree 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
      Fail "Diretorio de projeto nao e um repositorio Git: $ProjectPath"
    }
  } finally {
    Pop-Location
  }
}

function Show-Help {
  @"
FusioneCore Dev CLI

Uso:
  .\scripts\fusionecore-dev.ps1 <comando> [args] [-Apply]

Comandos:
  feature create <nome> [descricao]      Cria branch feature/* (usa scripts/new-feature.ps1)
  feature finish <nome|feature/nome>     Finaliza branch (usa scripts/finish-feature.ps1)
  feature hotfix <nome> [descricao]      Cria branch hotfix/* (usa scripts/new-hotfix.ps1)
  feature release <versao> [descricao]   Cria branch release/* (usa scripts/new-release.ps1)
  feature list                           Lista branches feature/hotfix/release

  commit <mensagem> [--type tipo]        Commit + push (Conventional Commits)
  sync to-manus                          Push para remoto
  sync from-manus                        Pull + pnpm install
  sync status                            Status Git resumido

  deploy manus                           Testes + build e instrucoes de deploy
  deploy local                           pnpm dev

  test all|unit|watch|coverage           Executa testes
  db push|pull|seed                      Executa scripts de banco (pnpm)
  lint                                   pnpm lint
  format                                 pnpm format
  clean                                  Remove node_modules/.turbo/dist (requer -Apply)
  backup                                 Gera zip em _local/backups
  ai chatgpt|gemini|copilot|context      Atalhos para assistentes
  status                                 Status geral do projeto
  help                                   Esta ajuda

Modo seguro:
  Sem -Apply, comandos mutantes exibem preview (dry-run).
"@ | Write-Host
}

function Handle-Feature {
  if ($CliArgs.Count -lt 1) {
    Fail "Uso: feature <create|finish|hotfix|release|list> ..."
  }
  $action = $CliArgs[0].ToLowerInvariant()

  switch ($action) {
    "create" {
      if ($CliArgs.Count -lt 2) { Fail "Uso: feature create <nome> [descricao]" }
      $name = $CliArgs[1]
      $description = if ($CliArgs.Count -ge 3) { ($CliArgs[2..($CliArgs.Count - 1)] -join " ") } else { "" }
      $scriptArgs = @("-FeatureName", $name, "-Type", "feature", "-BaseBranch", "develop")
      if ($description) { $scriptArgs += @("-Description", $description) }
      if (-not $Apply) { $scriptArgs += "-AllowDirty" }
      if ($Apply) { $scriptArgs += "-Apply" }
      Run-PwshScript -ScriptName "new-feature.ps1" -ScriptArgs $scriptArgs
    }
    "finish" {
      if ($CliArgs.Count -lt 2) { Fail "Uso: feature finish <nome|feature/nome>" }
      $name = $CliArgs[1]
      $feature = if ($name.Contains("/")) { $name } else { "feature/$(Get-Slug $name)" }
      $scriptArgs = @("-FeatureName", $feature, "-BaseBranch", "develop")
      if (-not $Apply) { $scriptArgs += "-AllowDirty" }
      if ($Apply) { $scriptArgs += "-Apply" }
      Run-PwshScript -ScriptName "finish-feature.ps1" -ScriptArgs $scriptArgs
    }
    "hotfix" {
      if ($CliArgs.Count -lt 2) { Fail "Uso: feature hotfix <nome> [descricao]" }
      $name = $CliArgs[1]
      $description = if ($CliArgs.Count -ge 3) { ($CliArgs[2..($CliArgs.Count - 1)] -join " ") } else { "" }
      $scriptArgs = @("-HotfixName", $name, "-BaseBranch", "main")
      if ($description) { $scriptArgs += @("-Description", $description) }
      if (-not $Apply) { $scriptArgs += "-AllowDirty" }
      if ($Apply) { $scriptArgs += "-Apply" }
      Run-PwshScript -ScriptName "new-hotfix.ps1" -ScriptArgs $scriptArgs
    }
    "release" {
      if ($CliArgs.Count -lt 2) { Fail "Uso: feature release <versao> [descricao]" }
      $version = $CliArgs[1]
      $description = if ($CliArgs.Count -ge 3) { ($CliArgs[2..($CliArgs.Count - 1)] -join " ") } else { "" }
      $scriptArgs = @("-Version", $version, "-BaseBranch", "develop")
      if ($description) { $scriptArgs += @("-Description", $description) }
      if (-not $Apply) { $scriptArgs += "-AllowDirty" }
      if ($Apply) { $scriptArgs += "-Apply" }
      Run-PwshScript -ScriptName "new-release.ps1" -ScriptArgs $scriptArgs
    }
    "list" {
      Run-Step -Exe "git" -StepArgs @("branch", "--list", "feature/*", "hotfix/*", "release/*")
    }
    default {
      Fail "Acao de feature invalida: $action"
    }
  }
}

function Handle-Commit {
  if ($CliArgs.Count -lt 1) { Fail "Uso: commit <mensagem> [--type tipo]" }
  $raw = @($CliArgs)
  $type = ""
  $msgParts = New-Object System.Collections.Generic.List[string]

  for ($i = 0; $i -lt $raw.Count; $i++) {
    if ($raw[$i] -eq "--type" -and $i + 1 -lt $raw.Count) {
      $type = $raw[$i + 1]
      $i++
      continue
    }
    $msgParts.Add($raw[$i]) | Out-Null
  }

  $message = ($msgParts -join " ").Trim()
  if (-not $message) { Fail "Mensagem de commit vazia." }

  if ($type) {
    $message = "${type}: $message"
  }

  Run-Step -Exe "git" -StepArgs @("add", ".") -Mutating
  Run-Step -Exe "git" -StepArgs @("commit", "-m", $message) -Mutating
  Run-Step -Exe "git" -StepArgs @("push") -Mutating
}

function Handle-Sync {
  if ($CliArgs.Count -lt 1) { Fail "Uso: sync <to-manus|from-manus|status>" }
  $direction = $CliArgs[0].ToLowerInvariant()
  switch ($direction) {
    "to-manus" {
      Run-Step -Exe "git" -StepArgs @("push") -Mutating
    }
    "from-manus" {
      Run-Step -Exe "git" -StepArgs @("pull") -Mutating
      Run-Step -Exe "pnpm" -StepArgs @("install")
    }
    "status" {
      Run-Step -Exe "git" -StepArgs @("status", "-sb")
      Run-Step -Exe "git" -StepArgs @("log", "--oneline", "-5")
    }
    default {
      Fail "Direcao invalida: $direction"
    }
  }
}

function Handle-Deploy {
  if ($CliArgs.Count -lt 1) { Fail "Uso: deploy <manus|local>" }
  $target = $CliArgs[0].ToLowerInvariant()
  switch ($target) {
    "manus" {
      Run-Step -Exe "pnpm" -StepArgs @("test")
      Run-Step -Exe "pnpm" -StepArgs @("build")
      Write-Info "Passos no Manus:"
      Write-Host "  cd /home/ubuntu/fusionecore"
      Write-Host "  git pull"
      Write-Host "  pnpm install"
      Write-Host "  pnpm db:push"
      Write-Host "  pnpm build"
    }
    "local" {
      Run-Step -Exe "pnpm" -StepArgs @("dev")
    }
    default {
      Fail "Target invalido: $target"
    }
  }
}

function Handle-Test {
  if ($CliArgs.Count -lt 1) { Fail "Uso: test <all|unit|watch|coverage>" }
  $scope = $CliArgs[0].ToLowerInvariant()
  switch ($scope) {
    "all" { Run-Step -Exe "pnpm" -StepArgs @("test") }
    "unit" { Run-Step -Exe "pnpm" -StepArgs @("test", "--", "--run") }
    "watch" { Run-Step -Exe "pnpm" -StepArgs @("test") }
    "coverage" { Run-Step -Exe "pnpm" -StepArgs @("test", "--", "--coverage") }
    default { Fail "Escopo de teste invalido: $scope" }
  }
}

function Handle-Db {
  if ($CliArgs.Count -lt 1) { Fail "Uso: db <push|pull|seed>" }
  $action = $CliArgs[0].ToLowerInvariant()
  switch ($action) {
    "push" { Run-Step -Exe "pnpm" -StepArgs @("db:push") -Mutating }
    "pull" { Run-Step -Exe "pnpm" -StepArgs @("db:pull") }
    "seed" { Run-Step -Exe "pnpm" -StepArgs @("db:seed") -Mutating }
    default { Fail "Acao de db invalida: $action" }
  }
}

function Handle-Ai {
  if ($CliArgs.Count -lt 1) { Fail "Uso: ai <chatgpt|gemini|copilot|context>" }
  $assistant = $CliArgs[0].ToLowerInvariant()
  switch ($assistant) {
    "chatgpt" { Start-Process "https://chat.openai.com/" | Out-Null }
    "gemini" { Start-Process "https://gemini.google.com/" | Out-Null }
    "copilot" {
      Write-Info "Use o chat do Copilot no VSCode (Ctrl+I)."
    }
    "context" {
      $contextFile = Join-Path $DocsPath "fusionecore-context-script.md"
      if (Test-Path $contextFile) {
        Start-Process "notepad.exe" $contextFile | Out-Null
      } else {
        Write-Warn "Arquivo de contexto nao encontrado: $contextFile"
      }
    }
    default { Fail "Assistente invalido: $assistant" }
  }
}

function Handle-Status {
  Write-Info "Repo root: $RepoRoot"
  Write-Info "Project path: $ProjectPath"
  Write-Info "Apply mode: $($Apply.IsPresent)"
  Run-Step -Exe "git" -StepArgs @("status", "-sb")
  Run-Step -Exe "git" -StepArgs @("branch", "--show-current")
}

function Handle-Clean {
  $targets = @(
    (Join-Path $ProjectPath "node_modules"),
    (Join-Path $ProjectPath ".turbo"),
    (Join-Path $ProjectPath "dist")
  )

  foreach ($target in $targets) {
    if (-not (Test-Path $target)) { continue }
    if (-not $Apply) {
      Write-Warn "[dry-run] Remove-Item -Recurse -Force $target"
      continue
    }
    Remove-Item -Recurse -Force $target
    Write-Ok "Removido: $target"
  }
}

function Handle-Backup {
  $backupDir = Join-Path $RepoRoot "_local\backups"
  if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
  }
  $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $outFile = Join-Path $backupDir "fusionecore_backup_$stamp.zip"
  Compress-Archive -Path (Join-Path $ProjectPath "*") -DestinationPath $outFile -Force
  Write-Ok "Backup criado: $outFile"
}

Ensure-GitRepo
Write-Info "=== FusioneCore Dev CLI ==="
if (-not $Apply) {
  Write-Warn "Modo DRY-RUN ativo para comandos mutantes. Use -Apply para executar."
}

switch ($Command.ToLowerInvariant()) {
  "feature" { Handle-Feature; break }
  "commit" { Handle-Commit; break }
  "sync" { Handle-Sync; break }
  "deploy" { Handle-Deploy; break }
  "test" { Handle-Test; break }
  "ai" { Handle-Ai; break }
  "db" { Handle-Db; break }
  "lint" { Run-Step -Exe "pnpm" -StepArgs @("lint"); break }
  "format" { Run-Step -Exe "pnpm" -StepArgs @("format") -Mutating; break }
  "clean" { Handle-Clean; break }
  "backup" { Handle-Backup; break }
  "status" { Handle-Status; break }
  "help" { Show-Help; break }
  default { Show-Help; break }
}
