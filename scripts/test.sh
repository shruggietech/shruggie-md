#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

echo "=== Shruggie MD Tests ==="

if [ $# -gt 0 ]; then
  echo "Running tests with extra args: $*"
  pnpm run test -- "$@"
else
  pnpm run test
fi
