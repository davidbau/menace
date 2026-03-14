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
import { _setPriDeps, newsym } from '../js/pri.js';
import { _setMonDeps, g_at_mon, g_at_gen, g_at_obj, killed, rloc, mnexto, newcham, poisoned } from '../js/mon.js';
import { _setHackDeps, setsee, tele, nomul, amon, attmon } from '../js/hack.js';
import { _setDo1Deps, dosearch, buzz } from '../js/do1.js';
import { setRhack, gameLoop, GameOver, losestr, ndaminc, dodown, doup } from '../js/main.js';
import { rhack } from '../js/do.js';
import { docrt } from '../js/pri.js';
import { MockDisplay } from './mock_display.mjs';
import { MockInput } from './mock_input.mjs';

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

const seed = parseInt(process.argv[2] || '23');
const display = new MockDisplay();
const input = new MockInput();
const g = new GameState();
g.display = display; g.input = input; g.rawRngLog = [];
setGame(g);

let first = true;
input.getKey = async () => {
  if (first) {
    first = false;
    console.log('seed=' + seed + ' dlevel=' + game.dlevel);
    for (let m = game.fmon; m; m = m.nmon) {
      console.log('  mlet=' + (m.data?.mlet||'?') + ' at ' + m.mx + ',' + m.my);
    }
    throw new Error('done');
  }
  return 'Q';
};
try { await gameLoop(seed); } catch(e) {}
