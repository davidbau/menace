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
import { saveGame, loadGameState, clearSave, hasSave } from '../js/save.js';
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

// ===== fight.js / monsters.js / options.js coverage =====

import {
  attack, fight, roll_em, str_plus, add_dam, is_magic,
  check_level, raise_level, killed, thunk, bounce, swing, save_throw,
} from '../js/fight.js';
import { new_monster, find_mons, wake_monster, DISTANCE, cansee } from '../js/monsters.js';
import { option, loadOptions } from '../js/options.js';
import {
  ISREGEN, ISCANC, ISBLIND, CANSEE, ISGREED, ISINVIS, ISMEAN, ISRUN, ISFOUND, ISHUH,
  ARMOR, WEAPON, POTION, SCROLL, RING, STICK, AMULET, FOOD,
  R_ADDDAM, R_ADDHIT, R_PROTECT, LEFT, RIGHT,
  ISMISL, WS_HIT, R_SUSTSTR, R_AGGR,
} from '../js/const.js';
import { new_item } from '../js/list.js';
import { genocide } from '../js/monsters.js';
import { wanderer } from '../js/monsters.js';

// ---- str_plus / add_dam: pure functions, no game needed ----
async function testStrFunctions() {
  // str_plus
  console.assert(str_plus({ st_str: 18, st_add: 100 }) === 3, 'str_plus 18/100');
  console.assert(str_plus({ st_str: 18, st_add: 60  }) === 2, 'str_plus 18/51+');
  console.assert(str_plus({ st_str: 18, st_add: 10  }) === 1, 'str_plus 18/<=50 (falls to >=17)');
  console.assert(str_plus({ st_str: 17, st_add: 0   }) === 1, 'str_plus 17');
  console.assert(str_plus({ st_str: 10, st_add: 0   }) === 0, 'str_plus 10');
  console.assert(str_plus({ st_str: 5,  st_add: 0   }) === -2, 'str_plus 5');
  // add_dam
  console.assert(add_dam({ st_str: 18, st_add: 100 }) === 6, 'add_dam 18/100');
  console.assert(add_dam({ st_str: 18, st_add: 95  }) === 5, 'add_dam 18/>90');
  console.assert(add_dam({ st_str: 18, st_add: 80  }) === 4, 'add_dam 18/>75');
  console.assert(add_dam({ st_str: 18, st_add: 50  }) === 3, 'add_dam 18/nonzero');
  console.assert(add_dam({ st_str: 18, st_add: 0   }) === 2, 'add_dam 18/0');
  console.assert(add_dam({ st_str: 16, st_add: 0   }) === 1, 'add_dam >15');
  console.assert(add_dam({ st_str: 10, st_add: 0   }) === 0, 'add_dam 10');
  console.assert(add_dam({ st_str: 5,  st_add: 0   }) === -2, 'add_dam 5');
  // swing: pure arithmetic
  console.assert(typeof swing(10, 5, 0) === 'boolean', 'swing returns bool');
  // save_throw: pure
  const tp = { t_stats: { s_lvl: 10 } };
  const result = save_throw(3, tp);
  console.assert(typeof result === 'boolean', 'save_throw returns bool');
}

// ---- is_magic: needs game state for ARMOR branch ----
async function testIsMagic() {
  const { g } = await setupGame(50);
  // ARMOR: magic if o_ac != a_class[which]
  const baseAc = g.a_class ? g.a_class[2] : 7;
  console.assert(is_magic({ o_type: ARMOR, o_which: 2, o_ac: baseAc + 1 }) === true,  'is_magic ARMOR magic');
  console.assert(is_magic({ o_type: ARMOR, o_which: 2, o_ac: baseAc     }) === false, 'is_magic ARMOR normal');
  // WEAPON
  console.assert(is_magic({ o_type: WEAPON, o_hplus: 1, o_dplus: 0 }) === true,  'is_magic WEAPON hplus');
  console.assert(is_magic({ o_type: WEAPON, o_hplus: 0, o_dplus: 1 }) === true,  'is_magic WEAPON dplus');
  console.assert(is_magic({ o_type: WEAPON, o_hplus: 0, o_dplus: 0 }) === false, 'is_magic WEAPON plain');
  // Always-magic types
  console.assert(is_magic({ o_type: POTION }) === true, 'is_magic POTION');
  console.assert(is_magic({ o_type: SCROLL }) === true, 'is_magic SCROLL');
  console.assert(is_magic({ o_type: STICK  }) === true, 'is_magic STICK');
  console.assert(is_magic({ o_type: RING   }) === true, 'is_magic RING');
  console.assert(is_magic({ o_type: AMULET }) === true, 'is_magic AMULET');
  console.assert(is_magic({ o_type: ARMOR, o_which: 0, o_ac: 0 }) !== undefined, 'is_magic ARMOR');
  // Unknown type → false
  console.assert(is_magic({ o_type: '%' }) === false, 'is_magic unknown');
}

// ---- Monster special attacks via attack(mp) ----
async function testSpecialAttacks() {
  const { g, input } = await setupGame(77);
  // Pre-inject many spaces for _msg prompts
  for (let i = 0; i < 500; i++) input.inject(' ');

  function mkMon(type, extraFlags = 0) {
    return {
      t_type: type, t_disguise: type, t_oldch: '.', t_dest: null,
      t_pack: null, t_turn: true,
      t_pos: { x: 3, y: 3 },
      t_flags: extraFlags,   // NOTE: no ISCANC so special attacks trigger
      t_stats: { s_lvl: 20, s_arm: -10, s_hpt: 100, s_dmg: '1d4', s_exp: 10,
                 s_str: { st_str: 10, st_add: 0 } },
    };
  }

  // Make player unkillable and ensure monster always hits
  g.player.t_stats.s_hpt = 100000;
  g.max_hp = 100000;
  g.player.t_stats.s_arm = 10;  // no armor class bonus
  g.cur_armor = null;

  // 'R' — rust armor: needs cur_armor with o_ac < 9
  g.cur_armor = { o_ac: 5, o_which: 2, o_type: '[', o_flags: 0, o_hplus: 0, o_dplus: 0 };
  g.terse = false;
  for (let i = 0; i < 5; i++) {
    if (g.cur_armor.o_ac < 9) await attack(mkMon('R'));
  }
  g.terse = true;
  if (g.cur_armor.o_ac < 9) await attack(mkMon('R'));  // terse branch
  g.cur_armor = null;

  // 'E' — eye transfixion (never calls hit(), checked via t_type !== 'E' skip)
  g.player.t_flags &= ~ISBLIND;
  g.no_command = 0;
  g.terse = false;
  for (let i = 0; i < 3; i++) await attack(mkMon('E'));
  g.terse = true;
  await attack(mkMon('E'));
  // 'E' with player blind (break branch)
  g.player.t_flags |= ISBLIND;
  await attack(mkMon('E'));
  g.player.t_flags &= ~ISBLIND;

  // 'A' — aquator strength drain (run many times to cover both save branches)
  g.player.t_stats.s_str = { st_str: 15, st_add: 0 };
  g.terse = false;
  for (let i = 0; i < 20; i++) {
    g.player.t_stats.s_str.st_str = Math.max(3, g.player.t_stats.s_str.st_str);
    await attack(mkMon('A'));
  }
  g.terse = true;
  for (let i = 0; i < 5; i++) await attack(mkMon('A'));

  // 'W' — wraith exp drain (15% chance per hit; run many times)
  g.player.t_stats.s_exp = 500000;
  g.player.t_stats.s_lvl = 10;
  for (let i = 0; i < 60; i++) {
    g.player.t_stats.s_hpt   = Math.max(50, g.player.t_stats.s_hpt);
    g.max_hp                  = Math.max(50, g.max_hp);
    g.player.t_stats.s_exp   = Math.max(1000, g.player.t_stats.s_exp);
    g.player.t_stats.s_lvl   = Math.max(2, g.player.t_stats.s_lvl);
    await attack(mkMon('W'));
  }

  // 'F' — fungus: hold player, increase fung_hit
  g.fung_hit = 0;
  for (let i = 0; i < 5; i++) await attack(mkMon('F'));
  // Fungus MISS branch (fung_hit damage on miss): give fungus low stats to miss sometimes
  const weakFungus = mkMon('F');
  weakFungus.t_stats.s_lvl = 1;
  weakFungus.t_stats.s_arm = 10;
  g.player.t_stats.s_arm = -20; // very good armor so fungus misses
  g.player.t_stats.s_hpt = 100000;
  g.fung_hit = 0;
  for (let i = 0; i < 20; i++) await attack(weakFungus);
  g.player.t_stats.s_arm = 10; // reset

  // 'L' — lich gold theft (find_mons returns null since monster not in mlist)
  g.purse = 10000;
  for (let i = 0; i < 10; i++) await attack(mkMon('L'));

  // 'N' — nymph item theft: needs magic items in pack
  // Add a potion (magic) to pack
  const magicPotion = new_item({
    o_type: POTION, o_pos: { x: 0, y: 0 }, o_count: 1, o_which: 0,
    o_hplus: 0, o_dplus: 0, o_flags: 0, o_group: 0,
    o_damage: '0d0', o_hurldmg: '0d0', o_ac: 0, o_launch: 0, o_charges: 0,
  });
  if (g.pack === null) {
    g.pack = magicPotion; magicPotion.l_prev = magicPotion.l_next = null;
  } else {
    let tail = g.pack; while (tail.l_next) tail = tail.l_next;
    tail.l_next = magicPotion; magicPotion.l_prev = tail; magicPotion.l_next = null;
  }
  g.inpack++;
  // Also a stack of potions (o_count > 1) to cover that branch
  const stackPotion = new_item({
    o_type: POTION, o_pos: { x: 0, y: 0 }, o_count: 3, o_which: 1,
    o_hplus: 0, o_dplus: 0, o_flags: 0, o_group: 0,
    o_damage: '0d0', o_hurldmg: '0d0', o_ac: 0, o_launch: 0, o_charges: 0,
  });
  if (g.pack === null) {
    g.pack = stackPotion; stackPotion.l_prev = stackPotion.l_next = null;
  } else {
    let tail = g.pack; while (tail.l_next) tail = tail.l_next;
    tail.l_next = stackPotion; stackPotion.l_prev = tail; stackPotion.l_next = null;
  }
  g.inpack++;
  g.cur_armor = null; g.cur_weapon = null;
  for (let i = 0; i < 40; i++) {
    // Keep both items in pack so nymph can steal either (covers both o_count branches)
    function ensurePack() {
      // single-item potion (o_count=1 → else branch)
      magicPotion.l_next = null; magicPotion.l_prev = null;
      stackPotion.l_next = null; stackPotion.l_prev = null;
      g.pack = magicPotion;
      magicPotion.l_next = stackPotion;
      stackPotion.l_prev = magicPotion;
      g.inpack = 2;
    }
    ensurePack();
    await attack(mkMon('N'));
  }

  // Fungus miss kills player (lines 241-243)
  g.player.t_flags &= ~0x10; // clear ISHELD
  g.fung_hit = 999;   // will deal 999 damage when fungus misses
  const weakFungus2 = mkMon('F');
  weakFungus2.t_stats.s_lvl = 1;
  g.player.t_stats.s_arm = -20; // excellent armor, fungus misses
  g.player.t_stats.s_hpt = 1;   // 1 HP, miss damage will kill
  // Need extra keys for the death screen
  for (let i = 0; i < 50; i++) input.inject(' ');
  await attack(weakFungus2);
  g.fung_hit = 0;
  g.player.t_stats.s_hpt = 100000;
  g.player.t_stats.s_arm = 10;
  g.max_hp = 100000;

  // ISREGEN flag: monster regenerates on miss (set flags on a non-special monster)
  const regenMon = mkMon('B');  // bat, unlikely to do special attack
  regenMon.t_flags = ISREGEN | ISCANC;  // ISCANC disables special, ISREGEN enables regen
  regenMon.t_stats.s_hpt = 5;
  g.player.t_stats.s_arm = -20; // great armor so bat misses
  for (let i = 0; i < 20; i++) await attack(regenMon);
  g.player.t_stats.s_arm = 10;

  // Non-blind player attacking mimic (lines 125-126 in attack())
  g.player.t_flags &= ~ISBLIND;
  await attack(mkMon('M'));

  // Blind player: prname() line 362 — non-null who while player is blind
  g.player.t_flags |= ISBLIND;
  await attack(mkMon('R'));  // hits → hit('it', null) → prname('it', true) → blind branch
  g.player.t_flags &= ~ISBLIND;

  // Player dies from monster hit (lines 133-135)
  g.player.t_stats.s_hpt = 1;
  g.player.t_stats.s_arm = 10;  // bad armor so monster hits
  g.max_hp = 1;
  for (let i = 0; i < 50; i++) input.inject(' ');
  await attack(mkMon('R'));  // rust monster always hits with s_lvl=20
  g.player.t_stats.s_hpt = 100000;
  g.max_hp = 100000;

  // Rust terse message (line 141): reset armor to o_ac < 9 before terse test
  g.cur_armor = { o_ac: 5, o_which: 2, o_type: '[', o_flags: 0, o_hplus: 0, o_dplus: 0 };
  g.terse = true;
  if (g.cur_armor.o_ac < 9) await attack(mkMon('R'));
  g.cur_armor = null;
  g.terse = false;

  // Spider 'A' with SUSTSTR ring (lines 161-163): fail poison save but ring protects
  const sustRing = { o_type: RING, o_which: R_SUSTSTR, o_ac: 0, o_flags: 0 };
  g.cur_ring = [sustRing, null];
  g.player.t_stats.s_str = { st_str: 18, st_add: 0 };
  g.terse = false;
  for (let i = 0; i < 20; i++) await attack(mkMon('A'));
  g.terse = true;
  for (let i = 0; i < 10; i++) await attack(mkMon('A'));
  g.cur_ring = [null, null];

  // Wraith 'W' when s_exp === 0 (lines 169-171 — instant death)
  g.player.t_stats.s_exp = 0;
  g.player.t_stats.s_lvl = 1;
  g.player.t_stats.s_hpt = 100000;
  g.max_hp = 100000;
  for (let i = 0; i < 50; i++) input.inject(' ');
  for (let i = 0; i < 30; i++) {
    if (g.player.t_stats.s_exp !== 0) break;
    await attack(mkMon('W'));  // 15% chance; exp=0 → _death
    // Restore after each death so we keep looping
    g.player.t_stats.s_exp = 0;
    g.player.t_stats.s_hpt = 100000;
    g.max_hp = 100000;
  }

  // Wraith 'W' s_lvl drains to 0 → reset to 1 (lines 174-175)
  g.player.t_stats.s_exp = 1;   // non-zero so no insta-death
  g.player.t_stats.s_lvl = 1;
  g.player.t_stats.s_hpt = 100000;
  g.max_hp = 100000;
  for (let i = 0; i < 30; i++) {
    g.player.t_stats.s_exp = 1;   // keep non-zero so drain runs
    g.player.t_stats.s_lvl = 1;
    g.player.t_stats.s_hpt = 100000;
    g.max_hp = 100000;
    await attack(mkMon('W'));
  }

  // Wraith 'W' max_hp goes below 1 (lines 184-186)
  g.player.t_stats.s_exp = 100000;
  g.player.t_stats.s_lvl = 10;
  g.player.t_stats.s_hpt = 100000;
  g.max_hp = 1;   // very low; roll(1,10) will push it negative
  for (let i = 0; i < 50; i++) input.inject(' ');
  for (let i = 0; i < 30; i++) {
    g.max_hp = 1;
    g.player.t_stats.s_hpt = 100000;
    g.player.t_stats.s_exp = 100000;
    g.player.t_stats.s_lvl = 10;
    await attack(mkMon('W'));
  }
  g.player.t_stats.s_hpt = 100000;
  g.max_hp = 100000;

  // fight() with unrevealed mimic (lines 85-88 in fight())
  {
    const mPos = { x: 30, y: 5 };
    if (!g.cw[mPos.y]) g.cw[mPos.y] = new Array(80).fill(' ');
    if (!g.mw[mPos.y]) g.mw[mPos.y] = new Array(80).fill(' ');
    const mItem = new_item({
      t_pos: { x: mPos.x, y: mPos.y }, t_type: 'M', t_disguise: '!', t_oldch: '.',
      t_dest: null, t_flags: 0, t_pack: null, t_turn: true,
      t_stats: { s_lvl: 1, s_arm: 10, s_hpt: 100, s_dmg: '1d4', s_exp: 50,
                 s_str: { st_str: 10, st_add: 0 } },
    });
    const { _attach: laFight } = await import('../js/list.js');
    const lpFight = { val: g.mlist };
    laFight(lpFight, mItem);
    g.mlist = lpFight.val;
    g.mw[mPos.y][mPos.x] = 'M';
    g.player.t_flags &= ~ISBLIND;
    // fight(coord, montype, weap, thrown=false)
    await fight({ x: mPos.x, y: mPos.y }, 'M', null, false);
  }
}

