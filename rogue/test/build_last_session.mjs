#!/usr/bin/env node
/**
 * build_last_session.mjs — Final coverage session.
 *
 * Targets:
 *   sticks.js:247-259 — haste/slow wand hitting monster in line-of-sight
 *   misc.js:393-396   — add_haste exhaustion (drink haste twice)
 *   fight.js:492-503  — is_magic() all branches (via P_TFIND)
 *   rings.js:147-159  — get_str() backspace/ESC in ring naming
 *   fight.js:468-474  — thunk() for non-weapon thrown
 *   fight.js:480-486  — bounce() for non-weapon miss
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
const SEED = 222;

class SessionDone extends Error {}

function hexChar(n) { return n < 10 ? String(n) : String.fromCharCode(97 + n - 10); }
const PASSABLE = '.#:+!?/=)*]^,%*>{$}~`&';

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

function walkTo(ty, tx) {
  const g = game();
  const sy = g.player.t_pos.y, sx = g.player.t_pos.x;
  if (sy === ty && sx === tx) return '';
  const visited = new Set();
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

// Find a cardinal direction (h/j/k/l) with a monster in line-of-sight.
// For haste/slow wands: scan from player in direction until non-step_ok,
// check if that cell has a monster on mw.
function findCardinalMonsterDir() {
  const g = game();
  const py = g.player.t_pos.y, px = g.player.t_pos.x;
  for (const [dy, dx, ch] of [[-1,0,'k'],[1,0,'j'],[0,-1,'h'],[0,1,'l']]) {
    let y = py + dy, x = px + dx;
    // Scan until non-passable
    while (y >= 1 && y < 23 && x >= 0 && x < 80) {
      const mch = g.mw[y]?.[x];
      if (mch >= 'A' && mch <= 'Z') return ch;  // Monster found in line
      const sch = g.stdscr[y][x];
      if (sch === '|' || sch === '-' || sch === ' ' || sch === '+') break;
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
    if (ny>=0 && ny<24 && nx>=0 && nx<80 && g.mw[ny]?.[nx] >= 'A' && g.mw[ny]?.[nx] <= 'Z')
      return ch;
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
  a(() => '\x08');  // Ctrl-H
  for (let i = 0; i < 12; i++) {
    a(() => createItem('!', 8));
    a(() => { const l = findPackLetter('!', 8); return l ? 'q' + l : '.'; });
  }
  for (let i = 0; i < 6; i++) heal();

  // ================================================================
  // HASTE EXHAUSTION (misc.js:393-396)
  // Drink P_HASTE, then immediately drink another P_HASTE.
  // Second one while ISHASTE is active → "You faint from exhaustion."
  // ================================================================
  a(() => createItem('!', 10));  // P_HASTE #1
  a(() => { const l = findPackLetter('!', 10); return l ? 'q' + l : '.'; });
  // Immediately create and drink second haste potion (ISHASTE still active)
  a(() => createItem('!', 10));  // P_HASTE #2
  a(() => { const l = findPackLetter('!', 10); return l ? 'q' + l : '.'; });
  heal();

  // ================================================================
  // RINGS get_str (rings.js:147-159)
  // Enable askme, put on unknown ring → naming prompt → exercise get_str
  // ================================================================
  a(() => { game().askme = true; return '.'; });
  // Ring with backspace in naming
  a(() => createItem('=', 12));  // R_STEALTH
  a(() => {
    const l = findPackLetter('=', 12);
    if (!l) return '.';
    // Put on left, then naming: type "xy", backspace, "z", Enter → "xz"
    return 'P' + l + 'l' + 'xy\x7fz\n';
  });
  a(() => 'Rl');  // Remove
  // Ring with ESC in naming (returns null, no name set)
  a(() => createItem('=', 3));  // R_SEARCH
  a(() => {
    const l = findPackLetter('=', 3);
    if (!l) return '.';
    return 'P' + l + 'l' + '\x1b';  // ESC cancels naming
  });
  a(() => 'Rl');
  a(() => { game().askme = false; return '.'; });

  // ================================================================
  // HASTE/SLOW WAND AT MONSTER (sticks.js:247-259)
  // Go to level with monsters, find one in cardinal direction, zap.
  // Need to be in same room/corridor with clear line of sight.
  // ================================================================
  // Go to level 5 for more monsters
  a(() => '\x04'); a(() => '\x04'); a(() => '\x04'); a(() => '\x04');
  heal();

  // Walk close to a monster first, then zap
  a(() => {
    const g = game();
    for (let m = g.mlist; m; m = m.l_next) {
      const my = m.l_data.t_pos.y, mx = m.l_data.t_pos.x;
      // Try to get into same row or column as monster, 2-5 cells away
      for (const [dy, dx] of [[0,1],[0,-1],[1,0],[-1,0]]) {
        for (let dist = 2; dist <= 5; dist++) {
          const ty = my + dy * dist, tx = mx + dx * dist;
          if (ty < 1 || ty >= 23 || tx < 1 || tx >= 79) continue;
          if (!'.#'.includes(g.stdscr[ty][tx])) continue;
          const path = walkTo(ty, tx);
          if (path.length > 0 && path.length <= 20) return path;
        }
      }
    }
    return '\x14';  // teleport if no good position
  });

  // Now zap haste wand — findCardinalMonsterDir should find it
  a(() => createItem('/', 7));  // WS_HASTE_M
  a(() => {
    const l = findPackLetter('/', 7);
    const d = findCardinalMonsterDir();
    if (l && d) return 'z' + l + d;
    return '.';
  });

  // Zap slow wand at same or different monster
  a(() => createItem('/', 8));  // WS_SLOW_M
  a(() => {
    const l = findPackLetter('/', 8);
    const d = findCardinalMonsterDir();
    if (l && d) return 'z' + l + d;
    return '.';
  });
  heal();

  // Try on next level too
  a(() => '\x04');
  heal();
  a(() => {
    const g = game();
    for (let m = g.mlist; m; m = m.l_next) {
      const my = m.l_data.t_pos.y, mx = m.l_data.t_pos.x;
      for (const [dy, dx] of [[0,1],[0,-1],[1,0],[-1,0]]) {
        for (let dist = 2; dist <= 5; dist++) {
          const ty = my + dy * dist, tx = mx + dx * dist;
          if (ty < 1 || ty >= 23 || tx < 1 || tx >= 79) continue;
          if (!'.#'.includes(g.stdscr[ty][tx])) continue;
          const path = walkTo(ty, tx);
          if (path.length > 0 && path.length <= 20) return path;
        }
      }
    }
    return '\x14';
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
  heal();

  // Third attempt with teleport
  for (let attempt = 0; attempt < 3; attempt++) {
    a(() => {
      const d = findCardinalMonsterDir();
      if (d) return '.';
      return '\x14';  // teleport until we have line-of-sight
    });
  }
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
  heal();

  // ================================================================
  // P_TFIND — treasure find potion (fight.js is_magic coverage)
  // Need magic items on floor or in monster packs
  // ================================================================
  a(() => createItem('!', 7));  // P_TFIND
  a(() => { const l = findPackLetter('!', 7); return l ? 'q' + l : '.'; });

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
