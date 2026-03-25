Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ProjectDir = Split-Path -Parent $PSScriptRoot
Push-Location $ProjectDir

try {
    Write-Host "=== Shruggie MD Production Build ==="

    Write-Host ""
    Write-Host "[1/3] Running typecheck..."
    pnpm run typecheck
    if ($LASTEXITCODE -ne 0) { throw "typecheck failed" }

    Write-Host ""
    Write-Host "[2/3] Building web/PWA..."
    pnpm run build
    if ($LASTEXITCODE -ne 0) { throw "build failed" }

    Write-Host ""
    Write-Host "[3/3] Building Chrome extension..."
    pnpm run build:extension
    if ($LASTEXITCODE -ne 0) { throw "build:extension failed" }

    Write-Host ""
    Write-Host "=== Build Summary ==="
    Write-Host "Output directories:"

    foreach ($dir in @("dist", "extension\dist")) {
        if (Test-Path $dir) {
            $bytes = (Get-ChildItem -Path $dir -Recurse -File | Measure-Object -Property Length -Sum).Sum
            if ($null -eq $bytes) { $bytes = 0 }
            $sizeMB = [math]::Round($bytes / 1MB, 2)
            Write-Host "  $dir — ${sizeMB} MB"
        }
        else {
            Write-Host "  $dir — (not found)"
        }
    }

    Write-Host ""
    Write-Host "Build complete!"
}
finally {
    Pop-Location
}
