# Plan: Cursor Position Tracking and Blinking Cursor

## Context

NetHack uses the terminal cursor as a player affordance — it pulses at the player's position during normal gameplay, moves to the end of messages and `--More--` prompts when the game awaits acknowledgement, and sits at text-input prompts otherwise. Our JS session tests currently compare only the character/color grid; they ignore cursor position. The HTML game renders no cursor at all. This plan adds end-to-end cursor tracking: C-side capture, JS tracking, session comparison, and a blinking CSS outline in the HTML display.

## Scope

Nine files changed across six layers. Sessions need re-recording once C harness is updated.

---

## Layer 1 — C Harness: `test/comparison/c-harness/run_session.py`

After every existing `capture_screen_compressed(session)` call, also call tmux to get the cursor position and store it in the step dict.

```python
def capture_cursor(session):
    """Return [col, row] cursor position of the pane (0-indexed)."""
    out = subprocess.run(
        ['tmux', 'display-message', '-p', '-t', session,
         '#{pane_cursor_x},#{pane_cursor_y}'],
        capture_output=True, text=True, check=True
    ).stdout.strip()
    col, row = (int(v) for v in out.split(','))
    return [col, row]
```

Add `'cursor': capture_cursor(session)` to every step dict. There are **14 call sites** across
wizload (lines 516, 525, 534, 562, 1009, 1086), chargen (lines 1186, 1211, 1334),
interface (lines 1457, 1522), and gameplay (lines 1821, 1913) modes.

Sessions recorded before this change have no `cursor` field — comparison is optional (see Layer 5).

---

## Layer 2 — JS Display Classes

Both `HeadlessDisplay` (js/headless.js) and `Display` (js/display.js) get parallel cursor-tracking additions.

### `HeadlessDisplay` (js/headless.js)

**Constructor (line ~448)** — add after `this._tempOverlay = new Map()`:
```javascript
this.cursorCol = 0;
this.cursorRow = 0;
```

**New methods:**
```javascript
setCursor(col, row) {
    this.cursorCol = col;
    this.cursorRow = row;
}
getCursor() { return [this.cursorCol, this.cursorRow]; }
```

**`putstr_message(msg)` (lines 486-520)** — two branches write to row 0:
1. **Concatenated branch (line ~509)**: after `this.putstr(0, 0, combined.substring(...))`, add:
   `this.setCursor(Math.min(combined.length, this.cols - 1), 0);`
2. **Plain branch (line ~514)**: after `this.putstr(0, 0, msg.substring(...))`, add:
   `this.setCursor(Math.min(msg.length, this.cols - 1), 0);`

**`renderMoreMarker()` (lines 526-531)** — after the `this.putstr(col, 0, moreStr, ...)` call, add:
```javascript
this.setCursor(Math.min(col + moreStr.length, this.cols - 1), 0);
```

**New `cursorOnPlayer(player)` method:**
```javascript
cursorOnPlayer(player) {
    if (player) {
        const mapOffset = this.flags?.msg_window ? 3 : MAP_ROW_START;
        this.setCursor(player.x - 1, player.y + mapOffset);
    }
}
```

### `Display` (js/display.js)

**Constructor (line ~170)** — add after `this._tempOverlay`:
```javascript
this.cursorCol = 0;
this.cursorRow = 0;
this._cursorSpan = null;   // currently highlighted <span>
```

**`_createDOM()` (line ~182)** — inject CSS animation. Add a `<style>` element to the DOM
(not inline on `pre`) since `@keyframes` requires a stylesheet:
```javascript
const style = document.createElement('style');
style.textContent = `
@keyframes nh-cursor-blink {
  0%, 49% { outline: 2px solid rgba(255,255,255,0.85);
            outline-offset: -2px; }
  50%, 100% { outline: none; }
}
span.nh-cursor {
  animation: nh-cursor-blink 0.8s step-end infinite;
}
`;
this.container.appendChild(style);
```

