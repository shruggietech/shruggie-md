#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

echo "=== Shruggie MD Dev Server ==="

if [ ! -d "node_modules" ]; then
  echo "node_modules/ not found — running pnpm install..."
  pnpm install
fi

echo "Starting Vite dev server..."
pnpm run dev
