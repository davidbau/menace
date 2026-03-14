---
name: keylog-replay
description: Use this skill when working with browser-recorded keylogs to reproduce bugs, build regression tests, and verify display parity between browser and headless.
---

# Keylog Replay Skill

## When To Use
Use this when a user provides a browser-recorded keylog JSON file and you need to:
- Reproduce a UI bug seen in the browser
- Write a headless regression test from the keylog
- Compare browser and headless display output
- Debug menu clearing, screen corruption, or display parity issues

## Keylog Format (v1)

Browser keylogs are JSON files (typically `keylog_<name>_<seed>.json`):

```json
{
  "version": 1,
  "seed": 955505340,
  "options": { "name": "David", "time": true },
  "keys": [121, 121, 32, 32, 110, 106, 106, 98, ...],
  "metadata": { "timestamp": "...", "turns": 12 }
}
```

- **seed**: PRNG seed used for the session
- **options**: Diff from default game options (only non-default values)
- **keys**: Array of ASCII key codes, in order, as consumed by `nhgetch()`
- The first N keys are consumed by character generation (chargen); the rest are gameplay keys

## Key Concept: Chargen Key Consumption

When replaying a keylog headlessly, you must use the **browser init path** (no
`character` field) so that `_playerSelection()` runs and consumes chargen keys
from the input queue, exactly as the browser does.

Typical chargen sequence when `options.name` is set and auto-pick is used:
1. `y` — "Shall I pick a character for you?" → yes
2. `y` — "Is this ok?" → confirm
3. `SPC` — dismiss lore --More--
4. `SPC` — dismiss welcome --More--
5. `n` — decline tutorial

The exact count depends on the game state. The test can verify this by checking
which key is returned at each `nhgetch()` call.

**Important**: Do NOT use `createHeadlessGame()` from `js/headless.js` for keylog
replay — it passes a `character` field to `init()`, which skips chargen entirely
and causes RNG divergence. Instead, use `new NetHackGame()` + `game.init()` directly.

## Replay Pattern

The canonical replay function (from `test/unit/keylog_display_parity.test.js`):

```javascript
import { createHeadlessInput, HeadlessDisplay } from '../../js/headless.js';
import { NetHackGame } from '../../js/allmain.js';

async function replayKeylog(seed, keys, initFlags = {}) {
    const input = createHeadlessInput({ throwOnEmpty: true });
    const display = new HeadlessDisplay();
    const game = new NetHackGame({ display, input });

    const snapshots = [];
    let keyReadCount = 0;

    // Hook nhgetch to capture screen state before each key is returned
    const origNhgetch = input.nhgetch.bind(input);
    input.nhgetch = async function () {
        const lines = [];
        for (let r = 0; r < 24; r++) {
            let line = '';
            for (let c = 0; c < 80; c++) {
                line += display.grid?.[r]?.[c] || ' ';
            }
            lines.push(line);
        }
        const ch = await origNhgetch();
        keyReadCount++;
        snapshots.push({ index: keyReadCount, keyReturned: ch, lines });
        return ch;
    };

    // Pre-queue all keys
    for (const code of keys) {
        input.pushInput(code);
    }

    // Use browser-like init: NO character field → runs _playerSelection()
    await game.init({
        seed,
        wizard: false,
        flags: initFlags,   // e.g. { name: 'David', time: true }
    });

    // Run game loop until keys exhausted
    try {
        while (!game.gameOver) {
            await game._gameLoopStep();
        }
    } catch (e) {
        if (!e.message?.includes('Input queue empty') &&
            !e.message?.includes('pending')) {
            throw e;
        }
    }

    // Capture final screen state
    const finalLines = [];
    for (let r = 0; r < 24; r++) {
        let line = '';
        for (let c = 0; c < 80; c++) {
            line += display.grid?.[r]?.[c] || ' ';
        }
        finalLines.push(line);
    }

    return { snapshots, game, finalLines };
}
```

Key details:
- `throwOnEmpty: true` — throws when input queue is empty instead of blocking forever
- `flags` receives the keylog's `options` object (name, time, etc.)
- `snapshots[i].lines` is the screen state **before** key `i+1` is returned
- `finalLines` is the screen after all commands have been processed

## Writing Regression Tests

### Step 1: Load the keylog
```javascript
const keylog = JSON.parse(fs.readFileSync('keylog_David_955505340.json'));
const { seed, keys, options } = keylog;
```

