/*
 * nomux_capture.c — ANSI serialization of the NOMUX shadow frame buffer.
 *
 * Called at each nhgetch() boundary to produce the same "screen" string
 * that tmux capture-pane would produce, but from the shadow buffer
 * maintained by hooks in termcap.c/wintty.c.
 *
 * Compile with -DNOMUX_CAPTURE to enable.
 */

#ifdef NOMUX_CAPTURE

#include "hack.h"
#include "wintty.h"
#include <stdio.h>
#include <string.h>

/* SGR foreground code for NH color index */
static int
nomux_sgr_fg(int fg)
{
    /* Standard ANSI: 0-7 → 30-37, 8-15 → 90-97 */
    if (fg >= 0 && fg <= 7) return 30 + fg;
    if (fg >= 8 && fg <= 15) return 90 + (fg - 8);
    return 37; /* default gray */
}

/*
 * Serialize nomux_buf[24][80] to an ANSI-encoded string.
 * Returns a pointer to a static buffer (caller must not free).
 *
 * Format matches tmux capture-pane -p output:
 * - Lines separated by \n
 * - Trailing blank cells trimmed per line
 * - SGR sequences for color/attribute changes
 * - \033[0m reset at end of attributed segments
 */
static char nomux_out[24 * 256]; /* generous: ~6KB for 24 lines */

char *
nomux_capture_screen(void)
{
    char *p = nomux_out;
    int row, col, end;
    int cur_fg, cur_attr;

    for (row = 0; row < 24; row++) {
        cur_fg = 7;
        cur_attr = 0;

        /* Right-trim: find last non-default cell */
        end = 79;
        while (end >= 0
               && (nomux_buf[row][end].ch == ' ' || nomux_buf[row][end].ch == 0)
               && nomux_buf[row][end].attr == 0
               && (nomux_buf[row][end].fg == 7 || nomux_buf[row][end].fg == 0))
            end--;

        for (col = 0; col <= end; col++) {
            nomux_cell *c = &nomux_buf[row][col];
            char ch = c->ch ? c->ch : ' ';
            int fg = c->fg ? c->fg : 7;
            int attr = c->attr;

            /* Emit SGR when color or attribute changes */
            if (fg != cur_fg || attr != cur_attr) {
                p += sprintf(p, "\033[0");
                if (fg != 7)
                    p += sprintf(p, ";%d", nomux_sgr_fg(fg));
                if (attr & 1) p += sprintf(p, ";7");  /* inverse */
                if (attr & 2) p += sprintf(p, ";1");  /* bold */
                if (attr & 4) p += sprintf(p, ";4");  /* underline */
                *p++ = 'm';
                cur_fg = fg;
                cur_attr = attr;
            }
            *p++ = ch;
        }

        /* Reset attributes at end of line if needed */
        if (cur_attr != 0 || cur_fg != 7) {
            p += sprintf(p, "\033[0m");
            cur_fg = 7;
            cur_attr = 0;
        }

        if (row < 23)
            *p++ = '\n';
    }
    *p = '\0';
    return nomux_out;
}

/*
 * Get cursor position from ttyDisplay.
 * Returns [x, y] in 0-based coordinates.
 */
void
nomux_get_cursor(int *cx, int *cy)
{
    if (ttyDisplay) {
        *cx = ttyDisplay->curx;
        *cy = ttyDisplay->cury;
    } else {
        *cx = 0;
        *cy = 0;
    }
}

#endif /* NOMUX_CAPTURE */
