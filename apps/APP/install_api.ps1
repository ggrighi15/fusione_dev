$Source = "c:\fusionecore-suite\apps\APP\route_pipeline.py"
$Dest = "c:\fusionecore-suite\fc_core\api\routes\pipeline.py"

Write-Host "Installing Pipeline Router..."
Copy-Item -Path $Source -Destination $Dest -Force

Write-Host "Patching main.py..."
python c:\fusionecore-suite\apps\APP\patch_main_api.py

Write-Host "Installation Complete."
