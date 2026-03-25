Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ProjectDir = Split-Path -Parent $PSScriptRoot
Push-Location $ProjectDir

try {
    Write-Host "=== Shruggie MD Clean ==="

    $totalReclaimed = 0

    function Remove-BuildDir {
        param(
            [string]$Path,
            [string]$Warning = ""
        )
        if (Test-Path $Path) {
            $bytes = (Get-ChildItem -Path $Path -Recurse -File -ErrorAction SilentlyContinue |
                      Measure-Object -Property Length -Sum).Sum
            if ($null -eq $bytes) { $bytes = 0 }

            if ($Warning -ne "") {
                Write-Host "  WARNING: $Warning"
            }

            Remove-Item -Path $Path -Recurse -Force
            $sizeMB = [math]::Round($bytes / 1MB, 2)
            Write-Host "  Deleted $Path ($sizeMB MB)"
            $script:totalReclaimed += $bytes
        }
        else {
            Write-Host "  Skipped $Path (not found)"
        }
    }

    Remove-BuildDir -Path "dist"
    Remove-BuildDir -Path "extension\dist"
    Remove-BuildDir -Path "node_modules\.vite"
    Remove-BuildDir -Path "node_modules\.cache"
    Remove-BuildDir -Path "src-tauri\target" -Warning "Removing src-tauri\target\ will cause a full Rust recompile on next build"
    Remove-BuildDir -Path "dist-node"

    Write-Host ""
    if ($totalReclaimed -gt 0) {
        $sizeMB = [math]::Round($totalReclaimed / 1MB, 2)
        Write-Host "Total space reclaimed: ~$sizeMB MB"
    }
    else {
        Write-Host "Nothing to clean."
    }
}
finally {
    Pop-Location
}
