. "$PSScriptRoot\_install_common.ps1"
$core = Get-CoreRoot
Copy-Checked "$PSScriptRoot\procon_scraper.py" "$core\fc_core\automation\scrapers\admin_integrations\procon_scraper.py"
Copy-Checked "$PSScriptRoot\scraper_factory_v2.py" "$core\fc_core\automation\scrapers\scraper_factory.py"
Write-Host 'PROCON scraper installed.' -ForegroundColor Green