// ---- Misc fight.js: thunk/bounce non-WEAPON, killed, roll_em hurled ----
async function testFightMisc() {
  const { g, input } = await setupGame(88);
  for (let i = 0; i < 200; i++) input.inject(' ');

  // thunk / bounce with non-WEAPON type (else branch)
  const nonWeapon = { o_type: POTION, o_which: 0, o_hplus: 0, o_dplus: 0, o_flags: 0,
                      o_damage: '1d4', o_hurldmg: '1d4', o_ac: 0 };
  const weaponObj = { o_type: WEAPON, o_which: 0, o_hplus: 0, o_dplus: 0, o_flags: 0,
                      o_damage: '1d6', o_hurldmg: '1d4', o_ac: 0 };
  await thunk(nonWeapon, 'bat');
  await thunk(weaponObj, 'bat');
  await bounce(nonWeapon, 'bat');
  await bounce(weaponObj, 'bat');

  // raise_level: sets exp to next threshold, calls check_level
  g.player.t_stats.s_lvl = 1;
  g.player.t_stats.s_exp = 0;
  g.max_hp = 20;
  g.player.t_stats.s_hpt = 10;
  await raise_level();  // should announce level up

  // check_level when already at max
  g.player.t_stats.s_exp = 0;
  g.player.t_stats.s_lvl = 1;
  await check_level();  // no level up

  // roll_em with hurled weapon + launcher (prop_hplus/prop_dplus branch)
  const arrow = {
    o_type: WEAPON, o_which: 2, o_flags: 0x02,  // ISMISL
    o_hplus: 1, o_dplus: 1, o_damage: '1d6', o_hurldmg: '1d6', o_launch: 1,
    o_ac: 0,
  };
  const bow = { o_type: WEAPON, o_which: 1, o_hplus: 2, o_dplus: 1 };
  g.cur_weapon = bow;  // bow matches arrow's o_launch
  const defender = { s_lvl: 1, s_arm: 10, s_hpt: 100, s_dmg: '1d4',
                     s_str: { st_str: 10, st_add: 0 }, s_exp: 0 };
  // hurl with launcher: should use hurldmg + prop bonuses
  for (let i = 0; i < 5; i++) roll_em(g.player.t_stats, defender, arrow, true);
  // hurl without matching launcher (ISMISL but cur_weapon.o_which !== o_launch)
  const arrow2 = { ...arrow, o_launch: 99 };
  for (let i = 0; i < 5; i++) roll_em(g.player.t_stats, defender, arrow2, true);
  // hurl non-missile weapon (uses o_hurldmg)
  const rock = { o_type: WEAPON, o_which: 5, o_flags: 0, o_hplus: 0, o_dplus: 0,
                 o_damage: '1d2', o_hurldmg: '1d4', o_launch: 0, o_ac: 0 };
  for (let i = 0; i < 5; i++) roll_em(g.player.t_stats, defender, rock, true);

  // ring bonuses in roll_em: ADDDAM, ADDHIT, PROTECT
  const ringL = { o_type: RING, o_which: 3, o_ac: 2, o_flags: 0 };  // R_ADDDAM=3
  const ringR = { o_type: RING, o_which: 4, o_ac: 1, o_flags: 0 };  // R_ADDHIT=4
  g.cur_ring = [ringL, ringR];
  const sword = { o_type: WEAPON, o_which: 3, o_hplus: 0, o_dplus: 0, o_flags: 0,
                  o_damage: '1d8', o_hurldmg: '1d4', o_ac: 0 };
  g.cur_weapon = sword;
  // Inject ISRING deps (they come from wireGameDeps — should already be set)
  for (let i = 0; i < 5; i++) roll_em(g.player.t_stats, defender, sword, false);

  // Correct ISMISL flag (0o020000) for hurl-with-launcher path (lines 302-304)
  const arrow3 = {
    o_type: WEAPON, o_which: 2, o_flags: ISMISL,
    o_hplus: 1, o_dplus: 1, o_damage: '1d6', o_hurldmg: '2d6', o_launch: 1, o_ac: 0,
  };
  const bow2 = { o_type: WEAPON, o_which: 1, o_hplus: 2, o_dplus: 3 };
  g.cur_weapon = bow2;  // o_which=1 matches arrow3.o_launch=1
  for (let i = 0; i < 5; i++) roll_em(g.player.t_stats, defender, arrow3, true);

  // Stick WS_HIT with 0 charges sets damage to 0d0 (lines 311-313)
  const depletedWand = {
    o_type: STICK, o_which: WS_HIT, o_charges: 0, o_flags: 0,
    o_hplus: 1, o_dplus: 1, o_damage: '1d8', o_hurldmg: '1d4', o_ac: 0,
  };
  g.cur_weapon = depletedWand;
  for (let i = 0; i < 3; i++) roll_em(g.player.t_stats, defender, depletedWand, false);

  // killed() with blind player (covers "it." branch)
  g.player.t_flags |= ISBLIND;
  g.player.t_stats.s_exp = 0;
  const monItem = new_item({
    t_pos: { x: 2, y: 2 }, t_type: 'B', t_disguise: 'B', t_oldch: '.',
    t_dest: null, t_flags: 0, t_pack: null, t_turn: true,
    t_stats: { s_lvl: 1, s_arm: 10, s_hpt: -1, s_dmg: '1d4', s_exp: 25,
               s_str: { st_str: 10, st_add: 0 } },
  });
  // Add to mlist so removeM works
  const { _attach: listAttach } = await import('../js/list.js');
  const listp = { val: g.mlist };
  listAttach(listp, monItem);
  g.mlist = listp.val;
  mvwaddch_stub(g, monItem.l_data.t_pos.y, monItem.l_data.t_pos.x, 'B');
  await killed(monItem, true);  // pr=true, blind → "it."
  g.player.t_flags &= ~ISBLIND;

  // killed() terse=false, pr=true, sighted
  g.terse = false;
  const monItem2 = new_item({
    t_pos: { x: 4, y: 4 }, t_type: 'R', t_disguise: 'R', t_oldch: '.',
    t_dest: null, t_flags: 0,
    t_pack: null,
    t_turn: true,
    t_stats: { s_lvl: 1, s_arm: 10, s_hpt: -1, s_dmg: '1d4', s_exp: 50,
               s_str: { st_str: 10, st_add: 0 } },
  });
  const listp2 = { val: g.mlist };
  listAttach(listp2, monItem2);
  g.mlist = listp2.val;
  mvwaddch_stub(g, 4, 4, 'R');
  await killed(monItem2, true);
  g.terse = true;

  // killed() with pack items (tp.t_pack non-null)
  const packItem = new_item({
    o_type: POTION, o_pos: { x: 5, y: 5 }, o_count: 1, o_which: 0,
    o_hplus: 0, o_dplus: 0, o_flags: 0, o_group: 0,
    o_damage: '0d0', o_hurldmg: '0d0', o_ac: 0, o_launch: 0, o_charges: 0,
  });
  const monItem3 = new_item({
    t_pos: { x: 6, y: 6 }, t_type: 'B', t_disguise: 'B', t_oldch: '.',
    t_dest: null, t_flags: 0,
    t_pack: packItem,  // monster carries an item
    t_turn: true,
    t_stats: { s_lvl: 1, s_arm: 10, s_hpt: -1, s_dmg: '1d4', s_exp: 10,
               s_str: { st_str: 10, st_add: 0 } },
  });
  const listp3 = { val: g.mlist };
  listAttach(listp3, monItem3);
  g.mlist = listp3.val;
  mvwaddch_stub(g, 6, 6, 'B');
  await killed(monItem3, false);  // pr=false, pack drop covered

  // killed() 'F' case (clear fungus hold)
  g.player.t_flags |= 0x10; // ISHELD
  g.fung_hit = 5;
  const fungItem = new_item({
    t_pos: { x: 7, y: 7 }, t_type: 'F', t_disguise: 'F', t_oldch: '.',
    t_dest: null, t_flags: 0, t_pack: null, t_turn: true,
    t_stats: { s_lvl: 1, s_arm: 10, s_hpt: -1, s_dmg: '1d4', s_exp: 80,
               s_str: { st_str: 10, st_add: 0 } },
  });
  const listp4 = { val: g.mlist };
  listAttach(listp4, fungItem);
  g.mlist = listp4.val;
  mvwaddch_stub(g, 7, 7, 'F');
  await killed(fungItem, false);

  // killed() 'L' case — lich in a room with goldval (lines 532-544)
  if (g.rooms && g.rooms.length > 0) {
    const room = g.rooms[0];
    room.r_goldval = 100;
    room.r_gold = { x: room.r_pos.x + 2, y: room.r_pos.y + 1 };
    const lPos = { x: room.r_pos.x + 1, y: room.r_pos.y + 1 };
    if (!g.cw[lPos.y]) g.cw[lPos.y] = new Array(80).fill(' ');
    if (!g.mw[lPos.y]) g.mw[lPos.y] = new Array(80).fill(' ');
    if (g.stdscr && !g.stdscr[room.r_gold.y]) g.stdscr[room.r_gold.y] = new Array(80).fill(' ');
    const lichItem = new_item({
      t_pos: { x: lPos.x, y: lPos.y }, t_type: 'L', t_disguise: 'L', t_oldch: '.',
      t_dest: null, t_flags: 0, t_pack: null, t_turn: true,
      t_stats: { s_lvl: 3, s_arm: 3, s_hpt: -1, s_dmg: '1d4', s_exp: 250,
                 s_str: { st_str: 10, st_add: 0 } },
    });
    const listp5 = { val: g.mlist };
    listAttach(listp5, lichItem);
    g.mlist = listp5.val;
    if (g.mw[lPos.y]) g.mw[lPos.y][lPos.x] = 'L';
    // Run multiple times to cover both save branches (VS_MAGIC)
    for (let i = 0; i < 10; i++) {
      room.r_goldval = 100;
      const lItem2 = new_item({
        t_pos: { x: lPos.x, y: lPos.y }, t_type: 'L', t_disguise: 'L', t_oldch: '.',
        t_dest: null, t_flags: 0, t_pack: null, t_turn: true,
        t_stats: { s_lvl: 3, s_arm: 3, s_hpt: -1, s_dmg: '1d4', s_exp: 250,
                   s_str: { st_str: 10, st_add: 0 } },
      });
      const lp6 = { val: g.mlist };
      listAttach(lp6, lItem2);
      g.mlist = lp6.val;
      if (g.mw[lPos.y]) g.mw[lPos.y][lPos.x] = 'L';
      await killed(lItem2, false);
    }
  }
}

