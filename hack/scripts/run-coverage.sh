#!/bin/bash
# Run hack JS test sessions with V8 coverage and generate HTML report.
# Output goes to hack/coverage/ (committed to git).
# Usage: bash hack/scripts/run-coverage.sh [--text]

set -e
cd "$(git rev-parse --show-toplevel)"

REPORTERS="--reporter=html"
if [[ "$1" == "--text" ]]; then
  REPORTERS="--reporter=html --reporter=text"
fi

echo "Running hack sessions with coverage collection..."
npx c8 \
  $REPORTERS \
  --report-dir=hack/coverage \
  --include='hack/js/**' \
  node hack/test/coverage_all.mjs

echo "Applying NetHack theme..."
cp rogue/scripts/nethack.css hack/coverage/nethack.css
node rogue/scripts/nethack-theme.mjs hack/coverage

echo ""
echo "Coverage report written to: hack/coverage/index.html"
