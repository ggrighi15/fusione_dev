param(
  [Parameter(Mandatory = $true)]
  [string]$FeatureName,

  [string]$Description = "",

  [ValidateSet("feature", "fix", "hotfix", "release", "chore")]
  [string]$Type = "feature",

  [string]$BaseBranch = "develop",
  [string]$Remote = "origin",

  [switch]$CreatePr,
  [switch]$DraftPr,
  [switch]$AllowDirty,
  [switch]$Apply
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Fail {
  param([string]$Message)
  Write-Error $Message
  exit 1
}

function Test-Command {
  param([string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Invoke-Git {
  param(
    [string[]]$GitArgs,
    [switch]$ForceRun
  )

  $display = "git " + ($GitArgs -join " ")
  if (-not $Apply -and -not $ForceRun) {
    Write-Host "[dry-run] $display" -ForegroundColor Yellow
    return
  }

  Write-Host $display -ForegroundColor DarkGray
  & git @GitArgs
  if ($LASTEXITCODE -ne 0) {
    Fail "Falha ao executar: $display"
  }
}

function Invoke-Gh {
  param([string[]]$GhArgs)
  $display = "gh " + ($GhArgs -join " ")
  if (-not $Apply) {
    Write-Host "[dry-run] $display" -ForegroundColor Yellow
    return
  }

  Write-Host $display -ForegroundColor DarkGray
  & gh @GhArgs
  if ($LASTEXITCODE -ne 0) {
    Fail "Falha ao executar: $display"
  }
}

function Normalize-Slug {
  param([string]$Value)
  $slug = $Value.ToLowerInvariant()
  $slug = $slug -replace "[^a-z0-9]+", "-"
  $slug = $slug.Trim("-")
  if ([string]::IsNullOrWhiteSpace($slug)) {
    Fail "Nome de feature invalido apos normalizacao."
  }
  return $slug
}

if (-not (Test-Command "git")) {
  Fail "Git nao encontrado no PATH."
}

$insideWorktree = (& git rev-parse --is-inside-work-tree 2>$null)
if ($LASTEXITCODE -ne 0 -or "$insideWorktree".Trim() -ne "true") {
  Fail "Execute este script dentro de um repositorio Git."
}

$slug = Normalize-Slug -Value $FeatureName
$branch = "$Type/$slug"

Write-Step "Repositorio: $(Get-Location)"
Write-Step "Branch de destino: $branch"
Write-Step "Base branch: $BaseBranch"
if ($Apply) {
  Write-Step "Modo: APPLY"
} else {
  Write-Step "Modo: DRY-RUN (use -Apply para executar)"
}

$statusShort = (& git status --porcelain)
if ($LASTEXITCODE -ne 0) {
  Fail "Nao foi possivel ler status do git."
}
if (-not $AllowDirty -and -not [string]::IsNullOrWhiteSpace("$statusShort")) {
  Fail "Working tree suja. Commit/stash antes ou use -AllowDirty."
}

& git show-ref --verify --quiet "refs/heads/$branch"
$hasBranch = $LASTEXITCODE -eq 0
if ($hasBranch) {
  Fail "Branch local '$branch' ja existe."
}
$global:LASTEXITCODE = 0

Write-Step "Atualizando base e criando branch"
Invoke-Git -GitArgs @("fetch", $Remote)
Invoke-Git -GitArgs @("checkout", $BaseBranch)
Invoke-Git -GitArgs @("pull", "--ff-only", $Remote, $BaseBranch)
Invoke-Git -GitArgs @("checkout", "-b", $branch)

$featureDocPath = Join-Path "docs/features" "$slug.md"
$featureDocDir = Split-Path $featureDocPath -Parent
if (-not (Test-Path $featureDocDir)) {
  if ($Apply) {
    New-Item -Path $featureDocDir -ItemType Directory -Force | Out-Null
  } else {
    Write-Host "[dry-run] mkdir $featureDocDir" -ForegroundColor Yellow
  }
}

if (-not (Test-Path $featureDocPath)) {
  $doc = @"
# Feature: $FeatureName

## Contexto
$Description

## Escopo
- [ ] Definir contratos de API/tipos
- [ ] Implementar backend
- [ ] Implementar frontend
- [ ] Adicionar testes
- [ ] Atualizar documentacao

## Criterios de aceite
- [ ] Fluxo principal funcionando
- [ ] Sem regressao nas funcionalidades existentes
- [ ] Testes relevantes passando
"@
  if ($Apply) {
    $doc | Set-Content -Path $featureDocPath -Encoding UTF8
  } else {
    Write-Host "[dry-run] criar $featureDocPath" -ForegroundColor Yellow
  }
}

Write-Step "Commit inicial da feature (somente docs/features)"
Invoke-Git -GitArgs @("add", $featureDocPath)
if ($Apply) {
  $pending = (& git diff --cached --name-only)
  if (-not [string]::IsNullOrWhiteSpace("$pending")) {
    Invoke-Git -GitArgs @("commit", "-m", "chore($slug): iniciar $branch com documento da feature")
  } else {
    Write-Host "Nenhuma alteracao staged para commit inicial." -ForegroundColor DarkYellow
  }
}

Write-Step "Publicando branch"
Invoke-Git -GitArgs @("push", "-u", $Remote, $branch)

if ($CreatePr) {
  if (-not (Test-Command "gh")) {
    Write-Host "gh CLI nao encontrado; PR nao foi criado automaticamente." -ForegroundColor DarkYellow
  } else {
    $prTitle = switch ($Type) {
      "feature" { "feat: $FeatureName" }
      "fix" { "fix: $FeatureName" }
      "hotfix" { "fix: $FeatureName (hotfix)" }
      "release" { "release: $FeatureName" }
      default { "${Type}: $FeatureName" }
    }

    $prBody = @"
## Resumo
$Description

## Checklist
- [ ] Testes locais executados
- [ ] Documentacao atualizada
- [ ] Sem impacto em segredos/credenciais
"@

    $ghArgs = @(
      "pr", "create",
      "--base", $BaseBranch,
      "--head", $branch,
      "--title", $prTitle,
      "--body", $prBody
    )

    if ($DraftPr) {
      $ghArgs += "--draft"
    }

    Write-Step "Criando PR"
    Invoke-Gh -GhArgs $ghArgs
  }
}

Write-Host ""
Write-Host "Fluxo concluido." -ForegroundColor Green
Write-Host "Branch atual: $branch"
if (-not $CreatePr) {
  $hintTitle = switch ($Type) {
    "feature" { "feat: $FeatureName" }
    "fix" { "fix: $FeatureName" }
    "hotfix" { "fix: $FeatureName (hotfix)" }
    "release" { "release: $FeatureName" }
    default { "${Type}: $FeatureName" }
  }
  Write-Host "Dica: crie PR com:" -ForegroundColor DarkGray
  Write-Host "  gh pr create --base $BaseBranch --head $branch --title `"$hintTitle`"" -ForegroundColor DarkGray
}
