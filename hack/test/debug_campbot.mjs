const _store = new Map();
globalThis.localStorage = {
  getItem(k) { return _store.has(k) ? _store.get(k) : null; },
  setItem(k, v) { _store.set(k, String(v)); },
  removeItem(k) { _store.delete(k); },
  clear() { _store.clear(); },
  get length() { return _store.size; },
  key(i) { return [..._store.keys()][i] ?? null; },
};

import { GameState } from '../js/game.js';
import { game, setGame } from '../js/gstate.js';
import * as lev from '../js/lev.js';
import { gameLoop, GameOver, losestr, ndaminc, dodown, doup } from '../js/main.js';
import { _setPriDeps, newsym } from '../js/pri.js';
import { _setMonDeps, g_at_mon, g_at_gen, g_at_obj, killed, rloc, mnexto, newcham, poisoned } from '../js/mon.js';
import { _setHackDeps, setsee, tele, nomul, amon, attmon } from '../js/hack.js';
import { _setDo1Deps, dosearch, buzz } from '../js/do1.js';
import { setRhack } from '../js/main.js';
import { rhack } from '../js/do.js';
import { docrt } from '../js/pri.js';
import { MockDisplay } from './mock_display.mjs';
import { MockInput } from './mock_input.mjs';

// Patch mklev to log the seed used
const origMklev = lev.mklev;

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

const display = new MockDisplay();
const input = new MockInput();
const g = new GameState();
g.display = display; g.input = input; g.rawRngLog = [];
setGame(g);

let stepCount = 0;
const keyLog = [];

input.getKey = async function() {
  stepCount++;
  if (stepCount > 2000) throw new Error('done');
  const topLine = display.getRows()[0] || '';
  if (topLine.includes('--More--')) { keyLog.push(' '); return ' '; }
  const u = game.u;
  if (game.dlevel === 12) {
    // Log monsters at dlevel 12
    process.stderr.write('At dlevel=12, initialSeed=' + game.initialSeed + '\n');
    for (let m = game.fmon; m; m = m.nmon) {
      process.stderr.write('  monster mlet=' + (m.data?.mlet||'?') + ' at ' + m.mx + ',' + m.my + '\n');
    }
    throw new Error('done');
  }
  // Simple descent: navigate to stairs
  const dirs = [['h',-1,0],['l',1,0],['k',0,-1],['j',0,1],['y',-1,-1],['u',1,-1],['b',-1,1],['n',1,1]];
  if (u.ux === game.xdnstair && u.uy === game.ydnstair) { keyLog.push('>'); return '>'; }
  // BFS to stairs
  const visited = new Set([`${u.ux},${u.uy}`]);
  const queue = [{ x: u.ux, y: u.uy, fk: null }];
  let found = null;
  while (queue.length && !found) {
    const { x, y, fk } = queue.shift();
    const srcTyp = game.levl[x]?.[y]?.typ ?? 0;
    for (const [key, dx, dy] of dirs) {
      const nx = x+dx, ny = y+dy;
      if (nx < 0 || nx >= 80 || ny < 0 || ny >= 22) continue;
      const cell = game.levl[nx]?.[ny];
      if (!cell || cell.typ < 3) continue;
      if (dx && dy && (cell.typ === 3 || srcTyp === 3)) continue;
      const k = `${nx},${ny}`;
      if (visited.has(k)) continue;
      visited.add(k);
      const pfk = fk || key;
      if (nx === game.xdnstair && ny === game.ydnstair) { found = pfk; break; }
      queue.push({ x: nx, y: ny, fk: pfk });
    }
  }
  const key = found || 'hjklyubn'[stepCount % 8];
  keyLog.push(key);
  return key;
};

try { await gameLoop(757); } catch(e) {}
