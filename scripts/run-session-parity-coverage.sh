#!/bin/bash
# Run C-parity session replay coverage with V8/c8.
# Output goes to coverage/ at repo root.
#
# Usage:
#   bash scripts/run-session-parity-coverage.sh [--text] [--all-types] [extra session_test_runner args...]
#
# Defaults:
#   - session type filters: gameplay,chargen
#   - no parallel workers (single-process coverage fidelity)

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

REPORTERS="--reporter=html --reporter=json-summary"
TYPE_ARGS=(--type=gameplay --type=chargen)
RUNNER_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --text)
      REPORTERS="--reporter=html --reporter=json-summary --reporter=text"
      shift
      ;;
    --all-types)
      TYPE_ARGS=()
      shift
      ;;
    --type=*)
      TYPE_ARGS=("$1")
      shift
      ;;
    *)
      RUNNER_ARGS+=("$1")
      shift
      ;;
  esac
done

echo "Running C-parity session coverage..."
if [[ ${#TYPE_ARGS[@]} -gt 0 ]]; then
  echo "Session filters: ${TYPE_ARGS[*]//--type=/}"
else
  echo "Session filter: all session types"
fi

# Ensure each run writes a clean, deterministic report tree.
rm -rf coverage
mkdir -p coverage

runner_status=0

if [[ ${#TYPE_ARGS[@]} -eq 0 ]]; then
  set +e
  npx c8 \
    ${REPORTERS} \
    --report-dir=coverage \
    --include='js/**' \
    node test/comparison/session_test_runner.js \
      --no-parallel \
      "${RUNNER_ARGS[@]}"
  runner_status=$?
  set -e
else
  # Collect coverage across selected types, then emit reports once.
  first=1
  for type_arg in "${TYPE_ARGS[@]}"; do
    if [[ $first -eq 1 ]]; then
      set +e
      npx c8 \
        --clean \
        --reporter=none \
        --include='js/**' \
        node test/comparison/session_test_runner.js \
          --no-parallel \
          "${type_arg}" \
          "${RUNNER_ARGS[@]}"
      run_status=$?
      set -e
      first=0
    else
      set +e
      npx c8 \
        --clean=false \
        --reporter=none \
        --include='js/**' \
        node test/comparison/session_test_runner.js \
          --no-parallel \
          "${type_arg}" \
          "${RUNNER_ARGS[@]}"
      run_status=$?
      set -e
    fi

    if [[ ${run_status:-0} -ne 0 ]]; then
      runner_status=$run_status
    fi
  done

  npx c8 report \
    ${REPORTERS} \
    --report-dir=coverage \
    --include='js/**'
fi

echo "Applying NetHack theme..."
cp rogue/scripts/nethack.css coverage/nethack.css
node rogue/scripts/nethack-theme.mjs coverage --game "NetHack"
node scripts/annotate-session-parity-coverage.mjs coverage

echo ""
echo "Coverage report written to: coverage/index.html"

if [[ $runner_status -ne 0 ]]; then
  echo ""
  echo "Session replay coverage run had failing sessions (exit ${runner_status}), but coverage artifacts were still generated." >&2
fi

exit $runner_status
