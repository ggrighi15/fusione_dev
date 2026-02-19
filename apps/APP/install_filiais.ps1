. "$PSScriptRoot\_install_common.ps1"
$core = Get-CoreRoot
Copy-Checked "$PSScriptRoot\filiais.py" "$core\fc_core\core\filiais.py"
Copy-Checked "$PSScriptRoot\orchestrator_v2.py" "$core\fc_core\automation\orchestrator.py"
Write-Host 'Filiais and orchestrator installed.' -ForegroundColor Green

