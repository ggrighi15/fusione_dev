$SourceReact = "c:\fusionecore-suite\apps\APP\Processos.jsx"
$DestReact = "c:\fusionecore-suite\frontend\src\pages\Processos.jsx"

Write-Host "Updating React Component..."
Copy-Item -Path $SourceReact -Destination $DestReact -Force

$SourcePlan = "c:\fusionecore-suite\apps\APP\PLANNING_4_WEEKS.md"
$DestPlan = "c:\fusionecore-suite\PLANNING_4_WEEKS.md"

Write-Host "Publishing 4-Week Plan..."
Copy-Item -Path $SourcePlan -Destination $DestPlan -Force

Write-Host "Frontend Update Complete."
