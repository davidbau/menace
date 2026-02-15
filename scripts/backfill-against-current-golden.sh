#!/bin/bash
# Test old JS implementations against CURRENT golden sessions
# Uses a git worktree to maintain separation between old code and current tests
#
# Setup (run once):
#   git worktree add --detach /tmp/mazesofmenace-golden HEAD
#
# Usage: ./backfill-against-current-golden.sh [--dry-run] [limit] [skip]

set -e

DRY_RUN=false
if [[ "$1" == "--dry-run" ]]; then
  DRY_RUN=true
  shift
fi

LIMIT=${1:-10}
SKIP=${2:-0}

# Worktree with current golden sessions
GOLDEN_WORKTREE="/tmp/mazesofmenace-golden"

echo "=========================================="
echo "Backfill Against Current Golden Sessions"
echo "=========================================="
echo ""

# Check for worktree
if [ ! -d "$GOLDEN_WORKTREE" ]; then
  echo "Error: Golden worktree not found at $GOLDEN_WORKTREE"
  echo ""
  echo "Create it with:"
  echo "  git worktree add --detach $GOLDEN_WORKTREE HEAD"
  exit 1
fi

GOLDEN_COMMIT=$(git -C "$GOLDEN_WORKTREE" rev-parse HEAD)
echo "Golden sessions from: ${GOLDEN_COMMIT:0:7}"
echo ""

# Verify clean state
if ! git diff-index --quiet HEAD 2>/dev/null; then
  echo "Error: Uncommitted changes. Please commit or stash first."
  exit 1
fi

ORIGINAL_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
ORIGINAL_COMMIT=$(git rev-parse HEAD)

echo "Current state: ${ORIGINAL_COMMIT:0:7} ($ORIGINAL_BRANCH)"
echo "Config: limit=$LIMIT, skip=$SKIP, mode=$([ "$DRY_RUN" = true ] && echo "DRY RUN" || echo "LIVE")"
echo ""

# Notes ref for these results
NOTES_REF="test-results-current-golden"

# Find commits to test
echo "Finding commits..."
# Only look at main branch commits (not notes refs)
COMMITS=$(git log main --pretty=format:"%H" --skip=$SKIP | while read commit; do
  if git ls-tree -d "$commit" js >/dev/null 2>&1; then
    if ! git notes --ref=$NOTES_REF show "$commit" >/dev/null 2>&1; then
      echo "$commit"
    fi
  fi
done | head -n "$LIMIT")

COUNT=$(echo "$COMMITS" | grep -c . 2>/dev/null || echo 0)

if [ -z "$COMMITS" ] || [ "$COUNT" -eq 0 ]; then
  echo "All commits already tested!"
  exit 0
fi

echo "Found $COUNT commits to test"
echo ""

if [ "$DRY_RUN" = true ]; then
  echo "Commits to test:"
  echo "$COMMITS" | while read commit; do
    MSG=$(git show -s --format="%h %s" "$commit")
    echo "  $MSG"
  done
  echo ""
  echo "Run without --dry-run to execute."
  exit 0
fi

read -p "Test $COUNT commits? [y/N] " -n 1 -r
echo ""
[[ ! $REPLY =~ ^[Yy]$ ]] && { echo "Aborted."; exit 0; }

LOG_FILE="/tmp/backfill-golden-$(date +%s).log"
SUCCESS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
CURRENT=0
TOTAL=$COUNT

cleanup() {
  echo ""
  echo "Restoring to ${ORIGINAL_COMMIT:0:7}..."
  if [ -n "$ORIGINAL_BRANCH" ] && [ "$ORIGINAL_BRANCH" != "HEAD" ]; then
    git checkout --force "$ORIGINAL_BRANCH" 2>/dev/null || git checkout --force "$ORIGINAL_COMMIT"
  else
    git checkout --force "$ORIGINAL_COMMIT" 2>/dev/null
  fi
  echo ""
  echo "Summary: $SUCCESS_COUNT success, $SKIP_COUNT skipped, $FAIL_COUNT failed"
  echo "Log: $LOG_FILE"
}

trap cleanup EXIT

