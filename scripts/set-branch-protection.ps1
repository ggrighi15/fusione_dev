param(
    [Parameter(Mandatory = $true)]
    [string]$Repo,

    [string[]]$Branches = @('main', 'develop'),

    [string[]]$Checks = @(
        'FusionCore CI / guardrails',
        'FusionCore CI / python-tests',
        'FusionCore CI / ui-react-tests'
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
        required_linear_history = $false
        allow_force_pushes = $false
        allow_deletions = $false
        block_creations = $false
        required_conversation_resolution = $true
        lock_branch = $false
        allow_fork_syncing = $true
    } | ConvertTo-Json -Depth 20

    $tmp = Join-Path $env:TEMP ("branch-protection-{0}-{1}.json" -f $branch, [guid]::NewGuid().ToString('N'))
    Set-Content -Path $tmp -Value $body -Encoding utf8
    try {
        gh api --method PUT "repos/$Repo/branches/$branch/protection" --input $tmp | Out-Null
        Write-Host "Branch protection updated: $Repo/$branch" -ForegroundColor Green
    }
    finally {
        Remove-Item -Path $tmp -Force -ErrorAction SilentlyContinue
    }
}
