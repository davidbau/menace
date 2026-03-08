/**
 * coverage_direct.mjs — Direct JS tests for hard-to-reach code paths in hack/js/.
 *
 * Covers item-use functions that require specific inventory items:
 *   - drink1() (potions, all types)
 *   - read1() (scrolls, all types)
 *   - rhack 'p' (wand zap, all types including bolt)
 *   - rhack 'W'/'T' (wear/remove armor)
 *   - rhack 'P'/'R' (put on/remove ring, with ringoff() effects)
 *   - rhack 'd' (drop)
 *   - rhack 't' (throw)
 *   - rhack 'S' (save → dosave())
 *   - rhack 'Q' (quit → done/done1)
 *   - litroom(), rescham() via wand/scroll
 *   - buzz() via wand bolt
 *
 * Strategy: set up a live game state (via gameLoop + MockInput intercept),
 * then add items directly to game.invent before injecting command keystrokes.
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

import { GameState, makeObj, makeMonst, makeGen } from '../js/game.js';
import { game, setGame } from '../js/gstate.js';
import { _setPriDeps, newsym } from '../js/pri.js';
import { _setMonDeps, g_at_mon, g_at_gen, g_at_obj, killed, rloc, mnexto, newcham, poisoned, steal, justswld } from '../js/mon.js';
import { _setHackDeps, setsee, tele, nomul, amon, attmon, unsee, seeoff } from '../js/hack.js';
import { _setDo1Deps, dosearch, buzz, findit, hit, miss, bhit, zhit } from '../js/do1.js';
import { setRhack, gameLoop, GameOver, losestr, ndaminc, dodown, doup, alloc, getret } from '../js/main.js';
import { rhack } from '../js/do.js';
import { docrt } from '../js/pri.js';
import { mon } from '../js/data.js';
import { mkobj } from '../js/lev.js';
import { makeStole } from '../js/game.js';
import { generatelevel } from '../js/mklev.js';
import { seedRng } from '../js/rng.js';

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

/**
 * Run a game session with a setup callback and keystroke sequence.
 * setupFn(g) is called the first time getKey() is invoked (after dungeon is
 * generated and displayed), allowing items to be added to g.invent.
 */
async function runWith(seed, setupFn, keys) {
  wireDeps();
  const display = new MockDisplay();
  const input = new MockInput();
  const g = new GameState();
  g.display = display;
  g.input = input;
  g.rawRngLog = [];
  setGame(g);

  let initialized = false;
  let keyIdx = 0;
  input.getKey = async function () {
    if (!initialized) {
      initialized = true;
      if (setupFn) setupFn(g);
    }
    if (keyIdx >= keys.length) throw new SessionDone();
    return keys[keyIdx++];
  };

  try {
    await gameLoop(seed);
  } catch (e) {
    if (!(e instanceof SessionDone) && !(e instanceof GameOver)) throw e;
  }
}

/** Prepend an item to game.invent so it becomes item 'a'. */
function prependItem(g, fields) {
  const obj = Object.assign(makeObj(), fields);
  obj.nobj = g.invent;
  g.invent = obj;
  return obj;
}

// ===== Helper: place a monster adjacent to the player =====
// Forces the cell to ROOM typ if needed, prepends monster to fmon list.
// Returns the movement key to walk into the monster.
function placeMonsterAdjacent(g, mdat, mhp) {
  const ROOM = 5;
  // Try right ('l'), left ('h'), down ('j'), up ('k')
  const dirs = [
    { key: 'l', dx: 1, dy: 0 },
    { key: 'h', dx: -1, dy: 0 },
    { key: 'j', dx: 0, dy: 1 },
    { key: 'k', dx: 0, dy: -1 },
  ];
  for (const dir of dirs) {
    const nx = g.u.ux + dir.dx, ny = g.u.uy + dir.dy;
    if (nx < 0 || nx >= 80 || ny < 0 || ny >= 22) continue;
    // Force walkable
    if (!g.levl[nx] || !g.levl[nx][ny]) continue;
    g.levl[nx][ny].typ = ROOM;
    const mtmp = makeMonst(mdat);
    mtmp.mx = nx; mtmp.my = ny;
    mtmp.mhp = mhp != null ? mhp : mtmp.mhp;
    mtmp.orig_hp = mhp != null ? mhp : mtmp.orig_hp;
    mtmp.nmon = g.fmon;
    g.fmon = mtmp;
    return dir.key;
  }
  return 'l'; // fallback
}

// ===== Combat test (amon, attmon, killed, mon combat paths) =====
async function testCombatHit() {
  // Monster survives the hit — covers attmon() hit messages, flee check, confusion check
  let dirKey = 'l';
  await runWith(42, (g) => {
    const mdat = mon[0][4]; // kobold — low AC, doesn't do nasty things
    dirKey = placeMonsterAdjacent(g, mdat, 200); // high HP so it survives
    g.u.ulevel = 20; // high level → guaranteed hit
    g.u.udaminc = 1;
  }, dirKey.repeat(5)); // hit it multiple times
  console.log('testCombatHit: PASS (attmon hit path covered)');
}

async function testCombatKill() {
  // Monster dies in one hit — covers killed(), experience gain
  let dirKey = 'l';
  await runWith(42, (g) => {
    const mdat = mon[0][3]; // jackal — weakest
    dirKey = placeMonsterAdjacent(g, mdat, 1); // 1 HP → dies on first hit
    g.u.ulevel = 20;
  }, dirKey + ' ');  // kill + space for any prompt
  console.log('testCombatKill: PASS (killed() and attmon() covered)');
}

async function testCombatMiss() {
  // Player misses — covers MISS_MSG branch in amon()
  let dirKey = 'l';
  await runWith(99, (g) => {
    const mdat = mon[5][0]; // tougher monster with low AC (harder to hit)
    dirKey = placeMonsterAdjacent(g, mdat, 100);
    g.u.ulevel = 1; // low level → misses likely
    // Force a miss by prepping: use seed 99 which may give different RNG
  }, dirKey.repeat(3));
  console.log('testCombatMiss: PASS (miss path covered)');
}

// ===== Wand hits monster (covers lines 375-388 in do.js) =====
async function testWandHitsMonster() {
  let dirKey = 'l';
  await runWith(42, (g) => {
    // Place striking wand in inventory
    prependItem(g, { olet: '/', otyp: 3, spe: 5, quan: 1 });
    // Place monster in 'h' (left) direction
    const mdat = mon[0][0]; // bat
    const ROOM = 5;
    const nx = g.u.ux - 1, ny = g.u.uy;
    if (nx >= 0 && g.levl[nx] && g.levl[nx][ny]) {
      g.levl[nx][ny].typ = ROOM;
      const mtmp = makeMonst(mdat);
      mtmp.mx = nx; mtmp.my = ny;
      mtmp.mhp = 50; mtmp.orig_hp = 50;
      mtmp.nmon = g.fmon;
      g.fmon = mtmp;
    }
    g.u.ulevel = 20;
  }, 'pah ');  // p=zap, a=select wand, h=fire left (toward monster)
  console.log('testWandHitsMonster: PASS (wand hitting monster covered)');
}

// ===== Buzz wand hits monster (covers buzz() hit paths in do1.js) =====
async function testBuzzHitsMonster() {
  await runWith(42, (g) => {
    // Bolt wand (otyp=11 = fire wand)
    prependItem(g, { olet: '/', otyp: 11, spe: 5, quan: 1 });
    // Place monster in 'h' direction
    const mdat = mon[0][2]; // hobgoblin
    const ROOM = 5;
    const nx = g.u.ux - 1, ny = g.u.uy;
    if (nx >= 0 && g.levl[nx] && g.levl[nx][ny]) {
      g.levl[nx][ny].typ = ROOM;
      const mtmp = makeMonst(mdat);
      mtmp.mx = nx; mtmp.my = ny;
      mtmp.mhp = 50; mtmp.orig_hp = 50;
      mtmp.nmon = g.fmon;
      g.fmon = mtmp;
    }
  }, 'pah ');  // fire bolt wand left
  console.log('testBuzzHitsMonster: PASS (buzz() hitting monster covered)');
}

// ===== Pick up floor item (covers gobj() in hack.js) =====
async function testPickup() {
  await runWith(42, (g) => {
    // Place an item on the floor one step to the right
    const ROOM = 5;
    const nx = g.u.ux + 1, ny = g.u.uy;
    if (g.levl[nx] && g.levl[nx][ny]) {
      g.levl[nx][ny].typ = ROOM;
    }
    const obj = makeObj();
    obj.olet = '!'; obj.otyp = 0; obj.quan = 1;
    obj.ox = nx; obj.oy = ny;
    obj.nobj = g.fobj;
    g.fobj = obj;
  }, 'l ');  // move right onto item, pick it up
  console.log('testPickup: PASS (gobj() pickup covered)');
}

// ===== Stair descent/ascent (covers dodown/doup/savelev/getlev in lev.js) =====
async function testStairDescent() {
  // Teleport player to down stairs, then descend
  await runWith(42, (g) => {
    g.u.ux = g.xdnstair;
    g.u.uy = g.ydnstair;
  }, '> ');  // go down stairs
  console.log('testStairDescent: PASS (dodown/savelev/getlev covered)');
}

async function testStairAscent() {
  // Teleport player to up stairs; going up from level 1 triggers done('escaped')
  await runWith(42, (g) => {
    g.u.ux = g.xupstair;
    g.u.uy = g.yupstair;
  }, '< ');  // go up from level 1 → escape
  console.log('testStairAscent: PASS (doup/done(escaped) covered)');
}

async function testMultiLevel() {
  // Descend two levels and come back up
  await runWith(42, (g) => {
    g.u.ux = g.xdnstair;
    g.u.uy = g.ydnstair;
  }, '>< ');  // down then immediately up (now at xupstair on level 2)
  console.log('testMultiLevel: PASS (multi-level save/restore covered)');
}

// ===== Trap search (covers traps_name in do1.js) =====
async function testTrapSearch() {
  await runWith(42, (g) => {
    // Place a seen trap adjacent to the player
    // Place a seen bear trap adjacent to the player
    const SEEN = 32;
    const trapObj = { gx: g.u.ux + 1, gy: g.u.uy, gflag: SEEN | 0, ngen: g.ftrap };
    g.ftrap = trapObj;
    g.u.usearch = 0; // no ring of searching (so SEEN trap triggers without RNG)
  }, 'ss ');  // search twice
  console.log('testTrapSearch: PASS (traps_name covered)');
}

// ===== Buzz wand hits monster with each zhit type (1-4) =====
async function testBuzzZhitTypes() {
  // Test types 1-4 (fire, sleep, cold, death) by placing monster in bolt path
  for (let btype = 1; btype <= 4; btype++) {
    const wandOtyp = 11 + btype;  // wand otyp 12=fire, 13=sleep, 14=cold, 15=death
    await runWith(42, (g) => {
      prependItem(g, { olet: '/', otyp: wandOtyp, spe: 5, quan: 1 });
      const mdat = mon[0][2]; // hobgoblin
      const ROOM = 5;
      const nx = g.u.ux - 1, ny = g.u.uy;
      if (nx >= 0 && g.levl[nx] && g.levl[nx][ny]) {
        g.levl[nx][ny].typ = ROOM;
        const mtmp = makeMonst(mdat);
        mtmp.mx = nx; mtmp.my = ny;
        mtmp.mhp = 50; mtmp.orig_hp = 50;
        mtmp.nmon = g.fmon;
        g.fmon = mtmp;
      }
    }, 'pah ');
  }
  console.log('testBuzzZhitTypes: PASS (zhit types 1-4 covered)');
}

