. "$PSScriptRoot\_install_common.ps1"
$core = Get-CoreRoot
Copy-Checked "$PSScriptRoot\orchestrator_v2.py" "$core\fc_core\automation\orchestrator.py"
Write-Host 'Canonical orchestrator (v2) installed.' -ForegroundColor Green

