Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$sandbox = Join-Path $env:RUNNER_TEMP ('finai-gh-test-' + [guid]::NewGuid().ToString('N'))
$null = New-Item -ItemType Directory -Path $sandbox
$oldPath = $env:PATH
$oldTemp = $env:TEMP
try {
    $mock = Join-Path $sandbox 'gh.exe'
    Add-Type -TypeDefinition (Get-Content -LiteralPath 'tests/finai_fake_gh.cs' -Raw) -Language CSharp -OutputAssembly $mock -OutputType ConsoleApplication
    $env:PATH = $sandbox + ';' + $oldPath
    $env:TEMP = $sandbox
    $env:FINAI_FAKE_GH_AUDIT = Join-Path $sandbox 'audit.txt'
    $script = (Resolve-Path 'ops/finai-isolated-windows-setup.ps1').Path
    foreach ($mode in @('ok', 'unsafe-policy', 'enabled-flag', 'existing-secret', 'secret-fail')) {
        $env:FINAI_FAKE_GH_MODE = $mode
        Remove-Item -LiteralPath $env:FINAI_FAKE_GH_AUDIT -Force -ErrorAction SilentlyContinue
        $oldPreference = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        try { $output = @(& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $script 2>&1 | ForEach-Object { "$_" }) }
        finally { $ErrorActionPreference = $oldPreference }
        $result = $LASTEXITCODE
        $audit = @(if (Test-Path -LiteralPath $env:FINAI_FAKE_GH_AUDIT) { Get-Content -LiteralPath $env:FINAI_FAKE_GH_AUDIT })
        if (($output -join "`n") -match 'BEGIN OPENSSH PRIVATE KEY') { throw "Private key printed in $mode." }
        if ($mode -eq 'ok') {
            if ($result -ne 0 -or @($audit | Where-Object { $_ -like 'secret *' }).Count -ne 4 -or @($audit | Where-Object { $_ -like 'variable *' }).Count -ne 6) {
                $output | Write-Output
                throw 'Synthetic GitHub configuration failed.'
            }
        } elseif ($result -eq 0) { throw "Expected $mode to fail closed." }
        if ($mode -in @('unsafe-policy', 'enabled-flag', 'existing-secret') -and $audit.Count -ne 0) { throw "Writes occurred during $mode." }
        if (@(Get-ChildItem -LiteralPath $sandbox -Filter 'finai-deploy-key-*' -Force).Count -ne 0) { throw "Temporary private key not removed in $mode." }
    }
    Write-Output 'FINAI_GITHUB_BOOTSTRAP_SIMULATION=PASS'
} finally {
    $env:PATH = $oldPath
    $env:TEMP = $oldTemp
    Remove-Item Env:FINAI_FAKE_GH_AUDIT, Env:FINAI_FAKE_GH_MODE -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $sandbox -Recurse -Force -ErrorAction SilentlyContinue
}