**New methods:**
```javascript
setCursor(col, row) {
    if (this._cursorSpan) {
        this._cursorSpan.classList.remove('nh-cursor');
        this._cursorSpan = null;
    }
    this.cursorCol = col;
    this.cursorRow = row;
    if (row >= 0 && row < this.rows && col >= 0 && col < this.cols
        && this.spans[row] && this.spans[row][col]) {
        this._cursorSpan = this.spans[row][col];
        this._cursorSpan.classList.add('nh-cursor');
    }
}
getCursor() { return [this.cursorCol, this.cursorRow]; }
```

**`cursorOnPlayer(player)` (line ~942)** — modify existing method to add setCursor:
```javascript
cursorOnPlayer(player) {
    if (player) {
        const mapOffset = this.flags?.msg_window ? 3 : MAP_ROW_START;
        this.setCell(player.x - 1, player.y + mapOffset, '@', CLR_WHITE);
        this.setCursor(player.x - 1, player.y + mapOffset);  // NEW
    }
}
```
Note: existing method already exists (line 942) but only calls `setCell`. We modify it in place.

**`putstr_message(msg)` (lines 275-338)** — Display's version has word-wrapping and msg_window
branches that HeadlessDisplay lacks. Add `setCursor` at each write-to-row-0 exit point:
1. **Concatenated branch (~line 305)**: `this.setCursor(Math.min(combined.length, this.cols - 1), 0);`
2. **Plain single-line branch (~line 333)**: `this.setCursor(Math.min(msg.length, this.cols - 1), 0);`
3. **msg_window branch (~line 290)**: returns early — no cursor change needed here (message
   window mode uses a separate scrolling area).

**`morePrompt(nhgetch)` (lines 363-371)** — Display uses `morePrompt()` (not `renderMoreMarker()`).
After the `this.putstr(col, MESSAGE_ROW, moreStr, CLR_GREEN)` call, add:
```javascript
this.setCursor(Math.min(col + moreStr.length, this.cols - 1), 0);
```

---

## Layer 3 — Calling `cursorOnPlayer` in the Game Loop: `js/allmain.js`

**Best approach**: add `cursorOnPlayer` to `renderCurrentScreen()` (line ~1289), which is the
centralized render helper called from `_rerenderGame()` and other places:
```javascript
renderCurrentScreen() {
    this.fov.compute(this.map, this.player.x, this.player.y);
    this.display.renderMap(this.map, this.player, this.fov, this.flags);
    this.display.renderStatus(this.player);
    this.display.cursorOnPlayer(this.player);   // NEW
}
```

However, not all 9 render-pairs go through `renderCurrentScreen()` — many inline the
`renderMap` + `renderStatus` calls directly. For those sites (in `init()`, `executeCommand()`,
`gameLoop()`), add `this.display.cursorOnPlayer(this.player)` after each `renderStatus` call:
- Line ~1169 (init, after level creation)
- Line ~1395 (executeCommand, after command)
- Lines ~1534, ~1550, ~1563, ~1590, ~1604 (gameLoop, various points)

**Pattern**: wherever `this.display.renderStatus(this.player)` appears, add on the next line:
```javascript
this.display.cursorOnPlayer(this.player);
```

**`curs_on_u()` in display.js (line ~1330)**: Leave as-is for now. The `curs_on_u` stub is
an autotranslated function that calls `flush_screen(1)`. The `getRuntimeDisplay` function lives
in `input.js` (not accessible from display.js). Rather than wiring up cross-module access,
the `cursorOnPlayer` calls in allmain.js handle the cursor placement at the right times.
`curs_on_u` can be updated later if needed for non-replay paths.

---

## Layer 4 — Replay Core: `js/replay_core.js`

### 4a. Add `cursor` to `captureSnapshot` (line ~720)

