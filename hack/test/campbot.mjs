/**
 * campbot.mjs — Navigate to target depth, hunt target monster, camp adjacent to it.
 * Uses full map knowledge (including secret doors) for pathfinding.
 * When the path crosses a secret door, searches to reveal it first.
 *
 * Usage:
 *   node hack/test/campbot.mjs --seed N --depth D --target MLET [--campturns N] [--maxsteps N]
 */
{
  const _store = new Map();
  globalThis.localStorage = {
    getItem(k)    { return _store.has(k) ? _store.get(k) : null; },
    setItem(k, v) { _store.set(k, String(v)); },
    removeItem(k) { _store.delete(k); },
    clear()       { _store.clear(); },
    get length()  { return _store.size; },
    key(i)        { return [..._store.keys()][i] ?? null; },
  };
}

import { GameState } from '../js/game.js';
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

function wireDeps() {
  _setPriDeps(
    (x, y, list) => {
      if (!list) return null;
      if ('gx' in list) return g_at_gen(x, y, list);
      if ('ox' in list) return g_at_obj(x, y, list);
      if ('mx' in list) return g_at_mon(x, y, list);
      return null;
    }, newsym, setsee
  );
  _setMonDeps({ setsee, tele, nomul, killed, rloc, newcham, mnexto, attmon, amon, buzz, dosearch, losestr, ndaminc, docrt });
  _setDo1Deps(nomul);
  _setHackDeps({ dodown, doup, docrt, poisoned });
  setRhack(rhack);
}

const SDOOR = 2, DOOR = 3, CORR = 4, ROOM = 5;
const dirs = [['h',-1,0],['l',1,0],['k',0,-1],['j',0,1],['y',-1,-1],['u',1,-1],['b',-1,1],['n',1,1]];

// BFS that can optionally traverse secret doors (typ=SDOOR).
// Returns { key, needsSearch, searchX, searchY } where:
//   key = first movement key toward target
//   needsSearch = true if the path crosses an unrevealed SDOOR
//   searchX/Y = position of the SDOOR to search from (adjacent cell)
function bfsPath(tx, ty, allowSecretDoors) {
  const { ux, uy } = game.u;
  const visited = new Set();
  // Each node: { x, y, firstKey, crossesSDoor, sdoorAdjacentX/Y }
  const queue = [{ x: ux, y: uy, firstKey: null, crossesSDoor: false, sdx: 0, sdy: 0 }];
  visited.add(`${ux},${uy}`);
  while (queue.length) {
    const node = queue.shift();
    const srcTyp = game.levl[node.x]?.[node.y]?.typ ?? 0;
    for (const [key, dx, dy] of dirs) {
      const nx = node.x + dx, ny = node.y + dy;
      if (nx < 0 || nx >= 80 || ny < 0 || ny >= 22) continue;
      const cell = game.levl[nx]?.[ny];
      if (!cell) continue;
      const t = cell.typ;
      // Normal passable: DOOR(3), CORR(4), ROOM(5)
      // With allowSecretDoors: also SDOOR(2)
      if (t < SDOOR) continue;
      if (t === SDOOR && !allowSecretDoors) continue;
      if (t < DOOR && !allowSecretDoors) continue;
      // No diagonal through doors
      if (dx && dy && (t === DOOR || srcTyp === DOOR)) continue;
      if (dx && dy && (t === SDOOR || srcTyp === SDOOR)) continue;
      const pk = `${nx},${ny}`;
      if (visited.has(pk)) continue;
      visited.add(pk);
      const fk = node.firstKey || key;
      // Track if we cross an SDOOR
      let crossesSDoor = node.crossesSDoor;
      let sdx = node.sdx, sdy = node.sdy;
      if (t === SDOOR && !crossesSDoor) {
        crossesSDoor = true;
        // The cell adjacent to the SDOOR that we'd search from is the current node
        sdx = node.x; sdy = node.y;
      }
      if (nx === tx && ny === ty) {
        return { key: fk, needsSearch: crossesSDoor, searchX: sdx, searchY: sdy };
      }
      queue.push({ x: nx, y: ny, firstKey: fk, crossesSDoor, sdx, sdy });
    }
  }
  return null;
}

