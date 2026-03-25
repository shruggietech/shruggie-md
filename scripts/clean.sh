#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

echo "=== Shruggie MD Clean ==="

total_reclaimed=0

remove_dir() {
  local dir="$1"
  local warn="${2:-}"
  if [ -d "$dir" ]; then
    size_bytes=$(du -sb "$dir" 2>/dev/null | cut -f1 || echo 0)
    size_human=$(du -sh "$dir" 2>/dev/null | cut -f1 || echo "unknown")
    if [ -n "$warn" ]; then
      echo "  WARNING: $warn"
    fi
    rm -rf "$dir"
    echo "  Deleted $dir ($size_human)"
    total_reclaimed=$((total_reclaimed + size_bytes))
  else
    echo "  Skipped $dir (not found)"
  fi
}

remove_dir "dist"
remove_dir "extension/dist"
remove_dir "node_modules/.vite"
remove_dir "node_modules/.cache"
remove_dir "src-tauri/target" "Removing src-tauri/target/ will cause a full Rust recompile on next build"
remove_dir "dist-node"

echo ""
if [ "$total_reclaimed" -gt 0 ]; then
  if [ "$total_reclaimed" -ge 1073741824 ]; then
    human=$(awk "BEGIN {printf \"%.2f GB\", $total_reclaimed/1073741824}")
  elif [ "$total_reclaimed" -ge 1048576 ]; then
    human=$(awk "BEGIN {printf \"%.2f MB\", $total_reclaimed/1048576}")
  else
    human=$(awk "BEGIN {printf \"%.2f KB\", $total_reclaimed/1024}")
  fi
  echo "Total space reclaimed: ~$human"
else
  echo "Nothing to clean."
fi
