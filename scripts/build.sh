#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

echo "=== Shruggie MD Production Build ==="

echo ""
echo "[1/3] Running typecheck..."
pnpm run typecheck

echo ""
echo "[2/3] Building web/PWA..."
pnpm run build

echo ""
echo "[3/3] Building Chrome extension..."
pnpm run build:extension

echo ""
echo "=== Build Summary ==="
echo "Output directories:"
for dir in dist extension/dist; do
  if [ -d "$dir" ]; then
    size=$(du -sh "$dir" 2>/dev/null | cut -f1)
    echo "  $dir — $size"
  else
    echo "  $dir — (not found)"
  fi
done

echo ""
echo "Build complete!"
