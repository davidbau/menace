/**
 * io.js — I/O functions for Rogue 3.6 JS port.
 *
 * msg(), addmsg(), endmsg(), status(), readchar(), wait_for().
 */

import { game } from './gstate.js';
import { sprintf, mvwaddstr, wclrtoeol, wmove, waddstr, getCwyx, setCwyx, draw } from './curses.js';
import { LINES, COLS, LEFT, RIGHT } from './const.js';

// Internal message buffer (corresponds to C's msgbuf and newpos)
let _msgbuf = "";
let _newpos = 0;

/**
 * msg(fmt, ...args): display message at top of screen.
 * If fmt == "", just clear the top line.
 * Async because --More-- requires waiting for keypress.
 */
export async function msg(fmt, ...args) {
  const g = game();
  if (fmt === '') {
    // Clear top line
    mvwaddstr(g.cw, 0, 0, '');
    wclrtoeol(g.cw);
    // Manually clear row 0 of cw
    for (let c = 0; c < COLS; c++) g.cw[0][c] = ' ';
    g.mpos = 0;
    return;
  }
  // Otherwise format and show
  doadd(fmt, args);
  await endmsg();
}

/**
 * addmsg(fmt, ...args): append to current message buffer (no display yet).
 */
export function addmsg(fmt, ...args) {
  doadd(fmt, args);
}

/**
 * doadd: format string and append to _msgbuf
 */
function doadd(fmt, args) {
  _msgbuf = _msgbuf.slice(0, _newpos) + sprintf(fmt, args);
  _newpos = _msgbuf.length;
}

/**
 * endmsg(): display accumulated message, handle --More-- if needed.
 */
export async function endmsg() {
  const g = game();
  // Save to huh
  g.huh = _msgbuf;

  if (g.mpos) {
    // Show --More-- at current message position
    mvwaddstr(g.cw, 0, g.mpos, '--More--');
    draw(g.cw);
    await wait_for(' ');
  }

  // Display the new message
  // Clear row 0 of cw
  for (let c = 0; c < COLS; c++) g.cw[0][c] = ' ';
  // Write message — expand tabs to spaces (matching C curses waddch tab handling)
  let col = 0;
  for (let i = 0; i < _msgbuf.length && col < COLS; i++) {
    const ch = _msgbuf[i];
    if (ch === '\t') {
      const nextTab = (Math.floor(col / 8) + 1) * 8;
      while (col < nextTab && col < COLS) g.cw[0][col++] = ' ';
    } else {
      g.cw[0][col++] = ch;
    }
  }

  g.mpos = col;  // actual display column after tab expansion
  _newpos = 0;
  _msgbuf = "";

  draw(g.cw);
}

/**
 * readchar(): async — returns next key from input.
 */
export async function readchar() {
  const g = game();
  draw(g.cw);
  return await g.input.getKey();
}

/**
 * wait_for(ch): wait until the specified character is typed.
 * Special case: '\n' accepts '\n' or '\r'.
 */
export async function wait_for(ch) {
  const g = game();
  if (ch === '\n') {
    let c;
    do {
      c = await g.input.getKey();
    } while (c !== '\n' && c !== '\r');
  } else {
    let c;
    do {
      c = await g.input.getKey();
    } while (c !== ch);
  }
}

/**
 * status(): display the status line at row LINES-1 (row 23).
 * Skips if nothing changed.
 */
let _s_hp = -1, _s_exp = 0, _s_pur = 0, _s_ac = 0;
let _s_str = 0, _s_add = 0, _s_lvl = -1, _s_hungry = -1;
let _hpwidth = 0;

export function status() {
  const g = game();
  const ps = g.player.t_stats;
  const cur_ac = g.cur_armor !== null ? g.cur_armor.o_ac : ps.s_arm;

  // Check if anything changed
  if (_s_hp === ps.s_hpt && _s_exp === ps.s_exp && _s_pur === g.purse &&
      _s_ac === cur_ac && _s_str === ps.s_str.st_str &&
      _s_add === ps.s_str.st_add && _s_lvl === g.level &&
      _s_hungry === g.hungry_state) {
    return;
  }

  // Save cursor position
  const [oy, ox] = getCwyx();

  // Update hpwidth if max_hp changed
  if (_s_hp !== g.max_hp) {
    let temp = g.max_hp;
    _hpwidth = 0;
    if (temp <= 0) _hpwidth = 1;
    while (temp > 0) { _hpwidth++; temp = Math.floor(temp / 10); }
  }

  // Build status line
  let buf = `Level: ${g.level}  Gold: ${String(g.purse).padEnd(5)}  Hp: ${String(ps.s_hpt).padStart(_hpwidth)}(${String(g.max_hp).padStart(_hpwidth)})  Str: ${ps.s_str.st_str}`;
  if (ps.s_str.st_add !== 0) {
    buf += `/${ps.s_str.st_add}`;
  }
  buf += `  Ac: ${String(cur_ac).padEnd(2)}  Exp: ${ps.s_lvl}/${ps.s_exp}`;

  // Save state
  _s_lvl = g.level;
  _s_pur = g.purse;
  _s_hp = ps.s_hpt;
  _s_str = ps.s_str.st_str;
  _s_add = ps.s_str.st_add;
  _s_exp = ps.s_exp;
  _s_ac = cur_ac;

  // Write to row LINES-1 (0-based row 23)
  const row = LINES - 1;
  for (let c = 0; c < COLS; c++) g.cw[row][c] = ' ';
  for (let i = 0; i < buf.length && i < COLS; i++) {
    g.cw[row][i] = buf[i];
  }

  // Hunger state
  let hungerStr = '';
  switch (g.hungry_state) {
    case 0: break;
    case 1: hungerStr = '  Hungry'; break;
    case 2: hungerStr = '  Weak'; break;
    case 3: hungerStr = '  Fainting'; break;
  }
  if (hungerStr) {
    const start = buf.length;
    for (let i = 0; i < hungerStr.length && start + i < COLS; i++) {
      g.cw[row][start + i] = hungerStr[i];
    }
  }

  _s_hungry = g.hungry_state;

  // Restore cursor
  setCwyx(oy, ox);
}

export function resetStatus() {
  _s_hp = -1; _s_exp = 0; _s_pur = 0; _s_ac = 0;
  _s_str = 0; _s_add = 0; _s_lvl = -1; _s_hungry = -1;
  _hpwidth = 0;
  _msgbuf = "";
  _newpos = 0;
}

/**
 * step_ok(ch): returns true if it is ok to step on ch.
 */
export function step_ok(ch) {
  switch (ch) {
    case ' ':
    case '|':
    case '-':
    case '&':  // SECRETDOOR
      return false;
    default:
      return !(ch >= 'A' && ch <= 'Z');
  }
}
