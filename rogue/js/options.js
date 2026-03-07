/**
 * options.js — Options screen for Rogue 3.6 JS port.
 * Ported from options.c.
 */

import { game } from './gstate.js';
import { wclear, mvwaddstr, wmove, draw } from './curses.js';
import { LINES, COLS } from './const.js';

const OPT_KEY = 'rogue-options';

const BOOL_OPTS = [
  { label: 'terse output',             field: 'terse' },
  { label: 'flush typeahead in fight', field: 'fight_flush' },
  { label: 'jump between rooms',       field: 'jump' },
  { label: 'step through inventory',   field: 'slow_invent' },
  { label: 'ask about unid\'d things', field: 'askme' },
];

const STR_OPTS = [
  { label: 'name',  field: 'whoami' },
  { label: 'fruit', field: 'fruit'  },
];

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

/**
 * option(): interactive options screen ('o' key).
 */
export async function option() {
  const g = game();
  wclear(g.cw);

  // Header
  mvwaddstr(g.cw, 0, 0, 'Rogue options');

  // Render all options
  function renderAll() {
    let row = 2;
    let idx = 0;
    for (const b of BOOL_OPTS) {
      const ch = String.fromCharCode('a'.charCodeAt(0) + idx);
      const val = g[b.field] ? 'yes' : 'no ';
      const line = `${ch}) ${b.label.padEnd(30)} : ${val}`;
      mvwaddstr(g.cw, row, 2, line);
      row++; idx++;
    }
    row++;
    for (const s of STR_OPTS) {
      const ch = String.fromCharCode('a'.charCodeAt(0) + idx);
      const line = `${ch}) ${s.label.padEnd(30)} : ${g[s.field]}`;
      mvwaddstr(g.cw, row, 2, line);
      row++; idx++;
    }
    mvwaddstr(g.cw, row + 1, 2, 'Press letter to toggle/edit, space to save and quit');
    draw(g.cw);
  }

  renderAll();

  const { readchar } = await import('./io.js');

  for (;;) {
    const ch = await readchar();
    if (ch === ' ' || ch === '\r' || ch === '\n' || ch === '\x1b') {
      break;
    }
    const code = ch.charCodeAt(0) - 'a'.charCodeAt(0);
    if (code >= 0 && code < BOOL_OPTS.length) {
      const b = BOOL_OPTS[code];
      g[b.field] = !g[b.field];
      renderAll();
    } else {
      const strIdx = code - BOOL_OPTS.length;
      if (strIdx >= 0 && strIdx < STR_OPTS.length) {
        const s = STR_OPTS[strIdx];
        const row = 2 + BOOL_OPTS.length + 1 + strIdx;
        const prompt = `${s.label}: `;
        const col = 4 + 30 + 3;
        // Clear the value area and let user type
        const cur = g[s.field];
        let buf = cur;
        // Render inline input: re-draw with cursor at value position
        function renderInput() {
          const lineVal = `${String.fromCharCode('a'.charCodeAt(0) + code)}) ${s.label.padEnd(30)} : ${buf}_`;
          mvwaddstr(g.cw, row, 2, lineVal.padEnd(60));
          draw(g.cw);
        }
        renderInput();
        for (;;) {
          const ic = await readchar();
          if (ic === '\r' || ic === '\n') break;
          if (ic === '\x1b') { buf = cur; break; }
          if (ic === '\x7f' || ic === '\x08') { if (buf.length > 0) buf = buf.slice(0, -1); }
          else if (buf.length < 30) buf += ic;
          renderInput();
        }
        if (buf) g[s.field] = buf;
        renderAll();
      }
    }
  }

  saveOptions();
  wclear(g.cw);
  draw(g.cw);
}
