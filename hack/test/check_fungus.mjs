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
import { generatelevel } from '../js/mklev.js';
import { mon } from '../js/data.js';

const targets = (process.argv[3] || 'F,M').split(',');
const found = [];
const MAX_SEED = parseInt(process.argv[2] || '3000');
for (let seed = 1; seed <= MAX_SEED; seed++) {
  for (const dlevel of [12, 13, 14, 15]) {
    const g = new GameState();
    g.display = { moveCursor(){}, putCharAtCursor(){}, putString(){}, clearScreen(){}, clearToEol(){}, flush(){} };
    g.rawRngLog = [];
    g.initialSeed = seed;
    g.dlevel = dlevel;  // MUST set before generatelevel so makemon_lev uses correct dlevel
    setGame(g);
    g.rngSeed = (seed + dlevel) >>> 0;
    const lvdata = generatelevel(dlevel);

    for (let m = lvdata.fmon; m; m = m.nmon) {
      const tier = m.mhp, idx = m.orig_hp;
      const mdat = (tier < 8 && idx < 7) ? mon[tier]?.[idx] : null;
      if (mdat && targets.includes(mdat.mlet)) {
        found.push(`seed=${seed} dlevel=${dlevel} mlet=${mdat.mlet} tier=${tier} idx=${idx} at (${m.mx},${m.my})`);
      }
    }
  }
}
for (const s of found.slice(0, 50)) console.log(s);
console.log(`Total: ${found.length} found in seeds 1-${MAX_SEED}`);
