#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

echo "=== Shruggie MD Icon Generator ==="

# Check for ImageMagick
if ! command -v magick &>/dev/null; then
  echo "ERROR: ImageMagick (magick) is not installed or not in PATH."
  echo ""
  echo "Install instructions:"
  echo "  macOS:   brew install imagemagick"
  echo "  Ubuntu:  sudo apt install imagemagick"
  echo "  Windows: winget install ImageMagick.ImageMagick"
  echo "  Or visit: https://imagemagick.org/script/download.php"
  exit 1
fi

MASTER="assets/brand/icon-master.png"
if [ ! -f "$MASTER" ]; then
  echo "ERROR: Master icon not found at $MASTER"
  exit 1
fi

count=0

gen() {
  local src="$1"
  local size="$2"
  local dest="$3"
  mkdir -p "$(dirname "$dest")"
  magick "$src" -resize "${size}x${size}" -alpha on "PNG32:$dest"
  echo "  Generated $dest (${size}x${size})"
  count=$((count + 1))
}

copy_file() {
  local src="$1"
  local dest="$2"
  mkdir -p "$(dirname "$dest")"
  cp "$src" "$dest"
  echo "  Copied $src -> $dest"
  count=$((count + 1))
}

echo ""
echo "--- Tauri icons ---"
gen "$MASTER" 32   "src-tauri/icons/32x32.png"
gen "$MASTER" 128  "src-tauri/icons/128x128.png"
gen "$MASTER" 256  "src-tauri/icons/128x128@2x.png"
gen "$MASTER" 512  "src-tauri/icons/icon.png"
gen "$MASTER" 1024 "src-tauri/icons/icon-1024.png"
copy_file "assets/brand/icon.ico" "src-tauri/icons/icon.ico"

echo ""
echo "--- Windows Store logos ---"
gen "$MASTER" 30  "src-tauri/icons/Square30x30Logo.png"
gen "$MASTER" 44  "src-tauri/icons/Square44x44Logo.png"
gen "$MASTER" 71  "src-tauri/icons/Square71x71Logo.png"
gen "$MASTER" 89  "src-tauri/icons/Square89x89Logo.png"
gen "$MASTER" 107 "src-tauri/icons/Square107x107Logo.png"
gen "$MASTER" 142 "src-tauri/icons/Square142x142Logo.png"
gen "$MASTER" 150 "src-tauri/icons/Square150x150Logo.png"
gen "$MASTER" 284 "src-tauri/icons/Square284x284Logo.png"
gen "$MASTER" 310 "src-tauri/icons/Square310x310Logo.png"
gen "$MASTER" 50  "src-tauri/icons/StoreLogo.png"

echo ""
echo "--- PWA icons ---"
copy_file "assets/brand/icon-192.png" "public/icons/icon-192.png"
copy_file "assets/brand/icon-512.png" "public/icons/icon-512.png"
gen "$MASTER" 180 "public/icons/apple-touch-icon.png"

echo ""
echo "--- Chrome Extension icons ---"
gen "$MASTER" 16  "extension/icons/icon-16.png"
gen "$MASTER" 48  "extension/icons/icon-48.png"
gen "$MASTER" 128 "extension/icons/icon-128.png"

echo ""
echo "Done! Generated/copied $count icon files."