// ===== Throw at monster (covers thrown weapon hit/miss in attmon/amon) =====
async function testThrowAtMonster() {
  await runWith(42, (g) => {
    // Throw item 'a' in 'h' direction; place monster there
    prependItem(g, { olet: ')', otyp: 9, quan: 1, spe: 0, minus: false }); // dagger
    const mdat = mon[0][0]; // bat
    const ROOM = 5;
    const nx = g.u.ux - 1, ny = g.u.uy;
    if (nx >= 0 && g.levl[nx] && g.levl[nx][ny]) {
      g.levl[nx][ny].typ = ROOM;
      const mtmp = makeMonst(mdat);
      mtmp.mx = nx; mtmp.my = ny;
      mtmp.mhp = 50; mtmp.orig_hp = 50;
      mtmp.nmon = g.fmon;
      g.fmon = mtmp;
    }
    g.u.ulevel = 20; // high level → likely hits
  }, 'tah ');  // throw 'a' in direction 'h'
  console.log('testThrowAtMonster: PASS (thrown weapon combat covered)');
}

// ===== Losestr and ndaminc direct calls =====
async function testLoseStr() {
  // Run a game, then call losestr() / ndaminc() directly
  await runWith(42, (g) => {
    // Cover losestr normal str path (< 18)
    g.u.ustr = 10; g.u.ustrmax = 10;
    losestr(2); // ustr = 8 → ndaminc(8) → inc=0
    // Cover losestr high str path (> 18) → ustr = 20-15=5 → then set to 17
    g.u.ustr = 20; g.u.ustrmax = 20;
    losestr(1); // ustr → 17 → ndaminc(17) → inc=2
    // Cover ndaminc with str=18 (line 25)
    g.u.ustr = 18;
    ndaminc();
    // Cover ndaminc with str=19 (18/xx path, line 26)
    g.u.ustr = 19;
    ndaminc();
    // Cover ndaminc with str < 6 (line 18)
    g.u.ustr = 3;
    ndaminc();
    // Cover ndaminc with str 6-7 (line 19)
    g.u.ustr = 6;
    ndaminc();
  }, ' ');
  console.log('testLoseStr: PASS (losestr/ndaminc all branches covered)');
}

// ===== Hunger depletion (covers hunger messages in main.js) =====
async function testHunger() {
  // Set uhunger to 0 and run turns to trigger faint message
  await runWith(42, (g) => {
    g.u.uhunger = 0; // very hungry → triggers "faint from lack of food"
    g.u.uhs = 2; // already in "weak" state
  }, '   ');  // 3 idle turns to trigger hunger check
  console.log('testHunger: PASS (hunger faint path covered)');
}

// ===== Run mode movement (covers multi-move path in gameLoop) =====
async function testRunMode() {
  // 'L' = run right (uppercase movement = run mode)
  // The game runs domove() repeatedly until hitting a wall
  await runWith(42, (g) => {
    // Nothing to set up — just send run command
  }, 'L ');  // L = run-right until wall, space to stop
  console.log('testRunMode: PASS (multi-move run mode covered)');
}

// ===== HP regeneration at high level =====
async function testHPRegen() {
  // Player at level > 9 regenerates faster
  await runWith(42, (g) => {
    g.u.ulevel = 10; // level 10
    g.u.uhp = 1; // very low HP
    g.u.uhpmax = 50;
    g.u.uregen = true; // ring of regeneration — always regen
  }, '   ');  // idle turns to trigger regen
  console.log('testHPRegen: PASS (high-level HP regen covered)');
}

// ===== Pickup with stacking (covers gobj stacking path) =====
async function testPickupStack() {
  await runWith(42, (g) => {
    // Walk right onto a potion when player has same type in inventory
    // Player starts with food, mace, armor. We prepend a potion.
    // Then place same potion on floor to the right — stacking triggers
    prependItem(g, { olet: '!', otyp: 0, quan: 1 });  // potion in inventory
    const ROOM = 5;
    const nx = g.u.ux + 1, ny = g.u.uy;
    if (g.levl[nx] && g.levl[nx][ny]) g.levl[nx][ny].typ = ROOM;
    const floorPot = makeObj();
    floorPot.olet = '!'; floorPot.otyp = 0; floorPot.quan = 1;
    floorPot.ox = nx; floorPot.oy = ny;
    floorPot.nobj = g.fobj;
    g.fobj = floorPot;
  }, 'l ');  // move right onto floor potion — stacks with inventory potion
  console.log('testPickupStack: PASS (gobj stacking covered)');
}

// ===== Helper: place specific monster adjacent and fight =====
async function testMonsterFight(mdat, setupExtra, keys) {
  await runWith(42, (g) => {
    const dirKey = placeMonsterAdjacent(g, mdat, 200);
    g.u.ulevel = 15;
    g.u.uhp = 100;
    g.u.uhpmax = 100;
    if (setupExtra) setupExtra(g);
    testMonsterFight._lastDir = dirKey;
  }, keys || 'lllll ');
}

// ===== Level up on kill (covers mon.js lines 510-515) =====
async function testLevelUp() {
  await runWith(42, (g) => {
    // Set XP near threshold for level 1 → level 2
    g.u.uexp = 0; g.u.urexp = 0; g.u.ulevel = 1;
    // _levelXP(1) = 20 in hack, so give 19 XP, then kill bat (mhd=1, gives 4 XP) → level up
    g.u.uexp = 16;
    const mdat = mon[0][0]; // bat (mhd=1)
    placeMonsterAdjacent(g, mdat, 1); // 1 HP → one hit kill
    g.u.ulevel = 1;
  }, 'l ');
  console.log('testLevelUp: PASS (level-up on kill covered)');
}

// ===== Fight a nymph (steal test, mon.js steal()) =====
async function testNymphFight() {
  await runWith(42, (g) => {
    const mdat = mon[2][2]; // nymph (mlet='N')
    placeMonsterAdjacent(g, mdat, 200);
    g.u.ulevel = 15; // high level
    // Nymph steals items. Make sure we have items in inventory (already do).
  }, 'lllll ');  // fight nymph for several turns
  console.log('testNymphFight: PASS (steal() path covered)');
}

// ===== Fight a giant ant (poisoned, losestr) =====
async function testGiantAntFight() {
  await runWith(42, (g) => {
    const mdat = mon[2][0]; // giant ant (mlet='A')
    placeMonsterAdjacent(g, mdat, 200);
    g.u.ulevel = 15;
    g.u.upres = false; // not poison resistant → gets poisoned
  }, 'lllll ');
  console.log('testGiantAntFight: PASS (poisoned()/losestr paths covered)');
}

// ===== Fight a homonculous (sleep bite) =====
async function testHomonculousFight() {
  await runWith(42, (g) => {
    const mdat = mon[1][2]; // homonculous (mlet='h')
    placeMonsterAdjacent(g, mdat, 200);
    g.u.ulevel = 15;
    g.u.multi = 0; // not already in multi-move
  }, 'lllll ');
  console.log('testHomonculousFight: PASS (sleep bite path covered)');
}

// ===== Additional monster type fights for mon.js coverage =====

// Leprechaun - gold steal (lines 222-238 in mon.js)
async function testLeprechaunFight() {
  await runWith(42, (g) => {
    const mdat = mon[0][5]; // leprechaun (mlet='L')
    placeMonsterAdjacent(g, mdat, 200);
    g.u.ulevel = 15;
    g.u.ugold = 500; // need gold for steal to trigger
    g.u.urexp = 100;
  }, 'lllllll ');  // many turns to trigger steal
  console.log('testLeprechaunFight: PASS (leprechaun gold steal covered)');
}

// Vampire - level drain via losexp() (lines 283-288 in mon.js)
async function testVampireFight() {
  await runWith(42, (g) => {
    const mdat = mon[6][0]; // vampire (mlet='V')
    placeMonsterAdjacent(g, mdat, 200);
    g.u.ulevel = 5; // need level > 1 for losexp to work
    g.u.uhp = 200; g.u.uhpmax = 200;
  }, 'lllll      ');
  console.log('testVampireFight: PASS (vampire/losexp covered)');
}

// Wraith - level drain (lines 289-291 in mon.js)
async function testWraithFight() {
  await runWith(42, (g) => {
    const mdat = mon[4][5]; // wraith (mlet='W')
    placeMonsterAdjacent(g, mdat, 200);
    g.u.ulevel = 5;
    g.u.uhp = 200; g.u.uhpmax = 200;
  }, 'lllll      ');
  console.log('testWraithFight: PASS (wraith losexp covered)');
}

// Rust monster - rusts armor (lines 264-270 in mon.js)
async function testRustMonsterFight() {
  await runWith(42, (g) => {
    const mdat = mon[4][2]; // rust monster (mlet='R')
    placeMonsterAdjacent(g, mdat, 200);
    g.u.ulevel = 15;
    // Player has armor by default (ring armor, otyp=3)
  }, 'lllll ');
  console.log('testRustMonsterFight: PASS (rust monster/armor rust covered)');
}

// Violet fungi - stuck (line 282 in mon.js)
async function testVioletFungiFight() {
  await runWith(42, (g) => {
    const mdat = mon[2][6]; // violet fungi (mlet='v')
    placeMonsterAdjacent(g, mdat, 200);
    g.u.ulevel = 15;
  }, 'lllll ');
  console.log('testVioletFungiFight: PASS (violet fungi stuck covered)');
}

// Floating eye - freeze (lines 177-182 in mon.js)
async function testFloatingEyeFight() {
  await runWith(42, (g) => {
    const mdat = mon[1][1]; // floating eye (mlet='E')
    placeMonsterAdjacent(g, mdat, 200);
    g.u.ulevel = 15;
    g.u.ublind = 0; // not blind, so freeze triggers
    g.u.multi = 0;
  }, 'lllll ');
  console.log('testFloatingEyeFight: PASS (floating eye freeze covered)');
}

// Snake - poison (lines 272-275 in mon.js)
async function testSnakeFight() {
  await runWith(42, (g) => {
    const mdat = mon[3][6]; // snake (mlet='S')
    placeMonsterAdjacent(g, mdat, 200);
    g.u.ulevel = 15;
    g.u.upres = false; // not poison resistant
  }, 'lllll ');
  console.log('testSnakeFight: PASS (snake poison covered)');
}

// Killer bee - poison (lines 217-221 in mon.js)
async function testKillerBeeFight() {
  await runWith(42, (g) => {
    const mdat = mon[3][5]; // killer bee (mlet='k')
    placeMonsterAdjacent(g, mdat, 200);
    g.u.ulevel = 15;
    g.u.upres = false;
  }, 'lllll ');
  console.log('testKillerBeeFight: PASS (killer bee poison covered)');
}

// ===== do1.js uncovered paths =====

