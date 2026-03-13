/**
 * deepbot.mjs — Bot that navigates to deep dungeon levels via real JS game state.
 *
 * Usage:
 *   node hack/test/deepbot.mjs --seed N --depth D [--target MLET] [--maxsteps N]
 *
 * Strategy:
 *   1. Navigate to down stairs using BFS on the levl grid
 *   2. Descend until dlevel >= targetDepth
 *   3. If --target mlet given, hunt that monster type
 *   4. Print keystroke sequence to stdout (for C harness rerecording)
 *
 * Because we use real JS game state (g.u.ux/uy, g.levl, g.xdnstair etc.)
 * navigation is exact — no screen parsing needed.
 */

// localStorage mock
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

import { GameState, makeObj, makeMonst } from '../js/game.js';
import { game, setGame } from '../js/gstate.js';
import { _setPriDeps, newsym } from '../js/pri.js';
import { _setMonDeps, g_at_mon, g_at_gen, g_at_obj, killed, rloc, mnexto, newcham, poisoned } from '../js/mon.js';
import { _setHackDeps, setsee, tele, nomul, amon, attmon } from '../js/hack.js';
import { _setDo1Deps, dosearch, buzz } from '../js/do1.js';
import { setRhack, gameLoop, GameOver, losestr, ndaminc, dodown, doup } from '../js/main.js';
import { rhack } from '../js/do.js';
import { docrt } from '../js/pri.js';
import { mon } from '../js/data.js';

import { MockDisplay } from './mock_display.mjs';
import { MockInput } from './mock_input.mjs';

// ===== Dependency wiring =====
function wireDeps() {
  _setPriDeps(
    (x, y, list) => {
      if (!list) return null;
      if ('gx' in list) return g_at_gen(x, y, list);
      if ('ox' in list) return g_at_obj(x, y, list);
      if ('mx' in list) return g_at_mon(x, y, list);
      return null;
    },
    newsym, setsee
  );
  _setMonDeps({ setsee, tele, nomul, killed, rloc, newcham, mnexto, attmon, amon, buzz, dosearch, losestr, ndaminc, docrt });
  _setDo1Deps(nomul);
  _setHackDeps({ dodown, doup, docrt, poisoned });
  setRhack(rhack);
}

// ===== BFS pathfinding on game.levl =====
// Respects Hack's movement rules:
//   - Destination must be DOOR(3), CORR(4), or ROOM(5)
//   - Diagonal moves are blocked if source OR destination is DOOR(3)
// Returns first step direction key, or null if unreachable.
function bfsKey(g, tx, ty) {
  const { ux, uy } = g.u;

  const COLNO = 80, ROWNO = 22;
  const visited = new Set();
  const queue = [{ x: ux, y: uy, firstKey: null }];
  visited.add(`${ux},${uy}`);

  // Direction map: key → [dx, dy]
  const dirs = [
    ['h', -1, 0], ['l', 1, 0], ['k', 0, -1], ['j', 0, 1],
    ['y', -1, -1], ['u', 1, -1], ['b', -1, 1], ['n', 1, 1],
  ];

  while (queue.length) {
    const { x, y, firstKey } = queue.shift();
    const srcTyp = g.levl[x] && g.levl[x][y] ? g.levl[x][y].typ : 0;
    for (const [key, dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= COLNO || ny < 0 || ny >= ROWNO) continue;
      const cell = g.levl[nx] && g.levl[nx][ny];
      if (!cell) continue;
      // Destination must be DOOR(3), CORR(4), or ROOM(5)
      const t = cell.typ;
      if (t < 3) continue;
      // Diagonal into/from DOOR is blocked (hack.js line 176)
      // Check BEFORE marking visited so orthogonal path can still reach the cell
      if (dx && dy && (t === 3 || srcTyp === 3)) continue;
      const k = `${nx},${ny}`;
      if (visited.has(k)) continue;
      visited.add(k);
      const fk = firstKey || key;
      if (nx === tx && ny === ty) return fk;
      queue.push({ x: nx, y: ny, firstKey: fk });
    }
  }
  return null; // unreachable
}

// ===== Find a monster of given mlet =====
function findMonster(g, mlet) {
  let m = g.fmon;
  while (m) {
    if (m.data && m.data.mlet === mlet && m.mx > 0 && m.my > 0) return m;
    m = m.nmon;
  }
  return null;
}