// Small helper: write a char into g.mw so removeM doesn't crash
function mvwaddch_stub(g, y, x, ch) {
  if (!g.mw) return;
  if (!g.mw[y]) g.mw[y] = new Array(80).fill(' ');
  g.mw[y][x] = ch;
  if (!g.cw) return;
  if (!g.cw[y]) g.cw[y] = new Array(80).fill(' ');
}

// ---- monsters.js: mimic types, wake_monster paths ----
async function testMimicTypes() {
  const { g, input } = await setupGame(33);
  for (let i = 0; i < 50; i++) input.inject(' ');

  // new_monster type 'M': run many times to cover all switch cases (GOLD/POTION/SCROLL/etc.)
  // With level 1, max_items=8, so cases 0–7. With level>25, case 8 (AMULET) available.
  const positions = [
    {x:10,y:5},{x:11,y:5},{x:12,y:5},{x:13,y:5},{x:14,y:5},
    {x:10,y:6},{x:11,y:6},{x:12,y:6},{x:13,y:6},{x:14,y:6},
    {x:10,y:7},{x:11,y:7},{x:12,y:7},{x:13,y:7},{x:14,y:7},
  ];
  // Set up cw/mw arrays at these positions
  for (const p of positions) {
    if (!g.cw[p.y]) g.cw[p.y] = new Array(80).fill(' ');
    if (!g.mw[p.y]) g.mw[p.y] = new Array(80).fill(' ');
  }
  for (let i = 0; i < positions.length; i++) {
    const cp = positions[i];
    const item = new_item({
      t_pos: { x: cp.x, y: cp.y }, t_type: 'M', t_disguise: 'M', t_oldch: '.',
      t_dest: null, t_flags: 0, t_pack: null, t_turn: true,
      t_stats: { s_lvl: 1, s_arm: 10, s_hpt: 5, s_dmg: '1d4', s_exp: 50,
                 s_str: { st_str: 10, st_add: 0 } },
    });
    new_monster(item, 'M', cp);
  }
  // Level > 25 for AMULET case (case 8)
  const savedLevel = g.level;
  g.level = 26;
  for (let i = 0; i < 10; i++) {
    const cp = { x: 20, y: 8 };
    if (!g.cw[cp.y]) g.cw[cp.y] = new Array(80).fill(' ');
    if (!g.mw[cp.y]) g.mw[cp.y] = new Array(80).fill(' ');
    const item = new_item({
      t_pos: { x: cp.x, y: cp.y }, t_type: 'M', t_disguise: 'M', t_oldch: '.',
      t_dest: null, t_flags: 0, t_pack: null, t_turn: true,
      t_stats: { s_lvl: 1, s_arm: 10, s_hpt: 5, s_dmg: '1d4', s_exp: 50,
                 s_str: { st_str: 10, st_add: 0 } },
    });
    new_monster(item, 'M', cp);
  }
  g.level = savedLevel;

  // new_monster with AGGR ring worn (lines 93-95): _runto called on monster creation
  {
    const aggrRing = { o_type: RING, o_which: R_AGGR, o_ac: 0, o_flags: 0 };
    g.cur_ring = [aggrRing, null];
    const cp = { x: 24, y: 8 };
    if (!g.cw[cp.y]) g.cw[cp.y] = new Array(80).fill(' ');
    if (!g.mw[cp.y]) g.mw[cp.y] = new Array(80).fill(' ');
    const aggrItem = new_item({
      t_pos: { x: cp.x, y: cp.y }, t_type: 'B', t_disguise: 'B', t_oldch: '.',
      t_dest: null, t_flags: 0, t_pack: null, t_turn: true,
      t_stats: { s_lvl: 1, s_arm: 10, s_hpt: 5, s_dmg: '1d2', s_exp: 1,
                 s_str: { st_str: 10, st_add: 0 } },
    });
    new_monster(aggrItem, 'B', cp);
    g.cur_ring = [null, null];
  }

  // new_monster 'M' with existing t_pack (lines 99-100): tp.t_pack !== null → use pack item type
  {
    const packForMimic = new_item({
      o_type: WEAPON, o_pos: { x: 0, y: 0 }, o_count: 1, o_which: 3,
      o_hplus: 0, o_dplus: 0, o_flags: 0, o_group: 0,
      o_damage: '1d8', o_hurldmg: '1d4', o_ac: 0, o_launch: 0, o_charges: 0,
    });
    const cp = { x: 22, y: 8 };
    if (!g.cw[cp.y]) g.cw[cp.y] = new Array(80).fill(' ');
    if (!g.mw[cp.y]) g.mw[cp.y] = new Array(80).fill(' ');
    const mItemPack = new_item({
      t_pos: { x: cp.x, y: cp.y }, t_type: 'M', t_disguise: 'M', t_oldch: '.',
      t_dest: null, t_flags: 0, t_pack: packForMimic, t_turn: true,
      t_stats: { s_lvl: 1, s_arm: 10, s_hpt: 5, s_dmg: '1d4', s_exp: 50,
                 s_str: { st_str: 10, st_add: 0 } },
    });
    new_monster(mItemPack, 'M', cp);
  }
}

