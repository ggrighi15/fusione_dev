$SourceFactory = "c:\fusionecore-suite\apps\APP\scraper_factory_v2.py"
$DestFactory = "c:\fusionecore-suite\fc_core\automation\scrapers\scraper_factory.py"

$SourceDJE = "c:\fusionecore-suite\apps\APP\domicilio_scraper.py"
$DestDJE = "c:\fusionecore-suite\fc_core\automation\scrapers\legal_integrations\domicilio_scraper.py"

$SourceDJEN = "c:\fusionecore-suite\apps\APP\djen_scraper.py"
$DestDJEN = "c:\fusionecore-suite\fc_core\automation\scrapers\legal_integrations\djen_scraper.py"

Write-Host "Installing Domicilio Judicial & DJEN Scrapers..."
Copy-Item -Path $SourceDJE -Destination $DestDJE -Force
Copy-Item -Path $SourceDJEN -Destination $DestDJEN -Force

Write-Host "Updating Scraper Factory..."
Copy-Item -Path $SourceFactory -Destination $DestFactory -Force

Write-Host "Installation Complete."
