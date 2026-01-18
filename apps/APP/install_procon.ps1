$SourceFactory = "c:\fusionecore-suite\apps\APP\scraper_factory_v2.py"
$DestFactory = "c:\fusionecore-suite\fc_core\automation\scrapers\scraper_factory.py"

$SourceProcon = "c:\fusionecore-suite\apps\APP\procon_scraper.py"
$DestProcon = "c:\fusionecore-suite\fc_core\automation\scrapers\admin_integrations\procon_scraper.py"

Write-Host "Installing PROCON Scrapers (ProConsumidor, Consumidor.gov)..."
Copy-Item -Path $SourceProcon -Destination $DestProcon -Force

Write-Host "Updating Scraper Factory..."
Copy-Item -Path $SourceFactory -Destination $DestFactory -Force

Write-Host "Installation Complete."
