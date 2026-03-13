/**
 * actionsbot.mjs — Bot that exercises player action commands:
 *   inventory ('i'), eat food ('e'+'a'), run mode ('H'), escape ('<').
 *   Designed to cover uncovered code paths in do.js and main.js.
 *
 * Usage:
 *   node hack/test/actionsbot.mjs --seed N [--maxsteps N]
 *   Keys output to stdout. Session saved via run_session.py.
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

// Parse args
const args = process.argv.slice(2);
function getArg(name, def) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
}
const seed = parseInt(getArg('--seed', '1'));
const maxSteps = parseInt(getArg('--maxsteps', '200'));

wireDeps();
const display = new MockDisplay();
const input = new MockInput();
const g = new GameState();
g.display = display; g.input = input; g.rawRngLog = [];
setGame(g);

const keyLog = [];
let stepCount = 0;

// Scripted action sequence
// Actions that exercise uncovered paths:
// 1. 'z' → unknown command (do.js L779-782)
// 2. 'i', ' ' → inventory display (do.js L55-84)
// 3. 'e', 'a' → eat food ration (do.js L599-604, lesshungry, useup, then multi=-5)
//    After eating: 5 turns pass without consuming keys (multi=-5..-1..0)
//    When multi returns to 0: pline("You can move again.") → main.js L291
// 4. 'H' → run left (do.js L592-594, main.js L293-300)
//    But may need spaces to respond to --More-- from monster hits during run
// 5. '<' → ascend from level 1 → escape (main.js L119-120)
//    Player starts at upstair, so '<' works immediately
//    Note: do this AFTER everything else so the game ends

// We emit one key at a time; the game loop calls getKey once per visible action.
// During multi<0 (eating), no getKey is called.
// During run mode (multi>0), getKey is NOT called either (loop runs autonomously).
// So our scripted sequence maps directly to getKey calls.

const script = [
  'z',      // unknown command — do.js line 779-782
  'i',      // inventory — starts doinv()
  ' ',      // dismiss inventory ('--Hit space to continue--')
  '<',      // ascend from level 1 → done('escaped') — main.js L119-120
];

class BotDone extends Error {}

let scriptIdx = 0;

input.getKey = async function () {
  if (stepCount >= maxSteps) throw new BotDone();
  stepCount++;

  let key;
  if (scriptIdx < script.length) {
    key = script[scriptIdx++];
  } else {
    // Fallback: space to dismiss any remaining prompts
    key = ' ';
  }

  keyLog.push(key);
  return key;
};

process.stderr.write(`ActionsBot: seed=${seed}\n`);

try {
  await gameLoop(seed);
} catch (e) {
  if (!(e instanceof BotDone) && !(e instanceof GameOver)) throw e;
  if (e instanceof GameOver) process.stderr.write(`  Game over: ${e.message}\n`);
}

process.stderr.write(`Done: ${stepCount} steps\n`);
process.stdout.write(keyLog.join(''));
