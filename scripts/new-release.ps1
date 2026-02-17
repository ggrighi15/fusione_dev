param(
  [Parameter(Mandatory = $true)]
  [string]$Version,

  [string]$Description = "",
  [string]$Remote = "origin",
  [string]$BaseBranch = "develop",

  [switch]$CreatePr,
  [switch]$DraftPr,
  [switch]$AllowDirty,
  [switch]$Apply
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$targetScript = Join-Path $scriptDir "new-feature.ps1"

if (-not (Test-Path $targetScript)) {
  Write-Error "Script nao encontrado: $targetScript"
  exit 1
}

$forwardParams = @{
  FeatureName = $Version
  Type = "release"
  Remote = $Remote
  BaseBranch = $BaseBranch
}

if (-not [string]::IsNullOrWhiteSpace($Description)) { $forwardParams.Description = $Description }
if ($CreatePr) { $forwardParams.CreatePr = $true }
if ($DraftPr) { $forwardParams.DraftPr = $true }
if ($AllowDirty) { $forwardParams.AllowDirty = $true }
if ($Apply) { $forwardParams.Apply = $true }

& $targetScript @forwardParams
exit $LASTEXITCODE
