#!/usr/bin/env node
/**
 * build_last_session.mjs — Comprehensive final coverage session.
 *
 * Targets all remaining gaps with reliable strategies:
 *   misc.js:371-379  — search finding trap (walk adjacent, avoid stepping on it)
 *   sticks.js:247-259 — haste/slow wand hitting monster
 *   rings.js:147-159  — get_str backspace/ESC in naming
 *   fight.js:468-486  — thunk/bounce for bare-fist attacks
 *   fight.js:492-503  — is_magic via P_TFIND
 */

{
  const _store = new Map();
  globalThis.localStorage = {
    getItem(key) { return _store.has(key) ? _store.get(key) : null; },
    setItem(key, value) { _store.set(key, String(value)); },
    removeItem(key) { _store.delete(key); },
    clear() { _store.clear(); },
    get length() { return _store.size; },
    key(i) { return [..._store.keys()][i] ?? null; },
  };
}

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { GameState } from '../js/game.js';
import { game, setGame } from '../js/gstate.js';
import { command } from '../js/command.js';
import { roomin } from '../js/rooms.js';
import { wireGameDeps, startGameState } from '../js/main.js';
import { MockDisplay } from './mock_display.mjs';
import { MockInput } from './mock_input.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED = 111;

class SessionDone extends Error {}

function hexChar(n) { return n < 10 ? String(n) : String.fromCharCode(97 + n - 10); }

function findPackLetter(type, which) {
  const g = game();
  let letter = 'a', found = null;
  for (let item = g.pack; item; item = item.l_next) {
    if (item.l_data.o_type === type && (which === undefined || item.l_data.o_which === which))
      found = letter;
    letter = String.fromCharCode(letter.charCodeAt(0) + 1);
  }
  return found;
}

// BFS walkTo with optional set of excluded cells
function walkTo(ty, tx, exclude) {
  const PASSABLE = '.#:+!?/=)*]^,%*>{$}~`&';
  const g = game();
  const sy = g.player.t_pos.y, sx = g.player.t_pos.x;
  if (sy === ty && sx === tx) return '';
  const visited = new Set();
  if (exclude) for (const k of exclude) visited.add(k);
  const queue = [[sy, sx, []]];
  visited.add(sy * 80 + sx);
  while (queue.length > 0) {
    const [cy, cx, path] = queue.shift();
    if (path.length > 60) continue;
    for (const [dy, dx, ch] of [[-1,-1,'y'],[-1,0,'k'],[-1,1,'u'],[0,-1,'h'],[0,1,'l'],[1,-1,'b'],[1,0,'j'],[1,1,'n']]) {
      const ny = cy + dy, nx = cx + dx;
      if (ny < 1 || ny >= 23 || nx < 1 || nx >= 79) continue;
      const key = ny * 80 + nx;
      if (visited.has(key)) continue;
      const cell = g.stdscr[ny][nx];
      if (!PASSABLE.includes(cell)) continue;
      if (dy !== 0 && dx !== 0) {
        if (!PASSABLE.includes(g.stdscr[cy+dy]?.[cx] || ' ') || !PASSABLE.includes(g.stdscr[cy]?.[cx+dx] || ' ')) continue;
      }
      visited.add(key);
      const np = [...path, ch];
      if (ny === ty && nx === tx) return np.join('');
      queue.push([ny, nx, np]);
    }
  }
  return '';
}

function findCardinalMonsterDir() {
  const g = game();
  const py = g.player.t_pos.y, px = g.player.t_pos.x;
  for (const [dy, dx, ch] of [[-1,0,'k'],[1,0,'j'],[0,-1,'h'],[0,1,'l']]) {
    let y = py + dy, x = px + dx;
    while (y >= 1 && y < 23 && x >= 0 && x < 80) {
      if (g.mw[y]?.[x] >= 'A' && g.mw[y]?.[x] <= 'Z') return ch;
      const s = g.stdscr[y][x];
      if (s === '|' || s === '-' || s === ' ' || s === '+') break;
      y += dy; x += dx;
    }
  }
  return null;
}

