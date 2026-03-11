#!/bin/bash
# Run rogue JS test sessions with V8 coverage and generate HTML report.
# Output goes to rogue/coverage/ (committed to git).
# Usage: bash rogue/scripts/run-coverage.sh [--text]

set -e
cd "$(git rev-parse --show-toplevel)"

REPORTERS="--reporter=html"
if [[ "$1" == "--text" ]]; then
  REPORTERS="--reporter=html --reporter=text"
fi

echo "Running rogue sessions with coverage collection..."
npx c8 \
  $REPORTERS \
  --report-dir=rogue/coverage \
  --include='rogue/js/**' \
  node rogue/test/coverage_all.mjs --all rogue/test/sessions/ --sessions-only

echo "Applying NetHack theme..."
cp rogue/scripts/nethack.css rogue/coverage/nethack.css
node rogue/scripts/nethack-theme.mjs rogue/coverage --game "Rogue 3.6"

echo ""
echo "Coverage report written to: rogue/coverage/index.html"
