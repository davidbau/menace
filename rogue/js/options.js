/**
 * options.js — Options screen for Rogue 3.6 JS port.
 * Ported from options.c.
 */

import { game } from './gstate.js';
import { wclear, waddch, waddstr, wclrtoeol, wmove, mvwaddstr, draw, getyx } from './curses.js';
import { LINES } from './const.js';
import { wait_for } from './io.js';

const OPT_KEY = 'rogue-options';

// C: optlist[] — prompts matching options.c exactly
const BOOL_OPTS = [
  { prompt: 'Terse output: ',                      field: 'terse' },
  { prompt: 'Flush typeahead during battle: ',     field: 'fight_flush' },
  { prompt: 'Show position only at end of run: ',  field: 'jump' },
  { prompt: 'Do inventories one line at a time: ', field: 'slow_invent' },
  { prompt: 'Ask me about unidentified things: ',  field: 'askme' },
];

const STR_OPTS = [
  { prompt: 'Name: ',      field: 'whoami' },
  { prompt: 'Fruit: ',     field: 'fruit' },
  { prompt: 'Save file: ', field: 'file_name' },
];

const NORM = 0, QUIT = 1, MINUS = 2;

/**
 * loadOptions(): restore saved options from localStorage on game start.
 */
export function loadOptions() {
  try {
    const saved = localStorage.getItem(OPT_KEY);
    if (!saved) return;
    const opts = JSON.parse(saved);
    const g = game();
    for (const b of BOOL_OPTS) {
      if (opts[b.field] !== undefined) g[b.field] = !!opts[b.field];
    }
    for (const s of STR_OPTS) {
      if (opts[s.field]) g[s.field] = String(opts[s.field]);
    }
  } catch (e) {}
}

function saveOptions() {
  const g = game();
  const opts = {};
  for (const b of BOOL_OPTS) opts[b.field] = g[b.field];
  for (const s of STR_OPTS) opts[s.field] = g[s.field];
  try { localStorage.setItem(OPT_KEY, JSON.stringify(opts)); } catch (e) {}
}

// C: get_bool(bp, win) — interactively change a boolean option.
// Returns NORM, QUIT, or MINUS.
// Uses g.input.getKey() directly to avoid readchar()'s draw(cw) side-effect.
async function get_bool(field, win) {
  const g = game();
  const [oy, ox] = getyx(win);
  waddstr(win, g[field] ? 'True' : 'False');
  for (;;) {
    wmove(win, oy, ox);
    draw(win);
    const c = await g.input.getKey();
    if (c === 't' || c === 'T') { g[field] = true; break; }
    else if (c === 'f' || c === 'F') { g[field] = false; break; }
    else if (c === '\n' || c === '\r') { break; }
    else if (c === '\x1b' || c === '\x07') { return QUIT; }
    else if (c === '-') { return MINUS; }
    else { mvwaddstr(win, oy, ox + 10, '(T or F)'); }
  }
  wmove(win, oy, ox);
  waddstr(win, g[field] ? 'True' : 'False');
  waddch(win, '\n');
  return NORM;
}

// C: get_str(opt, win) — interactively edit a string option.
// Returns NORM, QUIT, or MINUS.
// Uses g.input.getKey() directly to avoid readchar()'s draw(cw) side-effect.
async function get_str(field, win) {
  const g = game();
  draw(win);
  const [oy, ox] = getyx(win);
  let buf = '';
  for (;;) {
    const c = await g.input.getKey();
    if (c === '\n' || c === '\r' || c === '\x1b' || c === '\x07') {
      if (buf.length > 0) g[field] = buf;
      wmove(win, oy, ox);
      waddstr(win, g[field]);
      waddch(win, '\n');
      draw(win);
      if (c === '\x1b' || c === '\x07') return QUIT;
      return NORM;
    }
    if (c === '\x7f' || c === '\x08') {
      if (buf.length > 0) buf = buf.slice(0, -1);
    } else if (buf.length < 30) {
      buf += c;
    }
    // C: wclrtoeol(win), draw(win) at end of each loop iteration
    wmove(win, oy, ox);
    waddstr(win, buf);
    wclrtoeol(win);
    draw(win);
  }
}

/**
 * option(): interactive options screen ('o' key).
 * Matches C options.c: uses hw window, get_bool/get_str per option.
 */
export async function option() {
  const g = game();
  wclear(g.hw);

  // C: display current values of all options
  for (const b of BOOL_OPTS) {
    waddstr(g.hw, b.prompt);
    waddstr(g.hw, g[b.field] ? 'True' : 'False');
    waddch(g.hw, '\n');
  }
  for (const s of STR_OPTS) {
    waddstr(g.hw, s.prompt);
    waddstr(g.hw, g[s.field]);
    waddch(g.hw, '\n');
  }

  // C: set values — go back to row 0 and step through each option
  wmove(g.hw, 0, 0);
  let quit = false;
  let op = 0;
  while (op < BOOL_OPTS.length && !quit) {
    waddstr(g.hw, BOOL_OPTS[op].prompt);
    const ret = await get_bool(BOOL_OPTS[op].field, g.hw);
    if (ret === QUIT) { quit = true; break; }
    if (ret === MINUS) {
      if (op > 0) { wmove(g.hw, op - 1, 0); op -= 2; }
      else { wmove(g.hw, 0, 0); op--; }
    }
    op++;
  }
  op = 0;
  while (op < STR_OPTS.length && !quit) {
    waddstr(g.hw, STR_OPTS[op].prompt);
    const ret = await get_str(STR_OPTS[op].field, g.hw);
    if (ret === QUIT) { quit = true; break; }
    if (ret === MINUS) {
      if (op > 0) { wmove(g.hw, BOOL_OPTS.length + op - 1, 0); op -= 2; }
      else { wmove(g.hw, BOOL_OPTS.length - 1, 0); op--; }
    }
    op++;
  }

  // C: "--Press space to continue--" at LINES-1
  mvwaddstr(g.hw, LINES - 1, 0, '--Press space to continue--');
  draw(g.hw);
  await wait_for(' ');

  saveOptions();

  // C: clearok(cw, TRUE); touchwin(cw); after = FALSE;
  wclear(g.hw);
  draw(g.cw);
}
