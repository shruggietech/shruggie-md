param(
    [Parameter(Mandatory = $true)]
    [string]$Version
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ProjectDir = Split-Path -Parent $PSScriptRoot
Push-Location $ProjectDir

try {
    Write-Host "=== Shruggie MD Version Bump ==="

    # Strip leading 'v' if present
    if ($Version.StartsWith("v")) {
        $Version = $Version.Substring(1)
    }

    # Validate MAJOR.MINOR.PATCH (digits only)
    if ($Version -notmatch '^\d+\.\d+\.\d+$') {
        Write-Host "ERROR: Invalid version format '$Version'. Expected MAJOR.MINOR.PATCH (digits only)."
        exit 1
    }

    Write-Host "New version: $Version"
    Write-Host ""

    function Update-JsonVersion {
        param(
            [string]$FilePath
        )
        $content = Get-Content -Path $FilePath -Raw
        $oldMatch = [regex]::Match($content, '"version"\s*:\s*"([^"]+)"')
        $oldVersion = $oldMatch.Groups[1].Value
        $newContent = $content -replace '"version"\s*:\s*"[^"]*"', "`"version`": `"$Version`""
        Set-Content -Path $FilePath -Value $newContent -NoNewline
        Write-Host "  ${FilePath}: $oldVersion -> $Version"
    }

    function Update-CargoVersion {
        param(
            [string]$FilePath
        )
        $content = Get-Content -Path $FilePath -Raw
        $oldMatch = [regex]::Match($content, '(?m)^version\s*=\s*"([^"]+)"')
        $oldVersion = $oldMatch.Groups[1].Value
        $newContent = $content -replace '(?m)^version\s*=\s*"[^"]*"', "version = `"$Version`""
        Set-Content -Path $FilePath -Value $newContent -NoNewline
        Write-Host "  ${FilePath}: $oldVersion -> $Version"
    }

    Write-Host "Updating version in:"
    Update-JsonVersion -FilePath "package.json"
    Update-JsonVersion -FilePath "src-tauri\tauri.conf.json"
    Update-CargoVersion -FilePath "src-tauri\Cargo.toml"
    Update-JsonVersion -FilePath "extension\manifest.json"

    Write-Host ""
    Write-Host "Version bump complete!"
}
finally {
    Pop-Location
}
