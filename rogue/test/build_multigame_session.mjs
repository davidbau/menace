#!/usr/bin/env node
/**
 * build_multigame_session.mjs — Build a multigame coverage session.
 *
 * Game 1: wizard mode, create/use items, walk to traps, fight, save.
 * Game 2: restore from save, more items, victory escape.
 *
 * Exercises loadGameState() (save.js restore path), be_trapped() (move.js),
 * killed() (fight.js), and other uncovered paths.
 *
 * Usage:
 *   node rogue/test/build_multigame_session.mjs
 */

{
  const _store = new Map();
  globalThis.localStorage = {
    getItem(key)        { return _store.has(key) ? _store.get(key) : null; },
    setItem(key, value) { _store.set(key, String(value)); },
    removeItem(key)     { _store.delete(key); },
    clear()             { _store.clear(); },
    get length()        { return _store.size; },
    key(i)              { return [..._store.keys()][i] ?? null; },
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
import { loadGameState, clearSave } from '../js/save.js';
import { resetStatus } from '../js/io.js';
import { resetGrpnum } from '../js/weapons.js';
import { resetBetween } from '../js/daemons.js';
import { draw } from '../js/curses.js';
import { MockDisplay } from './mock_display.mjs';
import { MockInput } from './mock_input.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED = 777;

class SessionDone extends Error {}

function hexChar(n) {
  return n < 10 ? String(n) : String.fromCharCode('a'.charCodeAt(0) + n - 10);
}

// Include trap chars: > { $ } ~ ` (TRAPDOOR, ARROWTRAP, SLEEPTRAP, BEARTRAP, TELTRAP, DARTTRAP)
const PASSABLE = '.#:+!?/=)*]^,%*>{$}~`';

function findPackLetter(type, which) {
  const g = game();
  let letter = 'a';
  let found = null;
  for (let item = g.pack; item !== null; item = item.l_next) {
    const obj = item.l_data;
    if (obj.o_type === type && (which === undefined || obj.o_which === which)) {
      found = letter;
    }
    letter = String.fromCharCode(letter.charCodeAt(0) + 1);
  }
  return found;
}

function findMonsterDir() {
  const g = game();
  const py = g.player.t_pos.y, px = g.player.t_pos.x;
  const dirs = [
    [-1,0,'k'],[1,0,'j'],[0,-1,'h'],[0,1,'l'],
    [-1,-1,'y'],[-1,1,'u'],[1,-1,'b'],[1,1,'n'],
  ];
  for (const [dy,dx,ch] of dirs) {
    let y = py+dy, x = px+dx;
    for (let i = 0; i < 12; i++) {
      if (y<1||y>=23||x<0||x>=80) break;
      if (g.mw[y][x] >= 'A' && g.mw[y][x] <= 'Z') return ch;
      const s = g.stdscr[y][x];
      if (s==='|'||s==='-'||s===' '||s==='+') break;
      y += dy; x += dx;
    }
  }
  return null;
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

    const moves = [
      [-1,-1,'y'],[-1,0,'k'],[-1,1,'u'],
      [0,-1,'h'],[0,1,'l'],
      [1,-1,'b'],[1,0,'j'],[1,1,'n'],
    ];
    for (const [dy, dx, ch] of moves) {
      const ny = cy + dy, nx = cx + dx;
      if (ny < 1 || ny >= 23 || nx < 1 || nx >= 79) continue;
      const key = ny * 80 + nx;
      if (visited.has(key)) continue;
      const cell = g.stdscr[ny][nx];
      if (!PASSABLE.includes(cell)) continue;
      if (dy !== 0 && dx !== 0) {
        const s1 = g.stdscr[cy + dy]?.[cx];
        const s2 = g.stdscr[cy]?.[cx + dx];
        if (!PASSABLE.includes(s1) || !PASSABLE.includes(s2)) continue;
      }
      visited.add(key);
      const newPath = [...path, ch];
      if (ny === ty && nx === tx) return newPath.join('');
      queue.push([ny, nx, newPath]);
    }
  }
  return '';
}

function createItem(type, which, blessing) {
  let keys = 'C' + type + hexChar(which);
  if (blessing !== undefined) keys += blessing;
  return keys;
}

function heal() {
  return createItem('!', 9) + (() => {  // Can't use closures in string concat
  })();
}

/**
 * Run one game using an action-based AI with game state access.
 * Returns { steps, keys } where steps is the step array.
 */
async function runGame(isRestore, wizard, seed, buildActions) {
  const display = new MockDisplay();
  const input = new MockInput();

  const g = new GameState();
  g.display = display; g.input = input; g.rawRngLog = [];
  g.suppressMore = true;
  if (wizard) { g.wizard = true; g.waswizard = true; }
  setGame(g);

  wireGameDeps(g);

  if (isRestore) {
    resetStatus(); resetGrpnum(); resetBetween();
    if (!loadGameState(g)) throw new Error('No save to restore');
    draw(g.cw);
    clearSave();
  } else {
    await startGameState(g, seed);
  }

  const actions = buildActions();
  const steps = [];
  let keyCount = 0;
  let pendingKey = null;
  let charQueue = [];
  let actionIdx = 0;

  input.getKey = async function () {
    const screen = display.getRows();
    const rng = [...g.rawRngLog];
    g.rawRngLog = [];

    if (pendingKey !== null) {
      steps.push({ key: pendingKey, rng, screen });
    }

    while (charQueue.length === 0) {
      if (actionIdx >= actions.length) throw new SessionDone();
      const result = actions[actionIdx++]();
      if (result && result.length > 0) {
        charQueue = [...result];
      }
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
    if (!(e instanceof SessionDone)) {
      console.error(`Game ended at step ${keyCount} (action ${actionIdx}/${actions.length}): ${e.message}`);
    }
  }

  if (pendingKey !== null) {
    steps.push({ key: pendingKey, rng: [...g.rawRngLog], screen: display.getRows() });
  }

  console.error(`  Game: ${steps.length} steps, ${keyCount} keys, ${actionIdx}/${actions.length} actions`);
  return steps;
}

function buildGame1Actions() {
  const actions = [];
  const a = (fn) => actions.push(fn);

  function heal() {
    a(() => createItem('!', 9));
    a(() => { const l = findPackLetter('!', 9); return l ? 'q' + l : '.'; });
  }

  // === Wizard setup ===
  a(() => '\x08');  // Ctrl-H (equips two-handed sword + plate mail)

  // Level up via P_RAISE potions (Ctrl-H check_level needs exp, but raise_level works)
  for (let i = 0; i < 8; i++) {
    a(() => createItem('!', 8));  // P_RAISE
    a(() => { const l = findPackLetter('!', 8); return l ? 'q' + l : '.'; });
  }
  // HP boost
  heal(); heal(); heal(); heal(); heal();

  // === Go to deeper level for traps (traps appear with rnd(10) < level) ===
  a(() => '\x04');  // Ctrl-D: go to level 2
  a(() => '\x04');  // Ctrl-D: go to level 3
  a(() => '\x04');  // Ctrl-D: go to level 4
  a(() => '\x04');  // Ctrl-D: go to level 5
  a(() => '\x04');  // Ctrl-D: go to level 6
  heal(); heal();

  // === Walk to traps using inside knowledge (be_trapped coverage) ===
  // Sort traps by distance, walk to closest 2-3
  a(() => {
    const g = game();
    const traps = [];
    for (let i = 0; i < g.ntraps; i++) traps.push(g.traps[i]);
    if (traps.length === 0) return '.';
    const py = g.player.t_pos.y, px = g.player.t_pos.x;
    traps.sort((a, b) =>
      (Math.abs(a.tr_pos.y - py) + Math.abs(a.tr_pos.x - px)) -
      (Math.abs(b.tr_pos.y - py) + Math.abs(b.tr_pos.x - px))
    );
    const path = walkTo(traps[0].tr_pos.y, traps[0].tr_pos.x);
    return path.length > 0 ? path : '.';
  });
  heal();

  // Walk to all traps on the level
  for (let trapIdx = 1; trapIdx < 5; trapIdx++) {
    a(() => {
      const g = game();
      const traps = [];
      for (let i = 0; i < g.ntraps; i++) traps.push(g.traps[i]);
      if (traps.length <= trapIdx) return '.';
      const py = g.player.t_pos.y, px = g.player.t_pos.x;
      traps.sort((a, b) =>
        (Math.abs(a.tr_pos.y - py) + Math.abs(a.tr_pos.x - px)) -
        (Math.abs(b.tr_pos.y - py) + Math.abs(b.tr_pos.x - px))
      );
      const path = walkTo(traps[trapIdx].tr_pos.y, traps[trapIdx].tr_pos.x);
      return path.length > 0 ? path : '.';
    });
    heal();
  }

  // === Fight monsters (killed() coverage) ===
  // Fight up to 3 monsters
  for (let fi = 0; fi < 3; fi++) {
    a(() => {
      const g = game();
      if (!g.mlist) return '.';
      // Find closest monster
      let closest = null, bestDist = Infinity;
      for (let m = g.mlist; m; m = m.l_next) {
        const d = Math.abs(m.l_data.t_pos.y - g.player.t_pos.y) +
                  Math.abs(m.l_data.t_pos.x - g.player.t_pos.x);
        if (d < bestDist) { bestDist = d; closest = m.l_data; }
      }
      if (!closest) return '.';
      const path = walkTo(closest.t_pos.y, closest.t_pos.x);
      if (path.length > 0 && path.length <= 20) {
        const last = path[path.length - 1];
        return path + last.repeat(12);
      }
      return '.';
    });
    heal();
  }

  // === Create some items for variety ===
  // A few potions not in the main session
  a(() => createItem('!', 3));  // P_STRENGTH
  a(() => { const l = findPackLetter('!', 3); return l ? 'q' + l : '.'; });

  // Create a ring and wear it (so save captures equipment state)
  a(() => createItem('=', 9, ''));  // R_REGEN
  a(() => { const l = findPackLetter('=', 9); return l ? 'P' + l + 'l' : '.'; });

  // === Search for secret doors ===
  a(() => {
    const g = game();
    for (let y = 1; y < 23; y++) {
      for (let x = 1; x < 79; x++) {
        if (g.stdscr[y][x] === '&') {
          for (const [ay, ax] of [[y-1,x],[y+1,x],[y,x-1],[y,x+1]]) {
            const ch = g.stdscr[ay]?.[ax];
            if (ch === '.' || ch === '#') {
              const path = walkTo(ay, ax);
              if (path.length > 0 && path.length <= 20) {
                return path + 'ssssssssss';
              }
            }
          }
        }
      }
    }
    return 'ss';
  });

  // === Save game ===
  a(() => 'Sy');

  return actions;
}

function buildGame2Actions() {
  const actions = [];
  const a = (fn) => actions.push(fn);

  function heal() {
    a(() => createItem('!', 9));
    a(() => { const l = findPackLetter('!', 9); return l ? 'q' + l : '.'; });
  }

  // After restore, player is wherever game 1 left them
  // Exercise more commands

  // === Wizard info commands ===
  a(() => '\x05');  // Ctrl-E: food_left
  a(() => '\x01');  // Ctrl-A: pack count
  a(() => '@');     // position

  // === Remove ring (ring_off coverage) ===
  a(() => 'Rl');  // remove ring, left hand

  // === Create and use a few more items ===
  a(() => createItem('?', 9));  // S_TELEP
  a(() => { const l = findPackLetter('?', 9); return l ? 'r' + l : '.'; });

  // === Some combat ===
  a(() => {
    const g = game();
    if (!g.mlist) return '.';
    const m = g.mlist.l_data;
    const path = walkTo(m.t_pos.y, m.t_pos.x);
    if (path.length > 0 && path.length <= 15) {
      const last = path[path.length - 1];
      return path + last.repeat(10);
    }
    return '.';
  });
  heal();

  // === Drop items to make room for amulet ===
  a(() => {
    const g = game();
    if (g.inpack >= 22) {
      let letter = 'a';
      for (let item = g.pack; item; item = item.l_next) {
        const obj = item.l_data;
        if (obj !== g.cur_weapon && obj !== g.cur_armor &&
            obj !== g.cur_ring[0] && obj !== g.cur_ring[1]) {
          return 'd' + letter;
        }
        letter = String.fromCharCode(letter.charCodeAt(0) + 1);
      }
    }
    return '.';
  });
  a(() => {
    const g = game();
    if (g.inpack >= 22) {
      let letter = 'a';
      for (let item = g.pack; item; item = item.l_next) {
        const obj = item.l_data;
        if (obj !== g.cur_weapon && obj !== g.cur_armor &&
            obj !== g.cur_ring[0] && obj !== g.cur_ring[1]) {
          return 'd' + letter;
        }
        letter = String.fromCharCode(letter.charCodeAt(0) + 1);
      }
    }
    return '.';
  });

  // === Create Amulet of Yendor ===
  a(() => 'C,0');

  // === Ensure on level 1 ===
  a(() => {
    const g = game();
    if (g.level > 1) return '\x15';  // Ctrl-U
    return '.';
  });
  a(() => {
    const g = game();
    if (g.level > 1) return '\x15';
    return '.';
  });

  // === Walk to stairs ===
  a(() => {
    const g = game();
    for (let y = 1; y < 23; y++) {
      for (let x = 1; x < 79; x++) {
        if (g.stdscr[y][x] === '%') {
          const path = walkTo(y, x);
          if (path.length > 0) return path;
        }
      }
    }
    return '.';
  });

  // === Victory! ===
  a(() => '<');

  // === Fallback quit ===
  a(() => 'Qy');

  return actions;
}

async function main() {
  // Game 1: fresh start, play, save
  console.error('Game 1: fresh start...');
  const game1Steps = await runGame(false, true, SEED, buildGame1Actions);

  // Game 2: restore from save, continue, win
  console.error('Game 2: restore from save...');
  const game2Steps = await runGame(true, true, SEED, buildGame2Actions);

  // Build multigame session JSON
  const session = {
    seed: SEED,
    wizard: true,
    games: [
      { seed: SEED, wizard: true, steps: game1Steps },
      { seed: SEED, wizard: true, restore: true, steps: game2Steps },
    ],
  };

  const outPath = join(__dirname, 'sessions', 'wizard_multigame_coverage.json');
  writeFileSync(outPath, JSON.stringify(session));
  console.log(`Wrote ${outPath}`);
  console.error(`Total: ${game1Steps.length + game2Steps.length} steps across 2 games`);
}

main().catch(e => { console.error(e.stack); process.exit(1); });