// Simple BFS for movement (no secret doors)
function bfsKey(tx, ty) {
  const result = bfsPath(tx, ty, false);
  return result ? result.key : null;
}

function findMonster(mlet) {
  for (let m = game.fmon; m; m = m.nmon) {
    if (m.data?.mlet === mlet) return m;
  }
  return null;
}

function isAdjacentToTarget(target) {
  if (!target) return false;
  const dx = Math.abs(target.mx - game.u.ux);
  const dy = Math.abs(target.my - game.u.uy);
  return dx <= 1 && dy <= 1;
}

// Parse args
const args = process.argv.slice(2);
function getArg(name, def) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
}
const seed = parseInt(getArg('--seed', '42'));
const targetDepth = parseInt(getArg('--depth', '3'));
const targetMlet = getArg('--target', 'E');
const campTurns = parseInt(getArg('--campturns', '80'));
const maxSteps = parseInt(getArg('--maxsteps', '600'));

wireDeps();
const display = new MockDisplay();
const input = new MockInput();
const g = new GameState();
g.display = display; g.input = input; g.rawRngLog = [];
setGame(g);

const keyLog = [];
let stepCount = 0;
let lastDepth = 1;
let campCount = 0;
let exploreVisited = new Set();
let stuckCount = 0;
let lastPos = null;

class BotDone extends Error {}

