# E2E Display Divergences: Browser vs Headless

Tracked in: GitHub Issue #333

## Overview

The game has **two entirely separate Display implementations**:
- **Browser**: `js/display.js` — DOM-based, renders to `<span>` elements
- **Headless**: `js/headless.js` — array-based, produces text screens for testing

They share a common layer (`js/windows.js` for menus, `js/input.js` for input queuing),
but the display rendering and input mapping paths are completely independent. This means
behavioral differences can silently exist — bugs caught in headless testing may not
reflect actual browser behavior, and vice versa.

## Confirmed Divergences

### 1. `renderTextPopup` — MISSING from Browser Display (FIXED)
- **Severity**: HIGH
- **Status**: FIXED — added `renderTextPopup()` and `clearTextPopup()` to display.js
- **Details**: `js/headless.js:922-1002` implements full text popup rendering for
  "Things that are here:", NHW_TEXT windows, etc. Browser Display had no implementation.
  `windows.js` gracefully handled this via `_display?.renderTextPopup` optional chaining,
  so it silently did nothing in the browser.
- **Impact**: Item pile descriptions, text windows, and similar popups were invisible
  in the browser. Players couldn't see "Things that are here:" when standing on items.

### 2. `cursorOnPlayer` Writes '@' in Browser Only (FIXED)
- **Severity**: Medium
- **Status**: FIXED — removed `setCell` call, now cursor-only like headless/C
- **Details**: Browser `Display.cursorOnPlayer()` called `setCell(x, y, '@', CLR_WHITE)`
  AND `setCursor()`. C's `curs_on_u()` only positions the cursor via `curs(WIN_MAP, ...)`.
  The '@' glyph is already placed by `renderMap()`/`show_glyph()`.
- **Impact**: The extra '@' write could mask the correct glyph when the player is
  polymorphed, invisible, or otherwise not represented by '@'.

### 3. Message Wrapping Breakpoint Differs (FIXED)
- **Severity**: Medium
- **Status**: FIXED — headless now uses `cols - 1` matching C's `CO - 1`
- **Details**: C's `update_topl()` (topl.c:284-297) scans backwards from `CO - 1`
  for a space to break at. Browser was correct (`lastIndexOf(' ', cols - 1)`).
  Headless was using `cols - 10`, breaking too early.
- **Impact**: Long messages now break at the same column in both implementations.

### 4. `renderMoreMarker` Row 1 Tracking
- **Severity**: Low
- **Status**: By design — browser and headless handle row 1 wrapping differently
  but produce equivalent results
- **Details**: Browser tracks `_topMessageRow1` and places --More-- on row 1 via
  `renderMoreMarker()`. Headless writes row 1 content and --More-- inline in
  `putstr_message()`, not through `renderMoreMarker()`.
- **Impact**: Functionally equivalent; both show --More-- on the correct row.

### 5. `_clearMore` Row 1 Handling
- **Severity**: Low
- **Status**: Acknowledged — tied to #4's different approaches
- **Details**: Browser `_clearMore()` clears both row 0 and row 1 (when
  `_topMessageRow1` is set). Headless `_clearMore()` only clears row 0.
- **Impact**: Minor; stale text on row 1 is cosmetic.

### 6. Overlay Menu Header Treatment (FIXED)
- **Severity**: Low
- **Status**: FIXED — browser now treats line 0 as inverse header, matching headless/C
- **Details**: C's tty wintty.c renders the menu prompt (line 0) in inverse video.
  Headless had this correct. Browser was not applying inverse to line 0.

### 7. `msg_window` Mode Check
- **Severity**: Low
- **Status**: Acknowledged — browser-only feature
- **Details**: Browser `putstr_message()` checks `this.flags.msg_window` to
  adjust behavior. Headless `putstr_message()` does not check this flag.
- **Impact**: Different behavior when msg_window option is toggled (rare in practice).

### 8. Message Color (FIXED)
- **Severity**: Low (cosmetic)
- **Status**: FIXED — browser now uses `CLR_GRAY` matching headless/C
- **Details**: C's TTY outputs messages in the terminal's default foreground color
  (ANSI color 7 = `CLR_GRAY`). Browser was using `CLR_WHITE` (bright white).

### 9. `rest_on_space` — Browser Only
- **Severity**: Medium
- **Status**: Acknowledged — browser-only input mapping
- **Details**: `browser_input.js:83` converts spacebar to '.' (wait/search) when
  `rest_on_space` flag is set. Headless input (`pushInput`/`pushKey`) has no
  equivalent mapping.
- **Impact**: If `rest_on_space` is enabled, space behaves differently in browser
  vs headless. Browser: space = wait. Headless: space = literal space character.

### 10. `noConcatenateMessages` — Headless Only
- **Severity**: Low
- **Status**: Acknowledged — test infrastructure only
- **Details**: Headless has a `noConcatenateMessages` flag that prevents message
  concatenation with "; ". Browser has no equivalent.
- **Impact**: Test-only flag, not used in production.

### 11. `cursSet` / Cursor Visibility (FIXED)
- **Severity**: Low
- **Status**: FIXED — `setCursor()` and `cursSet()` now respect `cursorVisible`
- **Details**: `cursSet(0)` updated the `cursorVisible` flag but the DOM cursor
  (CSS `nh-cursor` class) was always applied regardless. Now `setCursor()` checks
  `cursorVisible` before adding the class, and `cursSet()` updates the DOM.
- **Impact**: Cursor now correctly hides when `cursSet(0)` is called.

## Test Coverage

Tests in `test/e2e/display_divergence.e2e.test.js` (15 tests):

| Test | Targets Gap | Status |
|------|------------|--------|
| Inventory menu renders | #1 (renderTextPopup) | Pass |
| Look-here (:) popup | #1 (renderTextPopup) | Pass |
| Player glyph / grid parity | #2 (cursorOnPlayer) | Pass |
| Messages and --More-- | #3, #4, #5 | Pass |
| Overlay menu header inverse | #6, #8 (header + color) | Pass |
| Drop menu (PICK_ONE) | #6 (overlay menu) | Pass |
| Pickup menu (PICK_ANY) | #6 (overlay menu) | Pass |
| Space-as-rest | #9 (rest_on_space) | Pass |
| Multi-turn running (G) | Input handling | Pass |
| Extended command (#) | Input handling | Pass |
| Eat command (multi-turn) | Occupation system | Pass |
| Whatis (/) look mode | Cursor/getpos | Pass |
| Chargen menus | Overlay rendering | Pass |
| Menu cycle (no JS errors) | All menu paths | Pass |
| Arrow key movement | Browser keyboard mapping | Pass |

Additional tests in `test/e2e/headless_browser_parity.e2e.test.js` (5 tests):

| Test | Status |
|------|--------|
| Browser init + dungeon map | Pass |
| 20-turn gameplay (no JS errors) | Pass |
| Player @ visible and colored | Pass |
| DOM vs internal grid consistency | Pass |
| Browser/headless same-seed comparison | Pass |

## Remaining Work

1. **Close chargen RNG gap**: Browser interactive chargen consumes different RNG
   than headless direct-assign, producing different dungeons for same seed
2. **gap #9**: Consider adding `rest_on_space` equivalent to headless input
3. **gap #7**: Consider adding `msg_window` support to headless

## Architecture Notes

```
Browser path:                    Headless path:
  nethack.js                       headless.js
  → Display (display.js)           → HeadlessDisplay (headless.js)
  → browser_input.js               → pushInput()/pushKey()
  ↘                               ↙
    windows.js (shared menus)
    input.js (shared input queue)
    ↓
    Game engine (hack.js, cmd.js, etc.)
```
