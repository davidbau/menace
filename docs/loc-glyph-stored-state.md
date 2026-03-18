# Design: `loc.glyph` as Persistent Stored Display State

## Background: C's `level.glyph`

C NetHack stores the current display state for every map cell in `level.glyph[x][y]` (an integer glyph index). This is updated by two functions:

- `newsym(x, y)` — recomputes what should be shown at (x,y) from game state and stores it
- `show_glyph(x, y, glyph)` — directly sets what should be shown (bypasses game-state logic)

`docrt()` (redraw all visible cells) reads from `level.glyph` without re-evaluating game state. It only calls `newsym()` for cells whose visibility *state* changed (newly visible or newly hidden). Already-visible cells just use the stored glyph.

This means: if `show_map_spot()` in `detect.c` calls `newsym(x, y)` followed by `map_trap(trap, 1)` (to force trap > object priority), the stored `level.glyph` ends up with the trap glyph `^`. When `docrt()` runs on the next turn, it reads that stored `^` — it does not re-evaluate that game has a food object there.

## The JS Problem: Two Divergent Paths

### Step-indexed cache

JS uses a step-indexed cache (`loc._displayCell + loc._displayCellStepIndex`) as a fast-path for repeated renders within the same step. This expires when the step index advances.

### Display.renderMap (browser)

`Display.renderMap()` in `display.js` **re-evaluates every visible cell from game state** on every call (every step boundary, every menu open/close, etc.). This:

- Correctly handles normal game-state changes
- **Incorrectly overrides** display overrides that `show_glyph()` applied (e.g., magic mapping trap priority)
- Is the sole cause of the `'^' vs '%'` divergence in t11_s754/t11_s755

### HeadlessDisplay.renderMap (test/Node)

`HeadlessDisplay.renderMap()` in `headless.js` uses the step-indexed cache, then falls back to calling `newsym()` on cache miss. This:

- Correctly serves replay testing
- But also calls `newsym()` on cache miss → re-evaluates game state → overrides `show_glyph()` overrides
- Also clears `mem_magic_trap` flags when called for menu rendering between steps

These two paths diverge from each other AND from C's `docrt()` behavior.

## Root Cause of t11_s754 / t11_s755 Failures

**Sequence**:
1. `show_map_spot()` → `newsym(15,12)` → `putMapCell(...)` → `loc.glyph = {ch:'%'}` (food)
2. `show_map_spot()` → `map_trap(trap, 1)` → `show_glyph(15,12, {ch:'^'})` → cache `{ch:'^'}` but **does NOT update `loc.glyph`**
3. Step boundary: step-indexed cache expires
4. HeadlessDisplay (inventory menu render): cache miss → calls `newsym()` → `loc.glyph = {ch:'%'}`, clears `mem_magic_trap`
5. Display.renderMap: `mem_magic_trap = false` → shows `%` instead of `^`

**The specific bug**: `show_glyph()` updates the step-indexed cache but **not `loc.glyph`** when called with a `{ch, color}` object param. It only sets `loc.glyph` when called with an integer glyph code.

## Proposed Architecture: `loc.glyph` as Authoritative Stored State

### Core principle

`loc.glyph = {ch, color}` is the persistent stored display state, equivalent to C's `level.glyph[x][y]`. It survives step boundaries. It is the answer to "what is currently being shown at this map cell?"

**Updated by**:
- `putMapCell()` → called from `newsym()` — already sets `loc.glyph` ✓
- `show_glyph()` → called from `map_trap()`, `map_object()`, etc. — **fix: must also set `loc.glyph`** ✗

**Read by**:
- `HeadlessDisplay.renderMap()`: on cache miss for visible cells, use `loc.glyph` instead of calling `newsym()` — already implemented ✓
- `Display.renderMap()`: currently re-evaluates; `mem_magic_trap` is a workaround; long-term use `loc.glyph`

### Phase 1: Immediate fix (current PR)

Two targeted changes:

**Change 1: Fix `show_glyph()` to maintain `loc.glyph`**

```javascript
// Before: only sets loc.glyph when glyph is an integer
export function show_glyph(x, y, glyph, ctxOrMap = null) {
    ...
    if (typeof glyph === 'number') {
        cell = tempGlyphToCell(glyph, ...);
        if (loc) loc.glyph = glyph;   // only integer case!
    }
    ...
    cacheMapCell(loc, gameMap, ch, color, 0);
    ...
}

// After: always sets loc.glyph as {ch, color}
export function show_glyph(x, y, glyph, ctxOrMap = null) {
    ...
    if (typeof glyph === 'number') {
        cell = tempGlyphToCell(glyph, ...);
    }
    ...
    cacheMapCell(loc, gameMap, ch, color, 0);
    if (loc) loc.glyph = { ch, color };   // always update persistent state
    ...
}
```