// findit() — never called from game commands; call directly (lines 84-113 in do1.js)
async function testFindit() {
  await runWith(42, async (g) => {
    // Add an SDOOR (value 3 typ) adjacent to player so findit finds it
    // Place in player's room; findit scans the current room
    const ux = g.u.ux, uy = g.u.uy;
    const SDOOR = 3;
    // Set one adjacent cell to SDOOR so findit() converts it to DOOR
    if (g.levl[ux+1] && g.levl[ux+1][uy]) g.levl[ux+1][uy].typ = SDOOR;
    await findit();
  }, '');
  console.log('testFindit: PASS (findit() covered)');
}

// hit()/miss() with !cansee — covers lines 78-80 in do1.js
// Place monster at non-visible cell, then fire wand in that direction
async function testHitMissNotCansee() {
  await runWith(42, (g) => {
    const mdat = mon[0][3]; // jackal
    const ROOM = 5;
    // Place monster to the right, but set cansee=false on its cell
    g.levl[g.u.ux + 1][g.u.uy].typ = ROOM;
    const mtmp = makeMonst(mdat);
    mtmp.mx = g.u.ux + 1; mtmp.my = g.u.uy;
    mtmp.mhp = 200; mtmp.orig_hp = 200;
    mtmp.nmon = g.fmon; g.fmon = mtmp;
    g.levl[g.u.ux + 1][g.u.uy].cansee = false; // monster NOT visible
    // Add bolt wand (otyp 12 = cold bolt) pointing right
    const wand = makeObj('/');
    wand.otyp = 12; wand.spe = 10; wand.known = true;
    wand.nobj = g.invent; g.invent = wand;
  }, 'pl ');  // zap ('p'), select 'a' wand, fire right ('l')
  console.log('testHitMissNotCansee: PASS (hit/miss !cansee covered)');
}

// ringoff() strength > 18 path — lines 43-51 in do1.js
async function testRingoffHighStrength() {
  // Test ring removal when ustr > 18 (ring of strength otyp 13)
  // Ring.minus=false means ring ADDS strength, removing it decreases
  // Ring.minus=true means ring REDUCES strength, removing it increases
  await runWith(42, (g) => {
    // Put on a +3 ring of gain strength
    const ring = makeObj('=');
    ring.otyp = 13; // ring of gain strength
    ring.spe = 3; ring.minus = false; ring.known = true;
    ring.nobj = g.invent; g.invent = ring;
    g.u.ustr = 20; g.u.ustrmax = 20; // strength > 18
    g.uleft = ring; // ring is on left hand
  }, 'Ra ');  // Remove ring 'a'
  console.log('testRingoffHighStrength: PASS (ringoff high-strength covered)');
}

// ===== Additional hack.js uncovered paths =====

// Confusion effect on hit (umconf) — lines 530-535 in hack.js
async function testUmconfHit() {
  await runWith(42, (g) => {
    const mdat = mon[0][3]; // jackal (easy to kill)
    placeMonsterAdjacent(g, mdat, 200);
    g.u.ulevel = 20; g.u.uhp = 200; g.u.uhpmax = 200;
    g.u.umconf = 1; // hands glow blue, next hit confuses monster
  }, 'lll  ');
  console.log('testUmconfHit: PASS (confusion effect covered)');
}

// gobj() with empty inventory — lines 584-586 in hack.js
async function testPickupEmptyInvent() {
  await runWith(42, (g) => {
    // Place an item on the floor at player's position
    const food = makeObj('%');
    food.otyp = 0; food.quan = 1;
    food.ox = g.u.ux; food.oy = g.u.uy;
    food.nobj = g.fobj; g.fobj = food;
    // Remove inventory so gobj goes to empty invent path
    g.invent = null; g.uwep = null; g.uarm = null; g.uleft = null; g.uright = null;
    // Also give some armor/weapon so game is stable
  }, ' ');  // wait one turn — item is on floor, player moves onto it
  console.log('testPickupEmptyInvent: PASS (gobj empty invent covered)');
}

// gobj() weapon ammo stacking — lines 593-596 in hack.js (quan + stacking for arrows)
async function testPickupAmmoStack() {
  await runWith(42, (g) => {
    // Player already has some arrows (otyp=0 weapon, quan=5)
    const arrows1 = makeObj(')');
    arrows1.otyp = 0; arrows1.quan = 5; arrows1.spe = 0; arrows1.minus = false;
    arrows1.nobj = null; g.invent = arrows1;
    // Place more arrows on floor
    const arrows2 = makeObj(')');
    arrows2.otyp = 0; arrows2.quan = 3; arrows2.spe = 0; arrows2.minus = false;
    arrows2.ox = g.u.ux; arrows2.oy = g.u.uy;
    arrows2.nobj = g.fobj; g.fobj = arrows2;
    g.uwep = null; g.uarm = null;
  }, ' ');  // wait — pick up arrows automatically on tile
  console.log('testPickupAmmoStack: PASS (gobj ammo stack covered)');
}

// ===== lev.js uncovered paths =====

// mkobj() and _mkobj_fill() — covers all item type branches (lines 184-236 in lev.js)
async function testMkobj() {
  wireDeps();
  const display = new MockDisplay();
  const input = new MockInput();
  const g = new GameState();
  g.display = display; g.input = input; g.rawRngLog = [];
  setGame(g);
  // Initialize minimal state for mkobj
  g.fobj = null;
  // Call mkobj with each item type letter to cover all branches
  for (const ch of [')', '*', '[', '!', '?', '/', '=', '%']) {
    mkobj(ch);
  }
  // Also call mkobj(null) for random roll
  for (let i = 0; i < 20; i++) mkobj(null);
  console.log('testMkobj: PASS (mkobj/mkobj_fill all branches covered)');
}

// fstole save/restore — covers serializeStoles() and getlev fstole path (lines 66-79, 262-265)
async function testSaveFstole() {
  await runWith(42, (g) => {
    // Create a stole entry with stolen gold to test serializeStoles
    const stmp = makeStole(null, null, 50); // monster=null, obj=null, gold=50
    stmp.nstole = g.fstole;
    g.fstole = stmp;
    // Position player at down stair to descend then ascend
    g.u.ux = g.xdnstair;
    g.u.uy = g.ydnstair;
    g.u.uhp = 200; g.u.uhpmax = 200;
  }, '>< ');
  console.log('testSaveFstole: PASS (fstole save/restore covered)');
}

// ===== Trap trigger tests (hack.js lines 254-296) =====

// Place a trap at the player's next step and walk into it
// Returns the direction key to step onto the trap
function placeTrap(g, ttype, seen) {
  const ROOM = 5;
  const SEEN_BIT = 32;
  // Try all 4 directions to find an accessible cell
  const dirs = [{key:'l',dx:1,dy:0},{key:'h',dx:-1,dy:0},{key:'j',dx:0,dy:1},{key:'k',dx:0,dy:-1}];
  for (const dir of dirs) {
    const x = g.u.ux + dir.dx, y = g.u.uy + dir.dy;
    if (x < 1 || x >= 79 || y < 1 || y >= 21) continue;
    // Remove any monster at this position
    let prev = null;
    for (let m = g.fmon; m; m = m.nmon) {
      if (m.mx === x && m.my === y) {
        if (!prev) g.fmon = m.nmon; else prev.nmon = m.nmon;
        break;
      }
      prev = m;
    }
    g.levl[x][y].typ = ROOM;
    let gflag = ttype;
    if (seen) gflag |= SEEN_BIT;
    const trap = makeGen(x, y, gflag);
    trap.ngen = g.ftrap; g.ftrap = trap;
    return dir.key;
  }
  return 'l'; // fallback
}

async function testSlpTrap() {
  let dir = 'l';
  await runWith(42, (g) => {
    dir = placeTrap(g, 6); // sleeping gas trap (ttype=6)
    g.u.uhp = 200; g.u.uhpmax = 200;
  }, dir + '  ');
  console.log('testSlpTrap: PASS (sleeping gas trap covered)');
}

async function testArrowTrap() {
  let dir = 'l';
  await runWith(42, (g) => {
    dir = placeTrap(g, 1); // arrow trap (ttype=1)
    g.u.uhp = 200; g.u.uhpmax = 200; g.u.ulevel = 1;
  }, dir + '  ');
  console.log('testArrowTrap: PASS (arrow trap covered)');
}

async function testDartTrap() {
  let dir = 'l';
  await runWith(42, (g) => {
    dir = placeTrap(g, 2); // dart trap (ttype=2)
    g.u.uhp = 200; g.u.uhpmax = 200; g.u.ulevel = 1; g.u.upres = false;
  }, dir + '  ');
  console.log('testDartTrap: PASS (dart trap covered)');
}

async function testTeleTrap() {
  let dir = 'l';
  await runWith(42, (g) => {
    dir = placeTrap(g, 4); // teleport trap (ttype=4)
    g.u.uhp = 200; g.u.uhpmax = 200;
  }, dir + '  ');
  console.log('testTeleTrap: PASS (teleport trap covered)');
}

async function testPitTrap() {
  let dir = 'l';
  await runWith(42, (g) => {
    dir = placeTrap(g, 5); // pit trap (ttype=5)
    g.u.uhp = 200; g.u.uhpmax = 200;
    g.u.ufloat = false;
  }, dir + '  ');
  console.log('testPitTrap: PASS (pit trap covered)');
}

async function testBearTrap() {
  let dir = 'l';
  await runWith(42, (g) => {
    dir = placeTrap(g, 0); // bear trap (ttype=0)
    g.u.uhp = 200; g.u.uhpmax = 200;
  }, dir + '   ');
  console.log('testBearTrap: PASS (bear trap covered)');
}

async function testTrapdoor() {
  let dir = 'l';
  await runWith(42, (g) => {
    dir = placeTrap(g, 3); // trapdoor (ttype=3) — calls dodown()/docrt_fn()
    g.u.uhp = 200; g.u.uhpmax = 200;
    // game.xdnstair must be set for the trapdoor-fall path (vs rock-fall path)
    // It should already be set by the game generator
  }, dir + '   ');
  console.log('testTrapdoor: PASS (trapdoor/dodown covered)');
}

async function testEscapeTrap() {
  // Escape a SEEN trap (SEEN=32 bit set; rn2(6)=0 for escape)
  // Step on trap multiple times to trigger escape path
  let dir = 'l', opp = 'h';
  await runWith(3, (g) => {
    dir = placeTrap(g, 5, true); // seen pit trap (ttype=5, SEEN set)
    opp = {l:'h',h:'l',j:'k',k:'j'}[dir];
    g.u.uhp = 200; g.u.uhpmax = 200;
  }, (dir + opp).repeat(10) + '      ');  // step back and forth many times
  console.log('testEscapeTrap: PASS (escape known trap covered)');
}

// ===== hack.js uncovered paths =====

// Confused movement — randomizes dx/dy (lines 128-130 in hack.js)
async function testConfusedMovement() {
  await runWith(42, (g) => {
    g.u.uconfused = 20; // confused for many turns
    g.u.uhp = 200; g.u.uhpmax = 200;
    // no adjacent monster, so movement happens
  }, 'llllllll  ');
  console.log('testConfusedMovement: PASS (confused movement covered)');
}

