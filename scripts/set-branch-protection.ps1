param(
    [Parameter(Mandatory = $true)]
    [string]$Repo,

    [string[]]$Branches = @('main', 'develop'),

    [string[]]$Checks = @(
        'guardrails',
        'build',
        'Secret Scan (gitleaks)',
        'python-tests',
        'ui-react-tests',
        'api-bootstrap-smoke-linux',
        'dependency-install-smoke-windows'
    )
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw "gh CLI not found"
}

foreach ($branch in $Branches) {
    $body = @{
        required_status_checks = @{
            strict = $true
            contexts = $Checks
        }
        enforce_admins = $false
        required_pull_request_reviews = @{
            required_approving_review_count = 1
            dismiss_stale_reviews = $true
            require_code_owner_reviews = $false
        }
        restrictions = $null
    } | ConvertTo-Json -Depth 20

    $tmp = Join-Path $env:TEMP ("branch-protection-{0}-{1}.json" -f $branch, [guid]::NewGuid().ToString('N'))
    [System.IO.File]::WriteAllText($tmp, $body, [System.Text.UTF8Encoding]::new($false))

    try {
        gh api --method PUT "repos/$Repo/branches/$branch/protection" `
            -H "Accept: application/vnd.github+json" `
            --input $tmp | Out-Null

        if ($LASTEXITCODE -ne 0) {
            throw "gh api failed for branch '$branch' with exit code $LASTEXITCODE"
        }

        Write-Host "Branch protection updated: $Repo/$branch" -ForegroundColor Green
    }
    finally {
        Remove-Item -Path $tmp -Force -ErrorAction SilentlyContinue
    }
}