async function testWakeMonsterPaths() {
  const { g, input } = await setupGame(55);
  for (let i = 0; i < 200; i++) input.inject(' ');

  // Set up an Umber Hulk ('U') in mlist
  const uPos = { x: 15, y: 5 };
  if (!g.cw[uPos.y]) g.cw[uPos.y] = new Array(80).fill(' ');
  if (!g.mw[uPos.y]) g.mw[uPos.y] = new Array(80).fill(' ');

  const uItem = new_item({
    t_pos: { x: uPos.x, y: uPos.y }, t_type: 'U', t_disguise: 'U', t_oldch: '.',
    t_dest: null, t_flags: ISMEAN, t_pack: null, t_turn: true,
    t_stats: { s_lvl: 8, s_arm: 2, s_hpt: 40, s_dmg: '3d4/3d4', s_exp: 1200,
               s_str: { st_str: 10, st_add: 0 } },
  });
  const { _attach: la } = await import('../js/list.js');
  const lp = { val: g.mlist };
  la(lp, uItem);
  g.mlist = lp.val;
  if (g.mw[uPos.y]) g.mw[uPos.y][uPos.x] = 'U';

  // Put player near Umber Hulk (distance < 3) so confusion triggers
  g.player.t_pos = { x: uPos.x + 1, y: uPos.y };
  g.player.t_flags &= ~ISBLIND;

  // Repeatedly wake to cover ISFOUND / lengthen / ISHUH branches
  for (let i = 0; i < 20; i++) {
    uItem.l_data.t_flags &= ~ISFOUND;  // reset so confusion check re-runs
    g.player.t_flags &= ~ISHUH;
    await wake_monster(uPos.y, uPos.x);
  }
  // With ISHUH already set → lengthen branch (line 171): run many times until save fails
  const savedLvl = g.player.t_stats.s_lvl;
  g.player.t_stats.s_lvl = 30;  // very high level → save threshold very low → usually fails
  for (let i = 0; i < 30; i++) {
    g.player.t_flags |= ISHUH;
    uItem.l_data.t_flags &= ~ISFOUND;
    await wake_monster(uPos.y, uPos.x);
  }
  g.player.t_stats.s_lvl = savedLvl;

  // Greedy monster ('D' dragon has ISGREED) – set up in a room with gold
  const dPos = { x: 20, y: 10 };
  if (!g.cw[dPos.y]) g.cw[dPos.y] = new Array(80).fill(' ');
  if (!g.mw[dPos.y]) g.mw[dPos.y] = new Array(80).fill(' ');

  const dItem = new_item({
    t_pos: { x: dPos.x, y: dPos.y }, t_type: 'D', t_disguise: 'D', t_oldch: '.',
    t_dest: null, t_flags: ISGREED, t_pack: null, t_turn: true,
    t_stats: { s_lvl: 10, s_arm: -1, s_hpt: 80, s_dmg: '3d8', s_exp: 9000,
               s_str: { st_str: 10, st_add: 0 } },
  });
  const lp2 = { val: g.mlist };
  la(lp2, dItem);
  g.mlist = lp2.val;
  if (g.mw[dPos.y]) g.mw[dPos.y][dPos.x] = 'D';

  // Find a room and set r_goldval so greedy guard behavior triggers
  if (g.rooms && g.rooms.length > 0) {
    g.rooms[0].r_goldval = 100;
    g.rooms[0].r_gold = { x: dPos.x + 1, y: dPos.y };
    // Put dragon in that room by faking its pos to match room
    dItem.l_data.t_pos = { x: g.rooms[0].r_pos.x + 1, y: g.rooms[0].r_pos.y + 1 };
  }
  await wake_monster(dPos.y, dPos.x);

  // Invisible monster path (ISINVIS, player can't see = !CANSEE)
  const iPos = { x: 25, y: 5 };
  if (!g.cw[iPos.y]) g.cw[iPos.y] = new Array(80).fill(' ');
  if (!g.mw[iPos.y]) g.mw[iPos.y] = new Array(80).fill(' ');
  const iItem = new_item({
    t_pos: { x: iPos.x, y: iPos.y }, t_type: 'I', t_disguise: 'I', t_oldch: '.',
    t_dest: null, t_flags: ISINVIS, t_pack: null, t_turn: true,
    t_stats: { s_lvl: 5, s_arm: 3, s_hpt: 20, s_dmg: '1d8', s_exp: 300,
               s_str: { st_str: 10, st_add: 0 } },
  });
  const lp3 = { val: g.mlist };
  la(lp3, iItem);
  g.mlist = lp3.val;
  if (g.mw[iPos.y]) g.mw[iPos.y][iPos.x] = 'I';
  g.player.t_flags &= ~CANSEE;
  await wake_monster(iPos.y, iPos.x);
  // Now with CANSEE set
  g.player.t_flags |= CANSEE;
  iItem.l_data.t_flags = ISINVIS;
  await wake_monster(iPos.y, iPos.x);
  g.player.t_flags &= ~CANSEE;

  // find_mons miss path → "Can't find monster" message
  await wake_monster(0, 0);  // no monster at 0,0

  // Greedy monster with r_goldval in valid room (lines 188-193)
  if (g.rooms && g.rooms.length > 0) {
    const rp = g.rooms[0];
    const gPos = { x: rp.r_pos.x + 2, y: rp.r_pos.y + 1 };
    if (!g.cw[gPos.y]) g.cw[gPos.y] = new Array(80).fill(' ');
    if (!g.mw[gPos.y]) g.mw[gPos.y] = new Array(80).fill(' ');
    const gItem = new_item({
      t_pos: { x: gPos.x, y: gPos.y }, t_type: 'D', t_disguise: 'D', t_oldch: '.',
      t_dest: null, t_flags: ISGREED, t_pack: null, t_turn: true,
      t_stats: { s_lvl: 10, s_arm: -1, s_hpt: 80, s_dmg: '3d8', s_exp: 9000,
                 s_str: { st_str: 10, st_add: 0 } },
    });
    gItem.l_data.t_pos = { x: gPos.x, y: gPos.y };
    const { _attach: laG } = await import('../js/list.js');
    const lpG = { val: g.mlist };
    laG(lpG, gItem);
    g.mlist = lpG.val;
    g.mw[gPos.y][gPos.x] = 'D';
    rp.r_goldval = 50;
    rp.r_gold = { x: gPos.x + 1, y: gPos.y };
    await wake_monster(gPos.y, gPos.x);
  }

  // wanderer() with wizard=true (lines 143-145)
  const savedWiz = g.wizard;
  g.wizard = true;
  for (let i = 0; i < 50; i++) input.inject(' ');
  await wanderer();
  g.wizard = savedWiz;

  // genocide() — send valid letter then escape, and a non-letter first
  for (let i = 0; i < 50; i++) input.inject(' ');
  input.inject('1');    // invalid — triggers "Please specify..." branch (lines 262-264)
  input.inject('\x1b'); // escape to exit genocide
  await genocide();

  // genocide() with a valid letter (lowercase→uppercase), removing a monster
  {
    // Add a bat to mlist so genocide can remove it
    const bPos = { x: 40, y: 5 };
    if (!g.cw[bPos.y]) g.cw[bPos.y] = new Array(80).fill(' ');
    if (!g.mw[bPos.y]) g.mw[bPos.y] = new Array(80).fill(' ');
    const bItem = new_item({
      t_pos: { x: bPos.x, y: bPos.y }, t_type: 'B', t_disguise: 'B', t_oldch: '.',
      t_dest: null, t_flags: 0, t_pack: null, t_turn: true,
      t_stats: { s_lvl: 1, s_arm: 10, s_hpt: 5, s_dmg: '1d2', s_exp: 1,
                 s_str: { st_str: 10, st_add: 0 } },
    });
    const { _attach: laB } = await import('../js/list.js');
    const lpB = { val: g.mlist };
    laB(lpB, bItem);
    g.mlist = lpB.val;
    g.mw[bPos.y][bPos.x] = 'B';
    g.lvl_mons = g.lvl_mons || new Array(26).fill(' ');
    g.wand_mons = g.wand_mons || new Array(26).fill(' ');
    g.lvl_mons[1] = 'B';  // index 1 = 'B'
    for (let i = 0; i < 20; i++) input.inject(' ');
    input.inject('b');   // lowercase → B (genocide that type)
    await genocide();
  }
}

// ---- options.js: interactive option screen ----
async function testOptionsScreen() {
  const { g, input } = await setupGame(66);

  // loadOptions() with malformed JSON (error path)
  localStorage.setItem('rogue-options', 'not-json');
  loadOptions();  // should silently catch

  // loadOptions() with valid options
  localStorage.setItem('rogue-options', JSON.stringify({
    terse: true, fight_flush: false, jump: true, slow_invent: false, askme: true,
    whoami: 'TestHero', fruit: 'mango',
  }));
  loadOptions();

  // option() interactive screen:
  // 'a' → toggle terse (bool)
  // 'b' → toggle fight_flush (another bool)
  // 'f' → edit whoami (string): type 'X', backspace, 'Y', enter
  // 'g' → edit fruit (string): type 'A', ESC (restore)
  // ' ' → save and quit
  input.inject('a');    // toggle bool 0 (terse)
  input.inject('b');    // toggle bool 1 (fight_flush)
  input.inject('f');    // edit string 0 (whoami)
  // inner loop for string editing:
  input.inject('X');    // type char (buf.length < 30 branch)
  input.inject('\x7f'); // backspace (buf.length > 0 branch)
  input.inject('Y');    // type char
  input.inject('\r');   // confirm (exit inner loop)
  input.inject('g');    // edit string 1 (fruit)
  // type 31 chars to hit the length-limit branch
  for (let i = 0; i < 31; i++) input.inject('z');
  input.inject('\x1b'); // escape (restore original, exit inner loop)
  input.inject(' ');    // save and quit

  await option();

  console.assert(typeof g.terse === 'boolean', 'options: terse is bool');
}

// ===== Daemons, misc.js, move.js extra coverage =====

import { doctor, unsee, sight, stomach, unconfuse } from '../js/daemons.js';
import { search, chg_str, look } from '../js/misc.js';
import { be_trapped, trap_at, rndmove, do_move, show } from '../js/move.js';
import {
  SECRETDOOR, DOOR, TRAP, TRAPDOOR, BEARTRAP, SLEEPTRAP,
  ARROWTRAP, TELTRAP, DARTTRAP, FLOOR, PASSAGE,
} from '../js/const.js';

async function testDaemonsPaths() {
  const { g, input } = await setupGame(77);
  for (let i = 0; i < 100; i++) input.inject(' ');

  // doctor() at level >= 8 with quiet >= 3 (lines 44-45)
  g.player.t_stats.s_lvl = 9;
  g.player.t_stats.s_hpt = 50;
  g.max_hp = 100;
  g.quiet = 5;
  doctor();
  g.player.t_stats.s_lvl = 1;

  // unsee(): clear CANSEE (lines 92-94)
  g.player.t_flags |= CANSEE;
  unsee();
  console.assert(!(g.player.t_flags & CANSEE), 'unsee: CANSEE cleared');

  // sight(): restore sight when blind (lines 102-106)
  g.player.t_flags |= ISBLIND;
  await sight();
  // Call again when NOT blind (early return path)
  g.player.t_flags &= ~ISBLIND;
  await sight();

  // stomach(): food_left <= 0 → faint path (lines 124-130)
  g.food_left = 0;
  g.no_command = 0;
  for (let i = 0; i < 20; i++) await stomach(); // runs until 80% rnd triggers
  g.food_left = 1000;

  // stomach(): 2*MORETIME crossing (food 300→299, lines 141-147)
  // oldfood=300 >= 300, new food_left=299 < 300 → non-terse "starting to get hungry"
  g.food_left = 300;
  await stomach();
  g.hungry_state = 0;

  // stomach(): terse version of 2*MORETIME crossing
  g.terse = true;
  g.food_left = 300;
  await stomach(); // terse: "Getting hungry"
  g.terse = false;
  g.hungry_state = 0;

  // stomach(): MORETIME crossing (food 150→149, lines 138-139)
  // oldfood=150 >= 150, new food_left=149 < 150 → "starting to feel weak"
  g.food_left = 150;
  await stomach();
  g.hungry_state = 0;
  g.food_left = 1000;

  // status() with hungry_state > 0: covers hunger display (io.js lines 176-180)
  const { status } = await import('../js/io.js');
  const { resetStatus } = await import('../js/io.js');
  resetStatus();
  for (const hs of [1, 2, 3]) {
    g.hungry_state = hs;
    status();
    resetStatus(); // force re-render next call
  }
  g.hungry_state = 0;
}

async function testSearchPaths() {
  const { g, input } = await setupGame(88);
  for (let i = 0; i < 50; i++) input.inject(' ');

  // search() with secret door adjacent (lines 363-367)
  // Place player at (5, 5), secret door at (5, 6)
  g.player.t_pos = { x: 5, y: 5 };
  g.player.t_flags &= ~0x04; // not blind
  if (!g.stdscr[5]) g.stdscr[5] = new Array(80).fill(' ');
  if (!g.stdscr[4]) g.stdscr[4] = new Array(80).fill(' ');
  if (!g.stdscr[6]) g.stdscr[6] = new Array(80).fill(' ');
  if (!g.cw[5]) g.cw[5] = new Array(80).fill(' ');
  if (!g.cw[4]) g.cw[4] = new Array(80).fill(' ');
  if (!g.cw[6]) g.cw[6] = new Array(80).fill(' ');
  // Run many times so rnd(100) < 20 triggers at least once
  for (let i = 0; i < 50; i++) {
    g.stdscr[5][6] = SECRETDOOR;
    await search();
  }

  // search() with hidden trap adjacent (lines 369-380)
  // Set up a trap at (5, 6), not yet shown in cw
  g.ntraps = 1;
  g.traps[0] = { tr_pos: { x: 6, y: 5 }, tr_type: BEARTRAP, tr_flags: 0 };
  g.stdscr[5][6] = TRAP;
  g.cw[5][6] = ' '; // not revealed in cw yet
  // Run many times so rnd(100) <= 50 triggers
  for (let i = 0; i < 50; i++) {
    g.cw[5][6] = ' '; // reset so it's not already revealed
    g.traps[0].tr_flags = 0;
    await search();
  }

  // chg_str high add paths (lines 245, 247 in misc.js)
  // st_add 51-75 range → line 245: becomes 76+rnd(14)
  g.player.t_stats.s_str = { st_str: 18, st_add: 60 };
  chg_str(1);
  // st_add 76-90 → line 247: becomes 91
  g.player.t_stats.s_str = { st_str: 18, st_add: 80 };
  chg_str(1);
  // st_add 91-99 → line 248: st_add++
  g.player.t_stats.s_str = { st_str: 18, st_add: 95 };
  chg_str(1);

  // chg_str high add DECREASE paths (lines 271-272 in misc.js)
  // st_add 76-90 → decrease: line 265 → becomes 51+rnd(25)
  g.player.t_stats.s_str = { st_str: 18, st_add: 80 };
  chg_str(-1);
  // st_add 91-99 → decrease: line 267 → becomes 76+rnd(14)
  g.player.t_stats.s_str = { st_str: 18, st_add: 95 };
  chg_str(-1);
  // st_add = 100 → decrease: line 271 → becomes 91+rnd(8)
  g.player.t_stats.s_str = { st_str: 18, st_add: 100 };
  chg_str(-1);
}

