/**
 * node_runner.mjs — Runs one Hack 1982 game session in Node.js using mocks.
 *
 * All game modules (rng.js, mklev.js, lev.js, etc.) are pure JS and
 * import cleanly in Node. We substitute MockDisplay and MockInput for the
 * browser-specific Display and Input classes.
 *
 * Usage:
 *   import { runSession } from './node_runner.mjs';
 *   const steps = await runSession(seed, "hhhljjjkQy");
 *   // steps[i] = { key, rng: [...], screen: [...24 strings] }
 */

import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const JS_DIR = join(__dirname, '..', 'js');

// Import game modules from hack/js/
import { GameState } from '../js/game.js';
import { setGame } from '../js/gstate.js';
import { _setPriDeps, newsym } from '../js/pri.js';
import { _setMonDeps, g_at_mon, g_at_gen, g_at_obj, killed, rloc, mnexto, newcham, poisoned } from '../js/mon.js';
import { _setHackDeps, setsee, tele, nomul, amon, attmon } from '../js/hack.js';
import { _setDo1Deps, dosearch, buzz } from '../js/do1.js';
import { setRhack, gameLoop, GameOver, losestr, ndaminc, dodown, doup } from '../js/main.js';
import { rhack } from '../js/do.js';
import { docrt } from '../js/pri.js';

import { MockDisplay } from './mock_display.mjs';
import { MockInput } from './mock_input.mjs';
import { mon } from '../js/data.js';

// Sentinel error to terminate game after keys run out
class SessionDone extends Error {
  constructor() { super('session complete'); }
}

// Wire up cross-module dependencies once (idempotent)
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
    newsym,
    setsee
  );

  _setMonDeps({
    setsee, tele, nomul, killed, rloc, newcham, mnexto,
    attmon, amon, buzz, dosearch, losestr, ndaminc, docrt,
  });

  _setDo1Deps(nomul);
  _setHackDeps({ dodown, doup, docrt, poisoned });
  setRhack(rhack);
}

/**
 * Run one game session and return steps array.
 *
 * @param {number} seed  - RNG seed
 * @param {string} keys  - Keystroke sequence (same as C harness)
 * @returns {Promise<Array>} steps — each element: { key, rng, screen }
 *   where screen is an array of 24 trimmed strings (matching C harness format)
 *   and rng is an array of raw rand() values for that step.
 */
export async function runSession(seed, keys) {
  wireDeps();

  // Save mon table — genocide mutates mlet in-place; restore after each session
  // so sessions don't pollute each other when run with --all.
  const monSave = mon.map(tier => tier.map(m => m ? { ...m } : null));

  const display = new MockDisplay();
  const input = new MockInput();

  const g = new GameState();
  g.display = display;
  g.input = input;
  g.rawRngLog = [];
  setGame(g);

  const steps = [];
  let keyIndex = 0;

  // Wrap getKey() to:
  //   1. Capture current screen + rng as a step (before returning next key)
  //   2. Return the next key from `keys`, or throw SessionDone when exhausted
  const origGetKey = input.getKey.bind(input);
  input.getKey = async function () {
    // Capture the current state (state that prompted this key request)
    const screen = display.getRows();
    const rng = [...g.rawRngLog];
    g.rawRngLog = [];

    if (keyIndex >= keys.length) {
      // No more keys — terminate session without recording a step
      throw new SessionDone();
    }

    const key = keys[keyIndex];
    steps.push({ key, rng, screen });

    return keys[keyIndex++];
  };

  try {
    await gameLoop(seed);
  } catch (e) {
    if (e instanceof SessionDone || e instanceof GameOver) {
      // Normal termination — return captured steps
    } else {
      throw e;
    }
  } finally {
    // Restore mon table to clean state for next session
    for (let i = 0; i < mon.length; i++) {
      for (let j = 0; j < mon[i].length; j++) {
        if (monSave[i][j]) Object.assign(mon[i][j], monSave[i][j]);
      }
    }
  }

  return steps;
}
