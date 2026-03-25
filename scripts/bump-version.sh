#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

echo "=== Shruggie MD Version Bump ==="

# Validate argument
if [ $# -lt 1 ]; then
  echo "Usage: $0 <version>"
  echo "  e.g., $0 0.2.0"
  exit 1
fi

VERSION="$1"

# Strip leading 'v' if present
VERSION="${VERSION#v}"

# Validate MAJOR.MINOR.PATCH (digits only)
if ! echo "$VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo "ERROR: Invalid version format '$VERSION'. Expected MAJOR.MINOR.PATCH (digits only)."
  exit 1
fi

echo "New version: $VERSION"
echo ""

update_json() {
  local file="$1"
  local old
  old=$(grep -oP '"version"\s*:\s*"\K[^"]+' "$file" | head -1)
  sed -i "s/\"version\"\s*:\s*\"[^\"]*\"/\"version\": \"$VERSION\"/" "$file"
  echo "  $file: $old → $VERSION"
}

update_cargo() {
  local file="$1"
  local old
  old=$(grep -oP '^version\s*=\s*"\K[^"]+' "$file" | head -1)
  sed -i "s/^version\s*=\s*\"[^\"]*\"/version = \"$VERSION\"/" "$file"
  echo "  $file: $old → $VERSION"
}

echo "Updating version in:"
update_json "package.json"
update_json "src-tauri/tauri.conf.json"
update_cargo "src-tauri/Cargo.toml"
update_json "extension/manifest.json"

echo ""
echo "Version bump complete!"
