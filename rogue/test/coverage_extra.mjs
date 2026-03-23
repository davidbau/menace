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
import { setGame } from '../js/gstate.js';
import { wireGameDeps, startGameState } from '../js/main.js';
import { death, total_winner } from '../js/rip.js';
import { saveGame, loadGameState, hasSave, clearSave } from '../js/save.js';

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

/**
 * Test saveGame() + loadGameState() — covers save.js lines 181-516.
 */
async function testSaveLoad() {
  const { g, input } = await setupGame(42);

  // Inject 'y' to confirm the save, then ' ' to clear the "Saved." --More-- prompt
  input.inject('y');
  input.inject(' ');

  clearSave();
  const saved = await saveGame();
  console.log('testSaveLoad saveGame:', saved !== false ? 'saved' : 'failed');

  // Now load it back into a new game state
  const { g: g2 } = await setupGame(99); // use different seed to distinguish
  const loaded = loadGameState(g2);
  console.log('testSaveLoad loadGameState:', loaded ? 'PASS (save/load covered)' : 'FAIL (load returned false)');
  clearSave();
}

/**
 * Test that SECRETDOOR ('&') never appears on the displayed screen.
 * In original Rogue, secret doors look like wall characters (| or -).
 * Our JS port uses '&' internally in stdscr but draw() must suppress it.
 *
 * Secret doors only appear at level 2+ (the C formula requires g.level >= 2),
 * so we directly inject '&' into stdscr to test the draw() suppression logic,
 * rather than relying on natural level generation to produce one.
 */
async function testSecretdoorDisplay() {
  const { g, display } = await setupGame(42);
  const { draw } = await import('../js/curses.js');

  // Inject a secret door '&' into stdscr at a known position
  const testRow = 5, testCol = 10;
  g.stdscr[testRow][testCol] = '&';

  // Redraw — draw() should suppress '&' (show as space since mw/cw are empty there)
  draw(g.stdscr);

  // Check that display shows space (not '&') at that position
  // display.getChar is 1-based: col testCol+1, row testRow+1
  const shown = display.getChar(testCol + 1, testRow + 1);
  if (shown === '&') {
    console.error(`testSecretdoorDisplay FAIL: '&' leaked to display at row ${testRow} col ${testCol}`);
    process.exit(1);
  }
  console.log(`testSecretdoorDisplay: PASS (stdscr '&' suppressed in draw(), shows '${shown}' on screen)`);
}

/**
 * Test that throwing an arrow north lands in a straight line (same column).
 * Uses seed 42 where the player starts in a room with open floor to the north.
 * Key sequence: t=throw, k=north direction, e=select arrows (inventory slot e),
 * then \0 to advance past the "throw" prompt so the landing position is visible.
 *
 * Also verifies that '&' (SECRETDOOR) never appears on any displayed screen:
 * in original Rogue, secret doors look like wall characters (| or -).
 */
async function testArrowStraightLine() {
  // runSession captures the screen state at each keypress, so step[0].screen
  // is the initial dungeon (rendered before 't' is processed).
  const { runSession } = await import('./node_runner.mjs');
  const steps = await runSession(42, 'tke\0');

  // Verify no '&' (SECRETDOOR) appears on any screen at any step
  for (let i = 0; i < steps.length; i++) {
    for (let r = 0; r < steps[i].screen.length; r++) {
      if ((steps[i].screen[r] || '').includes('&')) {
        console.error(`testArrowStraightLine FAIL: '&' on screen step ${i} row ${r}: ${steps[i].screen[r]}`);
        process.exit(1);
      }
    }
  }

  // Find player position in initial screen (step 0)
  const initScreen = steps[0].screen;
  let playerRow = -1, playerCol = -1;
  for (let r = 0; r < initScreen.length - 1; r++) {  // skip status bar row 23
    const c = (initScreen[r] || '').indexOf('@');
    if (c >= 0) { playerRow = r; playerCol = c; break; }
  }
  if (playerRow < 0) { console.error('testArrowStraightLine FAIL: player @ not found'); process.exit(1); }

  // After throw (last step), arrow ')' should be north of player in same column
  const lastScreen = steps[steps.length - 1].screen;
  let arrowRow = -1;
  for (let r = 0; r < playerRow; r++) {
    if ((lastScreen[r] || '')[playerCol] === ')') { arrowRow = r; break; }
  }
  if (arrowRow < 0) {
    console.error(`testArrowStraightLine FAIL: arrow ) not found in col ${playerCol} above row ${playerRow}`);
    console.error('Last screen:\n' + lastScreen.join('\n'));
    process.exit(1);
  }
  console.log(`testArrowStraightLine: PASS (arrow at row ${arrowRow} col ${playerCol}, ` +
              `player at row ${playerRow} — straight line north confirmed, no '&' on any screen)`);
}

// Run all coverage tests
await testDeath();
await testDeathArrow();
await testWinner();
await testSaveLoad();
await testSecretdoorDisplay();
await testArrowStraightLine();

console.log('coverage_extra: all tests complete');
