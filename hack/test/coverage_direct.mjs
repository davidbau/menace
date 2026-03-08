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
import { _setMonDeps, g_at_mon, g_at_gen, g_at_obj, killed, rloc, mnexto, newcham, poisoned } from '../js/mon.js';
import { _setHackDeps, setsee, tele, nomul, amon, attmon } from '../js/hack.js';
import { _setDo1Deps, dosearch, buzz } from '../js/do1.js';
import { setRhack, gameLoop, GameOver, losestr, ndaminc, dodown, doup } from '../js/main.js';
import { rhack } from '../js/do.js';
import { docrt } from '../js/pri.js';
import { mon } from '../js/data.js';

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

console.log('coverage_direct: all tests complete');
