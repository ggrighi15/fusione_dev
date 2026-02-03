# Export Outlook PST folders to .msg (offline)
# Usage:
#   .\export_pst_to_msg.ps1 -PstPath "C:\Temp\Emails\gustavo_ri.pst" -ExportDir "C:\Temp\Auditoria_Export" -Folders "Caixa de Entrada","Auditoria" -Days 90

param(
  [Parameter(Mandatory=$true)][string]$PstPath,
  [string]$ExportDir = "C:\Temp\Auditoria_Export",
  [string[]]$Folders = @("Caixa de Entrada","Auditoria"),
  [int]$Days = 90
)

$ErrorActionPreference = "Stop"

function Get-FolderByName {
  param(
    [Microsoft.Office.Interop.Outlook.MAPIFolder]$Root,
    [string]$Name
  )
  if ($Root.Name -ieq $Name) { return $Root }
  foreach ($f in $Root.Folders) {
    $found = Get-FolderByName -Root $f -Name $Name
    if ($found) { return $found }
  }
  return $null
}

if (!(Test-Path $PstPath)) {
  throw "PST nao encontrado: $PstPath"
}

if (!(Test-Path $ExportDir)) {
  New-Item -ItemType Directory -Force -Path $ExportDir | Out-Null
}

$outlook = New-Object -ComObject Outlook.Application
$ns = $outlook.GetNamespace("MAPI")

$store = $ns.Stores | Where-Object { $_.FilePath -ieq $PstPath }
if (-not $store) {
  $ns.AddStore($PstPath)
  $store = $ns.Stores | Where-Object { $_.FilePath -ieq $PstPath }
}
if (-not $store) {
  throw "Nao foi possivel abrir o PST em Outlook."
}

$root = $store.GetRootFolder()
$since = (Get-Date).AddDays(-$Days)

foreach ($folderName in $Folders) {
  $folder = Get-FolderByName -Root $root -Name $folderName
  if (-not $folder) {
    Write-Host "Pasta nao encontrada no PST: $folderName" -ForegroundColor Yellow
    continue
  }

  $folderOut = Join-Path $ExportDir ($folderName -replace '[\\/:*?"<>|]', '_')
  if (!(Test-Path $folderOut)) { New-Item -ItemType Directory -Force -Path $folderOut | Out-Null }

  # Restrict by ReceivedTime
  $items = $folder.Items
  $items.Sort("[ReceivedTime]", $true)
  $filter = "[ReceivedTime] >= '" + $since.ToString("g") + "'"
  $filtered = $items.Restrict($filter)

  $count = 0
  foreach ($item in $filtered) {
    try {
      if ($item.Class -ne 43) { continue } # MailItem
      $subject = $item.Subject
      if (-not $subject) { $subject = "sem_assunto" }
      $safe = ($subject -replace '[\\/:*?"<>|]', ' ')
      $safe = $safe.Trim()
      if ($safe.Length -gt 80) { $safe = $safe.Substring(0,80) }
      $ts = $item.ReceivedTime.ToString("yyyyMMdd_HHmmss")
      $name = "$ts`_$safe`_$($item.EntryID).msg"
      $path = Join-Path $folderOut $name
      $item.SaveAs($path, 3) # 3 = olMSG
      $count++
    } catch {
      continue
    }
  }

  Write-Host "Exportados $count emails de '$folderName' para $folderOut" -ForegroundColor Green
}

Write-Host "OK: exportacao concluida." -ForegroundColor Green
