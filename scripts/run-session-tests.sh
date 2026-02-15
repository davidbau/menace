#!/bin/bash
# Run session-based tests and deposit results for git notes
#
# Usage: ./scripts/run-session-tests.sh [--golden]
#
# Runs backfill_runner.js and writes results to floatingeye/pending.jsonl
# with commit set to "HEAD". The post-commit hook will pick this up and
# attach it as a git note with the actual commit hash.

set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
PENDING_FILE="$REPO_ROOT/floatingeye/pending.jsonl"
RUNNER="$REPO_ROOT/test/comparison/backfill_runner.js"

# Pass through any arguments (e.g., --golden)
ARGS="$@"

echo "Running session tests..."

# Run the backfill runner and capture output
OUTPUT=$(node "$RUNNER" $ARGS 2>&1)

# Extract the JSON from the output (after __RESULTS_JSON__ marker)
JSON=$(echo "$OUTPUT" | sed -n '/__RESULTS_JSON__/{n;p;}')

if [ -z "$JSON" ]; then
    echo "Error: No JSON results found in output"
    echo "$OUTPUT"
    exit 1
fi

# Ensure floatingeye directory exists
mkdir -p "$REPO_ROOT/floatingeye"

# Write results with commit set to HEAD
echo "$JSON" | jq '.commit = "HEAD"' > "$PENDING_FILE"

# Show summary
PASSED=$(echo "$JSON" | jq -r '.summary.passed')
TOTAL=$(echo "$JSON" | jq -r '.summary.total')
FAILED=$(echo "$JSON" | jq -r '.summary.failed')

echo ""
echo "Session tests complete: $PASSED/$TOTAL passed ($FAILED failed)"
echo "Results written to floatingeye/pending.jsonl"
echo "Commit to attach results as git note."
