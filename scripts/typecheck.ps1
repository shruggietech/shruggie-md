Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ProjectDir = Split-Path -Parent $PSScriptRoot
Push-Location $ProjectDir

try {
    Write-Host "=== Shruggie MD Typecheck ==="
    pnpm run typecheck
    if ($LASTEXITCODE -ne 0) { throw "Typecheck failed" }
}
finally {
    Pop-Location
}
