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
- **Status**: Fixed (added to display.js)
- **Details**: `js/headless.js:922-1002` implements full text popup rendering for
  "Things that are here:", NHW_TEXT windows, etc. Browser Display had no implementation.
  `windows.js` gracefully handled this via `_display?.renderTextPopup` optional chaining,
  so it silently did nothing in the browser.
- **Impact**: Item pile descriptions, text windows, and similar popups were invisible
  in the browser. Players couldn't see "Things that are here:" when standing on items.

### 2. `cursorOnPlayer` Writes '@' in Browser Only
- **Severity**: Medium
- **Details**: Browser `Display.cursorOnPlayer()` (display.js:1151) calls
  `setCell(x, y, '@', CLR_WHITE)` AND `setCursor()`. Headless `cursorOnPlayer()`
  (headless.js:624) only calls `setCursor()` — no character write.
- **Impact**: Browser may show an extra '@' overlay that masks the actual map glyph.
  If the player's glyph changes (polymorph, invisibility), the browser might still
  show '@' while headless shows the correct glyph.

### 3. Message Wrapping Breakpoint Differs
- **Severity**: Medium
- **Details**:
  - Browser: `lastIndexOf(' ', this.cols - 1)` — wraps at column 79
  - Headless: `lastIndexOf(' ', this.cols - 10)` — wraps at column 70
- **Impact**: Long messages break at different points, producing different screen
  layouts. Can cause --More-- to appear at different times.

### 4. `renderMoreMarker` Row 1 Tracking
- **Severity**: Medium
- **Details**: Browser tracks `_topMessageRow1` for messages that wrap to row 1
  and renders --More-- on row 1 in that case. Headless always puts --More-- on row 0.
- **Impact**: --More-- marker position differs for wrapped messages.

### 5. `_clearMore` Row 1 Handling
- **Severity**: Low-Medium
- **Details**: Browser `_clearMore()` clears both row 0 and row 1 (when
  `_topMessageRow1` is set). Headless `_clearMore()` only clears row 0.
- **Impact**: Stale message text may linger on row 1 in headless but not browser.

### 6. Overlay Menu Header Treatment
- **Severity**: Low
- **Details**: Headless `renderOverlayMenu()` (headless.js:842) treats line 0
  (the prompt) as a header and renders it in inverse video. Browser
  `renderOverlayMenu()` (display.js:1082) does NOT give special treatment to line 0.
- **Impact**: Visual difference only. Menu content is identical.

### 7. `msg_window` Mode Check
- **Severity**: Low
- **Details**: Browser `putstr_message()` checks `this.flags.msg_window` to
  adjust behavior. Headless `putstr_message()` does not check this flag.
- **Impact**: Different behavior when msg_window option is toggled (rare in practice).

### 8. Message Color
- **Severity**: Low (cosmetic)
- **Details**: Browser uses `CLR_WHITE` for messages; headless uses `CLR_GRAY`.
- **Impact**: Visual only — white vs gray message text.

### 9. `rest_on_space` — Browser Only
- **Severity**: Medium
- **Details**: `browser_input.js:83` converts spacebar to '.' (wait/search) when
  `rest_on_space` flag is set. Headless input (`pushInput`/`pushKey`) has no
  equivalent mapping.
- **Impact**: If `rest_on_space` is enabled, space behaves differently in browser
  vs headless. Browser: space = wait. Headless: space = literal space character.

### 10. `noConcatenateMessages` — Headless Only
- **Severity**: Low
- **Details**: Headless has a `noConcatenateMessages` flag that prevents message
  concatenation with "; ". Browser has no equivalent.
- **Impact**: Test-only flag, not used in production.

## Test Coverage

Tests in `test/e2e/display_divergence.e2e.test.js`:

| Test | Targets Gap | Status |
|------|------------|--------|
| Inventory menu renders | #1 (renderTextPopup) | Pass |
| Look-here (:) popup | #1 (renderTextPopup) | Pass |
| Player @ position | #2 (cursorOnPlayer) | Pass |
| Messages and --More-- | #3, #4, #5 | Pass |
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

## Priorities for Further Work

1. **Fix gap #2**: `cursorOnPlayer` should NOT write '@' — only move cursor
   (matching headless and C behavior where `curs()` is cursor-only)
2. **Fix gap #3**: Unify message wrapping breakpoint (use `cols - 1` in both)
3. **Fix gap #4/5**: Unify --More-- row tracking
4. **Fix gap #8**: Use consistent message color
5. **Close chargen RNG gap**: Browser interactive chargen consumes different RNG
   than headless direct-assign, producing different dungeons for same seed

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
