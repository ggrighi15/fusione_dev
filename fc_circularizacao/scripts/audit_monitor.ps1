# Monitoramento offline de Auditoria (export .msg/.eml)
# Uso:
#   .\audit_monitor.ps1 -ExportDir "C:\Temp\Auditoria_Export"
#
param(
  [string]$ExportDir = "C:\Temp\Auditoria_Export",
  [string]$InboxDir = "C:\fusionecore-suite\fc_circularizacao\data\inbox_eml",
  [string]$PythonExe = "C:\fusionecore-suite\fc_circularizacao\.venv\Scripts\python.exe"
)

$ErrorActionPreference = "Stop"

if (!(Test-Path $ExportDir)) {
  throw "Pasta de exportacao nao encontrada: $ExportDir"
}

if (!(Test-Path $InboxDir)) {
  New-Item -ItemType Directory -Force -Path $InboxDir | Out-Null
}

# Copia .msg e .eml exportados
Get-ChildItem -Path $ExportDir -File -Include *.msg,*.eml | ForEach-Object {
  Copy-Item $_.FullName -Destination $InboxDir -Force
}

# Ingestao + relatorio
& $PythonExe "C:\fusionecore-suite\fc_circularizacao\src\ingest_eml.py"
& $PythonExe "C:\fusionecore-suite\fc_circularizacao\src\report_status.py"

Write-Host "OK: ingestao e relatorio atualizados." -ForegroundColor Green
