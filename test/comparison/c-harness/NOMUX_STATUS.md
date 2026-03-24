# NOMUX Implementation Status

## Complete: All Milestones (M1-M5) + Attribute Fixes

NOMUX provides deterministic screen capture via a C shadow frame buffer,
eliminating tmux timing-dependent capture non-determinism.

### Validation Results (March 24, 2026)
- **seed1**: 0/85 steps with diffs vs tmux (was 2629 cell diffs across 71 steps)
- Characters, colors, attributes, DEC graphics, and cursor all match tmux output

## Bugs Fixed (session 31)

1. **CLR_BLACK encoder bug**: `c->fg ? c->fg : 7` mapped fg=0 (CLR_BLACK)
   to default because 0 is falsy in C. Fixed to `c->fg` — cleared cells
   already use fg=7 as default.

2. **CLR_BLACK terminal remap**: Added `nomux_fg_remap[]` table populated
   in `init_hilite()` — maps CLR_BLACK to bright black (8) or blue (4)
   depending on `wc2_darkgray` setting, matching actual terminal color.

3. **topl_putsym position**: curx pre-incremented before putchar, so
   nomux_putch wrote at curx+1. Fixed with curx-1 save/restore pattern.

## Hooks Installed (all guarded by #ifdef NOMUX_CAPTURE)

### termcap.c
- Shadow buffer: `nomux_buf[24][80]` + `nomux_fg_cur`, `nomux_attr_cur`, `nomux_decgfx_cur`
- `nomux_putch()`, `nomux_clear_screen()`, `nomux_clear_to_eol()`
- `nomux_set_attr()`, `nomux_end_attr()`
- `nomux_fg_remap[16]` + `nomux_set_fg()`, `nomux_end_fg()`
- `nomux_capture_screen()` — tmux-compatible ANSI serializer with incremental SGR
- `nomux_get_cursor()`
- Hooks in: `cl_end`, `term_clear_screen`, `cl_eos`,
  `standoutbeg`, `standoutend`, `graph_on`, `graph_off`,
  `term_start_attr`, `term_end_attr`,
  `term_start_raw_bold`, `term_end_raw_bold`,
  `term_start_color`, `term_end_color`,
  `term_start_extracolor`, `term_end_extracolor`
- Remap init in `init_hilite()` (TERMLIB+TERMINFO path)

### wintty.c
- `dmore` prompt display (nomux_putch loop with curx save/restore)
- `process_menu_window` — glyph char + normal char (2 hooks, curx-1 pattern)
- `process_text_window` — offset space + glyph/normal chars (3 hooks)
- `tty_putsym` NHW_BASE — single character output
- `tty_putstr` NHW_MAP — text string output
- `g_putch` — map glyph output (with ch^0x80 DEC graphics stripping)
- `tty_nhgetch` — file write at input boundary (2 locations)
- `tty_putstatusfield` — status line field output

### topl.c
- `topl_putsym` — message line character output (curx-1 save/restore)

## Harness Integration

`run_session.py` supports NOMUX via `NOMUX=1` env var:
- `capture_screen_nomux()` reads `$NOMUX_SCREEN_FILE`
- `capture_screen_compressed_nomux()` returns compressed ANSI + cursor
- Falls back to tmux if NOMUX file missing

`rerecord_session.py` supports `--nomux` flag for session rerecording.
