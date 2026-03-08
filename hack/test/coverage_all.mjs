/**
 * coverage_all.mjs — Combined coverage runner for Hack 1982 JS port.
 *
 * Runs both:
 *   1. All session replay tests (hack/test/sessions/*.json)
 *   2. Direct unit tests (coverage_direct.mjs content inlined)
 *
 * Usage (from mac/ directory):
 *   npx c8 --reporter=text --include='hack/js/**' node hack/test/coverage_all.mjs
 *
 * This gives the true combined coverage number.
 */

// localStorage mock — always override (Node.js 25.x stub lacks getItem/setItem)
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

// ===== Part 1: Run all session replay tests =====
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { GameState, makeObj } from '../js/game.js';
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

class SessionDone extends Error { constructor() { super('session done'); } }

let _depsWired = false;
function wireDeps() {
  if (_depsWired) return;
  _depsWired = true;
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
  _setMonDeps({ setsee, tele, nomul, killed, rloc, newcham, mnexto, attmon, amon, buzz, dosearch, losestr, ndaminc });
  _setDo1Deps(nomul);
  _setHackDeps({ dodown, doup, docrt, poisoned });
  setRhack(rhack);
}

// Run one session replay
async function runSession(seed, keys) {
  wireDeps();
  const display = new MockDisplay();
  const input = new MockInput();
  const g = new GameState();
  g.display = display;
  g.input = input;
  g.rawRngLog = [];
  setGame(g);

  const steps = [];
  let keyIdx = 0;

  input.getKey = async function () {
    const screen = display.getRows();
    const rng = [...g.rawRngLog];
    g.rawRngLog = [];
    if (keyIdx >= keys.length) throw new SessionDone();
    const key = keys[keyIdx];
    steps.push({ key, rng, screen });
    return keys[keyIdx++];
  };

  try {
    await gameLoop(seed);
  } catch (e) {
    if (!(e instanceof SessionDone) && !(e instanceof GameOver)) throw e;
  }
  return steps;
}

// Run all sessions
const sessionsDir = new URL('../test/sessions', import.meta.url).pathname;
const sessionFiles = (await readdir(sessionsDir))
  .filter(f => f.endsWith('.json'))
  .sort();

let passed = 0, total = 0;
for (const file of sessionFiles) {
  const sessionData = JSON.parse(await readFile(join(sessionsDir, file), 'utf8'));
  const { seed, steps: cSteps } = sessionData;
  const keys = cSteps.map(s => s.key).join('');
  try {
    await runSession(seed, keys);
    passed++;
  } catch (e) {
    // ignore, just for coverage
  }
  total++;
}
console.log(`Session replay: ${passed}/${total} sessions ran`);

// ===== Part 2: Run direct unit tests =====
// (Import and re-run the direct test module)
await import('./coverage_direct.mjs');
