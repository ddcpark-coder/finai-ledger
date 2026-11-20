# One-time, dedicated FinAI deploy key bootstrap. Never changes the old account.
# The private key is generated in a restricted temporary directory, then
# stored in GitHub Secrets and removed locally (including on failure).
param([switch]$SelfTest)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Repo = 'ddcpark-coder/finai-ledger'
$Server = 'lcp-86.controlpanel.si'
$KnownHost = 'lcp-86.controlpanel.si ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIO9i84UNTjrIAUGHKFkgqW5verwIfvLS4lCOcLfO2llq'
$ExpectedHostFingerprint = 'SHA256:pvZiddi7Sx9cz/6MddgAkzsvC5IV+poTHdWMOIvYVCs'
$SourceCommit = '7b8c91122f09154251e5099d14691cc7588cffc8'
$GateSha256 = 'f7f81f23eadefb4661e520fac4b90610c508705bde3c05109676c2a8bf88e23e'
$InstallerSha256 = '3d2aa85468a687655eb175631672270274e167737f3cbf6cac1e5295b8ea2443'
$Environments = @('finai-staging', 'finai-production')

function Assert-Exit([string]$step) {
    if ($LASTEXITCODE -ne 0) { throw "STOP: $step failed (exit $LASTEXITCODE)." }
}
function Need-Command([string]$command) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
        throw "STOP: $command is not available."
    }
}
function New-FinaiKeyPair([string]$keyDir) {
    if (Test-Path -LiteralPath $keyDir) {
        $item = Get-Item -LiteralPath $keyDir -Force
        if (-not $item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
            throw 'STOP: FinAI key directory is not a normal directory.'
        }
    } else {
        $null = New-Item -ItemType Directory -Path $keyDir -Force
    }
    # Restrict only this dedicated FinAI directory, not the user's .ssh folder.
    $sid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    $null = & icacls.exe $keyDir /inheritance:r /grant:r ("*{0}:(OI)(CI)F" -f $sid)
    Assert-Exit 'protect FinAI key directory'
    $key = Join-Path $keyDir 'finai_deploy_einteg86'
    $privateExists = Test-Path -LiteralPath $key -PathType Leaf
    $publicExists = Test-Path -LiteralPath "$key.pub" -PathType Leaf
    if ($privateExists -xor $publicExists) { throw 'STOP: Incomplete existing FinAI key pair.' }
    if (-not $privateExists) {
        # An explicit empty argument is required on Windows PowerShell 5.1.
        $sshKeygen = (Get-Command ssh-keygen.exe).Source
        $keyArg = '"{0}"' -f $key
        $process = Start-Process -FilePath $sshKeygen -ArgumentList @(
            '-q', '-t', 'ed25519', '-N', '""', '-C', 'finai-dedicated-deploy', '-f', $keyArg
        ) -Wait -PassThru -NoNewWindow
        if ($process.ExitCode -ne 0) { throw 'STOP: Dedicated Ed25519 key generation failed.' }
    }
    foreach ($path in @($key, "$key.pub")) {
        $item = Get-Item -LiteralPath $path -Force
        if ($item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
            throw 'STOP: FinAI key must be a regular file.'
        }
    }
    $public = (Get-Content -LiteralPath "$key.pub" -Raw).Trim()
    $match = [regex]::Match($public, '^ssh-ed25519 ([A-Za-z0-9+/=]+)(?:\s+[^\r\n]*)?$')
    if (-not $match.Success) {
        throw 'STOP: Invalid FinAI public key.'
    }
    $publicCanonical = 'ssh-ed25519 ' + $match.Groups[1].Value
    $derived = @(& ssh-keygen.exe -y -f $key)
    Assert-Exit 'verify private/public key pair'
    if (($derived -join '').Trim() -notmatch ('^' + [regex]::Escape($publicCanonical) + '(?:\s|$)')) {
        throw 'STOP: FinAI public key does not match its private key.'
    }
    return @{ PrivatePath = $key; Public = $publicCanonical }
}
function New-FinaiBootstrap([string]$public) {
    if ($public -notmatch '^ssh-ed25519 [A-Za-z0-9+/=]+$') { throw 'STOP: Invalid public key.' }
    $script = @'
bash -s -- '__PUBLIC__' <<'FINAI_BOOTSTRAP'
set -euo pipefail
umask 077
[[ "$(id -un)" == einteg86 && "$(id -u)" == 1256 && "$HOME" == /home/einteg86 ]] || { echo STOP_WRONG_ACCOUNT; exit 65; }
for item in "$HOME" "$HOME/app.e-integrator.si" "$HOME/api.e-integrator.si"; do
  [[ -d "$item" && ! -L "$item" && "$(readlink -f -- "$item")" == "$item" && "$(stat -c %u -- "$item")" == 1256 ]] || { echo STOP_UNEXPECTED_FINAI_PATH; exit 65; }
done
for tool in curl sha256sum python3 ssh-keygen; do command -v "$tool" >/dev/null || { echo STOP_MISSING_TOOL; exit 65; }; done
tmp="$(mktemp -d "$HOME/.finai-bootstrap.XXXXXXXX")"
trap 'rm -rf -- "$tmp"' EXIT
mkdir "$tmp/ops"
base='https://raw.githubusercontent.com/ddcpark-coder/finai-ledger/__COMMIT__/ops'
curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 --max-time 45 "$base/finai-isolated-ssh-gate.py" -o "$tmp/ops/finai-isolated-ssh-gate.py"
curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 --max-time 45 "$base/finai-isolated-install-key.sh" -o "$tmp/ops/finai-isolated-install-key.sh"
printf '%s  %s\n' '__GATE_HASH__' "$tmp/ops/finai-isolated-ssh-gate.py" | sha256sum --check --status || { echo STOP_GATE_INTEGRITY; exit 65; }
printf '%s  %s\n' '__INSTALLER_HASH__' "$tmp/ops/finai-isolated-install-key.sh" | sha256sum --check --status || { echo STOP_INSTALLER_INTEGRITY; exit 65; }
printf '%s\n' "$1" | bash "$tmp/ops/finai-isolated-install-key.sh" --apply
FINAI_BOOTSTRAP
'@
    return $script.Replace("`r`n", "`n").Replace("`r", "`n").Replace('__PUBLIC__', $public).Replace('__COMMIT__', $SourceCommit).Replace('__GATE_HASH__', $GateSha256).Replace('__INSTALLER_HASH__', $InstallerSha256)
}
function Get-GhJson([string[]]$arguments, [string]$step) {
    $json = & gh.exe @arguments
    Assert-Exit $step
    return ($json | ConvertFrom-Json)
}
function Test-SafeFlags($variables) {
    $flags = @('FINAI_STAGE_ENABLED', 'FINAI_DEPLOY05_SERVER_READY', 'FINAI_PRODUCTION_ENABLED', 'FINAI_APP_DOCROOT_CONFIRMED', 'FINAI_AUTO_PUBLISH_ENABLED')
    foreach ($variable in @($variables)) {
        if ($null -eq $variable) { continue }
        if ($variable.name -in $flags -and $variable.value -match '^(?i:true|yes|1)$') {
            throw ('STOP: Existing deployment flag is enabled: ' + $variable.name)
        }
    }
}
function Assert-EnvironmentPolicy([string]$environment) {
    $details = Get-GhJson @('api', "repos/$Repo/environments/$environment") 'read environment'
    if ($null -eq $details.deployment_branch_policy -or $details.deployment_branch_policy.custom_branch_policies -ne $true) {
        throw "STOP: $environment must have a main-only branch policy."
    }
    $policies = Get-GhJson @('api', "repos/$Repo/environments/$environment/deployment-branch-policies") 'read branch policies'
    if (@($policies.branch_policies).Count -ne 1 -or $policies.branch_policies[0].name -ne 'main') {
        throw "STOP: $environment must allow exactly main."
    }
}

