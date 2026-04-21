#!/usr/bin/env bash
# Build script for "The Adventurer's Companion to the Great Underground Empire"
# Converts volume1.md and volume2.md to HTML.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if ! command -v pandoc &>/dev/null; then
  echo "Error: pandoc not found. Install with: brew install pandoc" >&2
  exit 1
fi

echo "=== Building Volume I (Hints) ==="
pandoc volume1.md \
  --from=markdown \
  --to=html5 \
  --template=template.html \
  --section-divs \
  --syntax-highlighting=none \
  --output=volume1.html
echo "    → volume1.html"

echo "=== Building Volume II (Walkthrough) ==="
pandoc volume2.md \
  --from=markdown \
  --to=html5 \
  --template=template.html \
  --section-divs \
  --syntax-highlighting=none \
  --output=volume2.html
echo "    → volume2.html"

echo "=== Done ==="