async function testTrapPaths() {
  const { g, input } = await setupGame(99);
  for (let i = 0; i < 500; i++) input.inject(' ');

  // Set up a trap in traps array
  g.ntraps = 1;
  g.traps[0] = { tr_pos: { x: 10, y: 10 }, tr_type: BEARTRAP, tr_flags: 0 };
  if (!g.cw[10]) g.cw[10] = new Array(80).fill(' ');
  if (!g.mw[10]) g.mw[10] = new Array(80).fill(' ');
  if (!g.stdscr[10]) g.stdscr[10] = new Array(80).fill(' ');

  // BEARTRAP (lines 251-253)
  g.traps[0].tr_type = BEARTRAP;
  await be_trapped({ y: 10, x: 10 });

  // SLEEPTRAP (lines 255-257)
  g.traps[0].tr_type = SLEEPTRAP;
  await be_trapped({ y: 10, x: 10 });

  // TELTRAP (lines 279-281)
  g.traps[0].tr_type = TELTRAP;
  await be_trapped({ y: 10, x: 10 });

  // TRAPDOOR (lines 246-249): triggers new level
  g.traps[0].tr_type = TRAPDOOR;
  await be_trapped({ y: 10, x: 10 });

  // ARROWTRAP miss path (lines 265-277): make player have very good armor
  g.traps[0].tr_type = ARROWTRAP;
  g.player.t_pos = { x: 10, y: 10 };
  g.player.t_stats.s_arm = -20; // excellent armor → arrow misses
  g.player.t_stats.s_hpt = 100;
  for (let i = 0; i < 10; i++) await be_trapped({ y: 10, x: 10 });

  // ARROWTRAP hit path (lines 259-264): with bad armor
  g.traps[0].tr_type = ARROWTRAP;
  g.player.t_stats.s_arm = 15; // terrible armor → arrow hits
  g.player.t_stats.s_hpt = 1000;
  g.player.t_stats.s_lvl = 1;
  for (let i = 0; i < 10; i++) {
    g.player.t_stats.s_hpt = 1000;
    await be_trapped({ y: 10, x: 10 });
  }

  // ARROWTRAP death path (lines 262-264): HP = 1 → arrow kills player
  g.traps[0].tr_type = ARROWTRAP;
  g.player.t_stats.s_arm = 15;
  g.player.t_stats.s_hpt = 1;
  g.player.t_stats.s_lvl = 1;
  await be_trapped({ y: 10, x: 10 }); // may or may not hit, keep trying
  g.player.t_stats.s_hpt = 1000; // reset

  // DARTTRAP miss path (lines 292-294): similarly with good armor
  g.traps[0].tr_type = DARTTRAP;
  g.player.t_stats.s_arm = -20;
  g.player.t_stats.s_hpt = 100;
  for (let i = 0; i < 10; i++) await be_trapped({ y: 10, x: 10 });

  // DARTTRAP hit path (lines 283-291): with bad armor
  g.traps[0].tr_type = DARTTRAP;
  g.player.t_stats.s_arm = 15; // terrible armor → dart hits
  g.player.t_stats.s_hpt = 1000;
  g.player.t_stats.s_lvl = 1;
  for (let i = 0; i < 10; i++) {
    g.player.t_stats.s_hpt = 1000;
    await be_trapped({ y: 10, x: 10 });
  }

  // DARTTRAP death path (lines 286-288): HP = 1 → dart kills player
  g.traps[0].tr_type = DARTTRAP;
  g.player.t_stats.s_arm = 15;
  g.player.t_stats.s_hpt = 1;
  g.player.t_stats.s_lvl = 1;
  await be_trapped({ y: 10, x: 10 });
  g.player.t_stats.s_hpt = 1000; // reset

  // trap_at() fallback (line 308): no trap at location → returns traps[0]
  g.ntraps = 0; // no traps registered
  const fallback = trap_at(99, 99);
  console.assert(fallback === g.traps[0], 'trap_at fallback');
  g.ntraps = 1; // restore

  // rndmove() with SCROLL scare check (lines 330-340)
  // Place a SCROLL of scare at a position adjacent to player
  const { new_item: ni } = await import('../js/list.js');
  const scareItem = ni({
    o_type: '?', o_pos: { x: 11, y: 10 }, o_count: 1, o_which: 9, // S_SCARE
    o_hplus: 0, o_dplus: 0, o_flags: 0, o_group: 0,
    o_damage: '0d0', o_hurldmg: '0d0', o_ac: 0, o_launch: 0, o_charges: 0,
  });
  g.lvl_obj = scareItem;
  scareItem.l_prev = null; scareItem.l_next = null;
  // Make adjacent cells walkable and include scare scroll cell
  if (!g.stdscr[10]) g.stdscr[10] = new Array(80).fill(' ');
  g.stdscr[10][11] = '?'; // SCROLL character
  const monster = {
    t_pos: { x: 10, y: 10 },
    t_flags: 0,
    t_stats: { s_str: { st_str: 10, st_add: 0 } },
  };
  // Run multiple times to cover the scare check
  for (let i = 0; i < 10; i++) rndmove(monster);
  g.lvl_obj = null;

  // do_move() with no_move > 0 (lines 82-85): bear trap stuck
  g.no_move = 3;
  await do_move(0, 1); // still stuck → returns early

  // do_move() with ISHELD (lines 107-110): held by fungus
  g.no_move = 0;
  g.player.t_pos = { x: 10, y: 10 };
  g.player.t_flags |= 0o000400; // ISHELD
  g.stdscr[10][11] = '.'; // FLOOR ahead
  await do_move(0, 1);
  g.player.t_flags &= ~0o000400;

  // do_move() with running + ISHUH + all neighbors blocked (lines 101-103)
  // When confused (ISHUH), rndmove() is used. If all adjacent tiles are walls,
  // rndmove() returns player.pos → nh === player.pos → lines 101-103 fire
  {
    const { ISHUH } = await import('../js/const.js');
    g.player.t_pos = { x: 10, y: 10 };
    g.player.t_flags |= ISHUH;
    g.running = true;
    // Surround player with walls in stdscr so rndmove returns player.pos
    for (let y = 9; y <= 11; y++)
      for (let x = 9; x <= 11; x++)
        if (!(y === 10 && x === 10)) g.stdscr[y][x] = '|';
    g.stdscr[10][10] = '.'; // player's own tile
    // Try multiple times (rnd(100) < 80 has 80% chance per call)
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) input.inject(' '); // pre-fill any waits
      await do_move(0, 1);
      g.running = true; // reset running after each call
    }
    g.player.t_flags &= ~ISHUH;
    g.running = false;
    for (let y = 9; y <= 11; y++)
      for (let x = 9; x <= 11; x++)
        g.stdscr[y][x] = ' ';
  }

  // show() with invisible monster 'I' and mimic 'M' in mlist (lines 221-229)
  const { new_item: ni2 } = await import('../js/list.js');
  const { _attach: attach2 } = await import('../js/list.js');
  // Add invisible monster to mlist at (12, 12)
  const invisMon = ni2({
    t_pos: { x: 12, y: 12 }, t_type: 'I', t_disguise: 'I',
    t_flags: 0o000020, // ISINVIS
    t_oldch: '.', t_turn: true, t_dest: null, t_pack: null,
    t_stats: { s_str: { st_str: 10, st_add: 0 }, s_exp: 0, s_lvl: 1, s_arm: 10, s_hpt: 5, s_dmg: '1d3' },
  });
  const mlistRef = { val: g.mlist };
  attach2(mlistRef, invisMon);
  g.mlist = mlistRef.val;
  if (!g.mw[12]) g.mw[12] = new Array(80).fill(' ');
  if (!g.stdscr[12]) g.stdscr[12] = new Array(80).fill(' ');
  g.mw[12][12] = 'I';
  g.stdscr[12][12] = '.';
  g.player.t_flags &= ~CANSEE; // can't see invisible → returns stdscr char
  show(12, 12); // invisible monster: CANSEE not set → returns mvwinch(stdscr)
  g.player.t_flags |= CANSEE;
  show(12, 12); // invisible monster: CANSEE set → returns 'I'
  // Add mimic at (13, 12)
  invisMon.l_data.t_pos = { x: 13, y: 12 };
  invisMon.l_data.t_type = 'M';
  invisMon.l_data.t_disguise = '*'; // disguised as gold
  if (!g.mw[12]) g.mw[12] = new Array(80).fill(' ');
  g.mw[12][13] = 'M';
  show(12, 13); // mimic → returns t_disguise '*'
  g.mw[12][12] = ' ';
  g.mw[12][13] = ' ';
}

async function testWeaponsPaths() {
  const { num, missile, wield } = await import('../js/weapons.js');
  // num() (lines 228-231): format plus numbers
  console.assert(num(0, 0) === '+0', 'num(0,0)');
  console.assert(num(2, 0) === '+2', 'num(2,0)');
  console.assert(num(-1, 0) === '-1', 'num(-1,0)');
  console.assert(num(1, 1) === '+1,+1', 'num(1,1)');
  console.assert(num(1, -1) === '+1,-1', 'num(1,-1)');

  // missile() with single item (o_count=1): covers detach_from_pack (lines 79-80, 101-106)
  {
    const { g, input } = await setupGame(151);
    const missileItem = new_item({
      o_type: WEAPON, o_which: 1, o_count: 1,
      o_hplus: 0, o_dplus: 0, o_flags: 0, o_group: 0,
      o_damage: '1d4', o_hurldmg: '1d4', o_ac: 0, o_launch: 0, o_charges: 0,
      o_pos: { x: 0, y: 0 },
    });
    g.pack = missileItem; missileItem.l_prev = null; missileItem.l_next = null; g.inpack = 1;
    g.player.t_pos = { x: 10, y: 10 };
    g.stdscr[10][10] = '.';  // floor under player
    input.inject('a');  // select missile
    input.inject(' ');  // any --More-- that might appear
    await missile(0, 1); // throw right
    // pack should be null after detach
    console.assert(g.pack === null || g.inpack === 0, 'missile: single item detached from pack');
  }

  // wield() with cursed current weapon → dropcheck fails (lines 242-244)
  {
    const { g, input } = await setupGame(152);
    const { ISCURSED } = await import('../js/const.js');
    const cursedWeapon = { o_type: WEAPON, o_which: 0, o_flags: ISCURSED,
                           o_hplus: -1, o_dplus: -1, o_count: 1, o_group: 0,
                           o_damage: '1d4', o_hurldmg: '1d4', o_ac: 0, o_launch: 0, o_charges: 0,
                           o_pos: { x: 0, y: 0 } };
    g.cur_weapon = cursedWeapon;
    input.inject(' ');  // just in case
    await wield();
    console.assert(g.cur_weapon === cursedWeapon, 'wield: cursed weapon not changed');
    g.cur_weapon = null;
  }

  // wield() with armor item in pack → can't wield armor (lines 250-253)
  {
    const { g, input } = await setupGame(153);
    const armorItem = new_item({
      o_type: ARMOR, o_which: 0, o_count: 1,
      o_hplus: 0, o_dplus: 0, o_flags: 0, o_group: 0,
      o_damage: '0d0', o_hurldmg: '0d0', o_ac: 5, o_launch: 0, o_charges: 0,
      o_pos: { x: 0, y: 0 },
    });
    g.pack = armorItem; armorItem.l_prev = null; armorItem.l_next = null; g.inpack = 1;
    g.cur_weapon = null;
    input.inject('a');  // select armor item
    input.inject(' ');  // --More-- for "You can't wield armor"
    await wield();
    g.pack = null; g.inpack = 0;
  }
}

