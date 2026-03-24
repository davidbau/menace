/*
 * curses.h — Fake curses for Rogue 3.6 harness
 *
 * Replaces the system curses.h. Provides WINDOW struct and all
 * curses function prototypes used by the Rogue source.
 */

#ifndef CURSES_H
#define CURSES_H

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdarg.h>

/* Screen dimensions */
#define LINES 24
#define COLS  80

/* Return codes */
#define OK  0
#define ERR (-1)

/* Boolean */
#ifndef TRUE
#define TRUE  1
#define FALSE 0
#endif
typedef int bool;

/* WINDOW structure */
typedef struct _win_st {
    int _cury;              /* current cursor row (0-based) */
    int _curx;              /* current cursor col (0-based) */
    int _lines;             /* number of rows */
    int _cols;              /* number of columns */
    char _data[LINES][COLS + 1]; /* character grid, null-terminated rows */
    /* _overlay tracks which cells were explicitly written to THIS window
     * (not inherited from another). Used by wrefresh for compositing. */
    char _overlay[LINES][COLS + 1];
    /* _attr tracks standout (inverse) attribute per cell: 1=standout, 0=normal */
    char _attr[LINES][COLS + 1];
} WINDOW;

/* Global windows */
extern WINDOW *stdscr;
extern WINDOW *curscr;
extern WINDOW *cw;
extern WINDOW *mw;
extern WINDOW *hw;

/* Harness display snapshot — updated by wrefresh(cw) */
extern char harness_display[LINES][COLS + 1];

/* Function prototypes */
WINDOW *initscr(void);
void    endwin(void);
WINDOW *newwin(int nlines, int ncols, int begin_y, int begin_x);

int  wclear(WINDOW *win);
int  werase(WINDOW *win);
int  wmove(WINDOW *win, int y, int x);
int  move(int y, int x);
int  waddch(WINDOW *win, int ch);
int  addch(int ch);
int  mvwaddch(WINDOW *win, int y, int x, int ch);
int  mvaddch(int y, int x, int ch);
int  waddstr(WINDOW *win, const char *str);
int  addstr(const char *str);
int  mvwaddstr(WINDOW *win, int y, int x, const char *str);
int  mvaddstr(int y, int x, const char *str);
int  wclrtoeol(WINDOW *win);
int  clrtoeol(void);
int  wclear(WINDOW *win);
int  clear(void);
int  printw(const char *fmt, ...);
int  mvprintw(int y, int x, const char *fmt, ...);
int  wprintw(WINDOW *win, const char *fmt, ...);
int  mvwprintw(WINDOW *win, int y, int x, const char *fmt, ...);
int  inch(void);
int  winch(WINDOW *win);
int  mvwinch(WINDOW *win, int y, int x);
int  mvwch(WINDOW *win, int y, int x);
int  wrefresh(WINDOW *win);
int  refresh(void);
int  clearok(WINDOW *win, int flag);
int  touchwin(WINDOW *win);
int  overwrite(WINDOW *src, WINDOW *dst);
int  overlay(WINDOW *src, WINDOW *dst);
int  standout(void);
int  standend(void);
int  wstandout(WINDOW *win);
int  wstandend(WINDOW *win);
int  crmode(void);
int  noecho(void);
int  nocrmode(void);
int  echo(void);
int  raw(void);
int  noraw(void);
int  baudrate(void);
int  mvcur(int oldy, int oldx, int newy, int newx);

/* getyx macro — reads cursor position from window */
#define getyx(win, y, x) ((y) = (win)->_cury, (x) = (win)->_curx)

/* unctrl — make control chars printable */
char *unctrl(int ch);

/* Additional curses functions */
int mvinch(int y, int x);
int erasechar(void);
int killchar(void);
int gettmode(void);
int setterm(char *type);
void delwin(WINDOW *win);
int keypad(WINDOW *win, int bf);
int scrollok(WINDOW *win, int bf);
int scroll(WINDOW *win);
int nonl(void);
int cbreak(void);
int nocbreak(void);
int nodelay(WINDOW *win, int bf);
int wgetch(WINDOW *win);

/* getmaxx/getmaxy — query window dimensions */
#define getmaxx(win) ((win)->_cols)
#define getmaxy(win) ((win)->_lines)

/* A_STANDOUT etc. for compatibility */
#define A_STANDOUT 0x00010000

/* Key codes for mdport.c keypad handling */
#define KEY_LEFT   0x104
#define KEY_RIGHT  0x105
#define KEY_UP     0x103
#define KEY_DOWN   0x102
#define KEY_HOME   0x106
#define KEY_PPAGE  0x153
#define KEY_NPAGE  0x152
#define KEY_END    0x168
#define KEY_BACKSPACE 0x107
#define KEY_DC     0x14a
#define KEY_IC     0x14b
#define KEY_F0     0x109

#define KEY_A1     0x1c1
#define KEY_A3     0x1c3
#define KEY_B2     0x1c5
#define KEY_C1     0x1c7
#define KEY_C3     0x1c9

/* CE terminal capability — not used in harness */
#define CE ""

/* chtype for compatibility */
typedef int chtype;

#endif /* CURSES_H */
