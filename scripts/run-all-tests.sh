#!/bin/bash
# Run all tests and deposit results for git notes
#
# Usage: ./scripts/run-all-tests.sh
#
# Runs unit, e2e, and session tests, merges results, and writes to
# floatingeye/pending.jsonl for the post-commit hook.

set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
PENDING_FILE="$REPO_ROOT/floatingeye/pending.jsonl"
TEMP_DIR=$(mktemp -d)

cleanup() {
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

echo "=== Running All Tests ==="
echo ""

# Track overall status
UNIT_PASSED=0
UNIT_TOTAL=0
E2E_PASSED=0
E2E_TOTAL=0
SESSION_RESULTS=""

# Run unit tests
echo "Running unit tests..."
UNIT_START=$(date +%s%3N 2>/dev/null || echo "0")
if node --test test/unit/*.test.js 2>&1 | tee "$TEMP_DIR/unit.log"; then
    UNIT_STATUS="passed"
else
    UNIT_STATUS="failed"
fi
UNIT_END=$(date +%s%3N 2>/dev/null || echo "0")
UNIT_DURATION=$((UNIT_END - UNIT_START))
# Parse unit test results (node --test outputs TAP format)
UNIT_TOTAL=$(grep -c "^ok\|^not ok" "$TEMP_DIR/unit.log" 2>/dev/null || echo "0")
UNIT_PASSED=$(grep -c "^ok " "$TEMP_DIR/unit.log" 2>/dev/null || echo "0")
echo "  Unit: $UNIT_PASSED/$UNIT_TOTAL (${UNIT_DURATION}ms)"
echo ""

# Run e2e tests
echo "Running e2e tests..."
E2E_START=$(date +%s%3N 2>/dev/null || echo "0")
if node --test --test-concurrency=1 test/e2e/*.test.js 2>&1 | tee "$TEMP_DIR/e2e.log"; then
    E2E_STATUS="passed"
else
    E2E_STATUS="failed"
fi
E2E_END=$(date +%s%3N 2>/dev/null || echo "0")
E2E_DURATION=$((E2E_END - E2E_START))
E2E_TOTAL=$(grep -c "^ok\|^not ok" "$TEMP_DIR/e2e.log" 2>/dev/null || echo "0")
E2E_PASSED=$(grep -c "^ok " "$TEMP_DIR/e2e.log" 2>/dev/null || echo "0")
echo "  E2E: $E2E_PASSED/$E2E_TOTAL (${E2E_DURATION}ms)"
echo ""

# Run session tests
echo "Running session tests..."
SESSION_OUTPUT=$(node test/comparison/backfill_runner.js 2>&1)
SESSION_JSON=$(echo "$SESSION_OUTPUT" | sed -n '/__RESULTS_JSON__/{n;p;}')

if [ -z "$SESSION_JSON" ]; then
    echo "Warning: No session test results"
    SESSION_JSON='{"results":[],"summary":{"total":0,"passed":0,"failed":0}}'
fi

SESSION_PASSED=$(echo "$SESSION_JSON" | jq -r '.summary.passed')
SESSION_TOTAL=$(echo "$SESSION_JSON" | jq -r '.summary.total')
echo "  Sessions: $SESSION_PASSED/$SESSION_TOTAL"
echo ""

# Build combined results
TOTAL=$((UNIT_TOTAL + E2E_TOTAL + SESSION_TOTAL))
PASSED=$((UNIT_PASSED + E2E_PASSED + SESSION_PASSED))
FAILED=$((TOTAL - PASSED))

# Create unit test results in standard format
UNIT_RESULTS="[]"
if [ "$UNIT_TOTAL" -gt 0 ]; then
    UNIT_RESULTS=$(cat <<EOF
[{"test":"unit-tests","type":"unit","passed":$( [ "$UNIT_PASSED" -eq "$UNIT_TOTAL" ] && echo "true" || echo "false" ),"count":{"passed":$UNIT_PASSED,"total":$UNIT_TOTAL},"duration":$UNIT_DURATION}]
EOF
)
fi

# Create e2e test results in standard format
E2E_RESULTS="[]"
if [ "$E2E_TOTAL" -gt 0 ]; then
    E2E_RESULTS=$(cat <<EOF
[{"test":"e2e-tests","type":"e2e","passed":$( [ "$E2E_PASSED" -eq "$E2E_TOTAL" ] && echo "true" || echo "false" ),"count":{"passed":$E2E_PASSED,"total":$E2E_TOTAL},"duration":$E2E_DURATION}]
EOF
)
fi

# Merge all results
mkdir -p "$REPO_ROOT/floatingeye"
jq -n \
    --argjson unit "$UNIT_RESULTS" \
    --argjson e2e "$E2E_RESULTS" \
    --argjson sessions "$(echo "$SESSION_JSON" | jq '.results')" \
    --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)" \
    '{
        timestamp: $timestamp,
        commit: "HEAD",
        results: ($unit + $e2e + $sessions),
        summary: {
            total: (($unit | length) + ($e2e | length) + ($sessions | length)),
            passed: ([($unit + $e2e + $sessions)[] | select(.passed == true)] | length),
            failed: ([($unit + $e2e + $sessions)[] | select(.passed == false)] | length)
        }
    }' > "$PENDING_FILE"

echo "=== Summary ==="
echo "Unit:     $UNIT_PASSED/$UNIT_TOTAL"
echo "E2E:      $E2E_PASSED/$E2E_TOTAL"
echo "Sessions: $SESSION_PASSED/$SESSION_TOTAL"
echo "Total:    $PASSED/$TOTAL"
echo ""
echo "Results written to floatingeye/pending.jsonl"
echo "Commit to attach results as git note."

# Exit with failure if any tests failed
[ "$PASSED" -eq "$TOTAL" ] || exit 1