async function testPotionAskme() {
  // Test the askme path, know+guess path, default case, and get_str in potions.js
  // Also covers internal is_magic() via P_TFIND with magic items on level
  //
  // Key insight: get_item() reads ONE key to select the item (letter 'a').
  // Then each message shown via _msg() when g.mpos!=0 requires ONE space via wait_for(' ').
  // Sequence: 'a' (select item), ' ' (--More-- after get_item prompt), ...
  const { quaff } = await import('../js/potions.js');

  function addPotionToGame(g, which) {
    const item = new_item({
      o_type: POTION, o_which: which, o_count: 1,
      o_hplus: 0, o_dplus: 0, o_flags: 0, o_group: 0,
      o_damage: '0d0', o_hurldmg: '0d0', o_ac: 0, o_launch: 0, o_charges: 0,
      o_pos: { x: 0, y: 0 },
    });
    g.pack = item; item.l_prev = null; item.l_next = null; g.inpack = 1;
    return item;
  }

  // Test askme path with get_str (lines 207, 209-212, 231-243):
  // P_NOP (safe: no game-changing effects), askme=true, item unknown, no guess
  // Key sequence:
  //   'a' → select item from get_item
  //   ' ' → --More-- before showing P_NOP message (g.mpos was set by get_item prompt)
  //   ' ' → --More-- before showing "What do you want to call it?"
  //   't','e','\x7f','s','\n' → get_str: type, backspace, type, Enter
  {
    const { g, input } = await setupGame(113);
    addPotionToGame(g, 13); // P_NOP
    g.p_know[13] = false; g.p_guess[13] = null;
    g.askme = true;
    input.inject('a');          // select item
    input.inject(' ');          // --More-- (after get_item prompt sets mpos)
    input.inject(' ');          // --More-- (after P_NOP message sets mpos)
    input.inject('t'); input.inject('e'); input.inject('\x7f'); input.inject('s'); input.inject('\n');
    await quaff();
    g.askme = false;
  }

  // Test know+guess path (line 207): item IS known and has a guess → clears guess
  // Key: 'a' select, ' ' --More-- (if mpos set), done
  {
    const { g, input } = await setupGame(114);
    addPotionToGame(g, 13); // P_NOP
    g.p_know[13] = true; g.p_guess[13] = 'boring';
    g.askme = false;
    input.inject('a'); // select item
    input.inject(' '); // --More-- for P_NOP message
    await quaff();
  }

  // Test askme path with ESC (get_str returns null → no guess stored)
  {
    const { g, input } = await setupGame(115);
    addPotionToGame(g, 13); // P_NOP
    g.p_know[13] = false; g.p_guess[13] = null;
    g.askme = true;
    input.inject('a');   // select item
    input.inject(' ');   // --More-- for P_NOP message
    input.inject(' ');   // --More-- for "What do you want to call it?"
    input.inject('\x1b'); // ESC in get_str → returns null
    await quaff();
    g.askme = false;
  }

  // Test default case in potions switch (lines 200-201): o_which = 99 (out of range)
  {
    const { g, input } = await setupGame(116);
    const item = new_item({
      o_type: POTION, o_which: 99, o_count: 1,
      o_hplus: 0, o_dplus: 0, o_flags: 0, o_group: 0,
      o_damage: '0d0', o_hurldmg: '0d0', o_ac: 0, o_launch: 0, o_charges: 0,
      o_pos: { x: 0, y: 0 },
    });
    g.pack = item; item.l_prev = null; item.l_next = null; g.inpack = 1;
    input.inject('a'); // select item
    input.inject(' '); // --More-- for "What an odd tasting potion!"
    await quaff();
  }

  // Test P_TFIND with magic items on level → covers internal is_magic (lines 224-229)
  {
    const { g, input } = await setupGame(117);
    addPotionToGame(g, 7); // P_TFIND
    const scrollItem = new_item({
      o_type: SCROLL, o_which: 0, o_count: 1,
      o_hplus: 0, o_dplus: 0, o_flags: 0, o_group: 0,
      o_damage: '0d0', o_hurldmg: '0d0', o_ac: 0, o_launch: 0, o_charges: 0,
      o_pos: { x: 5, y: 5 },
    });
    g.lvl_obj = scrollItem; scrollItem.l_prev = null; scrollItem.l_next = null;
    input.inject('a'); // select item
    input.inject(' '); // --More-- for P_TFIND message
    await quaff();
    g.lvl_obj = null;
  }

  // Test quaff() with non-potion item (lines 67-70): non-terse AND terse paths
  {
    const { g, input } = await setupGame(118);
    const weapItem = new_item({
      o_type: WEAPON, o_which: 0, o_count: 1,
      o_hplus: 0, o_dplus: 0, o_flags: 0, o_group: 0,
      o_damage: '1d4', o_hurldmg: '1d4', o_ac: 0, o_launch: 0, o_charges: 0,
      o_pos: { x: 0, y: 0 },
    });
    g.pack = weapItem; weapItem.l_prev = null; weapItem.l_next = null; g.inpack = 1;
    g.terse = false;
    input.inject('a'); // select item
    input.inject(' '); // --More-- for error message
    await quaff();
    // Terse path (line 68)
    g.pack = weapItem; weapItem.l_prev = null; weapItem.l_next = null; g.inpack = 1;
    g.terse = true;
    input.inject('a');
    input.inject(' ');
    await quaff();
    g.terse = false;
  }

  // Test P_POISON with R_SUSTSTR ring (lines 93-94)
  {
    const { R_SUSTSTR, LEFT: L } = await import('../js/const.js');
    const { g, input } = await setupGame(119);
    addPotionToGame(g, 2); // P_POISON
    // Wear a SUSTSTR ring
    g.cur_ring[0] = { o_which: R_SUSTSTR, o_type: RING, o_flags: 0 };
    input.inject('a');
    input.inject(' '); // --More-- for poison message
    await quaff();
    g.cur_ring[0] = null;
  }

  // Test P_MFIND when no monsters (lines 117-118)
  {
    const { g, input } = await setupGame(120);
    addPotionToGame(g, 6); // P_MFIND
    g.mlist = null; // no monsters
    input.inject('a');
    input.inject(' '); // --More-- for "strange feeling" message
    await quaff();
  }

  // Test P_RAISE (line 160 break): quaff potion of raise level
  {
    const { g, input } = await setupGame(122);
    addPotionToGame(g, 8); // P_RAISE
    input.inject('a');
    input.inject(' '); // --More-- for raise level message
    input.inject(' '); // --More-- for level-up message
    await quaff();
  }

  // Test P_TFIND with monster pack magic item (lines 129-130)
  {
    const { g, input } = await setupGame(121);
    addPotionToGame(g, 7); // P_TFIND
    // Create a monster with a magic item in its pack
    const { new_item: ni2 } = await import('../js/list.js');
    const { _attach: at2 } = await import('../js/list.js');
    const magicPackItem = ni2({
      o_type: POTION, o_which: 0, o_count: 1,
      o_hplus: 0, o_dplus: 0, o_flags: 0, o_group: 0,
      o_damage: '0d0', o_hurldmg: '0d0', o_ac: 0, o_launch: 0, o_charges: 0,
      o_pos: { x: 5, y: 5 },
    });
    const monItem = ni2({
      t_pos: { x: 5, y: 5 }, t_type: 'B', t_disguise: 'B',
      t_flags: 0, t_oldch: '.', t_turn: true, t_dest: null, t_pack: magicPackItem,
      t_stats: { s_str: { st_str: 10, st_add: 0 }, s_exp: 0, s_lvl: 1, s_arm: 10, s_hpt: 5, s_dmg: '1d3' },
    });
    magicPackItem.l_prev = null; magicPackItem.l_next = null;
    const mlistRef = { val: g.mlist };
    at2(mlistRef, monItem);
    g.mlist = mlistRef.val;
    input.inject('a');
    input.inject(' '); // --More-- for P_TFIND message
    await quaff();
    g.mlist = null;
  }
}

async function testRingsPaths() {
  const { ring_on, ring_off } = await import('../js/rings.js');
  const { R_ADDSTR, R_SEEINVIS } = await import('../js/const.js');

  // ring_on() with non-ring item, terse path (line 44)
  {
    const { g, input } = await setupGame(130);
    const weapItem = new_item({
      o_type: WEAPON, o_which: 0, o_count: 1,
      o_hplus: 0, o_dplus: 0, o_flags: 0, o_group: 0,
      o_damage: '1d4', o_hurldmg: '1d4', o_ac: 0, o_launch: 0, o_charges: 0,
      o_pos: { x: 0, y: 0 },
    });
    g.pack = weapItem; weapItem.l_prev = null; weapItem.l_next = null; g.inpack = 1;
    g.terse = true;
    input.inject('a'); // select item
    input.inject(' '); // --More-- for "Not a ring"
    await ring_on();
    g.terse = false;
    g.pack = null; g.inpack = 0;
  }

  // ring_on() with two rings already worn, terse path (line 60)
  {
    const { g, input } = await setupGame(131);
    const ringItem = new_item({
      o_type: RING, o_which: 0, o_count: 1,
      o_hplus: 0, o_dplus: 0, o_flags: 0, o_group: 0,
      o_damage: '0d0', o_hurldmg: '0d0', o_ac: 0, o_launch: 0, o_charges: 0,
      o_pos: { x: 0, y: 0 },
    });
    g.pack = ringItem; ringItem.l_prev = null; ringItem.l_next = null; g.inpack = 1;
    g.cur_ring[0] = { o_which: 0, o_type: RING, o_flags: 0 };
    g.cur_ring[1] = { o_which: 1, o_type: RING, o_flags: 0 };
    g.terse = true;
    input.inject('a');
    input.inject(' '); // --More-- for "Wearing two"
    await ring_on();
    g.terse = false;
    g.cur_ring[0] = null; g.cur_ring[1] = null;
    g.pack = null; g.inpack = 0;
  }

  // ring_on() askme path (lines 84-91, 147-159): both ring slots empty → gethand
  // Key seq: 'a' (get_item, mpos=0 so no wait), 'l' (gethand, mpos=0 so no wait),
  //          'r','\n' (get_str name)
  {
    const { g, input } = await setupGame(132);
    const ringItem = new_item({
      o_type: RING, o_which: R_ADDSTR, o_count: 1, o_ac: 1,
      o_hplus: 0, o_dplus: 0, o_flags: 0, o_group: 0,
      o_damage: '0d0', o_hurldmg: '0d0', o_ac: 0, o_launch: 0, o_charges: 0,
      o_pos: { x: 0, y: 0 },
    });
    g.pack = ringItem; ringItem.l_prev = null; ringItem.l_next = null; g.inpack = 1;
    g.r_know[R_ADDSTR] = false; g.r_guess[R_ADDSTR] = null;
    g.cur_ring[0] = null; g.cur_ring[1] = null;
    g.askme = true;
    // mpos=0 at all points: no --More-- waits needed
    input.inject('a');    // get_item select (get_item resets mpos to 0 after reading)
    input.inject('l');    // gethand: left hand
    input.inject('r'); input.inject('\x7f'); input.inject('s'); input.inject('\n'); // get_str: 'r'→'\x7f'→'s'→enter (covers backspace line)
    await ring_on();
    g.askme = false;
    g.cur_ring[0] = null; g.cur_ring[1] = null;
    g.pack = null; g.inpack = 0;
  }

  // ring_on() know+guess path (line 84): only left ring slot empty → auto-picks LEFT
  // Key seq: 'a' (get_item), done (know+guess clears guess, no more input needed)
  {
    const { g, input } = await setupGame(133);
    const ringItem = new_item({
      o_type: RING, o_which: R_ADDSTR, o_count: 1, o_ac: 1,
      o_hplus: 0, o_dplus: 0, o_flags: 0, o_group: 0,
      o_damage: '0d0', o_hurldmg: '0d0', o_ac: 0, o_launch: 0, o_charges: 0,
      o_pos: { x: 0, y: 0 },
    });
    g.pack = ringItem; ringItem.l_prev = null; ringItem.l_next = null; g.inpack = 1;
    g.r_know[R_ADDSTR] = true; g.r_guess[R_ADDSTR] = 'strength';
    g.cur_ring[0] = null;
    g.cur_ring[1] = { o_which: R_SEEINVIS, o_type: RING, o_flags: 0 }; // right ring worn
    // Only left slot empty → auto picks LEFT (no gethand call)
    // know+guess path clears guess, no message prompt
    input.inject('a'); // get_item
    await ring_on();
    g.cur_ring[0] = null; g.cur_ring[1] = null;
    g.pack = null; g.inpack = 0;
  }

  // ring_off() with no rings → terse path (lines 100-101)
  {
    const { g, input } = await setupGame(134);
    g.cur_ring[0] = null; g.cur_ring[1] = null;
    g.terse = true;
    input.inject(' '); // --More-- just in case
    await ring_off();
    g.terse = false;
  }
}

