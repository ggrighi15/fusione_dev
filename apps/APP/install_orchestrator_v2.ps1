$Source = "c:\fusionecore-suite\apps\APP\orchestrator_v2.py"
$Dest = "c:\fusionecore-suite\fc_core\automation\orchestrator.py"

Write-Host "Installing Updated Orchestrator (Universal Support)..."
Copy-Item -Path $Source -Destination $Dest -Force

Write-Host "Orchestrator Installed."
