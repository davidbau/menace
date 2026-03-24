/**
 * node_runner.mjs — Runs one Rogue 3.6 game session in Node.js using mocks.
 *
 * Uses the actual game code from rogue/js/main.js (wireGameDeps, startGameState).
 * Only provides mock I/O (display, input) and step capture.
 *
 * Usage:
 *   import { runSession } from './node_runner.mjs';
 *   const steps = await runSession(seed, "hhhljjjkQy");
 *   // steps[i] = { key, rng: [...], screen: [...24 strings] }
 */

// localStorage mock — must be installed before any game module is imported,
// since save.js/score.js/options.js reference localStorage at module load time.
// Always override — Node.js 25.x has a built-in localStorage stub that lacks getItem/setItem.
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

import { GameState } from '../js/game.js';
import { game, setGame } from '../js/gstate.js';
import { command } from '../js/command.js';
import { roomin } from '../js/rooms.js';
import { wireGameDeps, startGameState, giveStartingEquipment } from '../js/main.js';
import { loadGameState, clearSave } from '../js/save.js';
import { resetStatus } from '../js/io.js';
import { resetGrpnum } from '../js/weapons.js';
import { resetBetween } from '../js/daemons.js';
import { draw } from '../js/curses.js';

import { MockDisplay } from './mock_display.mjs';
import { MockInput } from './mock_input.mjs';

// Sentinel error to terminate game after keys run out
class SessionDone extends Error {
  constructor() { super('session complete'); }
}

/**
 * Run one game session driven by an AI callback.
 * keyProvider(screen, stepNum, display) => string | null
 * Returns the array of keys pressed.
 */
export async function runSessionWithAI(seed, keyProvider) {
  const display = new MockDisplay();
  const input = new MockInput();

  const g = new GameState();
  g.display = display; g.input = input; g.rawRngLog = [];
  setGame(g);

  wireGameDeps(g);
  await startGameState(g, seed);

  const keys = [];
  let stepNum = 0;

  input.getKey = async function () {
    const screen = display.getRows();
    const key = keyProvider(screen, stepNum++, display);
    if (key == null) throw new SessionDone();
    keys.push(key);
    return key;
  };

  try {
    g.oldpos = { x: g.player.t_pos.x, y: g.player.t_pos.y };
    g.oldrp = roomin(g.player.t_pos);
    while (g.playing) await command();
  } catch (e) {
    if (!(e instanceof SessionDone)) throw e;
  }

  return keys;
}

/**
 * Run one game session and return steps array.
 * @param {number} seed - RNG seed
 * @param {string} keys - keystroke string
 * @param {object} [opts] - options: { wizard: bool }
 */
export async function runSession(seed, keys, opts = {}) {
  const display = new MockDisplay();
  const input = new MockInput();

  const g = new GameState();
  g.display = display; g.input = input; g.rawRngLog = [];
  g.suppressMore = true;  // Match C harness: auto-dismiss --More--
  if (opts.wizard) { g.wizard = true; g.waswizard = true; }
  setGame(g);

  wireGameDeps(g);
  await startGameState(g, seed);

  // Set up step capture
  const steps = [];
  let keyIndex = 0;

  input.getKey = async function () {
    const screen = display.getRows();
    const rng = [...g.rawRngLog];
    g.rawRngLog = [];

    if (keyIndex >= keys.length) throw new SessionDone();

    const key = keys[keyIndex];
    steps.push({ key, rng, screen });
    return keys[keyIndex++];
  };

  try {
    g.oldpos = { x: g.player.t_pos.x, y: g.player.t_pos.y };
    g.oldrp = roomin(g.player.t_pos);
    while (g.playing) await command();
  } catch (e) {
    if (!(e instanceof SessionDone)) throw e;
  }

  return steps;
}

/**
 * Run a multigame session: multiple games in sequence sharing localStorage.
 * Game 0 starts fresh; games 1+ restore from the previous game's save.
 *
 * @param {Array} games - Array of { seed, keys, wizard } objects
 * @returns {Array} Array of step arrays, one per game
 */
export async function runMultigameSession(games) {
  // Clear localStorage between full multigame runs
  globalThis.localStorage.clear();

  const allGameSteps = [];

  for (let gi = 0; gi < games.length; gi++) {
    const { seed, keys, wizard } = games[gi];
    const isRestore = gi > 0;

    const display = new MockDisplay();
    const input = new MockInput();

    const g = new GameState();
    g.display = display; g.input = input; g.rawRngLog = [];
    g.suppressMore = true;
    if (wizard) { g.wizard = true; g.waswizard = true; }
    setGame(g);

    wireGameDeps(g);

    if (isRestore) {
      // Restore from save left by previous game
      resetStatus(); resetGrpnum(); resetBetween();
      if (!loadGameState(g)) {
        throw new Error(`Game ${gi}: no save to restore`);
      }
      draw(g.cw);
      clearSave();
    } else {
      await startGameState(g, seed);
    }

    // Set up step capture
    const steps = [];
    let keyIndex = 0;

    input.getKey = async function () {
      const screen = display.getRows();
      const rng = [...g.rawRngLog];
      g.rawRngLog = [];

      if (keyIndex >= keys.length) throw new SessionDone();

      const key = keys[keyIndex];
      steps.push({ key, rng, screen });
      return keys[keyIndex++];
    };

    try {
      g.oldpos = { x: g.player.t_pos.x, y: g.player.t_pos.y };
      g.oldrp = roomin(g.player.t_pos);
      while (g.playing) await command();
    } catch (e) {
      if (!(e instanceof SessionDone)) throw e;
    }

    allGameSteps.push(steps);
  }

  return allGameSteps;
}