async function testScrollsPaths() {
  const { read_scroll } = await import('../js/scrolls.js');
  const {
    S_NOP, S_GFIND, S_ENCH, S_CREATE, S_MAP, SCROLL: SCR,
  } = await import('../js/const.js');

  function addScrollToGame(g, which) {
    const item = new_item({
      o_type: SCROLL, o_which: which, o_count: 1,
      o_hplus: 0, o_dplus: 0, o_flags: 0, o_group: 0,
      o_damage: '0d0', o_hurldmg: '0d0', o_ac: 0, o_launch: 0, o_charges: 0,
      o_pos: { x: 0, y: 0 },
    });
    g.pack = item; item.l_prev = null; item.l_next = null; g.inpack = 1;
    return item;
  }

  // S_NOP with askme → covers askme path (lines 267, 269-272) and get_str (319-331)
  {
    const { g, input } = await setupGame(140);
    addScrollToGame(g, S_NOP);
    g.s_know[S_NOP] = false; g.s_guess[S_NOP] = null;
    g.askme = true;
    input.inject('a');   // select item
    input.inject(' ');   // --More-- for "This scroll seems to be blank."
    input.inject(' ');   // --More-- for "What do you want to call it?"
    // get_str: type name with backspace + Enter
    input.inject('x'); input.inject('\x7f'); input.inject('y'); input.inject('\n');
    await read_scroll();
    g.askme = false;
  }

  // S_NOP with known+guess → covers line 267
  {
    const { g, input } = await setupGame(141);
    addScrollToGame(g, S_NOP);
    g.s_know[S_NOP] = true; g.s_guess[S_NOP] = 'blank';
    g.askme = false;
    input.inject('a');
    input.inject(' '); // --More-- for scroll message
    await read_scroll();
  }

  // S_GFIND with no gold (lines 204-205): clear all room gold values
  {
    const { g, input } = await setupGame(142);
    addScrollToGame(g, S_GFIND);
    for (const r of g.rooms) r.r_goldval = 0;
    input.inject('a');
    input.inject(' '); // --More-- for "pull downward" message
    await read_scroll();
  }

  // S_ENCH with weapon (dplus path, line 224-225): run multiple times for coverage
  {
    const { g, input } = await setupGame(143);
    g.cur_weapon = { o_which: 0, o_type: WEAPON, o_flags: 0, o_hplus: 0, o_dplus: 0 };
    for (let i = 0; i < 5; i++) {
      addScrollToGame(g, S_ENCH);
      input.inject('a');
      input.inject(' '); // --More-- for ench message
    }
    for (let i = 0; i < 5; i++) await read_scroll();
    g.cur_weapon = null;
  }

  // default case (lines 259-260): scroll with o_which = 99 (out of range)
  {
    const { g, input } = await setupGame(144);
    const item = new_item({
      o_type: SCROLL, o_which: 99, o_count: 1,
      o_hplus: 0, o_dplus: 0, o_flags: 0, o_group: 0,
      o_damage: '0d0', o_hurldmg: '0d0', o_ac: 0, o_launch: 0, o_charges: 0,
      o_pos: { x: 0, y: 0 },
    });
    g.pack = item; item.l_prev = null; item.l_next = null; g.inpack = 1;
    input.inject('a');
    input.inject(' '); // --More-- for "puzzling scroll" message
    await read_scroll();
  }

  // get_str with ESC (line 324 in scrolls.js get_str)
  {
    const { g, input } = await setupGame(145);
    addScrollToGame(g, S_NOP);
    g.s_know[S_NOP] = false; g.s_guess[S_NOP] = null;
    g.askme = true;
    input.inject('a');
    input.inject(' ');   // --More-- for scroll msg
    input.inject(' ');   // --More-- for "What do you want to call it?"
    input.inject('\x1b'); // ESC in get_str → null
    await read_scroll();
    g.askme = false;
  }

  // terse "Nothing to read" (line 77): read a non-scroll item while terse=true
  {
    const { g, input } = await setupGame(146);
    const weapItem = new_item({
      o_type: WEAPON, o_which: 0, o_count: 1,
      o_hplus: 0, o_dplus: 0, o_flags: 0, o_group: 0,
      o_damage: '1d4', o_hurldmg: '1d4', o_ac: 0, o_launch: 0, o_charges: 0,
      o_pos: { x: 0, y: 0 },
    });
    g.pack = weapItem; weapItem.l_prev = null; weapItem.l_next = null; g.inpack = 1;
    g.terse = true;
    input.inject('a');   // select non-scroll item
    input.inject(' ');   // --More-- for "Nothing to read"
    await read_scroll();
    g.terse = false;
    g.pack = null; g.inpack = 0;
  }

  // S_CREATE with no adjacent walkable tiles (lines 161-162): surround player with walls
  {
    const { g, input } = await setupGame(147);
    addScrollToGame(g, S_CREATE);
    // Put player at (10,10), fill adjacent positions with walls in stdscr
    g.player.t_pos = { x: 10, y: 10 };
    // S_CREATE loops y=[py..py+1], x=[px..px+1] skipping player pos
    // Make those 3 adjacent squares non-walkable
    g.stdscr[10][11] = '|';
    g.stdscr[11][10] = '|';
    g.stdscr[11][11] = '|';
    input.inject('a');
    input.inject(' ');   // --More-- for "faint cry" message
    await read_scroll();
    // restore
    g.stdscr[10][11] = ' '; g.stdscr[11][10] = ' '; g.stdscr[11][11] = ' ';
  }

  // S_MAP with SECRETDOOR in stdscr (lines 184-186)
  {
    const { g, input } = await setupGame(148);
    addScrollToGame(g, S_MAP);
    // Place a SECRETDOOR ('&') in stdscr and leave cw as ' '
    g.stdscr[5][5] = '&';
    g.cw[5][5] = ' ';
    input.inject('a');
    input.inject(' ');   // --More-- for map message
    await read_scroll();
    console.assert(g.stdscr[5][5] === '+', 'S_MAP: SECRETDOOR converted to door');
    console.assert(g.cw[5][5] === '+', 'S_MAP: cw updated for SECRETDOOR');
    g.stdscr[5][5] = ' '; g.cw[5][5] = ' ';
  }

  // S_ENCH dplus path (lines 224-225): run with multiple seeds until dplus branch hits
  // (rnd(100) > 50 is false → dplus++). Run with several seeds for coverage.
  for (const seed of [149, 150, 200, 777, 1234]) {
    const { g, input } = await setupGame(seed);
    g.cur_weapon = { o_which: 0, o_type: WEAPON, o_flags: 0, o_hplus: 0, o_dplus: 0 };
    for (let i = 0; i < 20; i++) {
      addScrollToGame(g, S_ENCH);
      input.inject('a');
      input.inject(' '); // --More-- for ench message
    }
    for (let i = 0; i < 20; i++) await read_scroll();
    g.cur_weapon = null;
  }
}

async function testMiscMore() {
  const { g, input } = await setupGame(111);
  for (let i = 0; i < 50; i++) input.inject(' ');

  // chg_str(1): st_str < 18 path (line 239)
  g.player.t_stats.s_str = { st_str: 10, st_add: 0 };
  chg_str(1);
  console.assert(g.player.t_stats.s_str.st_str === 11, 'chg_str +1 st_str < 18');

  // chg_str(1): st_str == 18, st_add === 0 (line 241)
  g.player.t_stats.s_str = { st_str: 18, st_add: 0 };
  chg_str(1);
  console.assert(g.player.t_stats.s_str.st_add > 0, 'chg_str +1 st_add 0→nonzero');

  // chg_str(1): st_str == 18, st_add <= 50 (line 243)
  g.player.t_stats.s_str = { st_str: 18, st_add: 30 };
  chg_str(1);
  console.assert(g.player.t_stats.s_str.st_add >= 51, 'chg_str +1 st_add 30→51+');

  // vowelstr() (lines 292-297)
  const { vowelstr, secretdoor, eat } = await import('../js/misc.js');
  console.assert(vowelstr('apple') === 'n', 'vowelstr vowel');
  console.assert(vowelstr('bread') === '', 'vowelstr consonant');
  console.assert(vowelstr('') === '', 'vowelstr empty');
  console.assert(vowelstr(null) === '', 'vowelstr null');

  // secretdoor() at non-room position → returns 'p' (line 171)
  const pchar = secretdoor(0, 0);
  console.assert(pchar === 'p', 'secretdoor: non-room position returns p');

  // eat() non-food item, terse path (line 197)
  {
    const { g: ge, input: ie } = await setupGame(112);
    const weapItem = new_item({
      o_type: WEAPON, o_which: 0, o_count: 1,
      o_hplus: 0, o_dplus: 0, o_flags: 0, o_group: 0,
      o_damage: '1d4', o_hurldmg: '1d4', o_ac: 0, o_launch: 0, o_charges: 0,
      o_pos: { x: 0, y: 0 },
    });
    ge.pack = weapItem; weapItem.l_prev = null; weapItem.l_next = null; ge.inpack = 1;
    ge.terse = true;
    ie.inject('a');   // select non-food item
    ie.inject(' ');   // --More-- for "That's Inedible!"
    await eat();
    ge.terse = false;
    ge.pack = null; ge.inpack = 0;
  }

  // eat() non-food item, non-terse path (line 196)
  {
    const { g: ge, input: ie } = await setupGame(113);
    const weapItem = new_item({
      o_type: WEAPON, o_which: 0, o_count: 1,
      o_hplus: 0, o_dplus: 0, o_flags: 0, o_group: 0,
      o_damage: '1d4', o_hurldmg: '1d4', o_ac: 0, o_launch: 0, o_charges: 0,
      o_pos: { x: 0, y: 0 },
    });
    ge.pack = weapItem; weapItem.l_prev = null; weapItem.l_next = null; ge.inpack = 1;
    ge.terse = false;
    ie.inject('a');   // select non-food item
    ie.inject(' ');   // --More-- for "Ugh, you would get ill..."
    await eat();
    ge.pack = null; ge.inpack = 0;
  }

  // eat() with o_which=1 (fruit) → "My, that was a yummy..." (line 207)
  {
    const { g: ge, input: ie } = await setupGame(114);
    const foodItem = new_item({
      o_type: FOOD, o_which: 1, o_count: 1,
      o_hplus: 0, o_dplus: 0, o_flags: 0, o_group: 0,
      o_damage: '0d0', o_hurldmg: '0d0', o_ac: 0, o_launch: 0, o_charges: 0,
      o_pos: { x: 0, y: 0 },
    });
    ge.pack = foodItem; foodItem.l_prev = null; foodItem.l_next = null; ge.inpack = 1;
    ie.inject('a');   // select food
    ie.inject(' ');   // --More-- for "yummy" message
    await eat();
    ge.pack = null; ge.inpack = 0;
  }

  // eat() "Yum" path (lines 214-215): use multiple seeds to hit rnd(100) <= 70 path
  for (const s of [115, 116, 117, 118, 119]) {
    const { g: ge, input: ie } = await setupGame(s);
    const foodItem = new_item({
      o_type: FOOD, o_which: 0, o_count: 1,
      o_hplus: 0, o_dplus: 0, o_flags: 0, o_group: 0,
      o_damage: '0d0', o_hurldmg: '0d0', o_ac: 0, o_launch: 0, o_charges: 0,
      o_pos: { x: 0, y: 0 },
    });
    ge.pack = foodItem; foodItem.l_prev = null; foodItem.l_next = null; ge.inpack = 1;
    ie.inject('a');   // select food
    ie.inject(' ');   // --More-- for food message
    await eat();
    ge.pack = null; ge.inpack = 0;
  }

  // look() with monster on TRAP (lines 100-102): monster at adjacent tile, stdscr has TRAP
  {
    const { g: gl, input: il } = await setupGame(120);
    for (let i = 0; i < 10; i++) il.inject(' ');
    const { mk_thing_data } = await import('../js/monsters.js').catch(() => null) || {};
    // Place monster at (10, 11) in mw
    gl.player.t_pos = { x: 10, y: 10 };
    gl.mw[10][11] = 'A'; // monster
    gl.stdscr[10][11] = TRAP; // underlying is TRAP
    // Set up trap at that location
    gl.ntraps = 1;
    gl.traps[0] = { tr_pos: { x: 11, y: 10 }, tr_type: 1, tr_flags: 0 };  // no ISFOUND
    // Add monster to mlist so find_mons can find it
    const monItem = new_item({
      t_pos: { x: 11, y: 10 }, t_type: 'A', t_disguise: 'A',
      t_flags: 0, t_oldch: TRAP, t_turn: true, t_dest: null, t_pack: null,
      t_stats: { s_str: { st_str: 10, st_add: 0 }, s_exp: 0, s_lvl: 1, s_arm: 10, s_hpt: 5, s_dmg: '1d4' },
    });
    const { _attach } = await import('../js/list.js');
    const mlistRef = { val: gl.mlist };
    _attach(mlistRef, monItem);
    gl.mlist = mlistRef.val;
    await look(false); // wakeup=false → uses find_mons
    // Also test with ISFOUND set (lines 101 true branch)
    gl.traps[0].tr_flags |= ISFOUND;
    gl.mw[10][11] = 'A'; // reset monster
    await look(false);
    // cleanup
    gl.mw[10][11] = ' ';
    gl.stdscr[10][11] = ' ';
    gl.mlist = null;
    gl.ntraps = 0;
  }

  // look() with door_stop + running (lines 122-143): trigger door_stop running paths
  {
    const { g: gl, input: il } = await setupGame(121);
    for (let i = 0; i < 10; i++) il.inject(' ');
    gl.player.t_pos = { x: 10, y: 10 };
    gl.door_stop = true;
    gl.firstmove = false;
    gl.running = true;
    // Place a DOOR, PASSAGE, and other chars adjacent to player
    gl.stdscr[10][9] = DOOR;  // left of player (x-1)
    gl.stdscr[9][10] = PASSAGE; // above player
    gl.stdscr[11][10] = FLOOR; // below player
    gl.stdscr[10][11] = '|';  // right
    // Run through different runch directions
    for (const dir of ['h', 'j', 'k', 'l', 'y', 'u', 'n', 'b']) {
      gl.runch = dir;
      gl.running = true;
      await look(false);
    }
    // default: running=false when unknown char seen
    gl.stdscr[10][9] = '$'; // gold (not FLOOR/DOOR/PASSAGE/wall)
    gl.runch = 'h';
    gl.running = true;
    await look(false);
    // passcount > 1: two passages visible
    gl.stdscr[10][9] = PASSAGE;
    gl.stdscr[9][9] = PASSAGE;
    gl.runch = 'h';
    gl.running = true;
    await look(false);
    // cleanup
    gl.door_stop = false; gl.running = false;
    gl.stdscr[10][9] = ' '; gl.stdscr[9][10] = ' ';
    gl.stdscr[11][10] = ' '; gl.stdscr[10][11] = ' ';
    gl.stdscr[9][9] = ' ';
  }
}

