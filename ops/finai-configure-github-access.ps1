# FinAI one-time Windows bridge into protected GitHub Actions environment.
# No private key or password is sent to ChatGPT or committed in Git.
# Default is preflight-only; -Apply is required for any GitHub write.
param([switch]$Apply)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Repo = "ddcpark-coder/finai-ledger"
$Environment = "finai-remote-audit"
$Server = "hcp-30.controlpanel.si"
$User = "laskot48"
$Port = 22
$ExpectedFingerprint = "SHA256:NkSXlIOxybr1c3pbDWUeWjugtA0livvN8fPzaB4W1vI"

function Assert-Exit([string]$step) {
    if ($LASTEXITCODE -ne 0) {
        throw "STOP: $step failed (exit $LASTEXITCODE). No bypass."
    }
}
function Need-Command([string]$command) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
        throw "STOP: Missing $command. Install and authenticate GitHub CLI first."
    }
}
Need-Command "ssh.exe"
Need-Command "ssh-keygen.exe"
Need-Command "gh.exe"

$Key = Join-Path $HOME ".ssh\finai_github_audit"
$PublicKey = "$Key.pub"
$KnownHosts = Join-Path $HOME ".ssh\known_hosts"
foreach ($p in @($Key, $PublicKey, $KnownHosts)) {
    if (-not (Test-Path -LiteralPath $p -PathType Leaf)) {
        throw "STOP: Missing private key, public key, or trusted known_hosts file."
    }
}
$Finger = (& ssh-keygen.exe -lf $PublicKey -E sha256) -join " "
Assert-Exit "Public key fingerprint verification"
if ($Finger -notmatch [regex]::Escape($ExpectedFingerprint)) {
    throw "STOP: FinAI public key fingerprint mismatch."
}
$HostLines = @(& ssh-keygen.exe -F $Server -f $KnownHosts 2>$null)
Assert-Exit "Trusted SSH host lookup"
$PinnedHostLines = @($HostLines | Where-Object {
    $_ -match '^\S+\s+(ssh-ed25519|ecdsa-sha2-nistp256|ssh-rsa)\s+[A-Za-z0-9+/=]+'
})
if ($PinnedHostLines.Count -eq 0) {
    throw "STOP: No verified SSH known_hosts key; never disable host checking."
}
$SshOptions = @(
    "-T", "-p", "$Port",
    "-o", "BatchMode=yes", "-o", "IdentitiesOnly=yes",
    "-o", "StrictHostKeyChecking=yes",
    "-o", "UserKnownHostsFile=$KnownHosts",
    "-o", "ConnectTimeout=12",
    "-i", $Key, "$User@$Server"
)
$Status = @(& ssh.exe @SshOptions "finai:status:v1" 2>&1)
Assert-Exit "SSH forced-command status check"
if (($Status -notcontains "finai_gateway=v1") -or ($Status -notcontains "operation=status")) {
    throw "STOP: Unexpected gateway response."
}
# Deliberate denial writes to stderr; avoid treating it as a PowerShell script exception.
$PreviousPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
try {
    $null = & ssh.exe @SshOptions "id" 2>$null
    $DeniedExit = $LASTEXITCODE
} finally {
    $ErrorActionPreference = $PreviousPreference
}
if ($DeniedExit -ne 64) {
    throw "STOP: Dedicated FinAI key did not reject arbitrary SSH commands."
}

$Login = @(& gh.exe api user --jq ".login")
Assert-Exit "GitHub CLI authentication"
if ([string]::IsNullOrWhiteSpace(($Login -join "").Trim())) {
    throw "STOP: GitHub CLI is not authenticated."
}
$Admin = @(& gh.exe api "repos/$Repo" --jq ".permissions.admin")
Assert-Exit "GitHub repository authorization"
if (($Admin -join "").Trim().ToLowerInvariant() -ne "true") {
    throw "STOP: GitHub login lacks repository administration permissions."
}
$Names = @(& gh.exe api "repos/$Repo/environments?per_page=100" --jq ".environments[].name")
Assert-Exit "GitHub environments query"
$Existing = $Names -contains $Environment

