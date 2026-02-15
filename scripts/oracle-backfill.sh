#!/bin/bash
# Oracle Backfill Script
# Runs session tests on all commits (shuffled order) and stores results in git notes
#
# Usage: scripts/oracle-backfill.sh [--dry-run] [--limit N]
#
# This script uses the CURRENT test infrastructure (from HEAD) to test each historical
# commit's game code. The session tests compare against the golden branch, so results
# show how well each commit's code matches the C reference implementation.
#
# Results are stored in refs/notes/oracle (one JSON per commit).

set -e

# Parse arguments
DRY_RUN=false
LIMIT=0
PROGRESS_INTERVAL=25

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run) DRY_RUN=true; shift ;;
        --limit) LIMIT=$2; shift 2 ;;
        --progress) PROGRESS_INTERVAL=$2; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

echo "========================================"
echo "Oracle Backfill"
echo "========================================"
echo ""

# Save current state
ORIGINAL_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
ORIGINAL_COMMIT=$(git rev-parse HEAD)
NOTES_REF="refs/notes/oracle"

echo "Current state:"
echo "  Branch: ${ORIGINAL_BRANCH:-detached HEAD}"
echo "  Commit: ${ORIGINAL_COMMIT:0:8}"
echo "  Notes ref: $NOTES_REF"
echo ""

# Create temp directory for test infrastructure
TEST_INFRA_DIR=$(mktemp -d)
GOLDEN_BRANCH="${GOLDEN_BRANCH:-golden}"
echo "Test infrastructure source: $GOLDEN_BRANCH branch"
echo "Test infrastructure backup: $TEST_INFRA_DIR"

# Extract test infrastructure files from golden branch
echo "Extracting test infrastructure from $GOLDEN_BRANCH..."
mkdir -p "$TEST_INFRA_DIR/test/comparison"

# Required files from golden branch
for file in session_test_runner.js test_worker.js test_result_format.js session_helpers.js; do
    if git show "$GOLDEN_BRANCH:test/comparison/$file" > "$TEST_INFRA_DIR/test/comparison/$file" 2>/dev/null; then
        echo "  $file"
    fi
done

# Verify we have the required files
if [ ! -f "$TEST_INFRA_DIR/test/comparison/session_test_runner.js" ]; then
    echo "Error: session_test_runner.js not found in $GOLDEN_BRANCH branch"
    echo "Please ensure golden branch has the test infrastructure."
    rm -rf "$TEST_INFRA_DIR"
    exit 1
fi
if [ ! -f "$TEST_INFRA_DIR/test/comparison/test_worker.js" ]; then
    echo "Error: test_worker.js not found in $GOLDEN_BRANCH branch"
    echo "Please ensure golden branch has the test infrastructure."
    rm -rf "$TEST_INFRA_DIR"
    exit 1
fi

# Get all commits
echo "Collecting commits..."
ALL_COMMITS=$(git rev-list HEAD)
TOTAL_COMMITS=$(echo "$ALL_COMMITS" | wc -l | tr -d ' ')
echo "  Total commits: $TOTAL_COMMITS"

# Find commits without oracle notes
echo "Finding commits without oracle notes..."
COMMITS_TO_PROCESS=""
while IFS= read -r commit; do
    if ! git notes --ref=oracle show "$commit" >/dev/null 2>&1; then
        COMMITS_TO_PROCESS="$COMMITS_TO_PROCESS$commit"$'\n'
    fi
done <<< "$ALL_COMMITS"
COMMITS_TO_PROCESS=$(echo "$COMMITS_TO_PROCESS" | grep -v '^$')

if [ -z "$COMMITS_TO_PROCESS" ]; then
    echo "All commits already have oracle notes!"
    rm -rf "$TEST_INFRA_DIR"
    exit 0
fi

COUNT_TO_PROCESS=$(echo "$COMMITS_TO_PROCESS" | wc -l | tr -d ' ')
echo "  Need processing: $COUNT_TO_PROCESS"

