#!/bin/bash
# scripts/run-and-report.sh
#
# Run all gameplay session tests, then display the PES (PRNG/Event/Screen) report.
#
# Usage:
#   scripts/run-and-report.sh                 # run all gameplay sessions + report
#   scripts/run-and-report.sh --why           # show table, generate AI category labels,
#                                             #   re-show table with inline AI tips
#   scripts/run-and-report.sh --diagnose      # like --why but append full TL;DR section
#   scripts/run-and-report.sh --failures       # show only failing sessions
#   scripts/run-and-report.sh --golden        # compare against golden branch
#   scripts/run-and-report.sh --pending       # run/report only pending sessions
#
# To skip the test run and report instantly from last recorded results:
#   node scripts/pes-report.mjs
#
# See docs/PESREPORT.md for full documentation.

set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
RUNNER="$REPO_ROOT/test/comparison/session_test_runner.js"
RESULTS_TMP="$(mktemp /tmp/pes-results-XXXXXX.json)"
RAW_TMP="$RESULTS_TMP.raw"
trap 'rm -f "$RESULTS_TMP" "$RAW_TMP"' EXIT

# Split report flags from args passed to the runner
WHY=0
DIAGNOSE=0
REPORT_FLAGS=()
RUNNER_ARGS=()
PENDING=0
for arg in "$@"; do
    if [ "$arg" = "--why" ]; then
        WHY=1
    elif [ "$arg" = "--diagnose" ]; then
        WHY=1
        DIAGNOSE=1
    elif [ "$arg" = "--failures" ]; then
        REPORT_FLAGS+=("--failures")
    elif [ "$arg" = "--pending" ]; then
        PENDING=1
    else
        RUNNER_ARGS+=("$arg")
    fi
done

RUN_CMD=(node "$RUNNER")
if [ "$PENDING" = "1" ]; then
    shopt -s nullglob
    pending_files=("$REPO_ROOT"/test/comparison/sessions/pending/*.session.json)
    shopt -u nullglob
    if [ "${#pending_files[@]}" -eq 0 ]; then
        echo "No pending session files found in test/comparison/sessions/pending/."
        exit 0
    fi
    sessions_csv=""
    for file in "${pending_files[@]}"; do
        if [ -n "$sessions_csv" ]; then
            sessions_csv+=","
        fi
        sessions_csv+="$file"
    done
    echo "Running pending session tests (${#pending_files[@]} files)..."
    RUN_CMD+=("--sessions=$sessions_csv")
else
    echo "Running gameplay session tests..."
    RUN_CMD+=(--type=gameplay)
fi
RUN_CMD+=("${RUNNER_ARGS[@]}")

# Run tests; accept non-zero exit (session failures are expected)
set +e
"${RUN_CMD[@]}" > "$RAW_TMP" 2>&1
set -e

# Extract JSON from output
sed -n '/__RESULTS_JSON__/{n;p;}' "$RAW_TMP" > "$RESULTS_TMP"

if [ ! -s "$RESULTS_TMP" ]; then
    echo "Error: no JSON results found. Raw output:"
    cat "$RAW_TMP"
    exit 1
fi

# Show table immediately
echo ""
node "$REPO_ROOT/scripts/pes-report.mjs" "$RESULTS_TMP" "${REPORT_FLAGS[@]}"

# Optionally generate AI diagnoses and append results
if [ "$WHY" = "1" ]; then
    CLAUDECODE= node "$REPO_ROOT/scripts/gen-pes-diagnoses.mjs" "$RESULTS_TMP"
    if [ "$DIAGNOSE" = "1" ]; then
        node "$REPO_ROOT/scripts/pes-report.mjs" "$RESULTS_TMP" --diagnose-only "${REPORT_FLAGS[@]}"
    else
        node "$REPO_ROOT/scripts/pes-report.mjs" "$RESULTS_TMP" "${REPORT_FLAGS[@]}"
    fi
fi
