. "$PSScriptRoot\_install_common.ps1"
$core = Get-CoreRoot
Copy-Checked "$PSScriptRoot\route_pipeline.py" "$core\fc_core\api\routes\pipeline.py"
Invoke-Python "$PSScriptRoot\patch_main_api.py"
Write-Host 'API pipeline installed and patched.' -ForegroundColor Green