while read commit; do
  [ -z "$commit" ] && continue
  CURRENT=$((CURRENT + 1))
  SHORT="${commit:0:7}"

  echo "[$CURRENT/$TOTAL] $SHORT"

  COMMIT_DATE=$(git show -s --format=%cI "$commit")
  AUTHOR=$(git show -s --format="%an" "$commit")
  MESSAGE=$(git show -s --format=%s "$commit")

  # Checkout old commit (force to discard copied golden files)
  if ! git checkout --force "$commit" -q 2>/dev/null; then
    echo "  SKIP: checkout failed"
    echo "$commit,SKIP,checkout" >> "$LOG_FILE"
    SKIP_COUNT=$((SKIP_COUNT + 1))
    continue
  fi

  # Check for js/ (the JS implementation directory)
  if [ ! -d "js" ]; then
    echo "  SKIP: no js/"
    echo "$commit,SKIP,no_js" >> "$LOG_FILE"
    SKIP_COUNT=$((SKIP_COUNT + 1))
    continue
  fi

  # Copy current test infrastructure from golden worktree
  rm -rf test/comparison test/unit 2>/dev/null || true
  cp -r "$GOLDEN_WORKTREE/test/comparison" test/
  cp -r "$GOLDEN_WORKTREE/test/unit" test/ 2>/dev/null || true
  cp "$GOLDEN_WORKTREE/scripts/collect-test-results.mjs" scripts/ 2>/dev/null || true

  # Note: We intentionally do NOT copy js/config.js, js/special_levels.js, or js/levels/
  # The backfill_runner.js only uses core modules (rng, config, dungeon) from the old commit
  # Copying golden's special_levels.js would cause import failures due to missing exports

  # Install deps if needed
  if [ ! -d "node_modules" ]; then
    cp "$GOLDEN_WORKTREE/package.json" . 2>/dev/null || true
    cp "$GOLDEN_WORKTREE/package-lock.json" . 2>/dev/null || true
    if ! npm install --silent >/dev/null 2>&1; then
      echo "  SKIP: npm install failed"
      echo "$commit,SKIP,npm" >> "$LOG_FILE"
      SKIP_COUNT=$((SKIP_COUNT + 1))
      continue
    fi
  fi

  # Run tests - use minimal backfill runner for better backwards compatibility
  TEST_OUTPUT=$(mktemp)
  START_TIME=$(date +%s)
  if [ -f "test/comparison/backfill_runner.js" ]; then
    node test/comparison/backfill_runner.js 2>&1 > "$TEST_OUTPUT" || true
  else
    node --test test/comparison/*.test.js 2>&1 > "$TEST_OUTPUT" || true
  fi
  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))

  # Parse results - handle both backfill_runner.js JSON and node --test output
  # Use tail -1 to get the JSON line after the marker (grep "^{" fails in pipe)
  RESULTS_JSON=$(grep -A1 "__RESULTS_JSON__" "$TEST_OUTPUT" | tail -1)

  if [ -n "$RESULTS_JSON" ] && echo "$RESULTS_JSON" | grep -q "summary"; then
    # New format with summary object
    SUMMARY_OBJ=$(echo "$RESULTS_JSON" | grep -o '"summary":{[^}]*}')
    PASS_COUNT=$(echo "$SUMMARY_OBJ" | grep -o '"passed":[0-9]*' | cut -d: -f2)
    TEST_TOTAL=$(echo "$SUMMARY_OBJ" | grep -o '"total":[0-9]*' | cut -d: -f2)
    CAN_IMPORT=$(echo "$RESULTS_JSON" | grep -c '"rng":true' || echo 0)
    CAN_GENERATE=$(echo "$RESULTS_JSON" | grep -c '"levelGen":true' || echo 0)
  elif [ -n "$RESULTS_JSON" ] && echo "$RESULTS_JSON" | grep -q "grids"; then
    # Old format with grids object
    GRIDS_OBJ=$(echo "$RESULTS_JSON" | grep -o '"grids":{[^}]*}')
    PASS_COUNT=$(echo "$GRIDS_OBJ" | grep -o '"passed":[0-9]*' | cut -d: -f2)
    TEST_TOTAL=$(echo "$GRIDS_OBJ" | grep -o '"total":[0-9]*' | cut -d: -f2)
    CAN_IMPORT=$(echo "$RESULTS_JSON" | grep -c '"rng":true' || echo 0)
    CAN_GENERATE=$(echo "$RESULTS_JSON" | grep -c '"canGenerate":true' || echo 0)
  else
    # Fallback to node --test output parsing
    PASS_COUNT=$(grep -c "^✔" "$TEST_OUTPUT" 2>/dev/null || echo 0)
    TEST_FAIL_COUNT=$(grep -c "^✖" "$TEST_OUTPUT" 2>/dev/null || echo 0)
    TEST_TOTAL=$((PASS_COUNT + TEST_FAIL_COUNT))
    CAN_IMPORT=1
    CAN_GENERATE=1
  fi

  if [ -z "$TEST_TOTAL" ] || [ "$TEST_TOTAL" -eq 0 ]; then
    echo "  SKIP: no results (tests crashed?)"
    echo "$commit,SKIP,crash" >> "$LOG_FILE"
    SKIP_COUNT=$((SKIP_COUNT + 1))
    rm "$TEST_OUTPUT"
    continue
  fi

  TEST_FAIL_COUNT=$((TEST_TOTAL - PASS_COUNT))
  PASS_RATE=$(awk "BEGIN {printf \"%.1f\", ($PASS_COUNT / $TEST_TOTAL) * 100}")
  echo "  $PASS_COUNT/$TEST_TOTAL ($PASS_RATE%) import=$CAN_IMPORT gen=$CAN_GENERATE"

  # Category breakdown (only available in node --test mode)
  CHARGEN_PASS=$(grep "^✔" "$TEST_OUTPUT" 2>/dev/null | grep -c "_chargen_" 2>/dev/null || echo 0)
  CHARGEN_FAIL=$(grep "^✖" "$TEST_OUTPUT" 2>/dev/null | grep -c "_chargen_" 2>/dev/null || echo 0)
  GAMEPLAY_PASS=$(grep "^✔" "$TEST_OUTPUT" 2>/dev/null | grep -c "_gameplay\\.session" 2>/dev/null || echo 0)
  GAMEPLAY_FAIL=$(grep "^✖" "$TEST_OUTPUT" 2>/dev/null | grep -c "_gameplay\\.session" 2>/dev/null || echo 0)
  MAP_PASS=$(grep "^✔" "$TEST_OUTPUT" 2>/dev/null | grep -c "_map\\.session" 2>/dev/null || echo 0)
  MAP_FAIL=$(grep "^✖" "$TEST_OUTPUT" 2>/dev/null | grep -c "_map\\.session" 2>/dev/null || echo 0)
  SPECIAL_PASS=$(grep "^✔" "$TEST_OUTPUT" 2>/dev/null | grep -c "_special_" 2>/dev/null || echo 0)
  SPECIAL_FAIL=$(grep "^✖" "$TEST_OUTPUT" 2>/dev/null | grep -c "_special_" 2>/dev/null || echo 0)

  # Save note
  TEST_NOTE=$(cat <<EOF
{
  "commit": "$SHORT",
  "date": "$COMMIT_DATE",
  "author": "$AUTHOR",
  "message": "$MESSAGE",
  "goldenCommit": "${GOLDEN_COMMIT:0:7}",
  "stats": {
    "total": $TEST_TOTAL,
    "pass": $PASS_COUNT,
    "fail": $TEST_FAIL_COUNT,
    "passRate": $PASS_RATE,
    "duration": $DURATION
  },
  "categories": {
    "chargen": {"pass": $CHARGEN_PASS, "fail": $CHARGEN_FAIL},
    "gameplay": {"pass": $GAMEPLAY_PASS, "fail": $GAMEPLAY_FAIL},
    "map": {"pass": $MAP_PASS, "fail": $MAP_FAIL},
    "special": {"pass": $SPECIAL_PASS, "fail": $SPECIAL_FAIL}
  },
  "testDate": "$(date -Iseconds)"
}
EOF
)

  if echo "$TEST_NOTE" | git notes --ref=$NOTES_REF add -f -F - "$commit" 2>/dev/null; then
    echo "$commit,OK,$PASS_COUNT,$TEST_FAIL_COUNT,$PASS_RATE" >> "$LOG_FILE"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    echo "  FAIL: couldn't save note"
    echo "$commit,FAIL,note" >> "$LOG_FILE"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi

  rm "$TEST_OUTPUT"
done <<< "$COMMITS"

exit 0
