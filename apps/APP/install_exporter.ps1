. "$PSScriptRoot\_install_common.ps1"
$core = Get-CoreRoot
Copy-Checked "$PSScriptRoot\excel_exporter.py" "$core\fc_core\reporting\excel_exporter.py"
Write-Host 'Excel exporter installed.' -ForegroundColor Green

