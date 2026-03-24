#!/usr/bin/env node
/**
 * build_victory_session.mjs — Short session: setup + victory escape.
 *
 * Exercises rip.js total_winner() (lines 104-207) and score.js addScore.
 * Kept very short (<50 steps) to avoid daemon timing drift.
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
const SEED = 42;  // Player at (5,31), stairs at (5,17) — distance 14

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

function findFirstUnequippedLetter() {
  const g = game();
  let letter = 'a';
  for (let item = g.pack; item; item = item.l_next) {
    const obj = item.l_data;
    if (obj !== g.cur_weapon && obj !== g.cur_armor &&
        obj !== g.cur_ring[0] && obj !== g.cur_ring[1]) return letter;
    letter = String.fromCharCode(letter.charCodeAt(0) + 1);
  }
  return null;
}

function walkTo(ty, tx) {
  const g = game();
  if (g.player.t_pos.y === ty && g.player.t_pos.x === tx) return '';
  const visited = new Set();
  const queue = [[g.player.t_pos.y, g.player.t_pos.x, []]];
  visited.add(g.player.t_pos.y * 80 + g.player.t_pos.x);
  while (queue.length > 0) {
    const [cy, cx, path] = queue.shift();
    if (path.length > 60) continue;
    for (const [dy, dx, ch] of [[-1,-1,'y'],[-1,0,'k'],[-1,1,'u'],[0,-1,'h'],[0,1,'l'],[1,-1,'b'],[1,0,'j'],[1,1,'n']]) {
      const ny = cy+dy, nx = cx+dx;
      if (ny<1||ny>=23||nx<1||nx>=79) continue;
      const key = ny*80+nx;
      if (visited.has(key)) continue;
      if (!PASSABLE.includes(g.stdscr[ny][nx])) continue;
      if (dy!==0&&dx!==0&&(!PASSABLE.includes(g.stdscr[cy+dy]?.[cx]||' ')||!PASSABLE.includes(g.stdscr[cy]?.[cx+dx]||' '))) continue;
      visited.add(key);
      const np = [...path, ch];
      if (ny===ty&&nx===tx) return np.join('');
      queue.push([ny, nx, np]);
    }
  }
  return '';
}

function createItem(type, which, blessing) {
  let k = 'C' + type + hexChar(which);
  if (blessing !== undefined) k += blessing;
  return k;
}

function buildActions() {
  const actions = [];
  const a = (fn) => actions.push(fn);

  // Ctrl-H: get equipment
  a(() => '\x08');

  // Create a few items so total_winner has things to tally
  // (weapon, armor, potion, scroll, ring, stick — one of each for all item type branches)
  a(() => createItem(')', 2, '+'));  // blessed bow
  a(() => createItem(']', 3, '+'));  // blessed studded leather
  a(() => createItem('!', 3));      // P_STRENGTH potion
  a(() => createItem('?', 0));      // S_CONFUSE scroll
  a(() => createItem('=', 1, '+'));  // R_ADDSTR ring
  a(() => createItem('/', 0));      // WS_LIGHT stick

  // Drop items to make room for amulet (pack starts with sword+plate from Ctrl-H + 6 created = 8)
  // MAXPACK is 23, we're at 8, plenty of room

  // Create Amulet of Yendor
  a(() => 'C,0');

  // Verify amulet was created
  a(() => {
    const g = game();
    if (!g.amulet) console.error('WARNING: amulet not created!');
    return '.';
  });

  // Walk to stairs using BFS on stdscr.
  // The path is deterministic — same in C and JS.
  a(() => {
    const g = game();
    for (let y = 1; y < 23; y++)
      for (let x = 1; x < 79; x++)
        if (g.stdscr[y][x] === '%') {
          const path = walkTo(y, x);
          if (path.length > 0) {
            console.error(`Walk to stairs (${y},${x}): ${path.length} steps`);
            return path;
          }
        }
    console.error('No path to stairs!');
    return '.';
  });

  // Now on stairs — go up with amulet → total_winner()!
  a(() => '<');

  // Fallback quit
  a(() => 'Qy');

  return actions;
}

async function main() {
  const display = new MockDisplay();
  const input = new MockInput();
  const g = new GameState();
  g.display = display; g.input = input; g.rawRngLog = [];
  g.suppressMore = true; g.wizard = true; g.waswizard = true;
  setGame(g); wireGameDeps(g); await startGameState(g, SEED);

  const actions = buildActions();
  const steps = [];
  let keyCount = 0, pendingKey = null, charQueue = [], actionIdx = 0;

  input.getKey = async function () {
    const screen = display.getRows();
    const rng = [...g.rawRngLog]; g.rawRngLog = [];
    if (pendingKey !== null) steps.push({ key: pendingKey, rng, screen });
    while (charQueue.length === 0) {
      if (actionIdx >= actions.length) throw new SessionDone();
      const result = actions[actionIdx++]();
      if (result && result.length > 0) charQueue = [...result];
    }
    const key = charQueue.shift();
    pendingKey = key; keyCount++;
    return key;
  };

  try {
    g.oldpos = { x: g.player.t_pos.x, y: g.player.t_pos.y };
    g.oldrp = roomin(g.player.t_pos);
    while (g.playing) await command();
  } catch (e) {
    if (!(e instanceof SessionDone))
      console.error(`Ended at step ${keyCount}: ${e.message}`);
  }
  if (pendingKey !== null)
    steps.push({ key: pendingKey, rng: [...g.rawRngLog], screen: display.getRows() });

  console.error(`Session: ${steps.length} steps, playing=${g.playing}`);
  const session = { seed: SEED, wizard: true, steps };
  const outPath = join(__dirname, 'sessions', 'wizard_victory.json');
  writeFileSync(outPath, JSON.stringify(session));
  console.log(`Wrote ${outPath} (${steps.length} steps)`);
}

main().catch(e => { console.error(e.stack); process.exit(1); });