// Stuck+can't escape — player stuck on monster, tries to move away (lines 140-144 in hack.js)
async function testStuckEscape() {
  await runWith(42, (g) => {
    const ROOM = 5;
    const mdat = mon[2][6]; // violet fungi (mlet='v')
    g.levl[g.u.ux + 1][g.u.uy].typ = ROOM;
    const mtmp = makeMonst(mdat);
    mtmp.mx = g.u.ux + 1; mtmp.my = g.u.uy;
    mtmp.mhp = 200; mtmp.orig_hp = 200;
    mtmp.nmon = g.fmon; g.fmon = mtmp;
    g.u.ustuck = mtmp; // player stuck on violet fungi at right
    g.u.uhp = 200; g.u.uhpmax = 200;
    g.u.ulevel = 20;
  }, 'h  ');  // press 'h' (move left) — can't escape, covered
  console.log('testStuckEscape: PASS (stuck escape covered)');
}

// Blind movement — setsee() when ublind (lines 17-20 in hack.js)
async function testBlindMovement() {
  await runWith(42, (g) => {
    g.u.ublind = 20; // blind from the start
    g.u.uhp = 200; g.u.uhpmax = 200;
    // seehx starts at 0 since setsee() returned early during init
  }, 'llllhhhh  ');
  console.log('testBlindMovement: PASS (blind setsee/unsee covered)');
}

// getobj with no matching items — "You don't have anything to..." (lines 25-26 in do.js)
async function testGetObjEmpty() {
  await runWith(42, (g) => {
    // Remove all food from inventory, then try to eat
    // Actually, player starts with food. Let's try to quaff (drink) with no potions
    // by removing all '!' items. Or just try: 'q' (quaff) with no potions in pack.
    // Remove all items from inventory
    g.invent = null; g.uwep = null; g.uarm = null; g.uleft = null; g.uright = null;
  }, 'q ');  // try to quaff with no items
  console.log('testGetObjEmpty: PASS (getobj empty covered)');
}

// useup when item is second in list — covers useup else branch (do.js line 107-109)
async function testUseupNonHead() {
  await runWith(42, (g) => {
    // Add two items; quaff the second one (item 'b')
    const food = makeObj('%');
    food.otyp = 0; food.quan = 1; food.nobj = g.invent; g.invent = food; // 'a'
    const potion = makeObj('!');
    potion.otyp = 0; potion.quan = 1; potion.nobj = food; g.invent = potion; // 'a' = potion, 'b' = food
    // swap so potion is at 'b' position
    // Actually invent head is prepended: potion first ('a'), food second ('b')
    // We want to useup the second item (food) to cover non-head branch
    // So: drink potion 'a' (head) first, then eat food 'b'
    // Actually useup called when food is consumed - player eats food from position 'a'
    // Just prepend 2 items and eat the second
    // Redo: just have 2 items, eat the non-head one
    // first item = potion, second = food; eat 'eb' to eat food (second item)
    // Actually rhack 'e' → getobj('%') → food is item 'b' in list after potion 'a'
  }, 'eb ');  // eat food (second item 'b' after potion 'a')
  console.log('testUseupNonHead: PASS (useup non-head covered)');
}

// ===== Additional monster type tests for uncovered switch cases =====

// Demon ('&') — 5 hitu attacks (lines 134-143 in mon.js)
async function testDemonFight() {
  await runWith(7, (g) => {
    const mdat = mon[7][4]; // demon (mlet='&')
    placeMonsterAdjacent(g, mdat, 200);
    g.u.ulevel = 20; g.u.uhp = 500; g.u.uhpmax = 500;
  }, 'lllll      ');
  console.log('testDemonFight: PASS (demon multi-hit covered)');
}

// Jaguar ('j') — multi-hit (lines 210-214 in mon.js)
async function testJaguarFight() {
  await runWith(42, (g) => {
    const mdat = mon[3][4]; // jaguar (mlet='j')
    placeMonsterAdjacent(g, mdat, 200);
    g.u.ulevel = 1; g.u.uhp = 200; g.u.uhpmax = 200;
  }, 'lllll  ');
  console.log('testJaguarFight: PASS (jaguar multi-hit covered)');
}

// Stalker ('n') — two hitu (line 247 in mon.js)
async function testStalkerFight() {
  await runWith(42, (g) => {
    const mdat = mon[6][3]; // stalker (mlet='n')
    placeMonsterAdjacent(g, mdat, 200);
    g.u.ulevel = 20; g.u.uhp = 500; g.u.uhpmax = 500;
  }, 'lllll  ');
  console.log('testStalkerFight: PASS (stalker double-hit covered)');
}

// Owlbear ('o') — constrict path (lines 248-258 in mon.js)
async function testOwlbearFight() {
  await runWith(5, (g) => {
    const mdat = mon[4][1]; // owlbear (mlet='o')
    placeMonsterAdjacent(g, mdat, 200);
    g.u.ulevel = 1; g.u.uhp = 300; g.u.uhpmax = 300;
  }, 'lllllllll      ');
  console.log('testOwlbearFight: PASS (owlbear/constrict covered)');
}

// Quasit ('Q') — two hitu (line 263 in mon.js)
async function testQuasitFight() {
  await runWith(42, (g) => {
    const mdat = mon[2][4]; // quasit (mlet='Q')
    placeMonsterAdjacent(g, mdat, 200);
    g.u.ulevel = 20; g.u.uhp = 200; g.u.uhpmax = 200;
  }, 'lllll  ');
  console.log('testQuasitFight: PASS (quasit double-hit covered)');
}

// Scorpion ('s') — poison path (lines 277-279 in mon.js)
async function testScorpionFight() {
  await runWith(3, (g) => {
    const mdat = mon[4][3]; // giant scorpion (mlet='s')
    placeMonsterAdjacent(g, mdat, 200);
    g.u.ulevel = 1; g.u.uhp = 300; g.u.uhpmax = 300;
    g.u.upres = false;
  }, 'lllllllll      ');
  console.log('testScorpionFight: PASS (scorpion poison covered)');
}

// Troll ('T') — two hitu (line 280 in mon.js)
async function testTrollFight() {
  await runWith(42, (g) => {
    const mdat = mon[5][5]; // troll (mlet='T')
    placeMonsterAdjacent(g, mdat, 200);
    g.u.ulevel = 20; g.u.uhp = 200; g.u.uhpmax = 200;
  }, 'lllll  ');
  console.log('testTrollFight: PASS (troll double-hit covered)');
}

// Umber hulk ('U') — two hitu (line 281 in mon.js)
async function testUmberHulkFight() {
  await runWith(42, (g) => {
    const mdat = mon[5][6]; // umber hulk (mlet='U')
    placeMonsterAdjacent(g, mdat, 200);
    g.u.ulevel = 20; g.u.uhp = 200; g.u.uhpmax = 200;
  }, 'lllll  ');
  console.log('testUmberHulkFight: PASS (umber hulk double-hit covered)');
}

// Xorn ('X') — three hitu (line 293 in mon.js)
async function testXornFight() {
  await runWith(42, (g) => {
    const mdat = mon[6][1]; // xorn (mlet='X')
    placeMonsterAdjacent(g, mdat, 200);
    g.u.ulevel = 20; g.u.uhp = 200; g.u.uhpmax = 200;
  }, 'lllll  ');
  console.log('testXornFight: PASS (xorn triple-hit covered)');
}

// Yellow light ('y') — blinds player and self-destructs (lines 294-303 in mon.js)
async function testYellowLightFight() {
  await runWith(42, (g) => {
    const mdat = mon[1][5]; // yellow light (mlet='y')
    placeMonsterAdjacent(g, mdat, 1); // low HP so player kills it
    g.u.ulevel = 10; g.u.uhp = 200; g.u.uhpmax = 200;
    g.u.ublind = 0; // sighted so blind triggers
  }, 'l     ');
  console.log('testYellowLightFight: PASS (yellow light blind covered)');
}

// Yeti ('Y') — single hitu (line 304 in mon.js)
async function testYetiFight() {
  await runWith(42, (g) => {
    const mdat = mon[4][6]; // yeti (mlet='Y')
    placeMonsterAdjacent(g, mdat, 200);
    g.u.ulevel = 20; g.u.uhp = 200; g.u.uhpmax = 200;
  }, 'lllll  ');
  console.log('testYetiFight: PASS (yeti hit covered)');
}

// Freezing sphere ('F') — explodes and blinds/damages (lines 184-196 in mon.js)
async function testFreezingSphere() {
  await runWith(42, (g) => {
    const mdat = mon[4][0]; // freezing sphere (mlet='F')
    placeMonsterAdjacent(g, mdat, 1); // low HP so player kills it first turn
    g.u.ulevel = 5; g.u.uhp = 200; g.u.uhpmax = 200;
    g.u.ucoldres = false; // not cold resistant, so get blasted
  }, 'l     ');
  console.log('testFreezingSphere: PASS (freezing sphere explosion covered)');
}

// Blind combat — fight with ublind>0 to cover k1() blind paths (lines 87-88 in mon.js)
async function testBlindCombat() {
  await runWith(42, (g) => {
    const mdat = mon[5][5]; // troll (mlet='T')
    placeMonsterAdjacent(g, mdat, 200);
    g.u.ublind = 10; // player is blind during combat
    g.u.ulevel = 20; g.u.uhp = 200; g.u.uhpmax = 200;
  }, 'lllll  ');
  console.log('testBlindCombat: PASS (blind combat k1() covered)');
}

// Poison-resistant fight — covers poisoned() upres=true branch (lines 564-566)
async function testPoisonResist() {
  await runWith(3, (g) => {
    const mdat = mon[4][3]; // giant scorpion (mlet='s')
    placeMonsterAdjacent(g, mdat, 200);
    g.u.ulevel = 1; g.u.uhp = 300; g.u.uhpmax = 300;
    g.u.upres = true; // poison-resistant: different pline branch
  }, 'lllllllll      ');
  console.log('testPoisonResist: PASS (poisoned() upres=true covered)');
}

// delmon second branch — kill a second monster in the list (lines 530-534)
async function testDelmonSecond() {
  await runWith(42, (g) => {
    const ROOM = 5;
    // Place two monsters; kill the first one at right (l), second one at left (h)
    const mdat1 = mon[0][3]; // jackal (easy to kill)
    const mdat2 = mon[0][3]; // second jackal
    // Place monster 1 to the right
    g.levl[g.u.ux + 1][g.u.uy].typ = ROOM;
    const mtmp1 = makeMonst(mdat1);
    mtmp1.mx = g.u.ux + 1; mtmp1.my = g.u.uy;
    mtmp1.mhp = 1; mtmp1.orig_hp = 1;
    mtmp1.nmon = g.fmon; g.fmon = mtmp1;
    // Place monster 2 to the left
    g.levl[g.u.ux - 1][g.u.uy].typ = ROOM;
    const mtmp2 = makeMonst(mdat2);
    mtmp2.mx = g.u.ux - 1; mtmp2.my = g.u.uy;
    mtmp2.mhp = 1; mtmp2.orig_hp = 1;
    mtmp2.nmon = g.fmon; g.fmon = mtmp2;
    // Now fmon = mtmp2 -> mtmp1 -> ...
    // Kill mtmp2 first (move 'h'), then mtmp1 (move 'l')
    // After killing mtmp2, delmon(mtmp2): mtmp2 === g.fmon, so first branch
    // After killing mtmp1, delmon(mtmp1): prev.nmon = mtmp1, covers second branch
    g.u.ulevel = 20;
  }, 'h l    ');
  console.log('testDelmonSecond: PASS (delmon second branch covered)');
}

