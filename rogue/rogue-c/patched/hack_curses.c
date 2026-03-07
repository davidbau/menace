/*
 * hack_curses.c — Fake curses implementation for Rogue 3.6 harness
 *
 * Provides an in-memory 80x24 character grid that serves as the
 * display surface. wrefresh(cw) is the key moment: it copies cw
 * to the harness snapshot buffer harness_display[24][81].
 */

#include "curses.h"

/* ===== Global windows ===== */
WINDOW *stdscr = NULL;
WINDOW *curscr = NULL;
/* cw, mw, hw are declared in rogue.h as extern and defined in rogue source */

/* Harness display snapshot — copied from cw on wrefresh(cw) */
char harness_display[LINES][COLS + 1];

/* ===== Window allocation ===== */

static WINDOW *alloc_win(void)
{
    WINDOW *w = (WINDOW *)malloc(sizeof(WINDOW));
    if (!w) { fprintf(stderr, "hack_curses: out of memory\n"); exit(1); }
    w->_cury = 0;
    w->_curx = 0;
    w->_lines = LINES;
    w->_cols  = COLS;
    memset(w->_data, ' ', sizeof(w->_data));
    /* null-terminate each row */
    int i;
    for (i = 0; i < LINES; i++) w->_data[i][COLS] = '\0';
    return w;
}

WINDOW *initscr(void)
{
    stdscr = alloc_win();
    curscr = alloc_win();
    /* initialise harness display */
    int i;
    for (i = 0; i < LINES; i++) {
        memset(harness_display[i], ' ', COLS);
        harness_display[i][COLS] = '\0';
    }
    return stdscr;
}

void endwin(void)
{
    /* no-op in harness */
}

WINDOW *newwin(int nlines, int ncols, int begin_y, int begin_x)
{
    (void)nlines; (void)ncols; (void)begin_y; (void)begin_x;
    return alloc_win();
}

/* ===== Basic operations ===== */

int werase(WINDOW *win)
{
    if (!win) return ERR;
    int i;
    for (i = 0; i < LINES; i++) {
        memset(win->_data[i], ' ', COLS);
        win->_data[i][COLS] = '\0';
    }
    win->_cury = win->_curx = 0;
    return OK;
}

int wclear(WINDOW *win)
{
    return werase(win);
}

int clear(void)
{
    return wclear(stdscr);
}

int wmove(WINDOW *win, int y, int x)
{
    if (!win) return ERR;
    if (y < 0 || y >= LINES || x < 0 || x > COLS) return ERR;
    win->_cury = y;
    win->_curx = x;
    return OK;
}

int move(int y, int x)
{
    return wmove(stdscr, y, x);
}

int waddch(WINDOW *win, int ch)
{
    if (!win) return ERR;
    int y = win->_cury;
    int x = win->_curx;
    if (y < 0 || y >= LINES) return ERR;
    if (ch == '\n') {
        /* newline: move to start of next line */
        win->_curx = 0;
        if (y + 1 < LINES) win->_cury = y + 1;
        return OK;
    }
    if (ch == '\r') {
        win->_curx = 0;
        return OK;
    }
    if (ch == '\b') {
        if (x > 0) win->_curx = x - 1;
        return OK;
    }
    if (ch == '\t') {
        /* tab: advance to next tab stop */
        int nx = (x + 8) & ~7;
        if (nx > COLS) nx = COLS;
        win->_curx = nx;
        return OK;
    }
    /* regular character */
    if (x < COLS) {
        win->_data[y][x] = (char)(ch & 0xff);
        win->_curx = x + 1;
    }
    return OK;
}

int addch(int ch)
{
    return waddch(stdscr, ch);
}

int mvwaddch(WINDOW *win, int y, int x, int ch)
{
    wmove(win, y, x);
    return waddch(win, ch);
}

int mvaddch(int y, int x, int ch)
{
    return mvwaddch(stdscr, y, x, ch);
}

int waddstr(WINDOW *win, const char *str)
{
    if (!win || !str) return ERR;
    while (*str) waddch(win, (unsigned char)*str++);
    return OK;
}

