/**
 * curses.js — Curses emulation layer for Rogue 3.6 JS port.
 *
 * Rogue uses three windows:
 *   stdscr — underlying map (rooms, passages, items on floor)
 *   cw     — player's view window (what gets shown to player; updated via waddch etc.)
 *   mw     — monster window overlay (tracks monster positions)
 *
 * In our JS:
 *   game.stdscr[y][x] — underlying map
 *   game.cw[y][x]     — player's view (displayed)
 *   game.mw[y][x]     — monster overlay (not displayed directly)
 *
 * All coordinates are 0-based (y 0..23, x 0..79).
 * Display uses 1-based coords; we convert when drawing.
 *
 * Cursor tracking: stdscr has its own cursor (used by move/addch),
 * cw has its own cursor (used by wmove(cw,...)/waddch(cw,...)).
 */

import { game } from './gstate.js';
import { LINES, COLS } from './const.js';

// Cursor state for each window
export const _stdscrState = { y: 0, x: 0 };
export const _cwState = { y: 0, x: 0 };
export const _mwState = { y: 0, x: 0 };
export const _hwState = { y: 0, x: 0 };

function _arr(win) {
  const g = game();
  if (!win || win === 'cw' || win === g.cw) return g.cw;
  if (win === 'mw' || win === g.mw) return g.mw;
  if (win === 'stdscr' || win === g.stdscr) return g.stdscr;
  if (win === 'hw' || win === g.hw) return g.hw;
  return win;
}

function _state(win) {
  const g = game();
  if (!win || win === 'cw' || win === g.cw) return _cwState;
  if (win === 'mw' || win === g.mw) return _mwState;
  if (win === 'stdscr' || win === g.stdscr) return _stdscrState;
  if (win === 'hw' || win === g.hw) return _hwState;
  return _stdscrState;
}

// ---- Reading ----

// mvwinch(win, y, x): move cursor in win to (y,x) and return char
export function mvwinch(win, y, x) {
  const st = _state(win);
  st.y = y; st.x = x;
  const arr = _arr(win);
  if (y < 0 || y >= LINES || x < 0 || x >= COLS) return ' ';
  return arr[y][x];
}

// winch(win): return char at current cursor of win (after mvwinch)
export function winch(win) {
  const st = _state(win);
  return mvwinch(win, st.y, st.x);
}

// mvinch(y, x): read from stdscr at (y,x)
export function mvinch(y, x) {
  return mvwinch(game().stdscr, y, x);
}

// winat(y, x): monster char if mw != ' ', else stdscr char
export function winat(y, x) {
  const g = game();
  if (y < 0 || y >= LINES || x < 0 || x >= COLS) return ' ';
  const mc = g.mw[y][x];
  if (mc !== ' ') return mc;
  return g.stdscr[y][x];
}

// ---- Moving ----

// wmove(win, y, x): set cursor for window
export function wmove(win, y, x) {
  _state(win).y = y;
  _state(win).x = x;
}

// move(y, x): move cursor in stdscr
export function move(y, x) {
  _stdscrState.y = y;
  _stdscrState.x = x;
}

// ---- Writing to stdscr (main map) ----

// addch(ch): add char at stdscr cursor, advance x
export function addch(ch) {
  const g = game();
  const y = _stdscrState.y, x = _stdscrState.x;
  if (y >= 0 && y < LINES && x >= 0 && x < COLS) g.stdscr[y][x] = ch;
  _stdscrState.x++;
}

// mvaddch(y, x, ch): move + addch in stdscr (advances x by 1)
export function mvaddch(y, x, ch) {
  _stdscrState.y = y; _stdscrState.x = x;
  addch(ch);
}

// ---- Writing to specific windows ----

// waddch(win, ch): add char at current cursor of win, advance x for cw/stdscr/hw
export function waddch(win, ch) {
  const g = game();
  const arr = _arr(win);
  const st = _state(win);
  if (ch === '\n') {
    // Newline: advance to next row, column 0 (for hw and stdscr output)
    st.y++;
    st.x = 0;
    return;
  }
  if (ch === '\t') {
    // Tab: expand to next 8-column boundary (matches C curses behavior)
    const nextTab = (Math.floor(st.x / 8) + 1) * 8;
    while (st.x < nextTab && st.x < COLS) {
      if (st.y >= 0 && st.y < LINES) arr[st.y][st.x] = ' ';
      st.x++;
    }
    return;
  }
  const y = st.y, x = st.x;
  if (y >= 0 && y < LINES && x >= 0 && x < COLS) arr[y][x] = ch;
  // Advance x for cw, stdscr, and hw
  if (win === g.cw || win === 'cw' || win === g.stdscr || win === 'stdscr' ||
      win === 'hw' || win === g.hw) {
    st.x++;
  }
}

// mvwaddch(win, y, x, ch): move cursor in win and add char
export function mvwaddch(win, y, x, ch) {
  const g = game();
  const arr = _arr(win);
  const st = _state(win);
  st.y = y; st.x = x;
  if (y >= 0 && y < LINES && x >= 0 && x < COLS) arr[y][x] = ch;
}

// waddstr(win, str): write string at current cursor in win
export function waddstr(win, str) {
  for (const ch of str) waddch(win, ch);
}

// mvwaddstr(win, y, x, str): move + waddstr
export function mvwaddstr(win, y, x, str) {
  _state(win).y = y; _state(win).x = x;
  waddstr(win, str);
}