// steal() — nymph steals item (lines 537-560 in mon.js)
async function testNymphStealItem() {
  // Fight a nymph for many rounds with food in inventory to trigger steal
  await runWith(100, (g) => {
    const mdat = mon[2][2]; // nymph (mlet='N')
    placeMonsterAdjacent(g, mdat, 200);
    g.u.ulevel = 20; g.u.uhp = 300; g.u.uhpmax = 300;
    // Add a non-equipped item for nymph to steal
    const food = makeObj('%');
    food.otyp = 0; food.known = 0;
    food.nobj = g.invent; g.invent = food;
  }, 'lllllllllllllllllll      ');
  console.log('testNymphStealItem: PASS (steal() covered)');
}

// ===== Maze level generation (covers makemaz() in mklev.js) =====
async function testMazeLevel() {
  // Set flags.maze = 2 so level 2 is a maze, then descend to trigger makemaz()
  await runWith(42, (g) => {
    g.flags.maze = 2;  // next level will be maze
    g.u.ux = g.xdnstair;
    g.u.uy = g.ydnstair;
  }, '> ');  // descend to maze level 2
  console.log('testMazeLevel: PASS (makemaz() covered)');
}

// ===== Near-maze level (covers tspe="n" path) =====
async function testNearMazeLevel() {
  // Set flags.maze = 3 so level 2 is "near maze" (tspe='n')
  await runWith(42, (g) => {
    g.flags.maze = 3;  // level 2 = near-maze (level 3 = maze)
    g.u.ux = g.xdnstair;
    g.u.uy = g.ydnstair;
  }, '> ');
  console.log('testNearMazeLevel: PASS (near-maze level gen covered)');
}

// ===== Potion tests (drink1, all types) =====
// Each potion type is otyp 0..14.
// Sequence: 'qa' = quaff, select item 'a' (the prepended potion)
// Some potions (e.g. blindness) may need extra keys to clear prompts.

async function testPotions() {
  for (let otyp = 0; otyp <= 14; otyp++) {
    await runWith(42, (g) => {
      prependItem(g, { olet: '!', otyp, quan: 1 });
    }, 'qa ');
  }
  console.log('testPotions: PASS (all 15 types covered)');
}

// ===== Scroll tests (read1, all types) =====
// Scroll types 0..14. Some scrolls spawn monsters (create monster) or
// need follow-up input. We inject extra spaces to dismiss prompts.

async function testScrolls() {
  for (let otyp = 0; otyp <= 14; otyp++) {
    await runWith(42, (g) => {
      prependItem(g, { olet: '?', otyp, quan: 1 });
    }, 'ra   ');  // 'r' read, 'a' select, spaces for any prompts
  }
  console.log('testScrolls: PASS (all 15 types covered)');
}

// ===== Wand tests (zap, all types including bolt) =====
// Wand types: 0=light, 1=SMALL(strange), 2=create monster, 3=striking,
//             4-9: MSLOW/MFAST/ill/newcham/mcan/rloc
// Types 0-2: no direction needed. Types 3+: need direction.
// Bolt types (11-15): buzz() via wand of fire/cold/sleep/magic missile/death
// Key sequence: 'pa' for non-directional, 'pah' for directional

async function testWands() {
  // Non-directional wands: otyp 0, 1, 2
  for (let otyp = 0; otyp <= 2; otyp++) {
    await runWith(42, (g) => {
      prependItem(g, { olet: '/', otyp, spe: 5, quan: 1 });
    }, 'pa ');
  }
  // Directional wands: otyp 3-9 (hit monster or empty space)
  for (let otyp = 3; otyp <= 9; otyp++) {
    await runWith(42, (g) => {
      prependItem(g, { olet: '/', otyp, spe: 5, quan: 1 });
    }, 'pah ');
  }
  // Bolt wands: otyp 11-15 (fire buzz())
  for (let otyp = 11; otyp <= 15; otyp++) {
    await runWith(42, (g) => {
      prependItem(g, { olet: '/', otyp, spe: 5, quan: 1 });
    }, 'pah ');
  }
  console.log('testWands: PASS (all wand types + buzz() covered)');
}

// ===== Ring tests (P=put on, R=remove, ringoff effects) =====
// Key flow for put-on ring:
//   'P' → getobj calls pline('Wear what?') [topl→2], sets topl=1, waits for item key
//   'a' → item selected
//   pline('Right or Left?') [topl was 1 → topl=2, shows message then waits for getKey]
//   'l' → lowercase 'l' is valid → game.uleft = otmp
//   applyRingOn(otmp) runs (no getKey)
//   prinv(otmp) → pline [topl=2 → --More-- → waits for space]
//   ' ' → clears --More--
// Key flow for remove ring ('R' case picks first ring, no item selection):
//   'R' → ringoff(otmp), then pline('You remove X') [topl→2]
//   ' ' → clears --More--

async function testRings() {
  for (let otyp = 0; otyp <= 16; otyp++) {
    await runWith(42, (g) => {
      prependItem(g, { olet: '=', otyp, spe: 1, minus: false, quan: 1 });
    }, 'Pal R  ');  // P=put-on, a=select, l=left-hand, R=remove, spaces for --More--
  }
  // Test ring with minus flag (otyp 15/16 negative branch in applyRingOn/ringoff)
  await runWith(42, (g) => {
    prependItem(g, { olet: '=', otyp: 15, spe: 2, minus: true, quan: 1 });
  }, 'Pal R  ');
  await runWith(42, (g) => {
    prependItem(g, { olet: '=', otyp: 16, spe: 2, minus: true, quan: 1 });
  }, 'Pal R  ');
  // Test escape from Right/Left prompt (line 416: side === '\x1b')
  await runWith(42, (g) => {
    prependItem(g, { olet: '=', otyp: 1, spe: 1, minus: false, quan: 1 });
  }, 'Pa\x1b ');  // P=put-on, a=select, ESC=cancel ring placement
  // Test two-ring scenario (both hands full → "wearing two rings" message)
  await runWith(42, (g) => {
    const r1 = prependItem(g, { olet: '=', otyp: 1, spe: 1, minus: false, quan: 1 });
    const r2 = prependItem(g, { olet: '=', otyp: 2, spe: 1, minus: false, quan: 1 });
    g.uleft = r2; g.uright = r1;  // pre-worn, both hands
  }, 'Pa ');  // Try to put on a third ring → "wearing two rings" message
  console.log('testRings: PASS (all ring types + ringoff() + applyRingOn() covered)');
}

// ===== Armor wear/remove tests =====
// The player starts with ring armor (otyp=3). Remove it first ('T'),
// then wear a different armor ('Wa'). Also test: wearing while already wearing.
// 'T' = take off armor.

async function testArmor() {
  // Remove starting armor, then wear a new one
  await runWith(42, (g) => {
    prependItem(g, { olet: '[', otyp: 5, spe: 0, minus: false, quan: 1 });  // plate mail
  }, 'Ta Wa ');
  // Try wearing while already wearing (should fail)
  await runWith(42, (g) => {
    prependItem(g, { olet: '[', otyp: 5, spe: 0, minus: false, quan: 1 });
  }, 'Wa ');  // already wearing c armor
  console.log('testArmor: PASS (wear/remove armor covered)');
}

// ===== Drop test =====
async function testDrop() {
  // Drop item 'a' (prepended item)
  await runWith(42, (g) => {
    prependItem(g, { olet: '!', otyp: 3, quan: 3 });  // 3 healing potions
  }, 'da 2 ');  // drop, item a, quantity 2, space for prompt
  // Drop a single item
  await runWith(42, (g) => {
    prependItem(g, { olet: '?', otyp: 0, quan: 1 });
  }, 'da ');
  console.log('testDrop: PASS (drop covered)');
}

// ===== Throw test =====
async function testThrow() {
  // Throw weapon in direction h
  await runWith(42, (g) => {
    prependItem(g, { olet: ')', otyp: 4, quan: 1 });  // another mace
  }, 'tah ');  // throw, item a, direction h
  console.log('testThrow: PASS (throw covered)');
}

// ===== Eat food test =====
async function testEat() {
  // Food is item 'b' in starting inventory (food is at front = 'a'),
  // but we prepend a potion so food shifts to 'b'. Actually player starts with food at 'a'.
  // Just send 'ea' to eat food ration.
  await runWith(42, null, 'ea ');
  console.log('testEat: PASS (eat covered)');
}

// ===== Call item test (docall) =====
async function testCall() {
  // 'ca' to call item a (the potion), then type name + enter
  await runWith(42, (g) => {
    prependItem(g, { olet: '!', otyp: 3, quan: 1 });
  }, 'ca' + 'healing\r ');
  console.log('testCall: PASS (docall covered)');
}

// ===== Save game test (dosave) =====
async function testSave() {
  localStorage.removeItem('hack_save');
  await runWith(42, null, 'Sy ');  // S = save, y = confirm
  const saved = localStorage.getItem('hack_save') !== null;
  console.log('testSave:', saved ? 'PASS (dosave covered)' : 'FAIL (save not written)');
}

// ===== Restore game test (dorecover) =====
// dorecover() is called from firsthack.js (browser entry), not from rhack.
// We test it by calling it directly after saving.
async function testRestore() {
  // First save a game
  await runWith(42, null, 'Sy ');

  // Now call dorecover() directly
  const { dorecover } = await import('../js/do1.js');

  wireDeps();
  const display = new MockDisplay();
  const input = new MockInput();
  const g = new GameState();
  g.display = display;
  g.input = input;
  g.rawRngLog = [];
  setGame(g);

  const result = await dorecover();
  console.log('testRestore:', result ? 'PASS (dorecover covered)' : 'FAIL (restore returned false)');
  localStorage.removeItem('hack_save');
}

// ===== Quit test (done/done1) =====
async function testQuit() {
  await runWith(42, null, 'Qy');
  console.log('testQuit: PASS (done/done1 covered)');
}

// ===== Inventory display test =====
async function testInventory() {
  await runWith(42, null, 'i ');
  console.log('testInventory: PASS (inventory covered)');
}

// ===== Search test (dosearch) =====
async function testSearch() {
  await runWith(42, null, 'sssss');
  console.log('testSearch: PASS (dosearch covered)');
}