Add cursor parameter and include in frame:
```javascript
const captureSnapshot = (rawLog, screen, screenAnsiOverride, stepIndex, byteIndex, key, cursorOverride) => {
    // ... existing compact/normalize logic ...
    const cursor = cursorOverride
        || (typeof game.display?.getCursor === 'function' ? game.display.getCursor() : null);
    const frame = {
        key, stepIndex, byteIndex,
        rngCalls: rawLog.length, rng: compact,
        screen: normalizedScreen, screenAnsi: normalizedScreenAnsi,
        cursor,   // NEW
    };
    byteResults.push(frame);
    return frame;
};
```

### 4b. Capture cursor at all 6 screen-capture sites

Add a `capturedCursorOverride` variable alongside `capturedScreenOverride`:

1. **onAnimationDelayBoundary (line ~633)**: add `cursor: display.getCursor()` to snap object.
2. **Player death (line ~794)**: pass `game.display.getCursor()` as cursor param to captureSnapshot.
3. **Count prefix (line ~822)**: same.
4. **Pending command not settled (line ~852)**: capture `capturedCursorOverride = game.display.getCursor()`.
5. **New command awaiting input (line ~874)**: capture `capturedCursorOverride = game.display.getCursor()`.
6. **Final step capture (line ~895)**: pass `capturedCursorOverride` to captureSnapshot (falls back to live getCursor inside).

Reset `capturedCursorOverride = null` alongside the existing `capturedScreenOverride = null` reset.

---

## Layer 5 — Comparison Pipeline

### 5a. `test/comparison/session_comparator.js` — cursor comparison loop

Add cursor tracking variables and per-step comparison alongside screen/color:

```javascript
let cursorMatched = 0;
let cursorTotal = 0;
let firstCursorDivergence = null;

// Inside the per-step loop:
const expectedCursor = expected.cursor || null;
const actualCursor = (actual.cursor) || null;
if (expectedCursor) {
    cursorTotal++;
    const [ec, er] = expectedCursor;
    const [ac, ar] = actualCursor || [null, null];
    if (ac === ec && ar === er) {
        cursorMatched++;
    } else if (!firstCursorDivergence) {
        firstCursorDivergence = {
            step: i + 1,
            expected: expectedCursor,
            actual: actualCursor,
        };
    }
}
```

Add `cursor` channel to the return object (line ~112):
```javascript
cursor: {
    matched: cursorMatched,
    total: cursorTotal,
    firstDivergence: firstCursorDivergence,
},
```

### 5b. `test/comparison/comparator_policy.js` — no changes needed

The comparator_policy defines per-step comparison *methods* for complex channels (screen
normalization, color ANSI parsing, animation windows). Cursor comparison is trivial
(two integers) — it's simpler to inline it directly in session_comparator.js.

---

## Layer 6 — Test Result Format: `test/comparison/test_result_format.js`

### 6a. Add `cursor` to metrics structure (line ~57)

```javascript
metrics: {
    // ... existing fields ...
    cursor: { matched: 0, total: 0 },
}
```

### 6b. Add `recordCursor` function (after `recordColorWindow`):

```javascript
export function recordCursor(result, matched, total) {
    result.metrics.cursor.matched += matched;
    result.metrics.cursor.total += total;
}
```

### 6c. Update `formatBundleSummary` (line ~338)

Add cursor parity to the summary line:
```javascript
+ `cursorFull=${g.cursorFull}/${g.cursorComparable}, `
```

### 6d. Update `createResultsBundle` gameplayParity (line ~281)

Add `cursorComparable` and `cursorFull` fields.

---

## Layer 7 — Test Runner: `test/comparison/session_test_runner.js`

Wire cursor channel into the per-session result (alongside screenWindow/colorWindow at line ~426):

```javascript
if (cmp.cursor?.total > 0) {
    recordCursor(result, cmp.cursor.matched, cmp.cursor.total);
    setFirstDivergence(result, 'cursor', cmp.cursor.firstDivergence);
}
```