Need-Command 'ssh-keygen.exe'
Need-Command 'icacls.exe'
if ($SelfTest) {
    $testDir = Join-Path $env:RUNNER_TEMP ('finai-key-test-' + [guid]::NewGuid().ToString('N'))
    try {
        $testKey = New-FinaiKeyPair $testDir
        $again = New-FinaiKeyPair $testDir
        if ($testKey.Public -ne $again.Public) { throw 'STOP: key pair was not reused.' }
        $bootstrap = New-FinaiBootstrap $testKey.Public
        $testPath = Join-Path $testDir 'bootstrap.sh'
        [IO.File]::WriteAllText($testPath, $bootstrap, (New-Object Text.UTF8Encoding($false)))
        & bash.exe -n $testPath
        Assert-Exit 'bootstrap shell syntax'
        & bash.exe $testPath
        if ($LASTEXITCODE -ne 65) { throw 'STOP: wrong account was not rejected.' }
        Write-Output 'FINAI_WINDOWS_BOOTSTRAP_SYNTHETIC=PASS'
    } finally {
        Remove-Item -LiteralPath $testDir -Recurse -Force -ErrorAction SilentlyContinue
    }
    exit 0
}

Need-Command 'gh.exe'
$login = @(& gh.exe api user --jq '.login')
Assert-Exit 'GitHub CLI authentication'
if (($login -join '').Trim() -eq '') { throw 'STOP: GitHub CLI is not authenticated.' }
$admin = @(& gh.exe api "repos/$Repo" --jq '.permissions.admin')
Assert-Exit 'GitHub repository permission'
if (($admin -join '').Trim() -ne 'true') { throw 'STOP: GitHub repository administration is required.' }
$repoVariables = Get-GhJson @('variable', 'list', '-R', $Repo, '--json', 'name,value') 'read repository variables'
Test-SafeFlags $repoVariables
$existingEnvironments = Get-GhJson @('api', "repos/$Repo/environments?per_page=100") 'read environments'
if ($existingEnvironments.total_count -ne @($existingEnvironments.environments).Count) {
    throw 'STOP: Environment listing is incomplete; no environments modified.'
}
foreach ($environment in $Environments) {
    if (@($existingEnvironments.environments | Where-Object { $_.name -eq $environment }).Count -eq 0) {
        $bodyPath = Join-Path $env:TEMP ('finai-env-' + [guid]::NewGuid().ToString('N') + '.json')
        try {
            [IO.File]::WriteAllText($bodyPath, '{"deployment_branch_policy":{"protected_branches":false,"custom_branch_policies":true}}', (New-Object Text.UTF8Encoding($false)))
            $null = & gh.exe api -X PUT "repos/$Repo/environments/$environment" --input $bodyPath
            Assert-Exit "create $environment"
            $null = & gh.exe api -X POST "repos/$Repo/environments/$environment/deployment-branch-policies" -f name=main -f type=branch
            Assert-Exit "protect $environment"
        } finally { Remove-Item -LiteralPath $bodyPath -Force -ErrorAction SilentlyContinue }
    }
    Assert-EnvironmentPolicy $environment
    $variables = Get-GhJson @('variable', 'list', '-R', $Repo, '-e', $environment, '--json', 'name,value') 'read environment variables'
    Test-SafeFlags $variables
    $desired = @{ FINAI_DEPLOY_SSH_HOST = $Server; FINAI_DEPLOY_SSH_USER = 'einteg86'; FINAI_DEPLOY_SSH_PORT = '22' }
    foreach ($variable in @($variables)) {
        if ($null -eq $variable) { continue }
        if ($desired.ContainsKey($variable.name) -and $variable.value -ne $desired[$variable.name]) {
            throw ('STOP: Existing GitHub variable differs: ' + $variable.name)
        }
    }
    $secrets = Get-GhJson @('secret', 'list', '-R', $Repo, '-e', $environment, '--json', 'name') 'read secret names'
    foreach ($secret in @($secrets)) {
        if ($null -eq $secret) { continue }
        if ($secret.name -in @('FINAI_DEPLOY_SSH_PRIVATE_KEY', 'FINAI_DEPLOY_SSH_KNOWN_HOSTS')) {
            throw "STOP: Existing deployment secret in $environment; no secrets overwritten."
        }
    }
}

