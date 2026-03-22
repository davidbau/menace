# Display Cell Tracking Design

## Problem

JS renders ALL explored map cells on every display pass. C's tty only contains
characters at cells that were explicitly written via `newsym()` → `print_glyph()`
→ terminal output. This causes 45/664 screen divergences in seed032 despite 100%
RNG and cursor parity.

## Evidence (seed032)

- 18 menu overlay divergences: JS map content shows through where C has blank
- The specific pattern: at column boundaries where a PICK_ANY menu overlay meets
  the map, JS has wall characters (`│`) where C has spaces
- C's tty buffer has spaces at cells never written; JS always has map content

## C's Display Model

C's tty display is a character buffer (`WIN_MAP` window). Cells start as spaces.
Only explicit writes update them:

1. `newsym(x,y)` → `show_glyph()` → `print_glyph()` → writes to tty buffer
2. `docrt()` → full screen redraw (iterates all cells, writes via `print_glyph()`)
3. `flush_screen()` → pushes buffer to terminal
4. Menu overlay: `tty_select_menu()` writes menu text starting at `offx`; cells
   left of `offx` retain whatever was there before

Key insight: cells that were never written (or were last written as spaces during
`clear_nhwindow()`) remain as spaces. JS's `renderMap()` always fills them with
explored terrain.

## Proposed Solution: `loc.screenWritten` Bit

Add a per-cell boolean `screenWritten` that tracks whether JS has ever written
this cell to the display grid in the current display cycle.

### Semantics

- **Set to `true`** when:
  - `newsym(x,y)` updates the display cell
  - `docrt()` iterates and writes all visible cells
  - Menu overlay writes text cells

- **Set to `false`** when:
  - Level changes (new map loaded)
  - `clear_nhwindow(WIN_MAP)` equivalent

- **Used by** `renderMap()`: skip cells where `screenWritten === false` — leave
  them as spaces instead of rendering explored terrain.

### Alternative: Track in Display Grid

Instead of per-location, track in the display grid itself:

```javascript
// In display.js HeadlessDisplay
this.cellWritten = Array.from({ length: rows }, () => new Uint8Array(cols));

setCell(col, row, ch, color, attr) {
    // ... existing logic ...
    this.cellWritten[row][col] = 1;
}

clearCellWritten() {
    for (const row of this.cellWritten) row.fill(0);
}
```

Then in `renderMap()`, only write cells where the display grid was previously
written (by newsym, docrt, or menu overlay). Cells never written stay as spaces.

### Display Grid Approach (Preferred)

The display grid approach is simpler:

1. Add `cellWritten[row][col]` bitmap to `HeadlessDisplay`
2. In `setCell()`, mark `cellWritten[row][col] = 1`
3. In `renderMap()`, for cells where `cellWritten[row][col] === 0`, skip the
   write (leave as space)
4. In screen comparison, cells with `cellWritten === 0` are spaces
5. `docrt()` marks all cells it writes as written
6. Level change clears the bitmap

### Risks

- `renderMap()` currently renders ALL explored cells unconditionally. Restricting
  to only "written" cells could break browser rendering where the user expects to
  see the full map.
- Solution: apply the restriction ONLY in headless/replay mode where screen
  comparison matters. Browser mode continues to render all explored cells.

## Event Ordering Issue (Separate)

The event ordering divergence (4157/19733 = 21% match) has a different root cause:
JS's replay processes many game turns in a single "mega-step" due to travel/run
commands consuming multiple keys within a single `_gameLoopStep`. This causes
events to be assigned to different step indices than C.

### Evidence

JS step 143 contains 1893 RNG calls (87 monster turns) — an entire travel
sequence from one step. C spreads these across steps 143-169.

### Root Cause

The `pendingCommand` mechanism in `replay_core.js` keeps a single game loop step
active across multiple key presses. Travel and run commands consume many keys
within a single pending command, causing all their RNG/events to be attributed to
one step.

### Fix Path

The event comparison infrastructure should align events globally (across all
steps) rather than per-step. The current comparison already does this for RNG
(achieving 100% match). Extending the same global alignment to events would
improve the event match significantly.

Alternatively, the replay could break mega-steps into per-key sub-steps for
comparison purposes, but this would require changes to the replay architecture.
