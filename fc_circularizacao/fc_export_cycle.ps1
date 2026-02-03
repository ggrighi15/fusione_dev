param(
  [string]$CycleId = "",
  [switch]$IncludeAllReports,
  [switch]$IncludeDbFull,
  [switch]$Pdf,
  [switch]$PdfNoMerge,
  [string]$FilledDir = ""
)

chcp 65001 > $null
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

python --version
where.exe python

$args = @(".\src\export_cycle.py", "--zip", "--verify")

if ($CycleId -ne "") { $args += @("--cycle-id", $CycleId) }
if ($FilledDir -ne "") { $args += @("--filled-dir", $FilledDir) }
if ($IncludeAllReports) { $args += "--include-all-reports" }
if ($IncludeDbFull) { $args += "--include-db-full" }
if ($Pdf) { $args += "--pdf" }
if ($PdfNoMerge) { $args += "--pdf-no-merge" }

Write-Host ("Running: python " + ($args -join " "))

python @args
$code = $LASTEXITCODE

if ($code -eq 0) {
  Write-Host "OK: export + verify PASS"

  # --- Resumo pos-execucao (somente leitura) ---
  try {
    $exports = Join-Path (Get-Location) "exports"
    $lastPath = Join-Path $exports "LAST_EXPORT.json"

    if (Test-Path $lastPath) {
      $last = Get-Content $lastPath -Raw | ConvertFrom-Json

      Write-Host ""
      Write-Host "=== Export auditavel (ultimo) ==="
      Write-Host ("cycle_id:      " + $last.cycle_id)
      Write-Host ("export_dir:    " + $last.export_dir)
      Write-Host ("zip_path:      " + $last.zip_path)
      if ($last.zip_sha256) { Write-Host ("zip_sha256:    " + $last.zip_sha256) }

      if ($last.pdf -and $last.pdf.sha256) {
        Write-Host ("pdf_path:      " + (Join-Path $last.export_dir $last.pdf.path))
        Write-Host ("pdf_sha256:    " + $last.pdf.sha256)
        Write-Host ("pdf_merge:     " + $last.pdf.merge)
        Write-Host ("pdfs_appended: " + $last.pdf.pdfs_appended)
      } else {
        Write-Host "pdf:           (nao gerado nesta execucao)"
      }

      Write-Host ("verify_status: " + $last.verify_status)
      Write-Host ("ok_files:      " + $last.checked_files_ok)
      Write-Host ("missing_count: " + $last.missing_count)
      Write-Host ""
      Write-Host ("LAST_EXPORT:   " + $lastPath)
      Write-Host ("Logs:          " + (Join-Path (Get-Location) "logs\audit_exports"))
    } else {
      Write-Host "LAST_EXPORT.json nao encontrado em exports/ (ok, mas estranho)."
    }
  }
  catch {
    Write-Host ("Falha ao imprimir resumo: " + $_.Exception.Message)
  }

  exit 0
}

if ($code -eq 2) {
  Write-Host "FAIL: verify_report.json indicates integrity mismatch"
  exit 2
}

Write-Host ("FAIL: export returned exit code " + $code)
exit $code