Import `recordCursor` from `test_result_format.js`.

---

## Critical Files

| File | Change |
|------|--------|
| `test/comparison/c-harness/run_session.py` | Add `capture_cursor()`, write `cursor` to every step dict (14 sites) |
| `js/headless.js` | `cursorCol/Row`, `setCursor`, `getCursor`, `cursorOnPlayer`; update `putstr_message`, `renderMoreMarker` |
| `js/display.js` | Same fields/methods; CSS `@keyframes`; `setCursor` in `cursorOnPlayer`, `putstr_message`, `morePrompt` |
| `js/allmain.js` | Call `display.cursorOnPlayer(player)` after each `renderStatus` (9 sites + `renderCurrentScreen`) |
| `js/replay_core.js` | Add `cursor` to `captureSnapshot`; capture `getCursor()` at all 6 snapshot sites + animation boundary |
| `test/comparison/session_comparator.js` | Cursor comparison loop + `cursor` channel in return object |
| `test/comparison/test_result_format.js` | `cursor` metric, `recordCursor()`, update summary + gameplayParity |
| `test/comparison/session_test_runner.js` | Wire `recordCursor` + `setFirstDivergence('cursor', ...)` |

Note: `comparator_policy.js` does **not** need changes — cursor comparison is trivial and inlined
in `session_comparator.js`.

---

## Verification

1. **Run `npm test`** — confirm no regressions (cursor comparison skipped for old sessions without `cursor` field).

2. **Re-record sessions** — see detailed procedure below.

3. **Run `npm test` again** — confirm cursor comparison is active and results show cursor metrics.

4. **Manual check**: open the HTML game, play a few moves, verify blinking outline appears at player position; see cursor move to end of message on --More-- prompts.

---

## Implementation Status

Layers 2-7 and Layer 1 code changes are **done** (commits `06788b8c`, `f48d5aef`).
All JS-side cursor tracking, comparison pipeline, and C harness `capture_cursor()` are in place.
Remaining work: re-record sessions to add `cursor` fields.

- [x] Layer 2a: `js/headless.js`
- [x] Layer 2b: `js/display.js`
- [x] Layer 3: `js/allmain.js`
- [x] Layer 4: `js/replay_core.js`
- [x] Layer 5: `test/comparison/session_comparator.js`
- [x] Layer 6: `test/comparison/test_result_format.js`
- [x] Layer 7: `test/comparison/session_test_runner.js`
- [x] Layer 1: `test/comparison/c-harness/run_session.py`
- [x] Re-record sessions (cursor fields already present in all session files as of 2026-03-04)

---

## Re-recording Sessions: Procedure and Safeguards

Adding `cursor` to session files requires re-recording with the updated C harness. The new
sessions **must** be identical to the old ones in every existing field (RNG, events, screens,
screenAnsi) — the only change should be the addition of `cursor: [col, row]` per step.

### Why divergences can appear and how to handle them

| Risk | Cause | Mitigation |
|------|-------|------------|
| **Timing/screenshot drift** | tmux `capture_cursor` adds a tiny delay; screen captures may land before terminal settles | Compare old vs new session files field-by-field (see validation script below); if screens differ, increase per-step delay rather than accepting drift |
| **C binary version mismatch** | Re-recording with a different C NetHack build than the original | Always re-record against the exact same C binary + commit. Document the C build hash in `seeds.json` or session metadata |
| **Tutorial environment** | Tutorial sessions depend on specific .nethackrc options, tmux geometry, and startup prompt sequencing | Use `rerecord.py` which reads `regen` metadata from each session — never re-record tutorials manually |
| **Key delay overrides** | Some sessions have per-step `capture.key_delay_s` entries that tune timing for tricky steps (e.g., animation boundaries) | `rerecord.py` extracts these from the session JSON and passes them to `run_session.py` via `NETHACK_KEY_DELAYS_S` — do not bypass this |
| **Manual/keylog sessions** | `interface_tutorial.session.json` and similar are recorded from keylog files, not move strings | `rerecord.py` dispatches to `keylog_to_session.py` for `mode: keylog` — verify these separately |

