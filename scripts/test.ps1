Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ProjectDir = Split-Path -Parent $PSScriptRoot
Push-Location $ProjectDir

try {
    Write-Host "=== Shruggie MD Tests ==="

    if ($args.Count -gt 0) {
        Write-Host "Running tests with extra args: $($args -join ' ')"
        pnpm run test -- @args
        if ($LASTEXITCODE -ne 0) { throw "Tests failed" }
    }
    else {
        pnpm run test
        if ($LASTEXITCODE -ne 0) { throw "Tests failed" }
    }
}
finally {
    Pop-Location
}