# Apply limit if specified
if [ "$LIMIT" -gt 0 ] && [ "$LIMIT" -lt "$COUNT_TO_PROCESS" ]; then
    COUNT_TO_PROCESS=$LIMIT
    echo "  Limited to: $COUNT_TO_PROCESS"
fi

# Shuffle commits (process in random order to avoid correlation bias)
echo "Shuffling commits..."
SHUFFLED_COMMITS=$(echo "$COMMITS_TO_PROCESS" | sort -R | head -n "$COUNT_TO_PROCESS")

if [ "$DRY_RUN" = true ]; then
    echo ""
    echo "DRY RUN - would process these commits:"
    echo "$SHUFFLED_COMMITS" | head -20 | while read commit; do
        echo "  ${commit:0:8}"
    done
    if [ "$COUNT_TO_PROCESS" -gt 20 ]; then
        echo "  ... and $((COUNT_TO_PROCESS - 20)) more"
    fi
    rm -rf "$TEST_INFRA_DIR"
    exit 0
fi

echo ""
echo "Starting backfill of $COUNT_TO_PROCESS commits..."
echo ""

# Statistics
PROCESSED=0
SUCCESS=0
FAILED=0
SKIPPED=0
START_TIME=$(date +%s)

# Cleanup function
cleanup() {
    echo ""
    echo "========================================"
    echo "Restoring original state..."

    # Force checkout to discard any copied test infrastructure
    if [ -n "$ORIGINAL_BRANCH" ] && [ "$ORIGINAL_BRANCH" != "HEAD" ]; then
        git checkout -f "$ORIGINAL_BRANCH" -q 2>/dev/null || git checkout -f "$ORIGINAL_COMMIT" -q
    else
        git checkout -f "$ORIGINAL_COMMIT" -q 2>/dev/null
    fi

    # Clean up temp directory
    rm -rf "$TEST_INFRA_DIR"

    END_TIME=$(date +%s)
    ELAPSED=$((END_TIME - START_TIME))

    echo ""
    echo "========================================"
    echo "Backfill Summary"
    echo "========================================"
    echo "  Processed: $PROCESSED / $COUNT_TO_PROCESS"
    echo "  Success:   $SUCCESS"
    echo "  Failed:    $FAILED"
    echo "  Skipped:   $SKIPPED"
    echo "  Time:      ${ELAPSED}s"
    if [ $SUCCESS -gt 0 ]; then
        AVG=$((ELAPSED / SUCCESS))
        echo "  Avg/test:  ${AVG}s"
    fi
    echo ""

    if [ $SUCCESS -gt 0 ]; then
        echo "Notes stored in: $NOTES_REF"
        echo ""
        echo "To push notes to GitHub:"
        echo "  git push origin $NOTES_REF"
        echo ""
        echo "To aggregate to JSONL:"
        echo "  scripts/oracle-to-jsonl.sh"
    fi
}

trap cleanup EXIT

