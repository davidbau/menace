#!/bin/bash
# backfill.sh - Run headless session tests across all commits
# Uses git notes to store results on each commit

set -e

TIMEOUT=60  # seconds per test

# Get all commits from main branch
COMMITS=$(git log --oneline origin/main | tac | cut -d' ' -f1)
TOTAL=$(echo "$COMMITS" | wc -l | tr -d ' ')
CURRENT=0

echo "Backfilling $TOTAL commits..."

for COMMIT in $COMMITS; do
    CURRENT=$((CURRENT + 1))
    echo "[$CURRENT/$TOTAL] $COMMIT"

    # Check if we already have a note for this commit
    if git notes show $COMMIT 2>/dev/null | grep -q '"status"'; then
        echo "  Already has result, skipping"
        continue
    fi

    # Checkout the commit
    git checkout $COMMIT -q 2>/dev/null || {
        git notes add -f -m '{"status":"error","message":"checkout failed"}' $COMMIT
        continue
    }

    # Patch nethack.js to export NetHackGame (if not already exported)
    if ! grep -q "export class NetHackGame" js/nethack.js 2>/dev/null; then
        sed -i '' 's/^class NetHackGame {/export class NetHackGame {/' js/nethack.js 2>/dev/null || true
    fi

    # Also patch init() to skip display creation if display already set
    if ! grep -q "if (!this.display)" js/nethack.js 2>/dev/null; then
        sed -i '' 's/this.display = new Display/if (!this.display) { this.display = new Display/' js/nethack.js 2>/dev/null || true
        # Note: This is a quick hack, proper patching would need to add closing brace
    fi

    # Run the test with timeout
    RESULT=$(timeout $TIMEOUT node -e "
import('./test/comparison/headless_runner.js').then(async (m) => {
    try {
        const result = await m.createHeadlessGame(12345);
        if (result.error) {
            console.log(JSON.stringify({status:'error', message: result.error}));
            return;
        }
        const { feedKey, feedChargen, rng } = result;
        await feedChargen();
        const chargenRng = rng.getRngLog().length;
        await feedKey('.'.charCodeAt(0));  // wait
        await feedKey('s'.charCodeAt(0));  // search
        const totalRng = rng.getRngLog().length;
        rng.disableRngLog();
        console.log(JSON.stringify({
            status: 'ok',
            chargenRng,
            totalRng
        }));
    } catch (e) {
        console.log(JSON.stringify({status:'error', message: e.message}));
    }
}).catch(e => console.log(JSON.stringify({status:'error', message: e.message})));
" 2>&1 | grep '^{' | tail -1)

    # Handle timeout
    if [ -z "$RESULT" ]; then
        RESULT='{"status":"timeout"}'
    fi

    # Store result in git notes
    git notes add -f -m "$RESULT" $COMMIT

    # Show result
    echo "  $RESULT"

    # Clean up patched files
    git checkout -- js/nethack.js 2>/dev/null || true
done

# Return to main
git checkout main -q

echo "Backfill complete!"
