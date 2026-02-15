#!/bin/bash
# Helper script: Commit code changes AND test results in one command
# Usage: .githooks/commit-with-tests.sh "commit message" [files...]

set -e

if [ $# -lt 1 ]; then
  echo "Usage: $0 <commit-message> [files...]"
  echo ""
  echo "Example:"
  echo "  $0 'Fix reservoir sampling' js/levels/themerms.js"
  echo ""
  echo "This will:"
  echo "  1. Commit your code changes"
  echo "  2. Run tests"
  echo "  3. Commit test results"
  echo "  4. Ready to push!"
  exit 1
fi

COMMIT_MESSAGE="$1"
shift  # Remove first argument, rest are files

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================"
echo "Commit with Tests Helper"
echo "========================================"
echo "Commit message: $COMMIT_MESSAGE"
echo ""

# Step 1: Commit code changes
echo "Step 1: Committing code changes..."
if [ $# -gt 0 ]; then
  # Files specified
  git add "$@"
  echo "Added files: $@"
else
  # No files specified, commit all staged changes
  if git diff --staged --quiet; then
    echo "ERROR: No staged changes to commit"
    echo "Either:"
    echo "  - Stage files with: git add <files>"
    echo "  - Or specify files: $0 \"message\" file1 file2..."
    exit 1
  fi
fi

git commit -m "$COMMIT_MESSAGE"
CODE_COMMIT=$(git rev-parse --short HEAD)
echo "✅ Code committed: $CODE_COMMIT"
echo ""

# Step 2: Run tests
echo "Step 2: Running tests..."
"$SCRIPT_DIR/test-and-log.sh" || {
  echo ""
  echo "❌ Tests failed or regressed!"
  echo "   Code commit: $CODE_COMMIT"
  echo ""
  echo "Options:"
  echo "  1. Fix the issues and amend: git commit --amend"
  echo "  2. Revert this commit: git reset --soft HEAD^"
  echo "  3. Allow regression: $SCRIPT_DIR/test-and-log.sh --allow-regression"
  exit 1
}

echo ""

# Step 3: Commit test results
echo "Step 3: Committing test results..."
git add oracle/results.jsonl
git commit -m "Add test results for $CODE_COMMIT

Test run for commit: $CODE_COMMIT
Message: $COMMIT_MESSAGE"

TEST_COMMIT=$(git rev-parse --short HEAD)
echo "✅ Test results committed: $TEST_COMMIT"
echo ""

echo "========================================"
echo "✅ SUCCESS!"
echo "========================================"
echo "Code commit:  $CODE_COMMIT"
echo "Test commit:  $TEST_COMMIT"
echo ""
echo "Ready to push:"
echo "  git push"
echo ""
