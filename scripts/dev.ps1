Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ProjectDir = Split-Path -Parent $PSScriptRoot
Push-Location $ProjectDir

try {
    Write-Host "=== Shruggie MD Dev Server ==="

    if (-not (Test-Path "node_modules")) {
        Write-Host "node_modules/ not found — running pnpm install..."
        pnpm install
        if ($LASTEXITCODE -ne 0) { throw "pnpm install failed" }
    }

    # Suppress auto-opening browser
    $env:BROWSER = "none"

    Write-Host "Starting Vite dev server..."
    pnpm run dev
    if ($LASTEXITCODE -ne 0) { throw "pnpm run dev failed" }
}
finally {
    Pop-Location
}
