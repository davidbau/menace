#!/bin/bash
# Rebuild oracle/results.jsonl from git notes, commit and push if changed.
# Intended to be run periodically (e.g., cron, CI, or manually).

set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
OUTPUT_FILE="$REPO_ROOT/oracle/results.jsonl"

# Pull latest test notes from remote
echo "Fetching test notes from remote..."
git fetch origin 2>/dev/null || echo "ℹ️  Could not fetch from remote"

if git fetch origin refs/notes/test-results:refs/notes/test-results-remote 2>/dev/null; then
  echo "✅ Fetched test-results notes from remote"

  if git show-ref refs/notes/test-results >/dev/null 2>&1; then
    # Merge remote notes into local (newest wins)
    git notes --ref=test-results-remote list 2>/dev/null | while read note_hash commit_hash; do
      REMOTE_NOTE=$(git notes --ref=test-results-remote show "$commit_hash" 2>/dev/null || echo "")
      LOCAL_NOTE=$(git notes --ref=test-results show "$commit_hash" 2>/dev/null || echo "")

      if [ -z "$LOCAL_NOTE" ]; then
        echo "$REMOTE_NOTE" | git notes --ref=test-results add -f -F - "$commit_hash" 2>/dev/null || true
      elif [ -n "$REMOTE_NOTE" ]; then
        REMOTE_DATE=$(echo "$REMOTE_NOTE" | jq -r '.date' 2>/dev/null || echo "")
        LOCAL_DATE=$(echo "$LOCAL_NOTE" | jq -r '.date' 2>/dev/null || echo "")
        if [ -n "$REMOTE_DATE" ] && [ -n "$LOCAL_DATE" ] && [[ "$REMOTE_DATE" > "$LOCAL_DATE" ]]; then
          echo "$REMOTE_NOTE" | git notes --ref=test-results add -f -F - "$commit_hash" 2>/dev/null || true
        fi
      fi
    done
    echo "✅ Merged remote notes"
    git update-ref -d refs/notes/test-results-remote 2>/dev/null || true
  else
    git update-ref refs/notes/test-results refs/notes/test-results-remote
    git update-ref -d refs/notes/test-results-remote 2>/dev/null || true
    echo "✅ Initialized local notes from remote"
  fi
fi

# Rebuild results.jsonl from notes
echo "Rebuilding oracle/results.jsonl from git notes..."
TEMP_FILE=$(mktemp)

if git show-ref refs/notes/test-results >/dev/null 2>&1; then
  git notes --ref=test-results list | while read note_hash commit_hash; do
    NOTE=$(git notes --ref=test-results show "$commit_hash" 2>/dev/null || echo "")
    if [ -n "$NOTE" ] && echo "$NOTE" | jq empty 2>/dev/null; then
      echo "$NOTE" >> "$TEMP_FILE"
    fi
  done
fi

if [ -s "$TEMP_FILE" ]; then
  jq -s -c 'sort_by(.date) | .[]' "$TEMP_FILE" > "$OUTPUT_FILE"
  LINE_COUNT=$(wc -l < "$OUTPUT_FILE")
  echo "✅ Rebuilt results.jsonl with $LINE_COUNT entries"
else
  echo "⚠️  No test notes found, keeping existing results.jsonl"
fi
rm -f "$TEMP_FILE"

# Commit and push if results.jsonl changed
if ! git diff --quiet "$OUTPUT_FILE" 2>/dev/null; then
  git add "$OUTPUT_FILE"
  git commit --no-verify -m "Sync oracle/results.jsonl from test notes"
  echo "✅ Committed updated results.jsonl"

  if git push --no-verify 2>/dev/null; then
    echo "✅ Pushed"
  else
    echo "ℹ️  Could not push (try manually)"
  fi
else
  echo "ℹ️  results.jsonl is already up-to-date"
fi