async function testSaveEdgeCases() {
  // saveGame() with user pressing 'n' (decline) → lines 192-194
  const { g, input } = await setupGame(44);
  input.inject('n');
  input.inject(' ');
  clearSave();
  const result = await saveGame();
  console.assert(result === false, 'saveGame: declined');

  // saveGame() with localStorage.setItem throwing → lines 367-369
  const { g: g2, input: input2 } = await setupGame(45);
  input2.inject('y'); input2.inject(' ');
  const realSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = () => { throw new Error('simulated storage full'); };
  await saveGame();
  localStorage.setItem = realSetItem;

  // loadGameState() with corrupted JSON → lines 384-385
  const { g: g3 } = await setupGame(46);
  const realGetItem = localStorage.getItem.bind(localStorage);
  localStorage.getItem = () => 'not-valid-json{{{';
  loadGameState(g3);
  localStorage.getItem = realGetItem;

  // hasSave() with localStorage throwing → lines 168-173
  localStorage.getItem = () => { throw new Error('simulated error'); };
  const hs = hasSave();
  console.assert(hs === false, 'hasSave: localStorage throws → false');
  localStorage.getItem = realGetItem;

  // findPackIndex line 162: cur_weapon set but not in pack (empty pack)
  {
    const { g: g4, input: input4 } = await setupGame(47);
    // Set cur_weapon to an object NOT in g.pack
    g4.cur_weapon = { o_type: WEAPON, o_which: 0, o_flags: 0, o_hplus: 0, o_dplus: 0,
                      o_count: 1, o_group: 0, o_damage: '1d4', o_hurldmg: '1d4',
                      o_ac: 0, o_launch: 0, o_charges: 0, o_pos: { x: 0, y: 0 } };
    g4.pack = null; g4.inpack = 0;
    input4.inject('y'); input4.inject(' ');
    await saveGame();
    g4.cur_weapon = null;
    clearSave();
  }
}

async function testScorePaths() {
  const { g, input } = await setupGame(55);
  for (let i = 0; i < 10; i++) input.inject(' ');

  const { showScores, addScore } = await import('../js/score.js');

  // addScore: add a score entry
  g.whoami = 'testplayer';
  addScore(1234, 5, false);
  addScore(9999, 10, true);

  // showScores(): cover lines 44-71 (renders top scores list)
  await showScores();

  // getScores() catch path (lines 17-18): temporarily corrupt localStorage
  const realGetItem = localStorage.getItem.bind(localStorage);
  localStorage.getItem = () => { throw new Error('simulated parse error'); };
  // getScores returns [] on error; calling showScores will invoke getScores
  await showScores();
  localStorage.getItem = realGetItem;
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

async function testCommandPaths() {
  const { quit, d_level, u_level } = await import('../js/command.js');
  const { STAIRS } = await import('../js/const.js');

  // quit() with 'n' (lines 332-338)
  {
    const { g, input } = await setupGame(170);
    for (let i = 0; i < 5; i++) input.inject(' ');
    input.inject('n'); // decline quit
    await quit();
    console.assert(g.playing === true, 'quit: declined → still playing');
  }

  // d_level() not on stairs (line 349)
  {
    const { g, input } = await setupGame(171);
    for (let i = 0; i < 5; i++) input.inject(' ');
    g.player.t_pos = { x: 10, y: 10 };
    g.stdscr[10][10] = '.'; // not stairs
    input.inject(' ');  // --More-- for "I see no way down"
    await d_level();
  }

  // u_level() with amulet + level=2 → goes to level 1 + "wrenching" (lines 371-374)
  {
    const { g, input } = await setupGame(172);
    for (let i = 0; i < 20; i++) input.inject(' ');
    g.player.t_pos = { x: 10, y: 10 };
    g.stdscr[10][10] = STAIRS;
    g.amulet = true;
    g.level = 2;
    await u_level(); // level → 1, new_level + msg
    g.amulet = false;
    g.level = 1;
  }

  // u_level() not on stairs (line 376)
  {
    const { g, input } = await setupGame(173);
    for (let i = 0; i < 5; i++) input.inject(' ');
    g.player.t_pos = { x: 10, y: 10 };
    g.stdscr[10][10] = '.'; // not stairs
    input.inject(' ');  // --More-- for "I see no way up"
    await u_level();
  }
}

async function testPackPaths() {
  const { inventory, picky_inven } = await import('../js/pack.js');
  const { wield } = await import('../js/weapons.js');

  // inventory() with exactly 1 item (lines 226-229)
  {
    const { g, input } = await setupGame(160);
    const item = new_item({
      o_type: WEAPON, o_which: 0, o_count: 1,
      o_hplus: 0, o_dplus: 0, o_flags: 0, o_group: 0,
      o_damage: '1d4', o_hurldmg: '1d4', o_ac: 0, o_launch: 0, o_charges: 0,
      o_pos: { x: 0, y: 0 },
    });
    g.pack = item; item.l_prev = null; item.l_next = null; g.inpack = 1;
    input.inject(' '); // just in case --More-- fires
    await inventory(g.pack, 0); // lists 1 item → msg(inv_temp), return true
    g.pack = null; g.inpack = 0;
  }

  // picky_inven() with empty pack (line 266)
  {
    const { g, input } = await setupGame(161);
    g.pack = null; g.inpack = 0;
    input.inject(' '); // --More-- for "not carrying anything"
    await picky_inven();
  }

  // picky_inven() with single item (line 268)
  {
    const { g, input } = await setupGame(162);
    const item = new_item({
      o_type: WEAPON, o_which: 0, o_count: 1,
      o_hplus: 0, o_dplus: 0, o_flags: 0, o_group: 0,
      o_damage: '1d4', o_hurldmg: '1d4', o_ac: 0, o_launch: 0, o_charges: 0,
      o_pos: { x: 0, y: 0 },
    });
    g.pack = item; item.l_prev = null; item.l_next = null; g.inpack = 1;
    input.inject(' '); // --More-- for single item display
    await picky_inven();
    g.pack = null; g.inpack = 0;
  }

  // picky_inven() with multi-item pack, select 'a' (lines 278-282)
  // picky_inven calls _msg('Which item...'), then g.mpos=0, then _readchar()
  // So NO leading space needed - first key goes directly to _readchar()
  {
    const { g, input } = await setupGame(163);
    const item1 = new_item({
      o_type: WEAPON, o_which: 0, o_count: 1,
      o_hplus: 0, o_dplus: 0, o_flags: 0, o_group: 0,
      o_damage: '1d4', o_hurldmg: '1d4', o_ac: 0, o_launch: 0, o_charges: 0,
      o_pos: { x: 0, y: 0 },
    });
    const item2 = new_item({
      o_type: POTION, o_which: 0, o_count: 1,
      o_hplus: 0, o_dplus: 0, o_flags: 0, o_group: 0,
      o_damage: '0d0', o_hurldmg: '0d0', o_ac: 0, o_launch: 0, o_charges: 0,
      o_pos: { x: 0, y: 0 },
    });
    g.pack = item1; item1.l_prev = null; item1.l_next = item2;
    item2.l_prev = item1; item2.l_next = null; g.inpack = 2;
    // First _readchar() reads 'a' directly (no --More-- needed for prompt)
    input.inject('a');  // select item 'a' → found, msg("a) ..."), return
    input.inject(' ');  // just in case --More-- fires for found-item msg
    await picky_inven();
    g.pack = null; g.inpack = 0;
  }

  // get_item() ESC → returns null (lines 308-312 in pack.js)
  {
    const { g, input } = await setupGame(164);
    const item = new_item({
      o_type: WEAPON, o_which: 0, o_count: 1,
      o_hplus: 0, o_dplus: 0, o_flags: 0, o_group: 0,
      o_damage: '1d4', o_hurldmg: '1d4', o_ac: 0, o_launch: 0, o_charges: 0,
      o_pos: { x: 0, y: 0 },
    });
    g.pack = item; item.l_prev = null; item.l_next = null; g.inpack = 1;
    g.cur_weapon = null;
    input.inject('\x1b'); // ESC → get_item returns null → wield returns early
    input.inject(' ');
    await wield();
    g.pack = null; g.inpack = 0;
  }

  // pack_char() not found (line 347): item not in pack
  {
    const { g } = await setupGame(165);
    const { pack_char } = await import('../js/pack.js');
    const item = new_item({
      o_type: WEAPON, o_which: 0, o_count: 1,
      o_hplus: 0, o_dplus: 0, o_flags: 0, o_group: 0,
      o_damage: '1d4', o_hurldmg: '1d4', o_ac: 0, o_launch: 0, o_charges: 0,
      o_pos: { x: 0, y: 0 },
    });
    // item not in pack → returns 'z'
    const ch = pack_char(item.l_data);
    console.assert(ch === 'z', `pack_char not found returns 'z', got '${ch}'`);
  }
}

// Always run direct coverage tests (skip with --sessions-only)
if (!args.includes('--sessions-only')) {
  await testDeath();
  await testDeathArrow();
  await testWinner();
  await testSaveLoad();
  await testStrFunctions();
  await testIsMagic();
  await testSpecialAttacks();
  await testFightMisc();
  await testMimicTypes();
  await testWakeMonsterPaths();
  await testOptionsScreen();
  await testDaemonsPaths();
  await testSearchPaths();
  await testTrapPaths();
  await testWeaponsPaths();
  await testPotionAskme();
  await testRingsPaths();
  await testScrollsPaths();
  await testMiscMore();
  await testSaveEdgeCases();
  await testScorePaths();
  await testCommandPaths();
  await testPackPaths();
}