int addstr(const char *str)
{
    return waddstr(stdscr, str);
}

int mvwaddstr(WINDOW *win, int y, int x, const char *str)
{
    wmove(win, y, x);
    return waddstr(win, str);
}

int mvaddstr(int y, int x, const char *str)
{
    return mvwaddstr(stdscr, y, x, str);
}

int wclrtoeol(WINDOW *win)
{
    if (!win) return ERR;
    int y = win->_cury;
    int x = win->_curx;
    if (y < 0 || y >= LINES) return ERR;
    int i;
    for (i = x; i < COLS; i++) win->_data[y][i] = ' ';
    return OK;
}

int clrtoeol(void)
{
    return wclrtoeol(stdscr);
}

/* ===== printw family ===== */

int wprintw(WINDOW *win, const char *fmt, ...)
{
    char buf[1024];
    va_list ap;
    va_start(ap, fmt);
    vsnprintf(buf, sizeof(buf), fmt, ap);
    va_end(ap);
    return waddstr(win, buf);
}

int printw(const char *fmt, ...)
{
    char buf[1024];
    va_list ap;
    va_start(ap, fmt);
    vsnprintf(buf, sizeof(buf), fmt, ap);
    va_end(ap);
    return waddstr(stdscr, buf);
}

int mvprintw(int y, int x, const char *fmt, ...)
{
    char buf[1024];
    va_list ap;
    move(y, x);
    va_start(ap, fmt);
    vsnprintf(buf, sizeof(buf), fmt, ap);
    va_end(ap);
    return waddstr(stdscr, buf);
}

int mvwprintw(WINDOW *win, int y, int x, const char *fmt, ...)
{
    char buf[1024];
    va_list ap;
    wmove(win, y, x);
    va_start(ap, fmt);
    vsnprintf(buf, sizeof(buf), fmt, ap);
    va_end(ap);
    return waddstr(win, buf);
}

/* ===== inch / winch family ===== */

int winch(WINDOW *win)
{
    if (!win) return ERR;
    int y = win->_cury;
    int x = win->_curx;
    if (y < 0 || y >= LINES || x < 0 || x >= COLS) return ' ';
    return (unsigned char)win->_data[y][x];
}

int inch(void)
{
    return winch(stdscr);
}

int mvwinch(WINDOW *win, int y, int x)
{
    if (!win) return ERR;
    if (y < 0 || y >= LINES || x < 0 || x >= COLS) return ERR;
    /* move cursor then return char */
    win->_cury = y;
    win->_curx = x;
    return (unsigned char)win->_data[y][x];
}

/* ===== wrefresh / refresh ===== */

/*
 * wrefresh(win):
 *   - For mw/hw: copy non-space chars onto cw (overlay semantics).
 *     Actually for Rogue: hw is displayed as a full replacement when show_win
 *     is called; mw is the monster overlay.  We implement as:
 *       mw/hw -> copy entire window onto cw (overwrite), then do cw refresh.
 *     But actually the game calls draw(cw), draw(hw), draw(stdscr) etc.
 *     The simplest correct behaviour:
 *       - draw(cw)  -> snapshot cw into harness_display
 *       - draw(hw)  -> copy hw -> cw, then snapshot
 *       - draw(stdscr) -> copy stdscr -> cw, then snapshot
 *       - draw(mw)  -> no snapshot (monster window used only for winat)
 */

