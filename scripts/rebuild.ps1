Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ProjectDir = Split-Path -Parent $PSScriptRoot
Push-Location $ProjectDir

try {
    Write-Host "=== Shruggie MD Rebuild ==="

    Write-Host ""
    Write-Host "[1/3] Cleaning..."
    & "$PSScriptRoot\clean.ps1"

    Write-Host ""
    Write-Host "[2/3] Installing dependencies..."
    pnpm install
    if ($LASTEXITCODE -ne 0) { throw "pnpm install failed" }

    Write-Host ""
    Write-Host "[3/3] Building..."
    & "$PSScriptRoot\build.ps1"

    Write-Host ""
    Write-Host "Rebuild complete!"
}
finally {
    Pop-Location
}
