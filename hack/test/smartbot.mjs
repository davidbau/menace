/**
 * smartbot.mjs — AI player bot for reaching deep dungeon levels (25+).
 *
 * Uses full internal game knowledge:
 * - game.levl: complete map including SDOOR positions
 * - game.fmon: all monster positions and types
 * - game.fobj: all items on the floor (identity, position)
 * - game.invent: full inventory with item properties
 *
 * Eats food, equips better gear, avoids deadly monsters, navigates through
 * secret doors, picks up useful items.
 *
 * Usage:
 *   node hack/test/smartbot.mjs --seed N [--depth D] [--maxsteps N]
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
  _setPriDeps((x, y, list) => {
    if (!list) return null;
    if ('gx' in list) return g_at_gen(x, y, list);
    if ('ox' in list) return g_at_obj(x, y, list);
    if ('mx' in list) return g_at_mon(x, y, list);
    return null;
  }, newsym, setsee);
  _setMonDeps({ setsee, tele, nomul, killed, rloc, newcham, mnexto, attmon, amon, buzz, dosearch, losestr, ndaminc, docrt });
  _setDo1Deps(nomul);
  _setHackDeps({ dodown, doup, docrt, poisoned });
  setRhack(rhack);
}

// ===== Constants =====
const SDOOR = 2, DOOR = 3, CORR = 4, ROOM = 5;
const dirs = [['h',-1,0],['l',1,0],['k',0,-1],['j',0,1],['y',-1,-1],['u',1,-1],['b',-1,1],['n',1,1]];
// Never attack these (paralysis/instant death)
const DEADLY = new Set(['E']);

// ===== Inventory helpers =====
function invLetter(targetObj) {
  let code = 'a'.charCodeAt(0);
  for (let o = game.invent; o; o = o.nobj) {
    if (o === targetObj) return String.fromCharCode(code);
    code++; if (code > 'z'.charCodeAt(0)) code = 'A'.charCodeAt(0);
  }
  return null;
}
function findInv(olet) {
  for (let o = game.invent; o; o = o.nobj) if (o.olet === olet) return o;
  return null;
}
function weaponRating(o) {
  if (!o || o.olet !== ')') return 0;
  return o.damn * (o.damd + 1) / 2 + (o.minus ? -o.spe : o.spe);
}
function armorRating(o) {
  if (!o || o.olet !== '[') return 0;
  return o.otyp + (o.minus ? -o.spe : o.spe);
}

// ===== Monster knowledge =====
function dangerZone() {
  // Only block the exact cell of deadly monsters (not neighbors).
  // Walking adjacent is safe — paralysis only happens when you ATTACK the eye.
  const zone = new Set();
  for (let m = game.fmon; m; m = m.nmon) {
    if (!m.data) continue;
    if (DEADLY.has(m.data.mlet)) {
      zone.add(`${m.mx},${m.my}`);
    }
  }
  return zone;
}

// ===== BFS =====
function bfsTo(tx, ty, opts = {}) {
  const { sdoor = false, dzone = null, avoidMon = false } = opts;
  const { ux, uy } = game.u;
  const monCells = avoidMon ? new Set() : null;
  if (avoidMon) for (let m = game.fmon; m; m = m.nmon) if (m.mx > 0) monCells.add(`${m.mx},${m.my}`);
  const visited = new Set([`${ux},${uy}`]);
  const queue = [{ x: ux, y: uy, fk: null, cs: false, sx: 0, sy: 0 }];
  while (queue.length) {
    const n = queue.shift();
    const st = game.levl[n.x]?.[n.y]?.typ ?? 0;
    for (const [key, dx, dy] of dirs) {
      const nx = n.x + dx, ny = n.y + dy;
      if (nx < 0 || nx >= 80 || ny < 0 || ny >= 22) continue;
      const c = game.levl[nx]?.[ny];
      if (!c) continue;
      const t = c.typ;
      if (t < SDOOR) continue;
      if (t < DOOR && !sdoor) continue;
      if (dx && dy && (t <= DOOR || st <= DOOR)) continue;
      const pk = `${nx},${ny}`;
      if (visited.has(pk)) continue;
      if (dzone && dzone.has(pk) && !(nx === tx && ny === ty)) continue;
      if (monCells && monCells.has(pk) && !(nx === tx && ny === ty)) continue;
      visited.add(pk);
      const fk = n.fk || key;
      let cs = n.cs, sx = n.sx, sy = n.sy;
      if (t === SDOOR && !cs) { cs = true; sx = n.x; sy = n.y; }
      if (nx === tx && ny === ty) return { key: fk, needsSearch: cs, searchX: sx, searchY: sy };
      queue.push({ x: nx, y: ny, fk, cs, sx, sy });
    }
  }
  return null;
}

function nav(tx, ty) {
  const dz = dangerZone();
  let r = bfsTo(tx, ty, { dzone: dz, avoidMon: true });
  if (r) return r.key;
  r = bfsTo(tx, ty, { dzone: dz });
  if (r) return r.key;
  r = bfsTo(tx, ty);
  return r ? r.key : null;
}

// Find nearest SDOOR position from current player position that has an adjacent
// reachable cell. Returns {searchX, searchY} or null.
function nearestSDOOR() {
  // BFS reachable area — NO danger zone restriction (we need to find ALL SDOORs)
  const { ux, uy } = game.u;
  const reachable = new Set([`${ux},${uy}`]);
  const rq = [{x: ux, y: uy}];
  while (rq.length) {
    const {x, y} = rq.shift();
    const st = game.levl[x]?.[y]?.typ ?? 0;
    for (const [,dx,dy] of dirs) {
      const nx = x+dx, ny = y+dy;
      const c = game.levl[nx]?.[ny];
      if (!c || c.typ < DOOR) continue;
      if (dx && dy && (c.typ === DOOR || st === DOOR)) continue;
      const pk = `${nx},${ny}`;
      if (!reachable.has(pk)) { reachable.add(pk); rq.push({x:nx,y:ny}); }
    }
  }
  // Find closest SDOOR adjacent to reachable cell
  let best = null, bestDist = Infinity;
  for (const pk of reachable) {
    const [px, py] = pk.split(',').map(Number);
    for (const [,dx,dy] of dirs) {
      if (dx && dy) continue; // SDOORs are orthogonal
      const sx = px+dx, sy = py+dy;
      if (game.levl[sx]?.[sy]?.typ === SDOOR) {
        const dist = Math.abs(px - ux) + Math.abs(py - uy);
        if (dist < bestDist) { bestDist = dist; best = {x: px, y: py}; }
      }
    }
  }
  return best;
}

// ===== Parse args =====
const args = process.argv.slice(2);
function getArg(name, def) { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; }
const seed = parseInt(getArg('--seed', '47'));
const targetDepth = parseInt(getArg('--depth', '26'));
const maxSteps = parseInt(getArg('--maxsteps', '200000'));

// ===== Run =====
wireDeps();
const display = new MockDisplay();
const input = new MockInput();
const g = new GameState();
g.display = display; g.input = input; g.rawRngLog = [];
setGame(g);

const keyLog = [];
let stepCount = 0;
let lastDepth = 1;
let lastPos = null;
let stuckCount = 0;
const keyQueue = [];
let equipped = false; // track if we've checked equipment this level

class BotDone extends Error {}

input.getKey = async function () {
  if (stepCount >= maxSteps) throw new BotDone();
  stepCount++;

  // Detect --More-- prompt: pline waits for SPACE specifically.
  // If we return a non-space key, it's silently discarded in an infinite loop.
  // Check the display for "--More--" on the message line (row 1).
  {
    const row1 = display.grid[1]?.slice(1, 80).join('') || '';
    if (row1.includes('--More--')) {
      keyLog.push(' ');
      return ' ';
    }
  }

  // Drain key queue (for multi-key commands)
  if (keyQueue.length > 0) {
    const k = keyQueue.shift();
    keyLog.push(k);
    return k;
  }

  const u = game.u;
  const depth = game.dlevel;

  if (depth !== lastDepth) {
    let ms = []; for (let m = game.fmon; m; m = m.nmon) if (m.data) ms.push(m.data.mlet);
    process.stderr.write(`  Level ${depth} [${ms.join(',')}]\n`);
    }
    lastDepth = depth;
    equipped = false;
  }

  let key;

  // ===== Wait out paralysis =====
  if (game.multi < 0) {
    stuckCount = 0; // reset so navigation retries after paralysis
    keyLog.push(' '); return ' ';
  }

  // ===== Break free if grabbed =====
  if (u.ustuck) {
    const sm = u.ustuck;
    const dk = dirs.find(([,dx,dy]) => dx === Math.sign(sm.mx-u.ux) && dy === Math.sign(sm.my-u.uy));
    key = dk ? dk[0] : 'h';
    keyLog.push(key); return key;
  }

  // ===== Eat when hungry =====
  if (u.uhunger < 300) {
    const food = findInv('%');
    if (food) {
      const letter = invLetter(food);
      if (letter) { keyQueue.push(letter); key = 'e'; keyLog.push(key); return key; }
    }
  }

  // ===== Equip better gear (once per level to avoid loops) =====
  if (!equipped) {
    equipped = true;
    // Better weapon?
    if (game.uwep) {
      let best = null, bestR = weaponRating(game.uwep);
      for (let o = game.invent; o; o = o.nobj)
        if (o.olet === ')' && o !== game.uwep && weaponRating(o) > bestR) { bestR = weaponRating(o); best = o; }
      if (best) { keyQueue.push(invLetter(best)); key = 'w'; keyLog.push(key); return key; }
    }
    // Wear armor if not wearing any?
    if (!game.uarm) {
      let best = null, bestR = 0;
      for (let o = game.invent; o; o = o.nobj)
        if (o.olet === '[' && armorRating(o) > bestR) { bestR = armorRating(o); best = o; }
      if (best) { keyQueue.push(invLetter(best)); key = 'W'; keyLog.push(key); return key; }
    }
  }

  // ===== Navigate to stairs and descend =====
  if (depth < targetDepth) {
    if (u.ux === game.xdnstair && u.uy === game.ydnstair) {
      key = '>';
    } else {
      // Try progressively relaxed pathfinding to stairs:
      // 1. Avoid danger zones + avoid monsters
      // 2. Avoid danger zones only
      // 3. No restrictions
      // 4. Through SDOORs (with search)
      let k = null;
      const dz = dangerZone();
      k = bfsTo(game.xdnstair, game.ydnstair, { dzone: dz, avoidMon: true })?.key;
      if (!k) k = bfsTo(game.xdnstair, game.ydnstair, { dzone: dz })?.key;
      if (!k) k = bfsTo(game.xdnstair, game.ydnstair)?.key; // last resort: walk through danger
      if (!k) {
        // Stairs behind SDOOR — find path through secret doors
        // Try with danger zone first, then without
        const path = bfsTo(game.xdnstair, game.ydnstair, { sdoor: true, dzone: dz })
                  || bfsTo(game.xdnstair, game.ydnstair, { sdoor: true });
        if (path && path.needsSearch) {
          if (u.ux === path.searchX && u.uy === path.searchY) {
            key = 's';
          } else {
            // Navigate to search position — try BFS
            let sk = bfsTo(path.searchX, path.searchY, { dzone: dz, avoidMon: true })?.key;
            if (!sk) sk = bfsTo(path.searchX, path.searchY)?.key;
            if (sk) {
              key = sk;
              keyLog.push(key); return key;
            }
            // Search position unreachable — fall through to nearestSDOOR
          }
        }
      }
      // Find nearest SDOOR adjacent to reachable area and search there
      if (!k) {
        const sd = nearestSDOOR();
        if (sd) {
          if (u.ux === sd.x && u.uy === sd.y) {
            key = 's';
          } else {
            let sk = bfsTo(sd.x, sd.y, { dzone: dz, avoidMon: true })?.key;
            if (!sk) sk = bfsTo(sd.x, sd.y)?.key;
            key = sk || 's';
          }
          keyLog.push(key); return key;
        }
        k = 's';
      }
      key = k;
    }
  } else {
    // At target depth
    key = 's';
  }

  // ===== Search at every new position during descent =====
  // When descending and BFS couldn't find stairs (SDOOR situation),
  // search at every cell we visit — reveals any adjacent SDOORs.
  if (depth < targetDepth && !nav(game.xdnstair, game.ydnstair)) {
    // Check if current position is adjacent to any SDOOR
    let adjSDOOR = false;
    for (const [,dx,dy] of dirs) {
      if (dx && dy) continue;
      if (game.levl[u.ux+dx]?.[u.uy+dy]?.typ === SDOOR) { adjSDOOR = true; break; }
    }
    if (adjSDOOR) {
      key = 's'; // search to reveal adjacent SDOOR
      keyLog.push(key); return key;
    }
  }

  // ===== Stuck detection =====
  const pos = `${u.ux},${u.uy}`;
  if (pos === lastPos) {
    stuckCount++;
    if (key !== 's' && key !== ' ' && key !== '>') {
      if (stuckCount > 5 && stuckCount % 3 === 0) key = 's';
      else if (stuckCount > 30) key = 'hjklyubn'[stepCount % 8];
    }
  } else { stuckCount = 0; lastPos = pos; }

  keyLog.push(key);
  return key;
};

process.stderr.write(`SmartBot: seed=${seed} depth=${targetDepth} maxSteps=${maxSteps}\n`);

try {
  await gameLoop(seed);
} catch (e) {
  if (!(e instanceof BotDone) && !(e instanceof GameOver)) throw e;
  if (e instanceof GameOver) process.stderr.write(`  Game over: ${e.message}\n`);
}

process.stderr.write(`Done: ${stepCount} steps, depth=${game.dlevel}\n`);
process.stdout.write(keyLog.join(''));