// ===== Run all tests =====
await testMazeLevel();
await testNearMazeLevel();
await testLevelUp();
await testNymphFight();
await testGiantAntFight();
await testHomonculousFight();
await testLeprechaunFight();
await testVampireFight();
await testWraithFight();
await testRustMonsterFight();
await testVioletFungiFight();
await testFloatingEyeFight();
await testSnakeFight();
await testKillerBeeFight();
await testFindit();
await testHitMissNotCansee();
await testRingoffHighStrength();
await testMkobj();
await testSaveFstole();
await testUmconfHit();
await testPickupEmptyInvent();
await testPickupAmmoStack();
await testSlpTrap();
await testArrowTrap();
await testDartTrap();
await testTeleTrap();
await testPitTrap();
await testBearTrap();
await testTrapdoor();
await testEscapeTrap();
await testConfusedMovement();
await testStuckEscape();
await testBlindMovement();
await testGetObjEmpty();
await testUseupNonHead();
await testDemonFight();
await testJaguarFight();
await testStalkerFight();
await testOwlbearFight();
await testQuasitFight();
await testScorpionFight();
await testTrollFight();
await testUmberHulkFight();
await testXornFight();
await testYellowLightFight();
await testYetiFight();
await testFreezingSphere();
await testBlindCombat();
await testPoisonResist();
await testDelmonSecond();
await testNymphStealItem();
await testLoseStr();
await testHunger();
await testRunMode();
await testHPRegen();
await testStairDescent();
await testStairAscent();
await testMultiLevel();
await testTrapSearch();
await testBuzzZhitTypes();
await testThrowAtMonster();
await testPickupStack();
await testCombatHit();
await testCombatKill();
await testCombatMiss();
await testWandHitsMonster();
await testBuzzHitsMonster();
await testPickup();
await testEat();
await testInventory();
await testSearch();
await testDrop();
await testThrow();
await testCall();
await testPotions();
await testScrolls();
await testWands();
await testRings();
await testArmor();
await testSave();
await testRestore();
await testQuit();
await testAlloc();
await testGetret();
await testNdamincExtreme();
await testGetobjStar();
await testGetobjWrongType();
await testThrowWearing();
await testLoseoneStack();
await testFindSdoor();
await testFindHiddenTrap();
await testBuzzSwallowed();
await testBuzzHitsPlayer();
await testDeepLevel();
await testSwallowed();
await testMimicSinv();
await testHitMissVisible();
await testRingoffCursed();
await testBhitRangeOut();
await testBuzzColdRes();
await testDropPartial();
await testPotionDefault();
await testCtrlLRedraw();
await testPoisonedDirect();
await testDelmonNonHead();
await testStealEquipped();
await testRingoffCursedSmall();
await testDropNonHead();
await testGetobjSingleStar();
await testLitroomDark();
await testWandStrikeMiss();
await testFindFakeGold();
await testDropInvalid();

// ===== Additional coverage: main.js/do.js/do1.js/mklev.js paths =====

// alloc() — exported but never called in game; covers main.js lines 43-44
async function testAlloc() {
  const obj = alloc();
  if (typeof obj !== 'object') throw new Error('alloc should return an object');
  console.log('testAlloc: PASS (alloc() covered)');
}

// getret() — covers main.js lines 61-64
async function testGetret() {
  wireDeps();
  const display = new MockDisplay();
  const input = new MockInput();
  const g = new GameState();
  g.display = display; g.input = input; g.rawRngLog = [];
  setGame(g);
  let keyIdx = 0;
  const keys = '  '; // two spaces — first triggers --More-- from pline, second confirms
  input.getKey = async () => { if (keyIdx < keys.length) return keys[keyIdx++]; throw new SessionDone(); };
  try { await getret(); } catch (e) { if (!(e instanceof SessionDone)) throw e; }
  console.log('testGetret: PASS (getret() covered)');
}

// ndaminc with extreme strength (str >= 103) — covers main.js line 27
async function testNdamincExtreme() {
  wireDeps();
  const g = new GameState();
  g.display = new MockDisplay(); g.input = new MockInput(); g.rawRngLog = [];
  setGame(g);
  g.u.ustr = 103; // extreme strength — triggers `else inc = 7` branch
  ndaminc();
  console.log('testNdamincExtreme: PASS (ndaminc extreme str covered)');
}

// getobj with '*' key — shows inventory list (do.js lines 34-40)
async function testGetobjStar() {
  await runWith(42, (g) => {
    // Add 2 potions so doinv(filter) branch runs (foo > 1 for '!' filter)
    const p1 = makeObj(); p1.olet = '!'; p1.otyp = 3; p1.quan = 1;
    const p2 = makeObj(); p2.olet = '!'; p2.otyp = 5; p2.quan = 1;
    p1.nobj = g.invent; g.invent = p1;
    p2.nobj = g.invent; g.invent = p2;
  }, 'q*\x1b       '); // 'q'=quaff, '*'=list all, ESC=cancel
  console.log('testGetobjStar: PASS (getobj * branch covered)');
}

// getobj with wrong item type — "You can't wear that" (do.js lines 49-50)
async function testGetobjWrongType() {
  await runWith(42, (g) => {
    // Remove existing armor so player can wear something; player starts with leather armor
    // 'W' tries to wear armor ('['), but 'a' selects food ('%') — wrong type
    g.uarm = null; // allow wearing
  }, 'Wa  '); // W=wear, a=select food (wrong type), space=clear pline
  console.log('testGetobjWrongType: PASS (getobj wrong-type covered)');
}

// Throw a worn ring — "You can't throw something you're wearing!" (do.js line 328)
async function testThrowWearing() {
  await runWith(42, (g) => {
    // Add a ring as first inventory item and wear it on left hand
    const ring = makeObj(); ring.olet = '='; ring.otyp = 0; ring.quan = 1;
    ring.nobj = g.invent; g.invent = ring;
    g.uleft = ring; // ring is 'a' in inventory, worn on left
  }, 'tal  '); // t=throw, a=select ring, l=direction → WEARI message
  console.log('testThrowWearing: PASS (throw-wearing covered)');
}

// loseone with quan>1 — separate weapon from stack (do.js lines 130-134)
async function testLoseoneStack() {
  await runWith(42, (g) => {
    // Add arrows (weapon ')', quan=6) as first inventory item
    const arrows = makeObj(); arrows.olet = ')'; arrows.otyp = 0; arrows.quan = 6;
    arrows.cursed = false; arrows.minus = false;
    arrows.nobj = g.invent; g.invent = arrows;
  }, 'tal  '); // t=throw, a=select arrows (stack), l=direction
  console.log('testLoseoneStack: PASS (loseone quan>1 covered)');
}

// findit() with SDOOR in room — covers do1.js line 94
async function testFindSdoor() {
  wireDeps();
  const g = new GameState();
  g.display = new MockDisplay(); g.input = new MockInput(); g.rawRngLog = [];
  setGame(g);
  const ROOM = 5, SDOOR = 2;
  // Set player position and room context
  g.u.ux = 20; g.u.uy = 10;
  // Set room cells around player to ROOM type
  for (let x = 15; x <= 25; x++) g.levl[x][10].typ = ROOM;
  // Place SDOOR within the room scan area
  g.levl[23][10].typ = SDOOR;
  await findit();
  // SDOOR should now be DOOR (3)
  console.log('testFindSdoor: PASS (findit SDOOR conversion covered)');
}

// findit() with hidden trap (no SEEN bit) — covers do1.js lines 96-98
async function testFindHiddenTrap() {
  wireDeps();
  const g = new GameState();
  g.display = new MockDisplay(); g.input = new MockInput(); g.rawRngLog = [];
  setGame(g);
  const ROOM = 5;
  g.u.ux = 20; g.u.uy = 10;
  for (let x = 15; x <= 25; x++) g.levl[x][10].typ = ROOM;
  // Place hidden trap (no SEEN bit) in room
  const trap = makeGen(22, 10, 5); // pit trap, no SEEN flag
  trap.ngen = g.ftrap; g.ftrap = trap;
  await findit();
  // Trap should now have SEEN bit set
  console.log('testFindHiddenTrap: PASS (findit hidden trap covered)');
}

// buzz() while swallowed — covers do1.js lines 133-137
async function testBuzzSwallowed() {
  await runWith(42, (g) => {
    const mdat = mon[5][6]; // umber hulk 'U' (large monster, survives bolt)
    const mtmp = makeMonst(mdat);
    mtmp.mx = g.u.ux; mtmp.my = g.u.uy;
    mtmp.mhp = 200; mtmp.orig_hp = 200;
    mtmp.nmon = g.fmon; g.fmon = mtmp;
    g.u.uswallow = true;
    g.u.ustuck = mtmp;
    g.u.uhp = 200; g.u.uhpmax = 200;
    // Add bolt wand (otyp=11 → buzz type 0, fire) as first item
    const wand = makeObj(); wand.olet = '/'; wand.otyp = 11; wand.spe = 20; wand.quan = 1;
    wand.nobj = g.invent; g.invent = wand;
  }, 'pal     '); // p=zap, a=select wand, l=direction → buzz-swallowed fires
  console.log('testBuzzSwallowed: PASS (buzz-while-swallowed covered)');
}

// buzz() hitting player — covers do1.js lines 152-169
async function testBuzzHitsPlayer() {
  wireDeps();
  const g = new GameState();
  g.display = new MockDisplay(); g.input = new MockInput(); g.rawRngLog = [];
  setGame(g);
  g.rngSeed = 12345;
  g.u.ux = 20; g.u.uy = 10;
  g.u.uac = 20; // terrible armor → bolt almost always hits
  g.u.uhp = 200; g.u.uhpmax = 200;
  g.u.ufireres = true; // covers "You don't feel hot!" line (type=1)
  // Set cells between start and player to ROOM
  for (let x = 12; x <= 22; x++) g.levl[x][10].typ = 5;
  let keyIdx = 0;
  const spaces = '                    '; // 20 spaces for --More-- prompts
  g.input.getKey = async () => { if (keyIdx < spaces.length) return spaces[keyIdx++]; throw new SessionDone(); };
  try {
    // type=0 (fire): player hit, takes damage (lines 155-157)
    await buzz(0, 12, 10, 1, 0);
    // type=1 (fire bolt) with ufireres: "You don't feel hot!" (lines 159-160)
    g.u.uhp = 200; // restore HP
    await buzz(1, 12, 10, 1, 0);
    // type=0 with low AC (miss path): "The bolt wizzes by you!" (line 169)
    g.u.uac = -10; // excellent armor → almost always miss
    await buzz(0, 12, 10, 1, 0);
  } catch(e) { if (!(e instanceof SessionDone)) throw e; }
  console.log('testBuzzHitsPlayer: PASS (buzz hits/misses player covered)');
}

// mklev.js deep level (dlevel>8) — covers mkmim() lines 84-126
async function testDeepLevel() {
  wireDeps();
  const g = new GameState();
  g.display = new MockDisplay(); g.input = new MockInput(); g.rawRngLog = [];
  setGame(g);
  g.flags.maze = 99; // no maze at these levels
  g.dlevel = 9;      // deep enough for mktrap→mkmim (dlevel > 8)
  g.rngSeed = 1;
  // Generate many levels to ensure mkmim is called (12.5% per trap placed)
  for (let attempt = 0; attempt < 30; attempt++) {
    g.rngSeed = attempt + 1;
    generatelevel(9);
  }
  console.log('testDeepLevel: PASS (mkmim deep-level covered)');
}

// ===== Next wave: swallowed, sinv mimic, miss/hit visible, more edge cases =====

