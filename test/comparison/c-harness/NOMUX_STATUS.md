# NOMUX Implementation Status

## M2 Complete: Shadow Frame Buffer Works

The NOMUX shadow buffer captures the complete screen state:
- ✅ Map area (rows 1-21) — via `g_putch` hook
- ✅ Message line (row 0) — via `topl_putsym` hook
- ✅ Status lines (rows 22-23) — via `tty_putstatusfield` hook
- ✅ Menu/text popups — via `process_text_window` hooks
- ✅ Menu items — via `process_menu_window` putchar hooks
- ✅ Clear operations — `cl_end`, `term_clear_screen` hooks
- ✅ Attribute tracking — `term_start_attr`/`term_end_attr` hooks
- ✅ Color tracking — `term_start_color`/`term_end_color` hooks
- ✅ Cursor — read from `ttyDisplay->curx/cury` at nhgetch
- ✅ File output — writes to `$NOMUX_SCREEN_FILE` at each nhgetch

## Verified Output

NOMUX captures map + message + status matching tmux output:
```
NOMUX: Velkommen wizard... --More--
       map with @, f, corridors
       Wizard the Stripling  St:18 Dx:11...
       Dlvl:1 $:0 HP:16(16)...
       ---CURSOR:70,0
```

## Hooks Installed (all guarded by #ifdef NOMUX_CAPTURE)

### termcap.c
- `nomux_buf[24][80]` + tracking vars
- `nomux_putch()`, `nomux_clear_screen()`, `nomux_clear_to_eol()`
- `nomux_set_attr()`, `nomux_end_attr()`, `nomux_set_fg()`, `nomux_end_fg()`
- `nomux_capture_screen()` ANSI serializer
- Hooks in: `cl_end`, `term_clear_screen`, `term_start_attr`,
  `term_end_attr`, `term_start_color`, `term_end_color`

### wintty.c
- `g_putch` — map glyph output
- `tty_putsym` NHW_MAP/NHW_BASE — single character output
- `tty_putstr` NHW_MAP — text string output
- `tty_putstatusfield` — status line field output
- `process_text_window` — text popup character output
- `process_menu_window` — menu item character output
- `tty_nhgetch` — file write at input boundary

### topl.c
- `topl_putsym` — message line character output

## Known Gaps
- Leading space on message line (NOMUX has extra space vs tmux)
- ANSI color encoding differs slightly from tmux format
- Text popup rendering not yet tested with actual lore overlay
- DEC graphics character mapping (SO/SI) needs verification

## Next Steps (M3-M5)
- M3: Wire into Python `run_session.py` as alternative to tmux capture
- M4: Dual-capture validation (record same session both ways, diff)
- M5: Full suite rerecording + parity measurement