int wrefresh(WINDOW *win)
{
    if (!win) return ERR;

    /* Determine the source window to snapshot */
    WINDOW *src = win;

    /* If refreshing hw or stdscr, merge into cw first */
    /* We always capture from cw after any refresh of a "visible" window. */
    if (win == stdscr) {
        /* copy stdscr -> cw */
        int i;
        for (i = 0; i < LINES; i++) {
            memcpy(cw->_data[i], stdscr->_data[i], COLS + 1);
        }
        cw->_cury = stdscr->_cury;
        cw->_curx = stdscr->_curx;
        src = cw;
    } else if (win == hw) {
        /* hw displayed as full overlay over cw */
        int i;
        for (i = 0; i < LINES; i++) {
            memcpy(cw->_data[i], hw->_data[i], COLS + 1);
        }
        cw->_cury = hw->_cury;
        cw->_curx = hw->_curx;
        src = cw;
    } else if (win == mw) {
        /* mw is monster window — not a display event, skip snapshot */
        return OK;
    } else if (win == curscr) {
        /* curscr refresh — treat same as cw */
        src = cw;
    }
    /* else win == cw: snapshot directly */

    /* Copy src (cw) to harness_display */
    int i;
    for (i = 0; i < LINES; i++) {
        memcpy(harness_display[i], src->_data[i], COLS + 1);
    }

    return OK;
}

int refresh(void)
{
    return wrefresh(stdscr);
}

/* ===== Window manipulation ===== */

int clearok(WINDOW *win, int flag)
{
    (void)win; (void)flag;
    return OK;
}

int touchwin(WINDOW *win)
{
    (void)win;
    return OK;
}

/*
 * overwrite(src, dst): copy all chars (including spaces) from src to dst.
 */
int overwrite(WINDOW *src, WINDOW *dst)
{
    if (!src || !dst) return ERR;
    int i;
    for (i = 0; i < LINES; i++) {
        memcpy(dst->_data[i], src->_data[i], COLS + 1);
    }
    dst->_cury = src->_cury;
    dst->_curx = src->_curx;
    return OK;
}

/*
 * overlay(src, dst): copy non-space chars from src onto dst.
 */
int overlay(WINDOW *src, WINDOW *dst)
{
    if (!src || !dst) return ERR;
    int y, x;
    for (y = 0; y < LINES; y++) {
        for (x = 0; x < COLS; x++) {
            char c = src->_data[y][x];
            if (c != ' ') dst->_data[y][x] = c;
        }
    }
    return OK;
}

/* ===== Attribute stubs ===== */

int standout(void)  { return OK; }
int standend(void)  { return OK; }
int wstandout(WINDOW *win) { (void)win; return OK; }
int wstandend(WINDOW *win) { (void)win; return OK; }

/* ===== Terminal mode stubs ===== */

int crmode(void)   { return OK; }
int noecho(void)   { return OK; }
int nocrmode(void) { return OK; }
int echo(void)     { return OK; }
int raw(void)      { return OK; }
int noraw(void)    { return OK; }

int baudrate(void) { return 9600; }

int mvcur(int oldy, int oldx, int newy, int newx)
{
    (void)oldy; (void)oldx;
    if (stdscr) wmove(stdscr, newy, newx);
    return OK;
}

/* ===== Additional missing curses functions ===== */

/* mvinch: move stdscr cursor and return character */
int mvinch(int y, int x)
{
    return mvwinch(stdscr, y, x);
}

/* erasechar: return the erase character (backspace) */
int erasechar(void)
{
    return '\b';
}

/* killchar: return the kill character (ctrl-U) */
int killchar(void)
{
    return 0x15;  /* ^U */
}

/* gettmode: get terminal mode — no-op */
int gettmode(void)
{
    return OK;
}

/* setterm: set terminal type — no-op */
int setterm(char *type)
{
    (void)type;
    return OK;
}

/* ===== unctrl ===== */

static char unctrl_buf[8];

char *unctrl(int ch)
{
    if (ch >= 0x20 && ch < 0x7f) {
        unctrl_buf[0] = (char)ch;
        unctrl_buf[1] = '\0';
    } else if (ch == 0x7f) {
        strcpy(unctrl_buf, "^?");
    } else if (ch < 0x20) {
        unctrl_buf[0] = '^';
        unctrl_buf[1] = (char)(ch + '@');
        unctrl_buf[2] = '\0';
    } else {
        snprintf(unctrl_buf, sizeof(unctrl_buf), "\\%03o", (unsigned char)ch);
    }
    return unctrl_buf;
}
