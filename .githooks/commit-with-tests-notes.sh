#!/bin/bash
# Helper script: Commit with automatic test note (Git Notes version)
# Usage: .githooks/commit-with-tests-notes.sh "commit message" [files...]

set -e

if [ $# -lt 1 ]; then
  echo "Usage: $0 <commit-message> [files...]"
  echo ""
  echo "Example:"
  echo "  $0 'Fix reservoir sampling' js/levels/themerms.js"
  echo ""
  echo "This will:"
  echo "  1. Commit your code changes"
  echo "  2. Run tests and save to git note"
  echo "  3. Sync notes to results.jsonl"
  echo "  4. Commit the updated results.jsonl"
  echo "  5. Ready to push!"
  exit 1
fi

COMMIT_MESSAGE="$1"
shift  # Remove first argument, rest are files

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================"
echo "Commit with Tests Helper (Git Notes)"
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

# Step 2: Run tests and save to git note
echo "Step 2: Running tests and saving to git note..."
"$SCRIPT_DIR/test-and-log-to-note.sh" || {
  echo ""
  echo "❌ Tests failed or regressed!"
  echo "   Code commit: $CODE_COMMIT"
  echo ""
  echo "Options:"
  echo "  1. Fix the issues and amend: git commit --amend"
  echo "  2. Revert this commit: git reset --soft HEAD^"
  echo "  3. Allow regression: $SCRIPT_DIR/test-and-log-to-note.sh --allow-regression && git notes --ref=test-results add -f HEAD"
  exit 1
}

echo ""

# Step 3: Sync notes to JSONL
echo "Step 3: Syncing git notes to results.jsonl..."
"$SCRIPT_DIR/sync-notes-to-jsonl.sh"
echo ""

# Step 4: Commit the updated JSONL
echo "Step 4: Committing updated results.jsonl..."
if ! git diff --quiet floatingeye/results.jsonl 2>/dev/null; then
  git add floatingeye/results.jsonl
  git commit -m "Update test dashboard for $CODE_COMMIT

Synced from git notes (test-results ref)
Message: $COMMIT_MESSAGE"

  MIRROR_COMMIT=$(git rev-parse --short HEAD)
  echo "✅ Dashboard updated: $MIRROR_COMMIT"
else
  echo "⚠️  results.jsonl unchanged (no previous commits with test notes)"
fi

echo ""
echo "========================================"
echo "✅ SUCCESS!"
echo "========================================"
echo "Code commit:  $CODE_COMMIT"
echo "Test note:    Attached to $CODE_COMMIT"
echo ""
echo "Ready to push:"
echo "  git push"
echo "  git push origin refs/notes/test-results"
echo ""
echo "Or configure automatic note push:"
echo "  git config --add remote.origin.push '+refs/notes/test-results:refs/notes/test-results'"
echo ""
