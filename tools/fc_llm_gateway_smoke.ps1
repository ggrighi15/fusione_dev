param(
  [string]$Root = "C:\Aggregatto\Core",
  [string]$HostUrl = "http://127.0.0.1:8000",
  [string]$PayloadPath = "",
  [int]$WaitSeconds = 30
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

try { chcp 65001 | Out-Null } catch {}
try { [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false) } catch {}

function Write-Info([string]$msg) { Write-Host ("[INFO] " + $msg) }
function Write-Warn([string]$msg) { Write-Host ("[WARN] " + $msg) -ForegroundColor Yellow }
function Write-Err ([string]$msg) { Write-Host ("[ERR ] " + $msg) -ForegroundColor Red }

if (-not (Test-Path $Root)) { throw "Root nao existe: $Root" }
Set-Location $Root

if (-not (Test-Path ".\.venv\Scripts\Activate.ps1")) {
  Write-Info "Criando venv..."
  py -m venv .venv
}

Write-Info "Ativando venv..."
. .\.venv\Scripts\Activate.ps1

Write-Info "Atualizando pip..."
python -m pip install --upgrade pip | Out-Null

if (-not (Test-Path ".\requirements.txt")) { throw "requirements.txt nao encontrado em $Root" }
Write-Info "Instalando dependencias..."
pip install -r .\requirements.txt | Out-Null

if (-not $env:DATABASE_URL) {
  $env:DATABASE_URL = "sqlite:///" + (Join-Path $Root "fusionecore_smoke.db")
  Write-Warn "DATABASE_URL nao informado; usando $env:DATABASE_URL"
}
if (-not $env:REDIS_URL) {
  $env:REDIS_URL = "redis://localhost:6379/0"
  Write-Warn "REDIS_URL nao informado; usando $env:REDIS_URL"
}
if (-not $env:SECRET_KEY) {
  $env:SECRET_KEY = "smoke_test_secret_key"
  Write-Warn "SECRET_KEY nao informado; usando valor temporario de smoke."
}
if (-not $env:LLM_REQUIRE_TRUSTED_IDENTITY) {
  $env:LLM_REQUIRE_TRUSTED_IDENTITY = "false"
}
if (-not $env:LLM_ALLOW_BODY_IDENTITY_FALLBACK) {
  $env:LLM_ALLOW_BODY_IDENTITY_FALLBACK = "true"
}
if (-not $env:LLM_GATEWAY_MOCK_MODE) {
  $env:LLM_GATEWAY_MOCK_MODE = "true"
}

Write-Info "Aplicando migrations SQL..."
python .\scripts\apply_db_migrations.py | Out-Null

Write-Info "Compileall (sanidade)..."
python -m compileall . | Out-Null

$uvArgs = @("-m","uvicorn","fc_core.api.main:app","--host","0.0.0.0","--port","8000")
Write-Info "Subindo Uvicorn em background..."
$smokeOut = Join-Path $Root "outputs\automation\llm_gateway_smoke_uvicorn.out.log"
$smokeErr = Join-Path $Root "outputs\automation\llm_gateway_smoke_uvicorn.err.log"
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $smokeOut) | Out-Null
$proc = Start-Process -FilePath "python" -ArgumentList $uvArgs -PassThru -WindowStyle Hidden -RedirectStandardOutput $smokeOut -RedirectStandardError $smokeErr

$deadline = (Get-Date).AddSeconds($WaitSeconds)
$ok = $false
while ((Get-Date) -lt $deadline) {
  try {
    $r = Invoke-WebRequest -Uri "$HostUrl/openapi.json" -UseBasicParsing -TimeoutSec 3
    if ($r.StatusCode -eq 200 -and $r.Content.Length -gt 50) { $ok = $true; break }
  } catch {}
  Start-Sleep -Milliseconds 500
}

if (-not $ok) {
  try { Stop-Process -Id $proc.Id -Force } catch {}
  if (Test-Path $smokeErr) {
    Write-Err "Uvicorn stderr:"
    Get-Content -Path $smokeErr -Tail 120 | ForEach-Object { Write-Host $_ }
  }
  throw "API nao respondeu em $WaitSeconds s em $HostUrl/openapi.json"
}

Write-Info "API OK: openapi.json respondeu."

if ($PayloadPath -and (Test-Path $PayloadPath)) {
  Write-Info "Carregando payload: $PayloadPath"
  $json = Get-Content -Raw -Path $PayloadPath -Encoding UTF8

  Write-Info "POST $HostUrl/llm/chat"
  try {
    $resp = Invoke-RestMethod -Method Post -Uri "$HostUrl/llm/chat" -ContentType "application/json" -Body $json -TimeoutSec 120
    Write-Host ""
    Write-Info "Resposta (resumo):"
    $resp | ConvertTo-Json -Depth 10
  } catch {
    Write-Err "Falhou POST /llm/chat: $($_.Exception.Message)"
    throw
  }
} else {
  Write-Warn "PayloadPath nao informado ou arquivo nao existe. Pulando POST /llm/chat."
  Write-Warn "Para testar, passe: -PayloadPath C:\Aggregatto\Core\docs\llm_gateway_payload.json"
}

Write-Info "Encerrando Uvicorn..."
try { Stop-Process -Id $proc.Id -Force } catch {}
Write-Info "Smoke finalizado OK."