input.getKey = async function () {
  if (stepCount >= maxSteps) throw new BotDone();
  stepCount++;

  const u = game.u;
  const depth = game.dlevel;
  let key;

  if (depth !== lastDepth) {
    let _ms = []; for (let _m = game.fmon; _m; _m = _m.nmon) if (_m.data) _ms.push(_m.data.mlet);
    process.stderr.write(`  Level ${depth} [${_ms.join(',')}]\n`);
    lastDepth = depth;
    exploreVisited.clear();
    campCount = 0;
  }

  if (depth < targetDepth) {
    // Navigate to downstairs — use map-aware path (crosses secret doors)
    if (u.ux === game.xdnstair && u.uy === game.ydnstair) {
      key = '>';
    } else {
      // Try direct path first, then path through secret doors
      let k = bfsKey(game.xdnstair, game.ydnstair);
      if (!k) {
        const path = bfsPath(game.xdnstair, game.ydnstair, true);
        if (path) {
          if (path.needsSearch) {
            // Navigate to the cell adjacent to the secret door, then search
            const sk = bfsKey(path.searchX, path.searchY);
            k = sk || 's'; // search if already there, or navigate to search position
            if (u.ux === path.searchX && u.uy === path.searchY) k = 's';
          } else {
            k = path.key;
          }
        }
      }
      key = k || 's'; // search if completely stuck
    }
  } else {
    // At target depth: find monster, camp adjacent to it
    const target = findMonster(targetMlet);

    if (!target) {
      // Monster not found via fmon. Explore map-aware: find nearest SDOOR
      // adjacent to a reachable cell, navigate there, and search to reveal it.
      exploreVisited.add(`${u.ux},${u.uy}`);

      // First try normal BFS exploration (no secret doors)
      let exploreKey = null;
      const bfsQ = [{ x: u.ux, y: u.uy, firstKey: null }];
      const bfsSeen = new Set([`${u.ux},${u.uy}`]);
      while (bfsQ.length) {
        const { x, y, firstKey } = bfsQ.shift();
        const srcTyp = game.levl[x]?.[y]?.typ ?? 0;
        for (const [k, dx, dy] of dirs) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= 80 || ny < 0 || ny >= 22) continue;
          const cell = game.levl[nx]?.[ny];
          if (!cell || cell.typ < DOOR) continue;
          if (dx && dy && (cell.typ === DOOR || srcTyp === DOOR)) continue;
          const pk = `${nx},${ny}`;
          if (bfsSeen.has(pk)) continue;
          bfsSeen.add(pk);
          const fk = firstKey || k;
          if (!exploreVisited.has(pk)) { exploreKey = fk; break; }
          bfsQ.push({ x: nx, y: ny, firstKey: fk });
        }
        if (exploreKey) break;
      }

      if (exploreKey) {
        key = exploreKey;
      } else {
        // All normally reachable cells explored. Find nearest SDOOR adjacent
        // to a reachable cell, navigate there, and search.
        let bestSdoorDist = Infinity, bestSdoorKey = null;
        for (const pk of bfsSeen) {
          const [px, py] = pk.split(',').map(Number);
          // Check if any neighbor is SDOOR
          for (const [, dx, dy] of dirs) {
            if (dx && dy) continue; // SDOORs are orthogonal only
            const sx = px + dx, sy = py + dy;
            const sc = game.levl[sx]?.[sy];
            if (sc && sc.typ === SDOOR) {
              // Navigate to (px,py) and search from there
              const dist = Math.abs(px - u.ux) + Math.abs(py - u.uy);
              if (dist < bestSdoorDist) {
                bestSdoorDist = dist;
                if (px === u.ux && py === u.uy) bestSdoorKey = 's';
                else bestSdoorKey = bfsKey(px, py) || 's';
              }
            }
          }
        }
        key = bestSdoorKey || 's';
      }
    } else if (isAdjacentToTarget(target) && campCount < campTurns) {
      campCount++;
      key = ' ';
      if (campCount === 1) {
        process.stderr.write(`  Camping near ${targetMlet} at (${target.mx},${target.my}) for ${campTurns} turns...\n`);
      }
    } else if (campCount >= campTurns) {
      // Done camping — walk into monster to attack
      const k = bfsKey(target.mx, target.my);
      key = k || '>';
      if (!k) campCount = 0;
    } else {
      // Navigate adjacent to the target — use map-aware path
      const { mx, my } = target;
      const adjDirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
      let bestKey = null;
      let bestDist = Infinity;
      for (const [dx, dy] of adjDirs) {
        const ax = mx+dx, ay = my+dy;
        if (ax < 1 || ax >= 79 || ay < 1 || ay >= 21) continue;
        const cell = game.levl[ax]?.[ay];
        if (!cell || cell.typ < DOOR) continue;
        if (ax === u.ux && ay === u.uy) { bestKey = 's'; bestDist = 0; break; }
        const k = bfsKey(ax, ay);
        if (k) { const d2 = Math.abs(ax-u.ux)+Math.abs(ay-u.uy); if(d2<bestDist){bestDist=d2; bestKey=k;} }
      }
      if (!bestKey) {
        // Try path through secret doors
        const path = bfsPath(mx, my, true);
        bestKey = path ? (path.needsSearch && u.ux === path.searchX && u.uy === path.searchY ? 's' : (bfsKey(path.searchX, path.searchY) || 's')) : 's';
      }
      key = bestKey || 's';
    }
  }

  // Stuck detection
  const pos = `${u.ux},${u.uy}`;
  if (pos === lastPos) {
    stuckCount++;
    if (stuckCount > 30 && key !== 's') key = 'hjklyubn'[stepCount%8];
  } else { stuckCount = 0; lastPos = pos; }

  keyLog.push(key);
  return key;
};

process.stderr.write(`CampBot: seed=${seed} targetDepth=${targetDepth} target=${targetMlet} campTurns=${campTurns}\n`);

try {
  await gameLoop(seed);
} catch (e) {
  if (!(e instanceof BotDone) && !(e instanceof GameOver)) throw e;
  if (e instanceof GameOver) process.stderr.write(`  Game over\n`);
}

process.stderr.write(`Done: ${stepCount} steps, depth=${game.dlevel}\n`);
process.stdout.write(keyLog.join(''));
