$SourceFactory = "c:\fusionecore-suite\apps\APP\scraper_factory_v2.py"
$DestFactory = "c:\fusionecore-suite\fc_core\automation\scrapers\scraper_factory.py"

$SourceComprot = "c:\fusionecore-suite\apps\APP\comprot_scraper.py"
$DestComprot = "c:\fusionecore-suite\fc_core\automation\scrapers\admin_integrations\comprot_scraper.py"

$SourceANTT = "c:\fusionecore-suite\apps\APP\antt_scraper.py"
$DestANTT = "c:\fusionecore-suite\fc_core\automation\scrapers\admin_integrations\antt_scraper.py"

$SourceRI = "c:\fusionecore-suite\apps\APP\ridigital_scraper.py"
$DestRI = "c:\fusionecore-suite\fc_core\automation\scrapers\admin_integrations\ridigital_scraper.py"

Write-Host "Installing Administrative Scrapers (Comprot, ANTT, RIDigital)..."
Copy-Item -Path $SourceComprot -Destination $DestComprot -Force
Copy-Item -Path $SourceANTT -Destination $DestANTT -Force
Copy-Item -Path $SourceRI -Destination $DestRI -Force

Write-Host "Updating Scraper Factory..."
Copy-Item -Path $SourceFactory -Destination $DestFactory -Force

Write-Host "Installation Complete."
