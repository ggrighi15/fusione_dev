Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-CoreRoot {
    $scriptDir = Split-Path -Parent $PSCommandPath
    return Split-Path -Parent (Split-Path -Parent $scriptDir)
}

function Assert-PathExists {
    param([Parameter(Mandatory=$true)][string]$Path,[Parameter(Mandatory=$true)][string]$Label)
    if (-not (Test-Path $Path)) {
        throw "BLOCKED: $Label not found -> $Path"
    }
}

function Copy-Checked {
    param([Parameter(Mandatory=$true)][string]$Source,[Parameter(Mandatory=$true)][string]$Destination)
    Assert-PathExists -Path $Source -Label 'source'
    $destDir = Split-Path -Parent $Destination
    Assert-PathExists -Path $destDir -Label 'destination directory'
    Copy-Item -Path $Source -Destination $Destination -Force
    Write-Host "OK: $Source -> $Destination" -ForegroundColor Green
}

function Invoke-Python {
    param([Parameter(Mandatory=$true)][string]$ScriptPath)
    Assert-PathExists -Path $ScriptPath -Label 'python script'
    python $ScriptPath
    if ($LASTEXITCODE -ne 0) {
        throw "Python script failed: $ScriptPath"
    }
}

function Write-DeprecatedInstaller {
    param([Parameter(Mandatory=$true)][string]$Name,[Parameter(Mandatory=$true)][string]$UseInstead)
    Write-Warning "$Name is deprecated. Use $UseInstead"
    exit 1
}
