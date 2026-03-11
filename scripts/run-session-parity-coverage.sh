#!/bin/bash
# Run C-parity session replay coverage with V8/c8.
# Output goes to coverage/ at repo root.
#
# Usage:
#   bash scripts/run-session-parity-coverage.sh [--text] [--all-types] [extra session_test_runner args...]
#
# Defaults:
#   - session type filter: gameplay
#   - no parallel workers (single-process coverage fidelity)

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

REPORTERS="--reporter=html --reporter=json-summary"
TYPE_ARG="--type=gameplay"
RUNNER_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --text)
      REPORTERS="--reporter=html --reporter=json-summary --reporter=text"
      shift
      ;;
    --all-types)
      TYPE_ARG=""
      shift
      ;;
    --type=*)
      TYPE_ARG="$1"
      shift
      ;;
    *)
      RUNNER_ARGS+=("$1")
      shift
      ;;
  esac
done

echo "Running C-parity session coverage..."
if [[ -n "${TYPE_ARG}" ]]; then
  echo "Session filter: ${TYPE_ARG#--type=}"
else
  echo "Session filter: all session types"
fi

# Ensure each run writes a clean, deterministic report tree.
rm -rf coverage
mkdir -p coverage

npx c8 \
  ${REPORTERS} \
  --report-dir=coverage \
  --include='js/**' \
  node test/comparison/session_test_runner.js \
    --no-parallel \
    ${TYPE_ARG} \
    "${RUNNER_ARGS[@]}"

echo "Applying NetHack theme..."
cp rogue/scripts/nethack.css coverage/nethack.css
node rogue/scripts/nethack-theme.mjs coverage
node scripts/annotate-session-parity-coverage.mjs coverage

echo ""
echo "Coverage report written to: coverage/index.html"
