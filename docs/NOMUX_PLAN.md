# NOMUX Plan: Direct Screen Capture Without tmux

## Goal

Replace tmux `capture-pane` with a shadow frame buffer maintained inside
the C tty layer. The buffer is serialized to ANSI at each `nhgetch()`
boundary, producing the same `"screen"` strings the session format uses.

**Benefits:**
- **Higher faithfulness**: Captures exactly what C writes to the terminal,
  with exact attribute/color state per cell, no terminal emulator artifacts.
- **Higher speed**: No tmux subprocess round-trip per keystroke.
- **Eliminates tmux timing artifacts**: Inverse video persistence, cursor
  position lag, overlay remnants — all caused by reading terminal buffer
  state that may not reflect the last write.

**Non-goals (for now):**
- Removing tmux entirely (still useful for visual debugging).
- Changing the session file format.

## Architecture

### Current (tmux path)
```
Game logic → tty API → g_putch/putsyms → putchar() → pty → tmux buffer
                                                              ↓
nhgetch() → harness → tmux capture-pane → ANSI string → session
```

### Proposed (NOMUX path)
```
Game logic → tty API → g_putch/putsyms → putchar() → pty → terminal (unchanged)
                         ↓ (shadow write)
                    nomux_screen[24][80]
                         ↓
nhgetch() → harness → serialize nomux_screen → ANSI string → session
```

Both paths produce identical `"screen"` strings. The NOMUX path adds
a shadow write at the character output chokepoint and reads it back
at the nhgetch boundary.

## Why NOT "read wins[] directly"

An earlier version of this plan proposed reading C's `wins[]` window
data structures at capture time. **Code audit found this won't work:**

- **NHW_MAP output is never stored.** `tty_putstr` for map/base windows
  calls `putchar()` directly — no in-memory buffer.
- **NHW_MESSAGE** text is in `gt.toplines` (a global string), but without
  per-character attribute tracking.
- **NHW_MENU/TEXT** content is in `WinDesc.data[]` as row strings with
  a single attribute byte per row, but only while the window is active.
- **NHW_STATUS** has `WinDesc.data[]` row strings but limited attr info.

**The terminal IS C's frame buffer.** C's tty layer streams characters
to the terminal and relies on the terminal emulator to maintain display
state. There is no authoritative in-memory 24×80 grid.

The only exception is `TTY_PERM_INVENT` (inventory window) which has a
`cells[][]` 2D grid — but only for that one window.

## Approach: Shadow Frame Buffer via g_putch Hook

### The chokepoint

All visible character output in C's tty flows through a small set of
functions:

| Function | Role | Location |
|---|---|---|
| `g_putch(c)` / `xputc(c)` | Single character to terminal | wintty.c |
| `putsyms(str)` | String output (calls g_putch per char) | topl.c |
| `cl_end()` | Clear from cursor to end of line | wintty.c |
| `clear_screen()` | Clear entire terminal | wintty.c |
| `tty_curs(win, x, y)` | Position cursor | wintty.c |
| `tty_start_attr(attr)` | Begin attribute (bold/inverse/etc) | wintty.c |
| `tty_end_attr(attr)` | End attribute | wintty.c |
| `term_start_color(color)` | Set foreground color | wintty.c |
| `term_end_color()` | Reset color | wintty.c |

The shadow buffer is updated at these chokepoints. The existing terminal
output continues unchanged (tmux still shows the game for observation).

### Data structure

```c
typedef struct {
    char ch;        // character (0 = unwritten, treat as space)
    uint8_t fg;     // foreground color (0-15, 7=gray default)
    uint8_t attr;   // bit0=inverse, bit1=bold, bit2=underline
} nomux_cell;

static nomux_cell nomux_screen[24][80];  // shadow frame buffer
// Cursor read from ttyDisplay->curx, ttyDisplay->cury at capture time
```

### Hooks required