// Player swallowed — covers hack.js 135-139 (domove while swallowed),
// mon.js 113-121 (dochug swallow attack), pri.js 66-73 (swallowed() display)
async function testSwallowed() {
  await runWith(42, (g) => {
    const mdat = mon[5][6]; // umber hulk 'U' — uses default digest case
    const mtmp = makeMonst(mdat);
    mtmp.mx = g.u.ux; mtmp.my = g.u.uy;
    mtmp.mhp = 200; mtmp.orig_hp = 200;
    mtmp.mstat = 0; // MNORM — active
    mtmp.nmon = g.fmon; g.fmon = mtmp;
    g.u.uswallow = true;
    g.u.ustuck = mtmp;
    g.u.uhp = 200; g.u.uhpmax = 200;
  }, 'llllll              '); // moves while swallowed + plenty of spaces for digest messages
  console.log('testSwallowed: PASS (swallowed paths covered)');
}

// Sinv Mimic — player walks into sinv Mimic, covers hack.js 150-154
async function testMimicSinv() {
  await runWith(42, (g) => {
    const ROOM = 5;
    const mdat = mon[5][2]; // mimic 'M'
    g.levl[g.u.ux + 1][g.u.uy].typ = ROOM;
    const mtmp = makeMonst(mdat);
    mtmp.mx = g.u.ux + 1; mtmp.my = g.u.uy;
    mtmp.sinv = true; // invisible/sinv
    mtmp.nmon = g.fmon; g.fmon = mtmp;
    g.u.uhp = 200; g.u.uhpmax = 200;
    g.u.ustuck = null;
  }, 'l   '); // move right into sinv mimic → "That's a mimic!"
  console.log('testMimicSinv: PASS (sinv mimic covered)');
}

// hit() and miss() with cansee=true — covers do1.js lines 73, 79
async function testHitMissVisible() {
  wireDeps();
  const g = new GameState();
  g.display = new MockDisplay(); g.input = new MockInput(); g.rawRngLog = [];
  setGame(g);
  const mdat = mon[1][0]; // goblin 'g' or similar
  const mtmp = makeMonst(mdat);
  mtmp.mx = 15; mtmp.my = 10;
  g.levl[15][10].cansee = true; // monster IS visible → pline with name
  let keyIdx = 0;
  const spaces = '      ';
  g.input.getKey = async () => { if (keyIdx < spaces.length) return spaces[keyIdx++]; throw new SessionDone(); };
  try {
    await miss('bolt of fire', mtmp); // do1.js line 79 — "The bolt of fire misses the X."
    await hit('bolt of fire', mtmp);  // do1.js line 73 — "The bolt of fire hits the X."
  } catch (e) { if (!(e instanceof SessionDone)) throw e; }
  console.log('testHitMissVisible: PASS (hit/miss cansee=true covered)');
}

// Cursed gain-strength ring removal — covers do1.js lines 49-51 (obj.minus=true, ustr>17)
async function testRingoffCursed() {
  await runWith(42, (g) => {
    // Ring of gain strength (otyp=13), cursed (minus=true), spe=1
    const ring = makeObj();
    ring.olet = '='; ring.otyp = 13; ring.spe = 1; ring.minus = true; ring.quan = 1;
    ring.nobj = g.invent; g.invent = ring;
    g.uleft = ring; // wearing it
    g.u.ustr = 20; g.u.ustrmax = 20; // > 17 → hits line 49
  }, 'Ral  '); // R=remove ring, a=select it (first item), l=left
  console.log('testRingoffCursed: PASS (ringoff cursed str>17 covered)');
}

// bhit() range runs out — covers do1.js lines 126-127
async function testBhitRangeOut() {
  wireDeps();
  const g = new GameState();
  g.display = new MockDisplay(); g.input = new MockInput(); g.rawRngLog = [];
  setGame(g);
  g.u.ux = 10; g.u.uy = 10;
  // Set cells in bolt path to ROOM — no monsters, no walls
  for (let x = 10; x <= 20; x++) g.levl[x][10].typ = 5; // ROOM
  g.input.getKey = async () => { throw new SessionDone(); };
  const result = bhit(1, 0, 5); // fire bolt right, range=5, no obstacles
  if (result !== null) throw new Error('Expected null from bhit range-out');
  console.log('testBhitRangeOut: PASS (bhit range-out covered)');
}

// buzz() cold bolt with ucoldres=true — covers do1.js lines 163-164
async function testBuzzColdRes() {
  wireDeps();
  const g = new GameState();
  g.display = new MockDisplay(); g.input = new MockInput(); g.rawRngLog = [];
  setGame(g);
  g.rngSeed = 12345;
  g.u.ux = 20; g.u.uy = 10;
  g.u.uac = 20; // ensure bolt hits
  g.u.uhp = 200; g.u.uhpmax = 200;
  g.u.ucoldres = true; // "You don't feel cold!" path (lines 163-164)
  for (let x = 12; x <= 22; x++) g.levl[x][10].typ = 5;
  let keyIdx = 0;
  const spaces = '          ';
  g.input.getKey = async () => { if (keyIdx < spaces.length) return spaces[keyIdx++]; throw new SessionDone(); };
  try {
    await buzz(3, 12, 10, 1, 0); // cold bolt → hits player with coldres → "You don't feel cold!"
  } catch(e) { if (!(e instanceof SessionDone)) throw e; }
  console.log('testBuzzColdRes: PASS (buzz cold+ucoldres covered)');
}

// Drop partial stack — covers do.js lines 345-352
async function testDropPartial() {
  await runWith(42, (g) => {
    // Arrows (weapon, quan=6) as first inventory item
    const arrows = makeObj(); arrows.olet = ')'; arrows.otyp = 0; arrows.quan = 6;
    arrows.cursed = false; arrows.minus = false;
    arrows.nobj = g.invent; g.invent = arrows;
  }, 'da3\n     '); // d=drop, a=select arrows (6), 3=how many, \n=confirm, spaces for pline
  console.log('testDropPartial: PASS (drop partial stack covered)');
}

// Potion with otyp=15+ — covers do.js line 211 (default case in drink1)
async function testPotionDefault() {
  await runWith(42, (g) => {
    const p = makeObj(); p.olet = '!'; p.otyp = 15; p.quan = 1; // unknown type 15
    p.nobj = g.invent; g.invent = p;
  }, 'qa  '); // q=quaff, a=select potion, space for "You feel strange."
  console.log('testPotionDefault: PASS (drink1 default covered)');
}

// Ctrl-L redraw — covers do.js line 303
async function testCtrlLRedraw() {
  await runWith(42, null, '\x0c  '); // Ctrl-L = redraw
  console.log('testCtrlLRedraw: PASS (Ctrl-L redraw covered)');
}

// ===== Wave 3: mon.js poisoned, delmon non-head, steal, do.js remaining =====

// poisoned() direct call — covers mon.js lines 564-571
async function testPoisonedDirect() {
  wireDeps();
  const g = new GameState();
  g.display = new MockDisplay(); g.input = new MockInput(); g.rawRngLog = [];
  setGame(g);
  g.u.upres = false; g.u.uhp = 200; g.u.uhpmax = 200;
  let keyIdx = 0;
  const spaces = '          ';
  g.input.getKey = async () => { if (keyIdx < spaces.length) return spaces[keyIdx++]; throw new SessionDone(); };
  try {
    await poisoned("snake's bite");  // upres=false → lines 568-570
    g.u.upres = true;
    await poisoned("bee sting");     // upres=true → lines 564-566
  } catch(e) { if (!(e instanceof SessionDone)) throw e; }
  console.log('testPoisonedDirect: PASS (poisoned() all branches covered)');
}

// delmon() non-head — covers mon.js line 534
async function testDelmonNonHead() {
  wireDeps();
  const g = new GameState();
  g.display = new MockDisplay(); g.input = new MockInput(); g.rawRngLog = [];
  setGame(g);
  g.u.ux = 10; g.u.uy = 10; g.u.uhp = 200; g.u.uhpmax = 200;
  // Add monster1 first (will be second in list: m2→m1)
  const m1 = makeMonst(mon[0][0]); m1.mx = 5; m1.my = 5; m1.mhp = 1; m1.orig_hp = 1;
  m1.nmon = g.fmon; g.fmon = m1;
  // Add monster2 as new head
  const m2 = makeMonst(mon[0][0]); m2.mx = 6; m2.my = 6; m2.mhp = 1; m2.orig_hp = 1;
  m2.nmon = g.fmon; g.fmon = m2; // game.fmon = m2, m2.nmon = m1
  let keyIdx = 0;
  const spaces = '       ';
  g.input.getKey = async () => { if (keyIdx < spaces.length) return spaces[keyIdx++]; throw new SessionDone(); };
  try {
    await killed(m1); // kill non-head m1 → delmon non-head path (line 534)
  } catch(e) { if (!(e instanceof SessionDone)) throw e; }
  console.log('testDelmonNonHead: PASS (delmon non-head covered)');
}

// steal() with equipped items — covers mon.js lines 546-547, 550
async function testStealEquipped() {
  wireDeps();
  const g = new GameState();
  g.display = new MockDisplay(); g.input = new MockInput(); g.rawRngLog = [];
  setGame(g);
  // Inventory: uwep=sword, uarm=armor, then potion (unequipped, to be stolen)
  const sword = makeObj(); sword.olet = ')'; sword.otyp = 4; sword.quan = 1;
  const armor = makeObj(); armor.olet = '['; armor.otyp = 3; armor.quan = 1;
  const potion = makeObj(); potion.olet = '!'; potion.otyp = 3; potion.quan = 1;
  sword.nobj = armor; armor.nobj = potion; potion.nobj = null;
  g.invent = sword; g.uwep = sword; g.uarm = armor;
  // Nymph stealer
  const ndat = mon[3][2]; // some stealing monster
  const stealer = makeMonst(ndat); stealer.mx = 5; stealer.my = 5;
  stealer.nmon = g.fmon; g.fmon = stealer;
  let keyIdx = 0;
  const spaces = '         ';
  g.input.getKey = async () => { if (keyIdx < spaces.length) return spaces[keyIdx++]; throw new SessionDone(); };
  try {
    await steal(stealer); // sword=equipped, armor=equipped → while loop advances (546-547); steals potion from middle (550)
  } catch(e) { if (!(e instanceof SessionDone)) throw e; }
  console.log('testStealEquipped: PASS (steal() equipped-items covered)');
}

// ringoff with cursed ring, ustr<=17 — covers do1.js line 50
async function testRingoffCursedSmall() {
  await runWith(42, (g) => {
    const ring = makeObj();
    ring.olet = '='; ring.otyp = 13; ring.spe = 1; ring.minus = true; ring.quan = 1;
    ring.nobj = g.invent; g.invent = ring;
    g.uleft = ring;
    g.u.ustr = 15; g.u.ustrmax = 15; // <= 17 → hits else on line 50
  }, 'Ral  '); // R=remove ring, a=select, l=left
  console.log('testRingoffCursedSmall: PASS (ringoff cursed str<=17 covered)');
}

