# NOMUX Plan: Direct Screen Capture Without tmux

## Goal

Replace tmux `capture-pane` with direct screen state tracking inside the
C harness. The screen is serialized from C's internal tty data structures
at each `nhgetch()` boundary, producing the same ANSI-encoded `"screen"`
strings the session format already uses.

**Benefits:**
- **Higher faithfulness**: Screen state read from C's authoritative `wins[]`
  structures, not from a terminal buffer that may have stale content, partial
  writes, or timing-dependent attribute state.
- **Higher speed**: No tmux round-trip per keystroke (`capture-pane` + parse).
  Direct serialization is a single-pass memory read.
- **Eliminates tmux timing artifacts**: Inverse video persistence, cursor
  position lag, overlay remnants — all caused by reading terminal output
  instead of game intent.

**Non-goals (for now):**
- Removing tmux entirely (still useful for visual debugging).
- Changing the session file format.

## Architecture

### Current (tmux path)
```
Game logic → tty_putstr/tty_curs/etc → terminal escape codes → pty →
tmux terminal emulator → tmux buffer → capture-pane → ANSI string → session
```

### Proposed (NOMUX path)
```
Game logic → tty_putstr/tty_curs/etc → wins[] data structures →
nhgetch interception → direct serialization → ANSI string → session
```