**Character output — `g_putch(c)` or equivalent:**
```c
// After existing putchar(c):
if (ttyDisplay->cury >= 0 && ttyDisplay->cury < 24
    && ttyDisplay->curx >= 0 && ttyDisplay->curx < 80) {
    nomux_screen[ttyDisplay->cury][ttyDisplay->curx].ch = (char) c;
    nomux_screen[ttyDisplay->cury][ttyDisplay->curx].fg = current_nomux_fg;
    nomux_screen[ttyDisplay->cury][ttyDisplay->curx].attr = current_nomux_attr;
}
```

**Clear to end of line — `cl_end()`:**
```c
// After existing cl_end:
for (int c = ttyDisplay->curx; c < 80; c++) {
    nomux_screen[ttyDisplay->cury][c] = (nomux_cell){ ' ', 7, 0 };
}
```

**Clear screen — `clear_screen()`:**
```c
memset(nomux_screen, 0, sizeof(nomux_screen));
// 0-filled ch means unwritten; serializer treats as space
```

**Attribute tracking — `tty_start_attr` / `tty_end_attr`:**
```c
// Track in static variables:
static uint8_t current_nomux_attr = 0;
// tty_start_attr(ATR_INVERSE) → current_nomux_attr |= 1;
// tty_end_attr(ATR_INVERSE)   → current_nomux_attr &= ~1;
// Map ATR_BOLD→bit1, ATR_ULINE→bit2
```

**Color tracking — `term_start_color` / `term_end_color`:**
```c
static uint8_t current_nomux_fg = 7;  // default gray
// term_start_color(color) → current_nomux_fg = color;
// term_end_color()        → current_nomux_fg = 7;
```

**DEC graphics mode — SO (0x0e) / SI (0x0f):**
```c
static boolean nomux_decgraphics = FALSE;
// When SO received: nomux_decgraphics = TRUE
// When SI received: nomux_decgraphics = FALSE
// In character hook: if nomux_decgraphics, map DEC char to Unicode
```

### Capture at nhgetch

At the nhgetch interception point (where the harness currently calls
tmux capture-pane), instead serialize the shadow buffer:

```c
void nomux_capture_screen(char *out, size_t outsize) {
    char *p = out;
    for (int row = 0; row < 24; row++) {
        int cur_fg = 7, cur_attr = 0;
        // Right-trim trailing blank cells
        int end = 79;
        while (end >= 0 && nomux_screen[row][end].ch <= ' '
               && nomux_screen[row][end].attr == 0) end--;
        for (int col = 0; col <= end; col++) {
            nomux_cell *c = &nomux_screen[row][col];
            char ch = c->ch ? c->ch : ' ';
            // Emit SGR only on attr/color change
            if (c->fg != cur_fg || c->attr != cur_attr) {
                p += sprintf(p, "\033[0");
                if (c->fg != 7) p += sprintf(p, ";%d", sgr_fg_code(c->fg));
                if (c->attr & 1) p += sprintf(p, ";7");  // inverse
                if (c->attr & 2) p += sprintf(p, ";1");  // bold
                if (c->attr & 4) p += sprintf(p, ";4");  // underline
                *p++ = 'm';
                cur_fg = c->fg; cur_attr = c->attr;
            }
            *p++ = ch;
        }
        if (cur_attr || cur_fg != 7) p += sprintf(p, "\033[0m");
        if (row < 23) *p++ = '\n';
    }
    *p = '\0';
}
```

Cursor: read `ttyDisplay->curx`, `ttyDisplay->cury` directly.

## Milestones

### M1: Map the output chokepoints
- Read wintty.c/topl.c to identify every function that calls `putchar()`
  or equivalent for visible output.
- Build a complete call graph: game logic → tty API → character output.
- Verify `g_putch`/`xputc` is the single chokepoint, or identify all paths.
- Identify where `tty_start_attr`/`term_start_color` are called relative
  to character output.
- **Gate**: Document with code references. Every `putchar` in the tty layer
  is accounted for.