### Step-by-step re-recording procedure

**Step 0 — Preserve originals.**
```bash
# Snapshot all current session files so we can diff
mkdir -p /tmp/sessions-before
cp test/comparison/sessions/*.session.json /tmp/sessions-before/
cp test/comparison/maps/*.session.json /tmp/sessions-before/
cp test/comparison/sessions/manual/*.session.json /tmp/sessions-before/
```

**Step 1 — Re-record one session first.**
Pick a simple gameplay session (e.g., `seed100_multidigit_gameplay`) and re-record it alone:
```bash
cd test/comparison/c-harness
python3 rerecord.py ../sessions/seed100_multidigit_gameplay.session.json
```
Then validate (see Step 3).

**Step 2 — Re-record all sessions.**
Only after the single-session validation passes:
```bash
python3 rerecord.py --all --parallel 4
```
Session types handled by `rerecord.py` (reads `regen.mode` from each file):
- `gameplay` → `run_session.py` with moves, character, delays
- `chargen` → `run_session.py --chargen`
- `wizload` → `run_session.py --wizload`
- `interface` → `gen_interface_sessions.py`
- `option_test` → `gen_option_sessions.py`
- `keylog` → `keylog_to_session.py`

**Step 3 — Validate: old fields must be identical.**
For each re-recorded session, confirm that every field except `cursor` matches the original.
A validation script should:
```python
# Pseudocode for validate_rerecord.py
for each session file:
    old = load(before_snapshot)
    new = load(current_file)
    for each step i:
        assert old.steps[i].key == new.steps[i].key
        assert old.steps[i].rng == new.steps[i].rng
        assert old.steps[i].screen == new.steps[i].screen
        # screenAnsi may have minor encoding differences — compare decoded
        assert new.steps[i].cursor is not None, "cursor field missing"
    # cursor is the ONLY new field
```
If any RNG, screen, or event field diverges, **stop and investigate** — do not proceed with
the divergent session. Common fixes:
- **Screen differs at step N**: increase `key_delay_s` for that step (add to session's
  `regen.key_delays_s` dict so it persists across future re-records)
- **RNG differs**: usually means the C binary changed or the environment (.nethackrc) is
  wrong — never paper over RNG divergence with timing fixes
- **Step count differs**: `--More--` prompts may have appeared/disappeared due to timing —
  check `record_more_spaces` flag

**Step 4 — Run `npm test` and confirm cursor metrics appear.**
```bash
npm test 2>&1 | grep "cursorFull"
```
Expected: `cursorFull=N/M` in the gameplay parity line, with N > 0.

**Step 5 — Commit the re-recorded sessions.**
```bash
git diff --stat test/comparison/sessions/ test/comparison/maps/
# Should show only additions of "cursor" fields, no other changes
git add test/comparison/sessions/ test/comparison/maps/
git commit -m "sessions: re-record all sessions with cursor position data"
```

### Making fixes reproducible

When a re-recording divergence requires a fix (e.g., adding a per-step delay), the fix
should be encoded in the session file's `regen` metadata so that `rerecord.py` applies it
automatically next time. Specifically:

- **Per-step timing**: add to `regen.key_delays_s` (dict of step→delay). `rerecord.py`
  reads this and passes it to `run_session.py` via `NETHACK_KEY_DELAYS_S`.
- **Final-frame settle**: add `regen.final_capture_delay_s` for the last step.
- **Session-wide delay**: set `regen.key_delay_s` (single float) for all steps.

Never fix a re-recording issue by editing the session JSON fields directly (screen, rng,
etc.) — always fix the recording environment or timing so that re-recording produces the
correct result. This ensures that the next person who runs `rerecord.py --all` gets the
same output without knowing about ad-hoc workarounds.
