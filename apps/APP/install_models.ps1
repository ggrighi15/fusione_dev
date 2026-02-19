. "$PSScriptRoot\_install_common.ps1"
$core = Get-CoreRoot
Copy-Checked "$PSScriptRoot\models.py" "$core\fc_core\core\models.py"
Write-Host 'Models installed.' -ForegroundColor Green