// printw(fmt, ...args): printf to stdscr
export function printw(fmt, ...args) {
  waddstr(game().stdscr, sprintf(fmt, args));
}

// wprintw(win, fmt, ...args): printf to specific window
export function wprintw(win, fmt, ...args) {
  waddstr(win, sprintf(fmt, args));
}

// mvwprintw(win, y, x, fmt, ...args)
export function mvwprintw(win, y, x, fmt, ...args) {
  mvwaddstr(win, y, x, sprintf(fmt, args));
}

// ---- Clearing ----

// wclear(win): clear window
export function wclear(win) {
  const arr = _arr(win);
  for (let r = 0; r < LINES; r++)
    for (let c = 0; c < COLS; c++)
      arr[r][c] = ' ';
  const st = _state(win);
  st.y = 0; st.x = 0;
}

// clear(): clear stdscr
export function clear() {
  wclear(game().stdscr);
}

// wclrtoeol(win): clear from current cursor to end of line
export function wclrtoeol(win) {
  const arr = _arr(win);
  const st = _state(win);
  const y = st.y;
  if (y >= 0 && y < LINES)
    for (let c = st.x; c < COLS; c++) arr[y][c] = ' ';
}

export function clrtoeol() { wclrtoeol(game().stdscr); }

// ---- getyx ----

// In C: getyx(win, oy, ox) sets oy and ox. In JS we need a different approach.
// We return an array [y, x] that callers must unpack.
export function getyx(win) {
  const st = _state(win);
  return [st.y, st.x];
}

export function getCwyx() { return [_cwState.y, _cwState.x]; }
export function setCwyx(y, x) { _cwState.y = y; _cwState.x = x; }

export function resetCursorState() {
  _stdscrState.y = 0; _stdscrState.x = 0;
  _cwState.y = 0; _cwState.x = 0;
  _mwState.y = 0; _mwState.x = 0;
}

// ---- draw / refresh ----

// draw(win): composite stdscr + mw + cw to display (like C harness wrefresh)
// Matches hack_curses.c wrefresh(cw): stdscr base + mw overlay + cw overlay
export function draw(win) {
  const g = game();
  if (!g.display) return;

  // mw is never displayed directly
  if (win === g.mw || win === 'mw') return;

  const display = g.display;

  // hw (help/inventory window) is drawn as a full overlay (like C's touchwin+draw(hw))
  if (win === g.hw) {
    for (let r = 0; r < LINES; r++) {
      for (let c = 0; c < COLS; c++) {
        display.putChar(c + 1, r + 1, g.hw[r][c]);
      }
    }
    display.moveCursor(_cwState.x + 1, _cwState.y + 1);
    display.flush();
    return;
  }

  for (let r = 0; r < LINES; r++) {
    for (let c = 0; c < COLS; c++) {
      // Layer 1: stdscr base (dungeon map, all rooms)
      let ch = g.stdscr[r][c];
      // Layer 2: mw overlay (monster positions)
      const mc = g.mw[r][c];
      if (mc !== ' ') ch = mc;
      // Layer 3: cw overlay (player @, explicitly drawn items)
      const cc = g.cw[r][c];
      if (cc !== ' ') ch = cc;
      display.putChar(c + 1, r + 1, ch);
    }
  }
  // Position cursor at cw cursor
  display.moveCursor(_cwState.x + 1, _cwState.y + 1);
  display.flush();
}

// ---- sprintf ----

export function sprintf(fmt, args) {
  let i = 0;
  return fmt.replace(/%%|%(-?\d+)?(?:\.(\d+))?([diouxXeEfgGscp]|l[diouxX])/g, (match, width, prec, spec) => {
    if (match === '%%') return '%';
    const arg = args[i++];
    const w = parseInt(width) || 0;
    const p = parseInt(prec) || 0;
    if (spec === 's' || spec === undefined) {
      let s = String(arg === undefined || arg === null ? '' : arg);
      if (p > 0) s = s.slice(0, p);
      if (w > 0) return s.padStart(w);
      if (w < 0) return s.padEnd(-w);
      return s;
    }
    if (spec === 'd' || spec === 'i' || spec === 'ld' || spec === 'li') {
      const n = Math.trunc(Number(arg) || 0);
      let s = String(n);
      if (w > 0) return (width && width.startsWith('-')) ? s.padEnd(w) : s.padStart(w);
      if (w < 0) return s.padEnd(-w);
      return s;
    }
    if (spec === 'u') return String((arg >>> 0) || 0);
    if (spec === 'o' || spec === 'lo') return ((parseInt(arg) || 0) >>> 0).toString(8);
    if (spec === 'x' || spec === 'lx') return ((parseInt(arg) || 0) >>> 0).toString(16);
    if (spec === 'X' || spec === 'lX') return ((parseInt(arg) || 0) >>> 0).toString(16).toUpperCase();
    if (spec === 'c') return typeof arg === 'number' ? String.fromCharCode(arg) : String(arg || '');
    if (spec === 'f' || spec === 'e' || spec === 'g' || spec === 'E' || spec === 'G') {
      return String(parseFloat(arg) || 0);
    }
    return String(arg || '');
  });
}

// ---- Misc curses no-ops ----

export function touchwin(win) {}
export function clearok(win, flag) {}
export function noecho() {}
export function crmode() {}
export function raw() {}
export function noraw() {}
export function endwin() {}
export function baudrate() { return 9600; }
export function initscr() {}
export function newwin(lines, cols, y, x) { return 'cw'; } // stub
