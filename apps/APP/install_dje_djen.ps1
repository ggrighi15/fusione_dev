. "$PSScriptRoot\_install_common.ps1"
$core = Get-CoreRoot
Copy-Checked "$PSScriptRoot\domicilio_scraper.py" "$core\fc_core\automation\scrapers\legal_integrations\domicilio_scraper.py"
Copy-Checked "$PSScriptRoot\djen_scraper.py" "$core\fc_core\automation\scrapers\legal_integrations\djen_scraper.py"
Copy-Checked "$PSScriptRoot\scraper_factory_v2.py" "$core\fc_core\automation\scrapers\scraper_factory.py"
Write-Host 'DJE/DJEN scrapers installed.' -ForegroundColor Green

