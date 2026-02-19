param(
  [Parameter(Mandatory=$true)]
  [string]$RepoPath,

  # ex: ggrighi15/fusione_dev
  [Parameter(Mandatory=$true)]
  [string]$RepoSlug,

  [string]$Remote = "origin",

  # Bases para checar se o branch foi absorvido
  [string[]]$BaseBranches = @("main","develop"),

  # Padroes de inclusao (se -Branches nao for informado)
  [string[]]$IncludePatterns = @("feat/*","hotfix/*"),

  # Branches a nunca deletar
  [string[]]$ExcludeBranches = @("main","develop"),

  # Lista explicita de branches (sem prefixo origin/)
  [string[]]$Branches = @(),

  # Se true, permite delecao quando houver PR merged na base (compativel com squash merge)
  [switch]$AllowMergedPR,

  [switch]$DryRun,
  [switch]$Apply,

  # Se nao der pra checar PR (sem gh) ou se nao for ancestor/mergedPR, ainda assim permite deletar
  [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

try { chcp 65001 | Out-Null } catch {}
try { [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false) } catch {}

function Info($m){ Write-Host "[INFO] $m" }
function Warn($m){ Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Err ($m){ Write-Host "[ERR ] $m" -ForegroundColor Red }

if (-not $DryRun -and -not $Apply) { $DryRun = $true }
if ($DryRun -and $Apply) { throw "Use apenas um: -DryRun OU -Apply" }

if (-not (Test-Path $RepoPath)) { throw "RepoPath nao existe: $RepoPath" }
if (-not (Test-Path (Join-Path $RepoPath ".git"))) { throw "Nao e um repo git: $RepoPath" }

# Normaliza Branches quando vier como string unica com virgulas: "a,b,c"
if ($Branches -and $Branches.Count -eq 1 -and ($Branches[0] -match ",")) {
  $Branches = $Branches[0].Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ }
}

# Verifica gh
$gh = Get-Command gh -ErrorAction SilentlyContinue
$hasGh = [bool]$gh

# Diretorio de relatorio
$stamp = (Get-Date -Format "yyyyMMdd_HHmmss")
$reportDir = "C:\Aggregatto\outputs\remote_prune_$stamp"
New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
$csvPath = Join-Path $reportDir "remote_branch_prune_plan.csv"
$mdPath  = Join-Path $reportDir "remote_branch_prune_plan.md"

Info "Repo: $RepoSlug"
Info "RepoPath: $RepoPath"
Info ("Mode: " + ($(if($Apply){"APPLY"} else {"DRYRUN"})))
Info ("AllowMergedPR(squash): " + $AllowMergedPR.IsPresent)
Info "ReportDir: $reportDir"

# Atualiza refs
Info "Fetching remotes..."
git -C $RepoPath fetch --all --prune | Out-Null

# Lista branches remotos origin/*
$refs = git -C $RepoPath for-each-ref "refs/remotes/$Remote" --format="%(refname:short)" |
  ForEach-Object { $_.Trim() } | Where-Object { $_ }

# Normaliza: origin/xyz -> xyz
$remoteBranches = $refs | ForEach-Object {
  if ($_ -like "$Remote/*") { $_.Substring($Remote.Length+1) } else { $_ }
} | Where-Object { $_ -and ($_ -ne "HEAD") }

# Selecao inicial
$candidates = @()
if ($Branches -and $Branches.Count -gt 0) {
  $candidates = $remoteBranches | Where-Object { $Branches -contains $_ }
} else {
  foreach ($b in $remoteBranches) {
    foreach ($p in $IncludePatterns) {
      if ($b -like $p) { $candidates += $b; break }
    }
  }
  $candidates = $candidates | Sort-Object -Unique
}

# Exclui protegidos
$candidates = $candidates | Where-Object { $ExcludeBranches -notcontains $_ }

if (-not $candidates -or $candidates.Count -eq 0) {
  Warn "Nenhum branch candidato encontrado."
  "# Plano de limpeza (vazio)`n`nNenhum branch candidato encontrado." | Set-Content -LiteralPath $mdPath -Encoding UTF8
  Info "Report: $mdPath"
  exit 0
}

# Helper: PR aberto?
function Get-HasOpenPR([string]$branch){
  if (-not $hasGh) { return $null }
  try {
    $json = gh pr list --repo $RepoSlug --state open --head $branch --json number,baseRefName 2>$null
    if (-not $json) { return $false }
    $raw = $json.Trim()
    if ($raw -eq "[]") { return $false }
    $items = New-Object System.Collections.Generic.List[object]
    ($json | ConvertFrom-Json) | ForEach-Object {
      if ($null -ne $_) { $items.Add($_) | Out-Null }
    }
    return ($items.Count -gt 0)
  } catch {
    return $null
  }
}

# Helper: branch e ancestor de alguma base?
function Get-IsAncestorMerged([string]$branch){
  foreach ($base in $BaseBranches) {
    $rb = "$Remote/$branch"
    $bb = "$Remote/$base"
    git -C $RepoPath merge-base --is-ancestor $rb $bb 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { return $true }
  }
  return $false
}

# Helper: obter PR merged (compativel com squash) e validar mergeCommit esta contido na base
function Get-MergedPRProof([string]$branch){
  if (-not $hasGh) { return $null }

  try {
    $json = gh pr list --repo $RepoSlug --state merged --head $branch --json number,baseRefName,mergedAt,mergeCommit 2>$null
    if (-not $json) { return $null }
    $raw = $json.Trim()
    if ($raw -eq "[]") { return $null }

    $prs = New-Object System.Collections.Generic.List[object]
    ($json | ConvertFrom-Json) | ForEach-Object {
      if ($null -ne $_) { $prs.Add($_) | Out-Null }
    }
    if ($prs.Count -eq 0) { return $null }

    # filtra bases alvo
    $filtered = New-Object System.Collections.Generic.List[object]
    foreach ($item in $prs) {
      if ($BaseBranches -contains $item.baseRefName) {
        $filtered.Add($item) | Out-Null
      }
    }
    if ($filtered.Count -eq 0) { return $null }

    # ordena pelo mergedAt desc
    $sorted = $filtered | Sort-Object -Property mergedAt -Descending

    foreach ($pr in $sorted) {
      $base = $pr.baseRefName
      $oid = $null
      if ($pr.mergeCommit -and $pr.mergeCommit.oid) { $oid = $pr.mergeCommit.oid }

      if (-not $oid) { continue }

      # valida que o mergeCommit esta contido na base remota
      $bb = "$Remote/$base"
      git -C $RepoPath merge-base --is-ancestor $oid $bb 2>$null | Out-Null
      if ($LASTEXITCODE -eq 0) {
        return [pscustomobject]@{
          PRNumber = $pr.number
          Base = $base
          MergeCommit = $oid
          MergedAt = $pr.mergedAt
        }
      }
    }

    return $null
  } catch {
    return $null
  }
}

$plan = New-Object System.Collections.Generic.List[object]

foreach ($b in $candidates) {
  $hasOpen = Get-HasOpenPR $b
  $isAncestorMerged = Get-IsAncestorMerged $b
  $mergedProof = $null
  if ($AllowMergedPR -and ($hasOpen -ne $true)) {
    $mergedProof = Get-MergedPRProof $b
  }

  $prOpenState = if ($hasOpen -eq $true) { "OPEN" } elseif ($hasOpen -eq $false) { "NONE" } else { "UNKNOWN" }
  $mergedState = if ($isAncestorMerged) { "MERGED_ANCESTOR" } else { "NOT_ANCESTOR" }
  $prMergedState = if ($mergedProof) { "MERGED_PR" } else { "NONE" }

  $eligible = $false
  $reason = New-Object System.Collections.Generic.List[string]

  if ($hasOpen -eq $true) {
    $eligible = $false
    $reason.Add("pr_open") | Out-Null
  } elseif ($hasOpen -eq $null -and -not $Force) {
    $eligible = $false
    $reason.Add("pr_unknown_no_gh") | Out-Null
  }

  if (-not $isAncestorMerged -and -not $Force) {
    if ($AllowMergedPR) {
      if ($mergedProof) {
        # ok via squash-proof
      } else {
        $reason.Add("not_absorbed") | Out-Null
      }
    } else {
      $reason.Add("not_absorbed") | Out-Null
    }
  }

  if ($Force) {
    if ($hasOpen -ne $true) {
      $eligible = $true
      if (-not $isAncestorMerged -and -not $mergedProof) { $reason.Add("force_unmerged") | Out-Null }
      if ($hasOpen -eq $null) { $reason.Add("force_pr_unknown") | Out-Null }
    } else {
      $eligible = $false
      $reason.Add("force_blocked_pr_open") | Out-Null
    }
  } else {
    if (($hasOpen -eq $false) -and ($isAncestorMerged -or ($AllowMergedPR -and $mergedProof))) {
      $eligible = $true
      if ($isAncestorMerged) { $reason.Add("merged_no_pr") | Out-Null }
      elseif ($mergedProof) { $reason.Add("merged_pr_proof") | Out-Null }
    }
  }

  $plan.Add([pscustomobject]@{
    Branch = $b
    PR_Open = $prOpenState
    Merged = $mergedState
    PR_Merged_Proof = $prMergedState
    PR_Number = $(if($mergedProof){$mergedProof.PRNumber}else{""})
    PR_Base = $(if($mergedProof){$mergedProof.Base}else{""})
    PR_MergeCommit = $(if($mergedProof){$mergedProof.MergeCommit}else{""})
    Eligible = $eligible
    Reason = ($reason -join ";")
  })
}

# Relatorios
$plan | Sort-Object Eligible,Branch | Export-Csv -NoTypeInformation -Encoding UTF8 -Path $csvPath

$md = New-Object System.Text.StringBuilder
$null = $md.AppendLine("# Plano de limpeza de branches remotos")
$null = $md.AppendLine("")
$null = $md.AppendLine("Repo: $RepoSlug")
$null = $md.AppendLine("Mode: " + ($(if($Apply){"APPLY"} else {"DRYRUN"})))
$null = $md.AppendLine("AllowMergedPR(squash): " + $AllowMergedPR.IsPresent)
$null = $md.AppendLine("ReportDir: $reportDir")
$null = $md.AppendLine("")
$null = $md.AppendLine("| Branch | PR(Open) | Merged(Ancestor) | PR(Merged Proof) | Eligible | Reason |")
$null = $md.AppendLine("|---|---|---|---|---:|---|")
foreach ($r in ($plan | Sort-Object Eligible,Branch)) {
  $null = $md.AppendLine("| $($r.Branch) | $($r.PR_Open) | $($r.Merged) | $($r.PR_Merged_Proof) | $($r.Eligible) | $($r.Reason) |")
}
$md.ToString() | Set-Content -LiteralPath $mdPath -Encoding UTF8

Info "Report CSV: $csvPath"
Info "Report MD : $mdPath"

$toDelete = $plan | Where-Object { $_.Eligible -eq $true } | Select-Object -ExpandProperty Branch

if (-not $toDelete -or $toDelete.Count -eq 0) {
  Warn "Nenhum branch elegivel para delecao (pelas regras atuais)."
  exit 0
}

if ($DryRun) {
  Info "DryRun: branches elegiveis (nao deletados):"
  $toDelete | ForEach-Object { Write-Host "  - $Remote/$_" }
  exit 0
}

# APPLY
Info "Deleting eligible branches on remote '$Remote'..."
foreach ($b in $toDelete) {
  try {
    Info "Deleting: $Remote/$b"
    git -C $RepoPath push $Remote --delete $b | Out-Null
    try { git -C $RepoPath branch -dr "$Remote/$b" | Out-Null } catch {}
  } catch {
    Err ("Falhou ao deletar {0}/{1}: {2}" -f $Remote, $b, $_.Exception.Message)
  }
}

Info "Done. Veja relatorios em: $reportDir"
