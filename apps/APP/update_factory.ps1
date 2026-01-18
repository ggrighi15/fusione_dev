$Source = "c:\fusionecore-suite\apps\APP\scraper_factory.py"
$Dest = "c:\fusionecore-suite\fc_core\automation\scrapers\scraper_factory.py"

Write-Host "Updating Scraper Factory with Comprehensive Court Mapping..."
Copy-Item -Path $Source -Destination $Dest -Force

Write-Host "Scraper Factory Updated."
