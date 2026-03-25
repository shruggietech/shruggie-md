#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

echo "=== Shruggie MD Rebuild ==="

echo ""
echo "[1/3] Cleaning..."
bash "$SCRIPT_DIR/clean.sh"

echo ""
echo "[2/3] Installing dependencies..."
pnpm install

echo ""
echo "[3/3] Building..."
bash "$SCRIPT_DIR/build.sh"

echo ""
echo "Rebuild complete!"