Both paths produce identical `"screen"` strings in the session file.
The NOMUX path reads from the source of truth (C's internal state)
instead of the terminal reflection.

## C tty Data Structures

C's tty windowing system maintains per-window state in `struct WinDesc`:

```c
struct WinDesc {
    // ...
    cell **cells;    // 2D array of cells (or data[][])
    int maxrow, maxcol;
    int curx, cury;  // cursor within this window
    // ...
};

// Windows:
// wins[WIN_MESSAGE] — message line (row 0, sometimes row 1)
// wins[WIN_MAP]     — map area (rows 1-21)
// wins[WIN_STATUS]  — status lines (rows 22-23)

// Global cursor:
// ttyDisplay->curx, ttyDisplay->cury — terminal cursor position
```

Each cell has a character and attributes (bold, inverse, underline, color).
The exact cell structure depends on the tty implementation but the data
is accessible via the `wins[]` array.

### Key tty functions to understand:

| Function | What it does | Relevant state |
|---|---|---|
| `tty_putstr(win, attr, str)` | Write string to window | `wins[win]->data` |
| `tty_curs(win, x, y)` | Position cursor | `ttyDisplay->curx/cury` |
| `tty_clear_nhwindow(win)` | Clear window | `wins[win]->data` zeroed |
| `tty_display_nhwindow(win, blocking)` | Make window visible | Transfers to screen |
| `cl_end()` | Clear to end of line | Current row from curx |
| `home()` | Cursor to (0,0) | `ttyDisplay->curx=cury=0` |
| `tty_start_attr(attr)` | Set text attribute | Current output attribute |

## Implementation Plan

### Phase 1: Screen State Buffer

Add a 24×80 screen buffer to the C harness that mirrors the terminal state.
This buffer is updated by intercepting key tty output functions.

```c
// In the harness (e.g., session_harness.c or a new nomux_capture.c):
typedef struct {
    char ch;
    int fg;      // foreground color (0-15)
    int bg;      // background color (0-15)
    int attr;    // bit0=inverse, bit1=bold, bit2=underline
} nomux_cell;

static nomux_cell nomux_screen[24][80];
static int nomux_cursor_x, nomux_cursor_y;
```

**Option A — Hook tty output functions:**
Intercept `tty_putstr`, `tty_curs`, etc. to update `nomux_screen` in
parallel with the real terminal output. The real tty output still goes
to the terminal (for visual debugging in tmux).

**Option B — Read wins[] directly at capture time:**
At each `nhgetch()` boundary, walk the `wins[]` data structures and
build `nomux_screen` from their current content. Simpler but requires
understanding the exact cell layout in each window type.

**Recommendation: Option B.** Reading at capture time is simpler, has
no risk of missing an output path, and doesn't require patching every
tty function. The `wins[]` structures ARE the authoritative state.

### Phase 2: ANSI Serialization

At each `nhgetch()` interception, serialize `nomux_screen` to an ANSI
string matching the existing session format:

```c
void nomux_capture_screen(char *out, size_t outsize) {
    char *p = out;
    for (int row = 0; row < 24; row++) {
        int cur_fg = 7, cur_attr = 0;
        // Right-trim: find last non-blank column
        int end = 79;
        while (end >= 0 && nomux_screen[row][end].ch == ' '
               && nomux_screen[row][end].attr == 0) end--;
        for (int col = 0; col <= end; col++) {
            nomux_cell *c = &nomux_screen[row][col];
            // Emit SGR when color/attr changes
            if (c->fg != cur_fg || c->attr != cur_attr) {
                p += sprintf(p, "\033[0");
                if (c->fg != 7) p += sprintf(p, ";%d", sgr_fg(c->fg));
                if (c->attr & 1) p += sprintf(p, ";7");  // inverse
                if (c->attr & 2) p += sprintf(p, ";1");  // bold
                if (c->attr & 4) p += sprintf(p, ";4");  // underline
                *p++ = 'm';
                cur_fg = c->fg; cur_attr = c->attr;
            }
            *p++ = c->ch ? c->ch : ' ';
        }
        if (cur_attr || cur_fg != 7) {
            p += sprintf(p, "\033[0m");
        }
        if (row < 23) *p++ = '\n';
    }
    *p = '\0';
}
```

Cursor position stored separately in the session step's `"cursor"` field
(already exists — just read from `ttyDisplay->curx/cury` instead of
parsing tmux cursor report).

### Phase 3: Harness Integration

Add a command-line flag to the C harness:

```
--screen-capture=tmux    (default, current behavior)
--screen-capture=direct  (NOMUX path)
```

When `direct` is selected:
1. At each `nhgetch()` interception, call `nomux_capture_screen()`
   instead of `tmux capture-pane`.
2. Store the result in the same `"screen"` field of the session step.
3. Read cursor from `ttyDisplay->curx/cury` directly.
4. tmux is still running (for visual observation) but not read.

### Phase 4: Validation

**4A. Diff test against tmux captures:**
For each existing session, record with both `--screen-capture=tmux` and
`--screen-capture=direct`. Diff the `"screen"` strings to identify:
- Cells that match (expected: vast majority)
- Cells that differ (expected: the 27 attr diffs in seed031, plus
  similar diffs in other sessions)
- For each diff: verify the NOMUX version matches JS's headless display

**4B. Re-run session parity suite:**
After rerecording sessions with NOMUX captures:
- seed031 should pass (color attrs now match JS's headless rendering)
- seed331_tourist, theme25 may improve
- Other sessions: RNG/events unchanged; screen match should improve

**4C. Speed benchmark:**
Compare recording time for the full 563-session suite:
- tmux path: captures involve `tmux capture-pane -p -t ...` subcommand
- NOMUX path: direct memory read + sprintf

Expected: significant speedup for sessions with many steps (seed031
has 1365 steps, seed032 has 678).

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| `wins[]` layout differs from terminal output | Phase 4A diff test catches discrepancies |
| Some tty output bypasses `wins[]` | Rare; `putsyms()` direct writes are for scroll regions only |
| DEC graphics characters need mapping | Apply same SO/SI → Unicode mapping as tmux |
| Menu/popup windows overlay map | Read all visible windows in correct z-order |
| C harness changes break builds | Guard with `#ifdef NOMUX_CAPTURE` |

## Window Overlay Z-Order

C's tty uses these windows in this z-order (front to back):
1. Active text popup (`cw->active`, NHW_TEXT/NHW_MENU)
2. Message line (WIN_MESSAGE, row 0, sometimes row 0-1)
3. Map (WIN_MAP, rows 1-21)
4. Status (WIN_STATUS, rows 22-23)

When a popup is active, its content overlays the map area. The NOMUX
capture must composite these correctly:
1. Start with map + status as base layer
2. Overlay message line on row 0
3. If a text/menu window is active, overlay its content at its offset

This matches what tmux sees (the terminal has the composited result),
so the output format is identical.

## Files to Modify

**C harness:**
- `nethack-c/src/session_harness.c` (or new `nomux_capture.c`)
  - Add `nomux_cell` buffer
  - Add `nomux_capture_screen()` serializer
  - Add `--screen-capture=direct` flag handling
  - Replace tmux capture call with direct capture when flag is set

**Patches:**
- New patch `0XX-nomux-capture.patch` for the C build

**No JS changes needed** — session format is unchanged.

## Success Criteria

1. `--screen-capture=direct` produces valid session files
2. Rerecorded sessions have ≥ current screen match rates
3. seed031 color match improves (27 diffs → 0 or near-0)
4. Recording speed improves measurably
5. All 549 currently-passing sessions still pass with NOMUX captures