function adjacentMonsterDir() {
  const g = game();
  const py = g.player.t_pos.y, px = g.player.t_pos.x;
  for (const [dy,dx,ch] of [[-1,0,'k'],[1,0,'j'],[0,-1,'h'],[0,1,'l'],[-1,-1,'y'],[-1,1,'u'],[1,-1,'b'],[1,1,'n']]) {
    const ny = py+dy, nx = px+dx;
    if (g.mw[ny]?.[nx] >= 'A' && g.mw[ny]?.[nx] <= 'Z') return ch;
  }
  return null;
}

function createItem(type, which, blessing) {
  let k = 'C' + type + hexChar(which);
  if (blessing !== undefined) k += blessing;
  return k;
}

function buildActions() {
  const actions = [];
  const a = (fn) => actions.push(fn);

  function heal() {
    a(() => createItem('!', 9));
    a(() => { const l = findPackLetter('!', 9); return l ? 'q' + l : '.'; });
  }

  // ================================================================
  // SETUP
  // ================================================================
  a(() => '\x08');
  for (let i = 0; i < 12; i++) {
    a(() => createItem('!', 8));
    a(() => { const l = findPackLetter('!', 8); return l ? 'q' + l : '.'; });
  }
  for (let i = 0; i < 6; i++) heal();

  // ================================================================
  // 1. HASTE EXHAUSTION (misc.js:393-396)
  // ================================================================
  a(() => createItem('!', 10));
  a(() => { const l = findPackLetter('!', 10); return l ? 'q' + l : '.'; });
  a(() => createItem('!', 10));
  a(() => { const l = findPackLetter('!', 10); return l ? 'q' + l : '.'; });
  heal();

  // ================================================================
  // 2. RINGS get_str — backspace and ESC (rings.js:147-159)
  // ================================================================

  a(() => createItem('=', 12));  // R_STEALTH (unknown)
  a(() => {
    const l = findPackLetter('=', 12);
    return l ? 'P' + l + 'l' + 'xy\x7fz\n' : '.';  // backspace test
  });
  a(() => 'Rl');
  a(() => createItem('=', 3));  // R_SEARCH (unknown)
  a(() => {
    const l = findPackLetter('=', 3);
    return l ? 'P' + l + 'l' + '\x1b' : '.';  // ESC test
  });
  a(() => 'Rl');


  // ================================================================
  // 3. SEARCH FINDING TRAP (misc.js:371-379)
  // Go deep (level 10+), find trap, walk ADJACENT (excluding trap cell
  // from BFS to avoid stepping on it), search repeatedly.
  // ================================================================
  for (let i = 0; i < 9; i++) a(() => '\x04');
  heal();

  // Try across multiple levels
  for (let levelTry = 0; levelTry < 4; levelTry++) {
    a(() => {
      const g = game();
      for (let i = 0; i < g.ntraps; i++) {
        const t = g.traps[i];
        if (t.tr_flags & 0o000010) continue;  // ISFOUND
        const ty = t.tr_pos.y, tx = t.tr_pos.x;
        const trapKey = ty * 80 + tx;
        // Find adjacent floor cell, walk there AVOIDING the trap cell
        for (const [dy,dx] of [[-1,0],[1,0],[0,-1],[0,1]]) {
          const ay = ty+dy, ax = tx+dx;
          if (ay < 1 || ay >= 23 || ax < 1 || ax >= 79) continue;
          const ch = g.stdscr[ay][ax];
          if (ch === '.' || ch === '#') {
            const path = walkTo(ay, ax, new Set([trapKey]));
            if (path.length > 0 && path.length <= 25) {
              console.error(`  Found unfound trap at ${ty},${tx}, walking to ${ay},${ax} (${path.length} steps)`);
              return path + 'ssssssssssssssssssssssssssssssssss';
            }
          }
        }
      }
      console.error(`  No reachable unfound trap on level ${g.level}`);
      return '\x04';  // go deeper
    });
    heal();
  }

  // ================================================================
  // 4. HASTE/SLOW WAND AT MONSTER (sticks.js:247-259)
  // Position in same row/column as monster, then zap.
  // ================================================================
  a(() => '\x04');
  heal();

  for (let attempt = 0; attempt < 4; attempt++) {
    a(() => {
      const g = game();
      // Find a monster and position in same row or column, 2-5 cells away
      for (let m = g.mlist; m; m = m.l_next) {
        const my = m.l_data.t_pos.y, mx = m.l_data.t_pos.x;
        for (const [dy, dx] of [[0,1],[0,-1],[1,0],[-1,0]]) {
          for (let dist = 2; dist <= 6; dist++) {
            const ty = my + dy * dist, tx = mx + dx * dist;
            if (ty < 1 || ty >= 23 || tx < 1 || tx >= 79) continue;
            if (!'.#'.includes(g.stdscr[ty][tx])) continue;
            const path = walkTo(ty, tx);
            if (path.length > 0 && path.length <= 18) return path;
          }
        }
      }
      return '\x14';  // teleport
    });
    a(() => createItem('/', 7));
    a(() => {
      const l = findPackLetter('/', 7);
      const d = findCardinalMonsterDir();
      return (l && d) ? 'z' + l + d : '.';
    });
    a(() => createItem('/', 8));
    a(() => {
      const l = findPackLetter('/', 8);
      const d = findCardinalMonsterDir();
      return (l && d) ? 'z' + l + d : '.';
    });
  }
  heal();

  // ================================================================
  // 5. P_TFIND for is_magic (fight.js:492-503)
  // ================================================================
  a(() => createItem('!', 7));
  a(() => { const l = findPackLetter('!', 7); return l ? 'q' + l : '.'; });

  // ================================================================
  // 6. BARE-FIST COMBAT (fight.js thunk/bounce non-weapon)
  // Drop weapon, fight monster with bare hands
  // ================================================================
  a(() => {
    const g = game();
    if (g.cur_weapon) {
      let letter = 'a';
      for (let item = g.pack; item; item = item.l_next) {
        if (item.l_data === g.cur_weapon) return 'd' + letter;
        letter = String.fromCharCode(letter.charCodeAt(0) + 1);
      }
    }
    return '.';
  });
  // Walk to nearest monster and punch it
  a(() => {
    const g = game();
    let best = null, bestDist = Infinity;
    for (let m = g.mlist; m; m = m.l_next) {
      const d = Math.abs(m.l_data.t_pos.y - g.player.t_pos.y) + Math.abs(m.l_data.t_pos.x - g.player.t_pos.x);
      if (d < bestDist) { bestDist = d; best = m.l_data; }
    }
    if (!best) return '.';
    const path = walkTo(best.t_pos.y, best.t_pos.x);
    if (path.length > 0 && path.length <= 20) {
      const last = path[path.length - 1];
      return path + last.repeat(15);
    }
    return '\x14';
  });
  heal();

  // ================================================================
  // QUIT
  // ================================================================
  a(() => 'Qy');

  return actions;
}