With this fix, after `map_trap()` calls `show_glyph(x, y, {ch:'^'})`, `loc.glyph = {ch:'^'}`. When HeadlessDisplay.renderMap has a cache miss on a visible cell, it uses `loc.glyph` → displays `^` without calling `newsym()` → `mem_magic_trap` is not cleared.

**Change 2: Fix `see_nearby_objects()` type error**

The current code calls `glyph_is_generic_object(cellloc.glyph.ch)` — this passes a **character string** to a function that expects an **integer glyph index**. The function compares the string against numeric ranges, which always returns false (type mismatch). This means the guard never triggers and `newsym_force()` is always called, which clears `mem_magic_trap`.

Fix: replace with a direct `mem_magic_trap` check. If a magic-mapped trap override is active, skip `newsym_force()`:

```javascript
// Before (type error — glyph_is_generic_object expects integer, not char):
if (cellloc?.glyph?.ch && !glyph_is_generic_object(cellloc.glyph.ch)) continue;

// After (semantically correct for our purpose):
if (cellloc?.mem_magic_trap) continue;
```

C's `glyph_is_generic_object` check is an optimization to avoid redundant newsym calls when the cell already shows the right non-generic glyph. The only case where this matters for correctness is the trap override case — which `mem_magic_trap` covers directly.

### Phase 2: Full `loc.glyph` refactor (future work)

The long-term goal is to eliminate `mem_magic_trap` entirely and have `Display.renderMap()` use `loc.glyph` as the authoritative displayed glyph, re-evaluating game state only for `cellInfo` (browser hover data).

**Proposed Display.renderMap() visible-cell logic**:

```javascript
// For each visible cell (x, y):
if (cached) {
    this.setCell(col, row, cached.ch, cached.color, cached.attr);
} else if (loc?.glyph?.ch) {
    // Use stored glyph — C's docrt() does this; avoids re-evaluating game state
    this.setCell(col, row, loc.glyph.ch, loc.glyph.color);
    // Still compute cellInfo from game state for hover (Display-only)
    computeCellInfo(x, y, ...);
} else {
    newsym(x, y, renderCtx);  // fallback for cells with no stored glyph yet
}
```

This eliminates the "Display re-evaluates, HeadlessDisplay doesn't" divergence entirely. Both paths use the same stored `loc.glyph`.

**Prerequisites for Phase 2**:
1. Phase 1 must be complete (show_glyph sets loc.glyph) ✓
2. Verify that ALL calls to `newsym()` and `show_glyph()` correctly update `loc.glyph`
3. Handle level transitions (loc.glyph should be cleared/reset on level change)
4. Handle `cellInfo` computation separately from glyph display

### Regarding `glyph_is_generic_object` (for future Phase 2)

In Phase 2, we'll need a proper character-based equivalent for `see_nearby_objects`. Options:

**Option A**: Store `isGenericObject: bool` alongside `loc.glyph`:
```javascript
// In newsym() object path:
putMapCell(..., !topObj.dknown);  // isGenericObject = true if not yet identified
// In show_glyph() / map_trap() path:
loc.glyph = { ch, color, isGenericObject: false };
```
Then: `if (!cellloc?.glyph?.isGenericObject) continue;`

**Option B**: Character-based check for object class symbols:
```javascript
const OBJECT_CLASS_CHARS = new Set(['!', '?', '/', '=', '"', '[', ')', '(', '%', '*', '+', '$', '`']);
function glyphChIsGenericObject(ch) { return OBJECT_CLASS_CHARS.has(ch); }
```
Slightly over-broad (known specific items still show class char) but harmless (extra newsym call = same result).

Option A is more precise; Option B is simpler. Either is acceptable for Phase 2.

## Risk Analysis

### Phase 1 risks

**show_glyph change**: Low risk. `show_glyph()` is called in terminal-rendering contexts (map_trap, map_object, map_engraving, animation). All these want `loc.glyph` to reflect what they just showed. Previously it was only set for integer glyph codes — the object-glyph case was simply missing. No behavioral change for existing passing tests.

**see_nearby_objects change**: Low risk. Replaces a type-incorrect call (always evaluated to false) with a direct check. The old code was effectively calling newsym_force unconditionally (because the type mismatch made the guard always false). The new code correctly skips cells with magic-mapped trap overrides.

### Phase 2 risks (future)

**Display.renderMap**: Medium risk. Changes the browser display path significantly. Must be verified against all 435+ gameplay sessions. CellInfo computation must be maintained. Level-transition reset must be verified.

## Test Plan

After Phase 1:
- `npm test` for unit tests
- `node scripts/run-and-report.sh --failures` must show 0 new regressions
- Specifically check: t11_s754 (1866/1866), t11_s755 (1789/1789), theme31_seed1951 (118/118), seed306 (212/212), theme12_seed890 (85/85), theme12_seed938 (87/87)
- Total passing should increase from 430/436 to ≥431/436 (t11_s755 fixed)