# Process each commit
while IFS= read -r COMMIT; do
    PROCESSED=$((PROCESSED + 1))
    SHORT=${COMMIT:0:8}

    # Progress report
    if [ $((PROCESSED % PROGRESS_INTERVAL)) -eq 0 ] || [ $PROCESSED -eq 1 ]; then
        NOW=$(date +%s)
        ELAPSED=$((NOW - START_TIME))
        if [ $SUCCESS -gt 0 ]; then
            AVG=$((ELAPSED / SUCCESS))
            ETA=$(( (COUNT_TO_PROCESS - PROCESSED) * AVG ))
            echo "--- Progress: $PROCESSED/$COUNT_TO_PROCESS (success=$SUCCESS, fail=$FAILED, skip=$SKIPPED) ETA=${ETA}s ---"
        else
            echo "--- Progress: $PROCESSED/$COUNT_TO_PROCESS ---"
        fi
    fi

    # Get commit info
    COMMIT_DATE=$(git show -s --format=%cI "$COMMIT" 2>/dev/null)
    COMMIT_MSG=$(git show -s --format=%s "$COMMIT" 2>/dev/null | head -c 60)

    echo "[$PROCESSED/$COUNT_TO_PROCESS] $SHORT: $COMMIT_MSG"

    # Check out commit (force to discard copied test infrastructure)
    if ! git checkout -f "$COMMIT" -q 2>/dev/null; then
        echo "  SKIP: checkout failed"
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    # Copy test infrastructure from backup (overwrite whatever is there)
    mkdir -p test/comparison
    if ! cp "$TEST_INFRA_DIR/test/comparison/session_test_runner.js" test/comparison/session_test_runner.js; then
        echo "  FAIL: could not copy test infrastructure"
        FAILED=$((FAILED + 1))
        continue
    fi
    cp "$TEST_INFRA_DIR/test/comparison/test_worker.js" test/comparison/test_worker.js 2>/dev/null || true
    cp "$TEST_INFRA_DIR/test/comparison/test_result_format.js" test/comparison/test_result_format.js 2>/dev/null || true
    cp "$TEST_INFRA_DIR/test/comparison/session_helpers.js" test/comparison/session_helpers.js 2>/dev/null || true

    # Check if essential game files exist (js/ directory with game code)
    if [ ! -d "js" ]; then
        echo "  SKIP: no js/ directory"
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    # Run session tests with golden reference (with timeout)
    # Use perl for portable timeout since macOS lacks 'timeout' command
    TEST_TIMEOUT=${TEST_TIMEOUT:-60}
    OUTPUT=$(perl -e 'alarm shift; exec @ARGV' "$TEST_TIMEOUT" node test/comparison/session_test_runner.js --golden 2>&1) || true

    # Extract JSON from output (after __RESULTS_JSON__ marker)
    JSON=$(echo "$OUTPUT" | sed -n '/__RESULTS_JSON__/,$ p' | tail -n +2 | head -1)

    if [ -z "$JSON" ]; then
        # Create synthetic error result
        ERROR_LINE=$(echo "$OUTPUT" | grep -E "(Error|Cannot|TypeError|SyntaxError)" | head -1 | head -c 80 | tr '"' "'")
        if [ -z "$ERROR_LINE" ]; then
            ERROR_LINE="Test timed out or produced no output"
        fi
        JSON="{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"commit\":\"$SHORT\",\"goldenBranch\":\"golden\",\"results\":[],\"summary\":{\"total\":0,\"passed\":0,\"failed\":0},\"error\":\"$ERROR_LINE\",\"status\":\"error\"}"
    fi

    # Validate JSON
    if ! echo "$JSON" | node -e "JSON.parse(require('fs').readFileSync(0, 'utf8'))" 2>/dev/null; then
        echo "  FAIL: invalid JSON"
        FAILED=$((FAILED + 1))
        continue
    fi

    # Add commit metadata to JSON
    ENRICHED_JSON=$(echo "$JSON" | node -e "
        const data = JSON.parse(require('fs').readFileSync(0, 'utf8'));
        data.commit = '$COMMIT';
        data.commitShort = '$SHORT';
        data.commitDate = '$COMMIT_DATE';
        console.log(JSON.stringify(data));
    " 2>/dev/null)

    if [ -z "$ENRICHED_JSON" ]; then
        ENRICHED_JSON="$JSON"
    fi

    # Store in git notes (can add notes while on any commit)
    if echo "$ENRICHED_JSON" | git notes --ref=oracle add -f -F - "$COMMIT" 2>/dev/null; then
        # Extract pass/total from JSON for display
        PASS=$(echo "$ENRICHED_JSON" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.summary?.passed || '?')" 2>/dev/null)
        TOTAL=$(echo "$ENRICHED_JSON" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.summary?.total || '?')" 2>/dev/null)
        echo "  OK: $PASS/$TOTAL passed"
        SUCCESS=$((SUCCESS + 1))
    else
        echo "  FAIL: could not store note"
        FAILED=$((FAILED + 1))
    fi

done <<< "$SHUFFLED_COMMITS"

echo ""
echo "Backfill complete!"