# Independently verified using the authenticated cPanel loopback fingerprint.
$hostFile = Join-Path $env:TEMP ('finai-host-' + [guid]::NewGuid().ToString('N'))
try {
    [IO.File]::WriteAllText($hostFile, $KnownHost + "`n", (New-Object Text.UTF8Encoding($false)))
    $fingerprint = @(& ssh-keygen.exe -lf $hostFile -E sha256)
    Assert-Exit 'verify pinned SSH host'
    if (($fingerprint -join '') -notmatch [regex]::Escape($ExpectedHostFingerprint)) { throw 'STOP: Host fingerprint mismatch.' }
} finally { Remove-Item -LiteralPath $hostFile -Force -ErrorAction SilentlyContinue }

$keyDir = Join-Path $env:TEMP ('finai-deploy-key-' + [guid]::NewGuid().ToString('N'))
try {
    $key = New-FinaiKeyPair $keyDir
    foreach ($environment in $Environments) {
        foreach ($entry in @(@('FINAI_DEPLOY_SSH_HOST', $Server), @('FINAI_DEPLOY_SSH_USER', 'einteg86'), @('FINAI_DEPLOY_SSH_PORT', '22'))) {
            $null = & gh.exe variable set $entry[0] -e $environment -R $Repo -b $entry[1]
            Assert-Exit "set variable in $environment"
        }
        # gh encrypts values; neither private key nor secret appears in arguments or logs.
        Get-Content -LiteralPath $key.PrivatePath -Raw | & gh.exe secret set FINAI_DEPLOY_SSH_PRIVATE_KEY -e $environment -R $Repo
        Assert-Exit "store private key in $environment"
        $KnownHost | & gh.exe secret set FINAI_DEPLOY_SSH_KNOWN_HOSTS -e $environment -R $Repo
        Assert-Exit "store pinned host key in $environment"
    }
    try { Set-Clipboard -Value $key.Public } catch { Write-Warning 'Public-key clipboard unavailable; use the printed public key.' }
} finally {
    if (Test-Path -LiteralPath $keyDir) {
        Remove-Item -LiteralPath $keyDir -Recurse -Force -ErrorAction Stop
    }
}
Write-Host 'FINAI_GITHUB_SECRETS=CONFIGURED'
Write-Host 'FINAI_PUBLISH_FLAGS=UNCHANGED_AND_DISABLED'
Write-Host ('FINAI_DEPLOY_PUBLIC_KEY=' + $key.Public)
Write-Host 'The public key was copied to the clipboard; the private key was not printed.'
Write-Host 'No hosting changes were made. Hosting setup still requires verified isolation.'
