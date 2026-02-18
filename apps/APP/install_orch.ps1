. "$PSScriptRoot\_install_common.ps1"
$core = Get-CoreRoot
Copy-Checked "$PSScriptRoot\orchestrator.py" "$core\fc_core\automation\orchestrator.py"
$testPath = "$PSScriptRoot\test_orchestrator.py"
@"
import asyncio
from fc_core.automation.orchestrator import Orchestrator, ScrapingRequest, DataSource

async def run_test():
    orch = Orchestrator()
    req = ScrapingRequest(
        target_id='5001234-56.2025.8.13.0000',
        sources=[DataSource.PJE, DataSource.INSTAGRAM],
        fetch_related=True,
    )
    result = await orch.run_pipeline(req)
    print(result)

if __name__ == '__main__':
    asyncio.run(run_test())
"@ | Set-Content -Path $testPath -Encoding utf8
Write-Host "Orchestrator installed and test created at $testPath" -ForegroundColor Green

