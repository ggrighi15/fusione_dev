param(
  [string]$Root = (Get-Location).Path
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Info([string]$msg) { Write-Host "[INFO] $msg" }
function Warn([string]$msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }

Set-Location $Root

$gitleaks = Get-Command gitleaks -ErrorAction SilentlyContinue
if (-not $gitleaks) {
  Warn "gitleaks not found on PATH. Install from https://github.com/gitleaks/gitleaks/releases."
  exit 2
}

Info "Running gitleaks on working tree..."
gitleaks detect --redact --no-git -v
if ($LASTEXITCODE -ne 0) {
  throw "gitleaks detected potential secrets in working tree."
}

Info "No secret exposure detected in working tree."
