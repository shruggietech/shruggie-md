Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ProjectDir = Split-Path -Parent $PSScriptRoot
Push-Location $ProjectDir

try {
    Write-Host "=== Shruggie MD Icon Generator ==="

    # Check for ImageMagick
    if (-not (Get-Command "magick" -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: ImageMagick (magick) is not installed or not in PATH."
        Write-Host ""
        Write-Host "Install instructions:"
        Write-Host "  Windows: winget install ImageMagick.ImageMagick"
        Write-Host "  macOS:   brew install imagemagick"
        Write-Host "  Or visit: https://imagemagick.org/script/download.php"
        exit 1
    }

    $Master = "assets\brand\icon-master.png"
    if (-not (Test-Path $Master)) {
        Write-Host "ERROR: Master icon not found at $Master"
        exit 1
    }

    $count = 0

    function New-Icon {
        param(
            [string]$Source,
            [int]$Size,
            [string]$Destination
        )
        $destDir = Split-Path -Parent $Destination
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        magick $Source -resize "${Size}x${Size}" -alpha on "PNG32:$Destination"
        if ($LASTEXITCODE -ne 0) { throw "magick failed for $Destination" }
        Write-Host "  Generated $Destination (${Size}x${Size})"
        $script:count++
    }

    function Copy-Icon {
        param(
            [string]$Source,
            [string]$Destination
        )
        $destDir = Split-Path -Parent $Destination
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        Copy-Item -Path $Source -Destination $Destination -Force
        Write-Host "  Copied $Source -> $Destination"
        $script:count++
    }

    Write-Host ""
    Write-Host "--- Tauri icons ---"
    New-Icon -Source $Master -Size 32   -Destination "src-tauri\icons\32x32.png"
    New-Icon -Source $Master -Size 128  -Destination "src-tauri\icons\128x128.png"
    New-Icon -Source $Master -Size 256  -Destination "src-tauri\icons\128x128@2x.png"
    New-Icon -Source $Master -Size 512  -Destination "src-tauri\icons\icon.png"
    New-Icon -Source $Master -Size 1024 -Destination "src-tauri\icons\icon-1024.png"
    Copy-Icon -Source "assets\brand\icon.ico" -Destination "src-tauri\icons\icon.ico"

    Write-Host ""
    Write-Host "--- Windows Store logos ---"
    New-Icon -Source $Master -Size 30  -Destination "src-tauri\icons\Square30x30Logo.png"
    New-Icon -Source $Master -Size 44  -Destination "src-tauri\icons\Square44x44Logo.png"
    New-Icon -Source $Master -Size 71  -Destination "src-tauri\icons\Square71x71Logo.png"
    New-Icon -Source $Master -Size 89  -Destination "src-tauri\icons\Square89x89Logo.png"
    New-Icon -Source $Master -Size 107 -Destination "src-tauri\icons\Square107x107Logo.png"
    New-Icon -Source $Master -Size 142 -Destination "src-tauri\icons\Square142x142Logo.png"
    New-Icon -Source $Master -Size 150 -Destination "src-tauri\icons\Square150x150Logo.png"
    New-Icon -Source $Master -Size 284 -Destination "src-tauri\icons\Square284x284Logo.png"
    New-Icon -Source $Master -Size 310 -Destination "src-tauri\icons\Square310x310Logo.png"
    New-Icon -Source $Master -Size 50  -Destination "src-tauri\icons\StoreLogo.png"

    Write-Host ""
    Write-Host "--- PWA icons ---"
    Copy-Icon -Source "assets\brand\icon-192.png" -Destination "public\icons\icon-192.png"
    Copy-Icon -Source "assets\brand\icon-512.png" -Destination "public\icons\icon-512.png"
    New-Icon -Source $Master -Size 180 -Destination "public\icons\apple-touch-icon.png"

    Write-Host ""
    Write-Host "--- Chrome Extension icons ---"
    New-Icon -Source $Master -Size 16  -Destination "extension\icons\icon-16.png"
    New-Icon -Source $Master -Size 48  -Destination "extension\icons\icon-48.png"
    New-Icon -Source $Master -Size 128 -Destination "extension\icons\icon-128.png"

    Write-Host ""
    Write-Host "Done! Generated/copied $count icon files."
}
finally {
    Pop-Location
}
