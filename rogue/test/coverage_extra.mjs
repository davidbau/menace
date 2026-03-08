/**
 * coverage_extra.mjs — Direct tests for hard-to-reach code paths in rogue/js/.
 *
 * Run alongside replay_test.mjs to improve coverage of:
 *   - rip.js: death(), total_winner()
 *   - score.js: addScore(), showScores()
 *
 * These paths require player death or winning, which is hard to achieve
 * reproducibly in C harness sessions due to RNG differences.
 */

// localStorage mock (required by save.js/score.js/options.js)
if (typeof globalThis.localStorage === 'undefined') {
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
import { setGame } from '../js/gstate.js';
import { wireGameDeps, startGameState } from '../js/main.js';
import { death, total_winner } from '../js/rip.js';

import { MockDisplay } from './mock_display.mjs';
import { MockInput } from './mock_input.mjs';

/**
 * Set up a fully initialized game state with mocks.
 */
async function setupGame(seed) {
  const display = new MockDisplay();
  const input = new MockInput();

  const g = new GameState();
  g.display = display;
  g.input = input;
  g.rawRngLog = [];
  setGame(g);

  wireGameDeps(g);
  await startGameState(g, seed);

  return { g, display, input };
}

/**
 * Test death() — covers rip.js lines 55-95.
 * Kills the player by a monster and navigates the RIP screen.
 */
async function testDeath() {
  const { g, input } = await setupGame(42);

  // Pre-inject spaces: one for wait_for in death(), one for showScores()
  input.inject(' ');
  input.inject(' ');
  input.inject(' ');

  // Call death() as if killed by an Aquator ('A')
  await death('A');
  console.log('testDeath: PASS (death by Aquator covered)');
}

/**
 * Test death() with lowercase monst — covers killname() else branch (lines 44-49).
 */
async function testDeathArrow() {
  const { g, input } = await setupGame(43);

  input.inject(' ');
  input.inject(' ');
  input.inject(' ');

  // 'a' = killed by arrow (lowercase path in killname)
  await death('a');
  console.log('testDeathArrow: PASS (death by arrow covered)');
}

/**
 * Test total_winner() — covers rip.js lines 100-196.
 * Exercises the winning screen and inventory tallying, including all item types.
 */
async function testWinner() {
  const { g, input } = await setupGame(42);

  // Pre-inject spaces for wait_for calls in total_winner()
  input.inject(' ');
  input.inject(' ');
  input.inject(' ');

  // Simulate having the amulet
  g.amulet = true;
  g.level = 26;

  // Add one of each item type to pack to cover all branches in total_winner()
  // (starting pack has WEAPON, ARMOR, FOOD; need SCROLL, POTION, RING, STICK, AMULET)
  const { new_item } = await import('../js/list.js');

  function addItem(type, which, extra = {}) {
    const item = new_item({
      o_type: type, o_pos: { x: 0, y: 0 }, o_count: 1, o_which: which,
      o_hplus: 0, o_dplus: 0, o_flags: 0, o_group: 0,
      o_damage: '0d0', o_hurldmg: '0d0', o_ac: 11, o_launch: 100, o_charges: 0,
      ...extra,
    });
    // Append to pack
    if (g.pack === null) {
      g.pack = item;
      item.l_prev = item.l_next = null;
    } else {
      let tail = g.pack;
      while (tail.l_next) tail = tail.l_next;
      tail.l_next = item;
      item.l_prev = tail;
      item.l_next = null;
    }
    g.inpack++;
    return item;
  }

  addItem('?', 0, { o_count: 1 });     // SCROLL type
  addItem('!', 0, { o_count: 1 });     // POTION type
  addItem('=', 1, { o_ac: 2 });        // RING with o_ac > 0 (R_ADDSTR)
  addItem('=', 0, { o_ac: -1 });       // RING with o_ac <= 0 (R_PROTECT)
  addItem('/', 0, { o_charges: 5 });   // STICK type
  addItem(',', 0);                      // AMULET type

  await total_winner();
  console.log('testWinner: PASS (total_winner covered)');
}

// Run all coverage tests
await testDeath();
await testDeathArrow();
await testWinner();

console.log('coverage_extra: all tests complete');
