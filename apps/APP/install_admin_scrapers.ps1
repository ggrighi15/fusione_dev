. "$PSScriptRoot\_install_common.ps1"
$core = Get-CoreRoot
Copy-Checked "$PSScriptRoot\comprot_scraper.py" "$core\fc_core\automation\scrapers\admin_integrations\comprot_scraper.py"
Copy-Checked "$PSScriptRoot\antt_scraper.py" "$core\fc_core\automation\scrapers\admin_integrations\antt_scraper.py"
Copy-Checked "$PSScriptRoot\ridigital_scraper.py" "$core\fc_core\automation\scrapers\admin_integrations\ridigital_scraper.py"
Copy-Checked "$PSScriptRoot\scraper_factory_v2.py" "$core\fc_core\automation\scrapers\scraper_factory.py"
Write-Host 'Administrative scrapers installed.' -ForegroundColor Green

