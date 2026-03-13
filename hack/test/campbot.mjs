/**
 * campbot.mjs — Navigate to target depth, hunt target monster, camp adjacent to it.
 * Camping (pressing 's') passes turns without moving, letting sleeping monsters
 * wake up and attack, triggering their special effects (freeze, rust, steal, etc.)
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

function bfsKey(tx, ty) {
  const { ux, uy } = game.u;
  const visited = new Set();
  const queue = [{ x: ux, y: uy, firstKey: null }];
  visited.add(`${ux},${uy}`);
  const dirs = [['h',-1,0],['l',1,0],['k',0,-1],['j',0,1],['y',-1,-1],['u',1,-1],['b',-1,1],['n',1,1]];
  while (queue.length) {
    const { x, y, firstKey } = queue.shift();
    const srcTyp = game.levl[x]?.[y]?.typ ?? 0;
    for (const [key, dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= 80 || ny < 0 || ny >= 22) continue;
      const cell = game.levl[nx]?.[ny];
      if (!cell || cell.typ < 3) continue;
      if (dx && dy && (cell.typ === 3 || srcTyp === 3)) continue;
      const k = `${nx},${ny}`;
      if (visited.has(k)) continue;
      visited.add(k);
      const fk = firstKey || key;
      if (nx === tx && ny === ty) return fk;
      queue.push({ x: nx, y: ny, firstKey: fk });
    }
  }
  return null;
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
let campTarget = null;
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
    process.stderr.write(`  Level ${depth}\n`);
    lastDepth = depth;
    exploreVisited.clear();
    campCount = 0;
    campTarget = null;
  }

  if (depth < targetDepth) {
    // Navigate to downstairs
    if (u.ux === game.xdnstair && u.uy === game.ydnstair) key = '>';
    else { const k = bfsKey(game.xdnstair, game.ydnstair); key = k || 'hjkl'[stepCount%4]; }
  } else {
    // At target depth: find monster, camp adjacent to it
    const target = findMonster(targetMlet);

    if (!target) {
      // Explore to find monster or reveal it
      exploreVisited.add(`${u.ux},${u.uy}`);
      // Use simple exploration: try unvisited neighbors
      const dirs = [['h',-1,0],['l',1,0],['k',0,-1],['j',0,1],['y',-1,-1],['u',1,-1],['b',-1,1],['n',1,1]];
      let exploreKey = null;
      for (const [k, dx, dy] of dirs) {
        const nx = u.ux+dx, ny = u.uy+dy;
        const cell = game.levl[nx]?.[ny];
        if (cell && cell.typ >= 3 && !exploreVisited.has(`${nx},${ny}`)) {
          if (!dx || !dy || (cell.typ !== 3 && game.levl[u.ux]?.[u.uy]?.typ !== 3)) {
            exploreKey = k; break;
          }
        }
      }
      key = exploreKey || 'hjkl'[stepCount%4];
    } else if (isAdjacentToTarget(target) && campCount < campTurns) {
      // Camp: press ' ' (space = no-op) to pass turn, letting monster act.
      // Use space not 's' because 's' doesn't dismiss --More-- prompts (only space does).
      campCount++;
      key = ' ';
      if (campCount === 1) {
        process.stderr.write(`  Camping near ${targetMlet} at (${target.mx},${target.my}) for ${campTurns} turns...\n`);
      }
    } else if (campCount >= campTurns) {
      // Done camping — kill the monster then find next or descend
      // Walk into monster to attack it
      const k = bfsKey(target.mx, target.my);
      key = k || '>';
      if (!k) campCount = 0; // reset to camp next target
    } else {
      // Navigate to be adjacent to the target monster
      // Move to a cell adjacent to (but not onto) the monster
      // Try to be 1 step away
      const { mx, my } = target;
      const dirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
      let bestKey = null;
      let bestDist = Infinity;
      for (const [dx, dy] of dirs) {
        const ax = mx+dx, ay = my+dy;
        if (ax < 1 || ax >= 79 || ay < 1 || ay >= 21) continue;
        const cell = game.levl[ax]?.[ay];
        if (!cell || cell.typ < 3) continue;
        if (ax === u.ux && ay === u.uy) { bestKey = 's'; bestDist = 0; break; }
        const k = bfsKey(ax, ay);
        if (k) { const d2 = Math.abs(ax-u.ux)+Math.abs(ay-u.uy); if(d2<bestDist){bestDist=d2; bestKey=k;} }
      }
      key = bestKey || 's';
    }
  }

  // Stuck detection
  const pos = `${u.ux},${u.uy}`;
  if (pos === lastPos) {
    stuckCount++;
    if (stuckCount > 15 && key !== 's') key = 'hjklyubn'[stepCount%8];
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
