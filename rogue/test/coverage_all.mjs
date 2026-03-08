/**
 * coverage_all.mjs — Combined test runner for coverage collection.
 *
 * Runs all replay sessions AND the direct coverage tests in a single node
 * process so c8 can collect all code paths at once.
 *
 * Usage:
 *   npx c8 --include='rogue/js/**' node rogue/test/coverage_all.mjs --all rogue/test/sessions/
 */

// Re-run replay_test main logic by importing its helpers
import path from 'path';
import { readFileSync, readdirSync } from 'fs';

// localStorage mock — must come before any game module imports.
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

import { runSession } from './node_runner.mjs';
import { death, total_winner } from '../js/rip.js';
import { GameState } from '../js/game.js';
import { setGame } from '../js/gstate.js';
import { wireGameDeps, startGameState } from '../js/main.js';
import { saveGame, loadGameState, clearSave } from '../js/save.js';
import { MockDisplay } from './mock_display.mjs';
import { MockInput } from './mock_input.mjs';

// ===== Replay test logic (inline to avoid re-loading localStorage mock) =====

function compareScreens(jsScreen, cScreen) {
  let matches = 0, total = 0;
  const rows = Math.max(jsScreen.length, cScreen.length, 24);
  for (let r = 0; r < rows; r++) {
    const jsRow = (jsScreen[r] || '').padEnd(80);
    const cRow  = (cScreen[r] || '').padEnd(80);
    for (let c = 0; c < 80; c++) {
      total++;
      const jc = jsRow[c];
      const cc = cRow[c];
      if (jc === cc || (cc === '\u00fc' && jc === '|') || (cc === '\u00c0' && jc === '@')) matches++;
    }
  }
  return { matches, total };
}

function compareRng(jsRng, cRng) {
  const jsNums = (jsRng || []).filter(x => typeof x === 'number');
  const cNums  = (cRng  || []).filter(x => typeof x === 'number');
  let first = -1;
  const len = Math.min(jsNums.length, cNums.length);
  for (let i = 0; i < len; i++) {
    if (jsNums[i] !== cNums[i]) { first = i; break; }
  }
  return {
    match: first < 0 && jsNums.length === cNums.length,
    firstDiverge: first,
    jsLen: jsNums.length,
    cLen: cNums.length,
  };
}

async function replaySession(sessionFile) {
  const data = JSON.parse(readFileSync(sessionFile, 'utf8'));
  const cSteps = (data.steps || []).filter(s => s.key !== '\x00');
  const seed = data.seed;
  const name = path.basename(sessionFile, '.json');

  if (cSteps.length === 0) return;

  const keys = cSteps.map(s => s.key).join('');
  const runOpts = { wizard: !!data.wizard };

  let jsSteps;
  try {
    jsSteps = await runSession(seed, keys, runOpts);
  } catch (e) {
    console.log(JSON.stringify({ session: name, passed: false, error: e.message }));
    return;
  }

  const totalSteps = Math.min(jsSteps.length, cSteps.length);
  let totalScreenMatches = 0, totalScreenCells = 0;
  let totalRngMatches = 0, totalRngCells = 0;
  let firstScreenDiverge = -1, firstRngDiverge = -1;

  for (let i = 0; i < totalSteps; i++) {
    const sc = compareScreens(jsSteps[i].screen, cSteps[i].screen);
    totalScreenMatches += sc.matches;
    totalScreenCells += sc.total;
    if (sc.matches < sc.total && firstScreenDiverge < 0) firstScreenDiverge = i;

    const rc = compareRng(jsSteps[i].rng, cSteps[i].rng);
    const m = rc.firstDiverge < 0 ? rc.jsLen : rc.firstDiverge;
    totalRngMatches += m;
    totalRngCells += Math.max(rc.jsLen, rc.cLen, 1);
    if (!rc.match && firstRngDiverge < 0) firstRngDiverge = i;
  }

  const screenPct = totalScreenCells > 0 ? (totalScreenMatches / totalScreenCells * 100) : 0;
  const rngPct = totalRngCells > 0 ? (totalRngMatches / totalRngCells * 100) : 0;
  const passed = firstScreenDiverge < 0 && jsSteps.length === cSteps.length;

  console.log(JSON.stringify({
    session: name, seed, passed, total_steps: totalSteps,
    js_steps: jsSteps.length, c_steps: cSteps.length,
    screen_pct: Math.round(screenPct * 10) / 10,
    rng_pct: Math.round(rngPct * 10) / 10,
    first_screen_diverge: firstScreenDiverge,
    first_rng_diverge: firstRngDiverge,
  }));
}

// ===== Direct coverage tests for hard-to-reach paths =====

async function setupGame(seed) {
  const display = new MockDisplay();
  const input = new MockInput();
  const g = new GameState();
  g.display = display; g.input = input; g.rawRngLog = [];
  setGame(g);
  wireGameDeps(g);
  await startGameState(g, seed);
  return { g, input };
}

async function testDeath() {
  const { input } = await setupGame(42);
  input.inject(' '); input.inject(' '); input.inject(' ');
  await death('A');
}

async function testDeathArrow() {
  const { input } = await setupGame(43);
  input.inject(' '); input.inject(' '); input.inject(' ');
  await death('a');
}

async function testWinner() {
  const { g, input } = await setupGame(42);
  input.inject(' '); input.inject(' '); input.inject(' ');
  g.amulet = true;
  g.level = 26;

  // Add one of each item type to cover all branches in total_winner()
  const { new_item } = await import('../js/list.js');
  function addItem(type, which, extra = {}) {
    const item = new_item({
      o_type: type, o_pos: { x: 0, y: 0 }, o_count: 1, o_which: which,
      o_hplus: 0, o_dplus: 0, o_flags: 0, o_group: 0,
      o_damage: '0d0', o_hurldmg: '0d0', o_ac: 11, o_launch: 100, o_charges: 0,
      ...extra,
    });
    if (g.pack === null) { g.pack = item; item.l_prev = item.l_next = null; }
    else {
      let tail = g.pack;
      while (tail.l_next) tail = tail.l_next;
      tail.l_next = item; item.l_prev = tail; item.l_next = null;
    }
    g.inpack++;
    return item;
  }
  addItem('?', 0, { o_count: 1 });     // SCROLL
  addItem('!', 0, { o_count: 1 });     // POTION
  addItem('=', 1, { o_ac: 2 });        // RING with o_ac > 0 (R_ADDSTR)
  addItem('=', 0, { o_ac: -1 });       // RING with o_ac <= 0 (R_PROTECT)
  addItem('/', 0, { o_charges: 5 });   // STICK
  addItem(',', 0);                      // AMULET

  await total_winner();
}

async function testSaveLoad() {
  const { g, input } = await setupGame(42);
  input.inject('y');
  input.inject(' ');
  clearSave();
  await saveGame();
  // Load into a fresh game state
  const { g: g2 } = await setupGame(99);
  loadGameState(g2);
  clearSave();
}

// ===== Main =====

const args = process.argv.slice(2);
const allIdx = args.indexOf('--all');
if (allIdx >= 0 && allIdx + 1 < args.length) {
  const sessionsDir = args[allIdx + 1];
  const files = readdirSync(sessionsDir)
    .filter(f => f.endsWith('.json'))
    .sort()
    .map(f => path.join(sessionsDir, f));

  for (const f of files) {
    await replaySession(f);
  }
}

// Always run direct coverage tests
await testDeath();
await testDeathArrow();
await testWinner();
await testSaveLoad();