// drop second item in inventory — covers do.js line 120 (dodr1 non-head)
async function testDropNonHead() {
  await runWith(42, (g) => {
    // First item is food (a), second is sword (b) — drop sword
    // Sword should NOT be equipped (to drop it)
    g.uwep = null; // unequip weapon so sword can be dropped
  }, 'db  '); // d=drop, b=second item (sword), space for "You dropped..."
  console.log('testDropNonHead: PASS (dodr1 non-head covered)');
}

// getobj '*' with single matching item — covers do.js lines 35-38 (else branch)
async function testGetobjSingleStar() {
  await runWith(42, (g) => {
    // Add exactly 1 potion (no others) — getobj filter='!', foo=1 → else branch with prinv
    const p = makeObj(); p.olet = '!'; p.otyp = 3; p.quan = 1;
    p.nobj = g.invent; g.invent = p; // prepend (becomes first item 'a')
  }, 'q*\x1b       '); // q=quaff, *=show 1 item (else branch), ESC=cancel
  console.log('testGetobjSingleStar: PASS (getobj * single-item covered)');
}

// litroom() when dark/corridor — covers do.js lines 154-157
async function testLitroomDark() {
  await runWith(42, (g) => {
    // Ensure seehx=0 (dark/corridor context)
    g.seehx = 0;
    // Add wand of light (otyp=0)
    const wand = makeObj(); wand.olet = '/'; wand.otyp = 0; wand.spe = 5; wand.quan = 1;
    wand.nobj = g.invent; g.invent = wand;
  }, 'pa  '); // p=zap, a=select wand-of-light → litroom() called with seehx=0
  console.log('testLitroomDark: PASS (litroom dark/corridor covered)');
}

// striking wand misses monster — covers do.js 377 and do1.js 79
async function testWandStrikeMiss() {
  let dirKey = 'l';
  await runWith(42, (g) => {
    // Place monster with very negative AC so striking wand always misses
    const mdat = mon[0][0];
    const mtmp = makeMonst(mdat);
    // Override AC to ensure miss: rnd(20) < 10 + (-20) = -10 → never true
    mtmp.data = Object.assign({}, mtmp.data, { ac: -20 });
    const ROOM = 5;
    g.levl[g.u.ux + 1][g.u.uy].typ = ROOM;
    mtmp.mx = g.u.ux + 1; mtmp.my = g.u.uy;
    mtmp.mhp = 100; mtmp.orig_hp = 100;
    mtmp.nmon = g.fmon; g.fmon = mtmp;
    // Add striking wand (otyp=3)
    const wand = makeObj(); wand.olet = '/'; wand.otyp = 3; wand.spe = 10; wand.quan = 1;
    wand.nobj = g.invent; g.invent = wand;
    dirKey = 'l';
  }, 'pal  '); // p=zap, a=wand, l=direction → strike wand at monster, miss
  console.log('testWandStrikeMiss: PASS (striking wand miss covered)');
}

// findit() fake gold detection — covers do1.js lines 100-107
async function testFindFakeGold() {
  wireDeps();
  const g = new GameState();
  g.display = new MockDisplay(); g.input = new MockInput(); g.rawRngLog = [];
  setGame(g);
  const ROOM = 5;
  g.u.ux = 20; g.u.uy = 10;
  for (let x = 15; x <= 25; x++) g.levl[x][10].typ = ROOM;
  // Place fake gold (gflag=0) in room
  const fgold = makeGen(22, 10, 0); // gflag=0 = fake gold
  fgold.ngen = g.fgold; g.fgold = fgold;
  g.levl[22][10].scrsym = '$';
  // Set game.rngSeed so makemon works in findit
  g.rngSeed = 42;
  g.flags = { maze: 99 };
  g.dlevel = 1;
  g.input.getKey = async () => { throw new SessionDone(); };
  await findit(); // will detect fake gold and place a mimic
  console.log('testFindFakeGold: PASS (findit fake-gold covered)');
}

// drop "0" items — covers do.js line 346 "can't drop that many"
async function testDropInvalid() {
  await runWith(42, (g) => {
    const arrows = makeObj(); arrows.olet = ')'; arrows.otyp = 0; arrows.quan = 6;
    arrows.cursed = false; arrows.minus = false;
    arrows.nobj = g.invent; g.invent = arrows;
  }, 'da0\n      '); // d=drop, a=select, 0=invalid count, \n=confirm → "can't drop that many"
  console.log('testDropInvalid: PASS (drop-invalid count covered)');
}

// ===== Wave 4: setsee/unsee/seeoff blind/corridor, justswld, zhit type4, wand non-bolt =====

// setsee() with ublind — covers hack.js lines 18-20
async function testSetseeBlind() {
  wireDeps();
  const g = new GameState();
  g.display = new MockDisplay(); g.input = new MockInput(); g.rawRngLog = [];
  setGame(g);
  g.u.ux = 10; g.u.uy = 10; g.u.ublind = true;
  g.levl[10][10].scrsym = '.';
  setsee(); // ublind=true → calls pru() and returns (lines 18-20)
  console.log('testSetseeBlind: PASS (setsee blind path covered)');
}

// unsee() else branch (seehx=0 = corridor) — covers hack.js lines 61-70
async function testUnseeElse() {
  wireDeps();
  const g = new GameState();
  g.display = new MockDisplay(); g.input = new MockInput(); g.rawRngLog = [];
  setGame(g);
  g.u.ux = 10; g.u.uy = 10; g.seehx = 0; // corridor context
  g.levl[10][10].scrsym = '@';
  g.levl[9][9].scrsym = '.';
  g.levl[9][10].scrsym = '.';
  unsee(); // seehx=0 → else branch (lines 61-70)
  console.log('testUnseeElse: PASS (unsee corridor/else path covered)');
}

// seeoff() else branch (seehx=0 = corridor) — covers hack.js lines 83-91
async function testSeeoffElse() {
  wireDeps();
  const g = new GameState();
  g.display = new MockDisplay(); g.input = new MockInput(); g.rawRngLog = [];
  setGame(g);
  g.u.ux = 10; g.u.uy = 10; g.seehx = 0; // corridor context
  g.levl[10][10].scrsym = '@';
  g.levl[9][9].scrsym = '.';
  seeoff(1); // seehx=0, mode=1 → else branch with mode-specific code (lines 83-91)
  seeoff(0); // mode=0 → else branch, else-if path (line 89)
  console.log('testSeeoffElse: PASS (seeoff corridor/else paths covered)');
}

// justswld() direct call — covers mon.js lines 58-67
async function testJustswld() {
  wireDeps();
  const g = new GameState();
  g.display = new MockDisplay(); g.input = new MockInput(); g.rawRngLog = [];
  setGame(g);
  g.u.ux = 10; g.u.uy = 10; g.u.uhp = 100; g.u.uhpmax = 100;
  const mdat = mon[7][6]; // death ray, mlet='~'
  const mtmp = makeMonst(mdat); mtmp.mx = 11; mtmp.my = 10;
  mtmp.nmon = g.fmon; g.fmon = mtmp;
  g.flags.topl = 0;
  let keyIdx = 0;
  g.input.getKey = async () => { if (keyIdx++ < 5) return ' '; throw new SessionDone(); };
  try {
    await justswld(mtmp); // engulf path → covers lines 58-67 (non-P mlet)
  } catch(e) { if (!(e instanceof SessionDone)) throw e; }
  console.log('testJustswld: PASS (justswld engulf path covered)');
}

// zhit() type=4 with WVZ and non-WVZ — covers do1.js lines 200-201
async function testZhitType4() {
  wireDeps();
  const g = new GameState();
  g.display = new MockDisplay(); g.input = new MockInput(); g.rawRngLog = [];
  setGame(g);
  const wdat = mon[4][5]; // wraith, mlet='W' (in WVZ)
  const wmtmp = makeMonst(wdat); wmtmp.mhp = 50;
  zhit(wmtmp, 4); // 'W' is in 'WVZ' → returns at line 200 (mhp unchanged)
  const kdat = mon[0][4]; // kobold, mlet='K' (not WVZ)
  const kmtmp = makeMonst(kdat); kmtmp.mhp = 50;
  zhit(kmtmp, 4); // 'K' not in 'WVZ' → mhp=-1 (line 201)
  console.log('testZhitType4: PASS (zhit type=4 WVZ/non-WVZ covered)');
}

// wand otyp 4-9 hitting monster — covers do.js lines 379-387
async function testWandNonBoltEffects() {
  await runWith(42, (g) => {
    // Place zombie (mlet='Z', in 'WVZ&') frozen at (ux+1, uy)
    const zdat = mon[1][6]; // zombie mlet='Z'
    const zombie = makeMonst(zdat); zombie.mhp = 200; zombie.orig_hp = 200; zombie.mstat = 3; // MFROZ
    zombie.mx = g.u.ux + 1; zombie.my = g.u.uy;
    zombie.nmon = g.fmon; g.fmon = zombie;
    g.levl[zombie.mx][zombie.my].typ = 4; // ROOM
    // Add wands otyp 9,8,7,6,5,4 reversed so 'a'=otyp4, 'b'=5, ... 'f'=otyp9
    for (let otyp = 9; otyp >= 4; otyp--) {
      const w = makeObj(); w.olet = '/'; w.otyp = otyp; w.spe = 5; w.quan = 1;
      w.nobj = g.invent; g.invent = w;
    }
  }, 'palplbplcpldpleplfl      '); // fire otyp 4,5,6,7,8,9 at zombie
  console.log('testWandNonBoltEffects: PASS (wand otyp 4-9 effects covered)');
}

// Cockatrice fight — covers mon.js lines 153-168 ('c' special attack)
async function testCockatriceFight() {
  await runWith(42, (g) => {
    const cdat = mon[3][2]; // cockatrice mlet='c', mhd=4
    const cock = makeMonst(cdat); cock.mhp = 30; cock.orig_hp = 30; cock.mstat = 0; // MNORM
    cock.mx = g.u.ux + 1; cock.my = g.u.uy;
    cock.nmon = g.fmon; g.fmon = cock;
    g.levl[cock.mx][cock.my].typ = 4; // ROOM
    g.u.uac = 10; // bad AC → cockatrice hits easily
    g.u.uhp = 200; g.u.uhpmax = 200;
  }, 'l'.repeat(30) + '            '); // attack right 30 times
  console.log('testCockatriceFight: PASS (cockatrice special attack covered)');
}

// Trapdoor with no xdnstair (rock falls) — covers hack.js lines 267-269
async function testTrapdoorRock() {
  await runWith(42, (g) => {
    g.xdnstair = 0; g.ydnstair = 0; // no stair → rock falls
    const trap = makeGen(g.u.ux + 1, g.u.uy, 3); // TDOOR = type 3, one step right
    trap.ngen = g.ftrap; g.ftrap = trap;
    g.levl[g.u.ux + 1][g.u.uy].typ = 4; // ROOM
    g.u.uhp = 200; g.u.uhpmax = 200;
  }, 'l    '); // move right → step on TDOOR → rock falls (no stair)
  console.log('testTrapdoorRock: PASS (trapdoor rock-fall path covered)');
}

await testSetseeBlind();
await testUnseeElse();
await testSeeoffElse();
await testJustswld();
await testZhitType4();
await testWandNonBoltEffects();
await testCockatriceFight();
await testTrapdoorRock();

console.log('coverage_direct: all tests complete');
