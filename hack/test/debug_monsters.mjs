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

const g = new GameState();
g.display = { moveCursor(){}, putCharAtCursor(){}, putString(){}, clearScreen(){}, clearToEol(){}, flush(){} };
g.rawRngLog = [];
g.initialSeed = 142;
setGame(g);
g.rngSeed = (142 + 9) >>> 0;  // seed=142, dlevel=9
const lvdata = generatelevel(9);
console.log('Monsters:');
for (let m = lvdata.fmon; m; m = m.nmon) {
  console.log(' mlet=', m.data?.mlet, 'at', m.mx, m.my);
}
console.log('Done');