if ($Existing) {
    $Data = (& gh.exe api "repos/$Repo/environments/$Environment" | ConvertFrom-Json)
    Assert-Exit "Inspect existing environment"
    if ($Data.deployment_branch_policy.custom_branch_policies -ne $true) {
        throw "STOP: Existing GitHub environment is not restricted to custom branches."
    }
    $Policies = @(& gh.exe api "repos/$Repo/environments/$Environment/deployment-branch-policies" --jq ".branch_policies[].name")
    Assert-Exit "Inspect environment branch policies"
    if ($Policies.Count -ne 1 -or $Policies[0] -ne "main") {
        throw "STOP: Existing GitHub environment must allow exactly main."
    }
}

Write-Host "FINAI CLIENT SSH=PASS"
Write-Host "FINAI FORBIDDEN COMMAND=DENIED"
Write-Host "FINAI GITHUB AUTH=PASS"
Write-Host "FINAI HOST=$Server PORT=$Port"
Write-Host "FINAI EXISTING ENVIRONMENT=$Existing"
if (-not $Apply) {
    Write-Host "FINAI PREFLIGHT ONLY=PASS (no changes)"
    Write-Host "For one-time secure GitHub setup, run this file again with -Apply."
    exit 0
}

if (-not $Existing) {
    # Main-only branch policy must be configured before any secrets are uploaded.
    $Body = '{"deployment_branch_policy":{"protected_branches":false,"custom_branch_policies":true}}'
    $Tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("finai-env-" + [guid]::NewGuid().ToString("N") + ".json")
    try {
        [System.IO.File]::WriteAllText($Tmp, $Body, (New-Object System.Text.UTF8Encoding($false)))
        $null = & gh.exe api -X PUT "repos/$Repo/environments/$Environment" --input $Tmp
        Assert-Exit "Create protected GitHub environment"
    } finally {
        Remove-Item -LiteralPath $Tmp -Force -ErrorAction SilentlyContinue
    }
    $null = & gh.exe api -X POST "repos/$Repo/environments/$Environment/deployment-branch-policies" -f name=main -f type=branch
    Assert-Exit "Create exact main branch policy"
}
$Policies = @(& gh.exe api "repos/$Repo/environments/$Environment/deployment-branch-policies" --jq ".branch_policies[].name")
Assert-Exit "Final environment policy verification"
if ($Policies.Count -ne 1 -or $Policies[0] -ne "main") {
    throw "STOP: Environment policy is not main-only. No secrets uploaded."
}
$null = & gh.exe variable set FINAI_SSH_HOST -e $Environment -R $Repo -b $Server
Assert-Exit "GitHub SSH host variable"
$null = & gh.exe variable set FINAI_SSH_USER -e $Environment -R $Repo -b $User
Assert-Exit "GitHub SSH user variable"
$null = & gh.exe variable set FINAI_SSH_PORT -e $Environment -R $Repo -b "$Port"
Assert-Exit "GitHub SSH port variable"

# Secret values go only via standard input to GitHub CLI (local encryption).
Get-Content -LiteralPath $Key -Raw | & gh.exe secret set FINAI_AUDIT_SSH_PRIVATE_KEY -e $Environment -R $Repo
Assert-Exit "Encrypted GitHub private-key secret"
($PinnedHostLines -join [Environment]::NewLine) | & gh.exe secret set FINAI_AUDIT_SSH_KNOWN_HOSTS -e $Environment -R $Repo
Assert-Exit "Encrypted pinned host-key secret"
$SecretNames = @(& gh.exe secret list -e $Environment -R $Repo --json name --jq ".[].name")
Assert-Exit "Verify GitHub secret names"
if (($SecretNames -notcontains "FINAI_AUDIT_SSH_PRIVATE_KEY") -or ($SecretNames -notcontains "FINAI_AUDIT_SSH_KNOWN_HOSTS")) {
    throw "STOP: GitHub secrets not all present."
}
Write-Host "FINAI_GITHUB_SSH_BRIDGE=CONFIGURED"
Write-Host "Scope: read-only, main-only, protected environment: $Environment"
Write-Host "No server deployment, database or Laškoteka changes performed."