async function main() {
  const display = new MockDisplay();
  const input = new MockInput();
  const g = new GameState();
  g.display = display; g.input = input; g.rawRngLog = [];
  g.suppressMore = true;
  g.wizard = true; g.waswizard = true;
  setGame(g);
  wireGameDeps(g);
  await startGameState(g, SEED);

  const actions = buildActions();
  const steps = [];
  let keyCount = 0, pendingKey = null, charQueue = [], actionIdx = 0;

  input.getKey = async function () {
    const screen = display.getRows();
    const rng = [...g.rawRngLog];
    g.rawRngLog = [];
    if (pendingKey !== null) steps.push({ key: pendingKey, rng, screen });
    while (charQueue.length === 0) {
      if (actionIdx >= actions.length) throw new SessionDone();
      const result = actions[actionIdx++]();
      if (result && result.length > 0) charQueue = [...result];
    }
    const key = charQueue.shift();
    pendingKey = key;
    keyCount++;
    return key;
  };

  try {
    g.oldpos = { x: g.player.t_pos.x, y: g.player.t_pos.y };
    g.oldrp = roomin(g.player.t_pos);
    while (g.playing) await command();
  } catch (e) {
    if (!(e instanceof SessionDone))
      console.error(`Ended at step ${keyCount} (action ${actionIdx}/${actions.length}): ${e.message}`);
  }

  if (pendingKey !== null)
    steps.push({ key: pendingKey, rng: [...g.rawRngLog], screen: display.getRows() });

  console.error(`Session: ${steps.length} steps, ${actionIdx}/${actions.length} actions`);

  const session = { seed: SEED, wizard: true, coverage_only: true, steps };
  const outPath = join(__dirname, 'sessions', 'wizard_last_coverage.json');
  writeFileSync(outPath, JSON.stringify(session));
  console.log(`Wrote ${outPath} (${steps.length} steps)`);
}

main().catch(e => { console.error(e.stack); process.exit(1); });