### Step 2: Replay and capture snapshots
```javascript
const { snapshots, finalLines } = await replayKeylog(seed, keys, options);
```

### Step 3: Write assertions

**Verify chargen key count** — find the first gameplay key:
```javascript
const key6 = snapshots[5]; // 0-indexed
assert.equal(key6.keyReturned, 106, 'Key 6 should be j — first gameplay key');
```

**Check menu content at a specific point**:
```javascript
const menuSnap = snapshots[20];
assert.equal(menuSnap.keyReturned, 111, 'Should be o at container menu');
const hasExpected = menuSnap.lines.some(l => l.includes('Do what with the chest?'));
assert.ok(hasExpected, 'Container menu should be visible');
```

**Assert no stale menu remnants**:
```javascript
const hasStale = lines.some(l => l.includes('Auto-select'));
assert.ok(!hasStale, 'Previous menu text should be cleared');
```

**Check clean final screen**:
```javascript
const hasMenuText = finalLines.some(l =>
    l.includes('Take out') || l.includes('(end)'));
assert.ok(!hasMenuText, 'No menu remnants on final screen');
```

### Step 4: Verify menu layout geometry
Use `assertCleanMenuRows(lines, startRow, endRow, description)` to check that
all non-blank content in a row range starts at similar columns (detecting
overlapping menus from different draw calls):

```javascript
function assertCleanMenuRows(lines, startRow, endRow, description) {
    const contentCols = [];
    for (let r = startRow; r <= endRow; r++) {
        const line = lines[r];
        const trimmed = line.trimStart();
        if (trimmed.trim().length === 0) continue;
        const firstContentCol = line.length - trimmed.length;
        contentCols.push({ row: r, col: firstContentCol, text: trimmed.trimEnd() });
    }
    if (contentCols.length <= 1) return;
    const cols = contentCols.map(c => c.col);
    const tolerance = 20;
    if (Math.max(...cols) - Math.min(...cols) > tolerance) {
        assert.fail(`${description}: overlapping menus detected`);
    }
}
```

## Workflow: Keylog to Regression Test

1. **Get keylog** from user (typically `~/Downloads/keylog_*.json`)
2. **Read it** — note seed, options, key count
3. **Replay headlessly** — run `replayKeylog()` to see screen states
4. **Identify the bug frame** — find the snapshot index where the display issue occurs
5. **Diagnose** — compare expected vs actual screen content at that frame
6. **Fix the bug** in game code (e.g., `js/pickup.js`, `js/windows.js`)
7. **Write test** in `test/unit/keylog_display_parity.test.js` with the keylog's seed + keys hardcoded
8. **Verify** — stash the fix, run test (should fail), restore fix, run test (should pass)

## Display Architecture Notes

- **Browser Display** stores grid cells as objects: `{ ch, color, attrs }`
- **HeadlessDisplay** stores 3 parallel flat arrays: `grid[r][c]`, `colors[r][c]`, `attrs[r][c]`
- Both share `putstr()`, `clearRow()`, `renderOverlayMenu()` APIs
- Container loot menus in `js/pickup.js` draw **directly on the grid** (not through the nhwindow overlay system in `js/windows.js`), making them susceptible to improper clearing
- The nhwindow-based menus (`select_menu()` in `windows.js`) use `renderOverlayMenu()` which handles its own clearing

## Key Files

| File | Purpose |
|------|---------|
| `test/unit/keylog_display_parity.test.js` | Keylog-based headless regression tests |
| `test/e2e/headless_browser_parity.e2e.test.js` | Puppeteer browser vs headless parity |
| `js/headless.js` | HeadlessDisplay, createHeadlessInput |
| `js/allmain.js` | NetHackGame class, init(), gameLoop() |
| `js/chargen.js` | playerSelection() — chargen flow |
| `js/nethack.js` | Browser entry point (reference for browser init path) |
| `js/pickup.js` | Container loot menus (direct grid drawing) |
| `js/windows.js` | nhwindow overlay menu system |
| `js/keylog.js` | Browser keylog recording/replay |

## Running Tests

```bash
# Unit tests (includes keylog parity tests)
npm test

# Just the keylog display parity tests
node --test test/unit/keylog_display_parity.test.js

# E2E browser parity tests (requires Puppeteer)
node --test test/e2e/headless_browser_parity.e2e.test.js
```