// ===== Find nearest unvisited reachable cell (for full exploration) =====
// Returns first-step key toward nearest unvisited passable cell, or null if all visited.
function exploreKey(g, visited) {
  const { ux, uy } = g.u;
  const COLNO = 80, ROWNO = 22;
  const queue = [{ x: ux, y: uy, firstKey: null }];
  const seen = new Set([`${ux},${uy}`]);
  const dirs = [
    ['h', -1, 0], ['l', 1, 0], ['k', 0, -1], ['j', 0, 1],
    ['y', -1, -1], ['u', 1, -1], ['b', -1, 1], ['n', 1, 1],
  ];
  while (queue.length) {
    const { x, y, firstKey } = queue.shift();
    const srcTyp = g.levl[x]?.[y]?.typ ?? 0;
    for (const [key, dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= COLNO || ny < 0 || ny >= ROWNO) continue;
      const cell = g.levl[nx]?.[ny];
      if (!cell) continue;
      const t = cell.typ;
      if (t < 3) continue;
      if (dx && dy && (t === 3 || srcTyp === 3)) continue;
      const k = `${nx},${ny}`;
      if (seen.has(k)) continue;
      seen.add(k);
      const fk = firstKey || key;
      if (!visited.has(k)) return fk; // found an unvisited cell
      queue.push({ x: nx, y: ny, firstKey: fk });
    }
  }
  return null; // all reachable cells visited
}

// ===== Parse args =====
const args = process.argv.slice(2);
function getArg(name, def) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
}
const seed = parseInt(getArg('--seed', '42'));
const targetDepth = parseInt(getArg('--depth', '6'));
const targetMlet = getArg('--target', null);
const maxSteps = parseInt(getArg('--maxsteps', '2000'));

// ===== Run bot =====
wireDeps();
const display = new MockDisplay();
const input = new MockInput();
const g = new GameState();
g.display = display;
g.input = input;
g.rawRngLog = [];
setGame(g);

const keyLog = [];
let stepCount = 0;
let lastDepth = 1;
let stuckCount = 0;
let lastPos = null;
let huntMode = false;
// Per-level visited cell sets for exploration (keyed by dlevel)
const exploredByLevel = new Map();

class BotDone extends Error {}

input.getKey = async function () {
  if (stepCount >= maxSteps) throw new BotDone();
  stepCount++;

  const u = g.u;
  const depth = g.dlevel;

  let key;

  if (depth < targetDepth) {
    // Navigate straight to down stairs
    huntMode = false;
    if (depth !== lastDepth) {
      process.stderr.write(`  Descended to level ${depth}\n`);
      lastDepth = depth;
    }
    if (u.ux === g.xdnstair && u.uy === g.ydnstair) {
      key = '>'; // at stairs — descend
    } else {
      const k = bfsKey(g, g.xdnstair, g.ydnstair);
      key = k || 'hjkl'[stepCount % 4];
    }
  } else {
    // At target depth — explore entire level to wake and fight all monsters
    huntMode = true;
    if (depth !== lastDepth) {
      process.stderr.write(`  Descended to level ${depth}\n`);
      lastDepth = depth;
    }

    // Maintain per-level visited set
    if (!exploredByLevel.has(depth)) exploredByLevel.set(depth, new Set());
    const visited = exploredByLevel.get(depth);
    visited.add(`${u.ux},${u.uy}`);

    // Priority 1: hunt specific target monster if given
    if (targetMlet) {
      const mon = findMonster(g, targetMlet);
      if (mon) {
        const k = bfsKey(g, mon.mx, mon.my);
        key = k || 'hjkl'[stepCount % 4];
      } else {
        // Explore to find it
        const k = exploreKey(g, visited);
        if (k) {
          key = k;
        } else {
          // Explored all, descend further if possible
          if (u.ux === g.xdnstair && u.uy === g.ydnstair) key = '>';
          else { const kd = bfsKey(g, g.xdnstair, g.ydnstair); key = kd || 'hjkl'[stepCount % 4]; }
        }
      }
    } else {
      // No specific target: explore entire level, then descend
      const k = exploreKey(g, visited);
      if (k) {
        key = k;
      } else {
        // Level fully explored — descend
        if (u.ux === g.xdnstair && u.uy === g.ydnstair) {
          key = '>';
        } else {
          const kd = bfsKey(g, g.xdnstair, g.ydnstair);
          key = kd || 'hjkl'[stepCount % 4];
        }
      }
    }
  }

  // Detect stuck (same position for 20 steps) → random escape
  const pos = `${u.ux},${u.uy}`;
  if (pos === lastPos) {
    stuckCount++;
    if (stuckCount > 20) {
      key = 'hjklyubn'[stepCount % 8];
      stuckCount = 0;
    }
  } else {
    stuckCount = 0;
    lastPos = pos;
  }

  keyLog.push(key);
  return key;
};

process.stderr.write(`Bot: seed=${seed} targetDepth=${targetDepth} targetMlet=${targetMlet}\n`);

try {
  await gameLoop(seed);
} catch (e) {
  if (!(e instanceof BotDone) && !(e instanceof GameOver)) throw e;
  if (e instanceof GameOver) process.stderr.write(`  Game over: ${e.reason}\n`);
}

const keys = keyLog.join('');
process.stderr.write(`Bot done: ${stepCount} steps, depth=${g.dlevel}\n`);
process.stdout.write(keys);
