#!/bin/bash
# Oracle to JSONL
# Aggregates all oracle git notes into oracle/results.jsonl for dashboard display
#
# Usage: scripts/oracle-to-jsonl.sh [--output FILE]

OUTPUT_FILE="oracle/results.jsonl"

while [[ $# -gt 0 ]]; do
    case $1 in
        --output) OUTPUT_FILE=$2; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

echo "Aggregating oracle notes to $OUTPUT_FILE..."

# Get all commits with oracle notes
COMMITS_WITH_NOTES=$(git notes --ref=oracle list 2>/dev/null | awk '{print $2}')

if [ -z "$COMMITS_WITH_NOTES" ]; then
    echo "No oracle notes found."
    exit 1
fi

COUNT=$(echo "$COMMITS_WITH_NOTES" | wc -l | tr -d ' ')
echo "Found $COUNT commits with oracle notes"

# Create output directory if needed
mkdir -p "$(dirname "$OUTPUT_FILE")"

# Aggregate notes sorted by commit date
echo "Sorting by commit date..."
SORTED_COMMITS=$(
    while IFS= read -r commit; do
        DATE=$(git show -s --format=%cI "$commit" 2>/dev/null)
        echo "$DATE $commit"
    done <<< "$COMMITS_WITH_NOTES" | sort | awk '{print $2}'
)

# Write JSONL file
echo "Writing JSONL..."
> "$OUTPUT_FILE"

WRITTEN=0
while IFS= read -r commit; do
    NOTE=$(git notes --ref=oracle show "$commit" 2>/dev/null)
    if [ -n "$NOTE" ]; then
        echo "$NOTE" >> "$OUTPUT_FILE"
        WRITTEN=$((WRITTEN + 1))
    fi
done <<< "$SORTED_COMMITS"

echo "Wrote $WRITTEN entries to $OUTPUT_FILE"
echo ""
echo "To view dashboard: open oracle/index.html"