### M2: Implement shadow frame buffer
- Add `nomux_cell nomux_screen[24][80]` and tracking variables.
- Hook character output: update buffer alongside `putchar`.
- Hook `cl_end`, `clear_screen`, `home` for clearing operations.
- Hook `tty_start_attr`/`tty_end_attr` and `term_start_color`/`term_end_color`
  for attribute/color tracking.
- Handle DEC graphics SO/SI character mapping.
- **Gate**: After a full game init + one command, dump `nomux_screen` and
  visually compare with tmux `capture-pane` output. Character content must
  match for all 24×80 cells.

### M3: ANSI serialization + harness integration
- Implement `nomux_capture_screen()` serializer.
- Add `--screen-capture=direct` flag to the harness.
- When flag is set: call `nomux_capture_screen()` at `nhgetch()` instead
  of `tmux capture-pane`. Read cursor from `ttyDisplay->curx/cury`.
- Produce valid session files with same format as tmux path.
- **Gate**: Record seed1 with `--screen-capture=direct`. Session file loads
  in JS test runner. RNG/events identical to tmux-recorded version.
  Screen text matches on all steps.

### M4: Dual-capture validation
- Record seed031 (1365 steps) with BOTH tmux and NOMUX.
- Diff every step's screen string cell-by-cell.
- Categorize differences:
  - Cells where both match: expected majority
  - Cells where NOMUX differs from tmux: analyze each — is NOMUX more
    faithful? (e.g., correct inverse attr where tmux has stale state)
  - Cells where NOMUX is wrong: bugs in shadow buffer hooks
- **Gate**: All NOMUX-vs-tmux differences are explainable as tmux timing
  artifacts. Zero cases where NOMUX is less faithful than tmux.

### M5: Full rerecording + parity measurement
- Rerecord seed031 with NOMUX. Run JS parity suite.
- **Gate**: seed031 color match improves (11805/11832 → closer to 11832).
  Cursor match improves (459/471 → closer to 471).
- Rerecord full 563-session suite with NOMUX.
- **Gate**: All 549 currently-passing sessions still pass. Net improvement
  in color/cursor metrics across failing sessions.
- Speed benchmark: measure wall-clock time for full suite recording.
  **Gate**: NOMUX is faster than tmux path.

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Missed output path (putchar not via g_putch) | M1 call graph audit; M4 dual-capture catches mismatches |
| Attribute state tracking drift | Compare against tmux at every step in M4; any drift is immediately visible |
| DEC graphics mapping differences | Use same Unicode mapping table as tmux; test with DECgraphics sessions |
| Cursor position differs from tmux | Read ttyDisplay->curx/cury directly — this IS what tty_curs sets |
| Performance overhead of shadow writes | Negligible: one extra memory write per putchar; far less than tmux IPC |
| Scroll regions / unusual terminal ops | NetHack tty doesn't use scroll regions for game display; only for --More-- paging which we already handle |

## Files to Create/Modify

**New file:**
- `nethack-c/src/nomux_capture.c` — shadow buffer, hooks, serializer

**Modified files:**
- `nethack-c/win/tty/wintty.c` — add shadow write calls at output chokepoints
- `nethack-c/src/session_harness.c` — add `--screen-capture=direct` flag,
  call `nomux_capture_screen()` instead of tmux capture

**New patch:**
- `test/comparison/c-harness/patches/0XX-nomux-capture.patch`

**No JS changes needed** — session format is unchanged.

## Why This Will Work

1. **Single chokepoint**: All visible tty output goes through `putchar()`
   (or a thin wrapper). One hook point captures everything.

2. **Attributes already tracked**: `ttyDisplay->attrs` and `ttyDisplay->color`
   hold the current output state. We shadow these, not recompute them.

3. **Cursor already tracked**: `ttyDisplay->curx/cury` is updated by every
   `tty_curs()` call and every character write. Direct read is authoritative.

4. **No compositing needed**: Unlike reading `wins[]` (which would require
   layering windows), the shadow buffer captures the FINAL composited output
   — exactly what the terminal receives.

5. **Same format**: ANSI serialization produces drop-in session strings.
   Zero JS changes. Existing comparators work unchanged.
