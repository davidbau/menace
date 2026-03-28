// actions.js - Verb action handlers for Colossal Cave Adventure
//
// Ported from open-adventure 2.5 (actions1.c, actions2.c)
// action(G, startAt) dispatches on verb/object, returns a goto label number.

import {
  speak, rspeak, pspeak, setprm, getin, yes, vocab, makewd, makewd_from_string,
  TOTING, AT, HERE, LIQ, LIQLOC, DARK, GSTONE, FOREST, CNDBIT,
  move, carry, drop, destroy, put, juggle, atdwrf, bug,
} from './misc.js';

function IABS(n) { return Math.abs(n); }
function MOD(n, m) { return ((n % m) + m) % m; }

// ---- carry (take) - from actions2.c ----
function doCarry(G) {
  if (TOTING(G, G.OBJ)) return 2011;
  G.SPK = 25;
  if (G.OBJ === G.PLANT && G.PROP[G.PLANT] <= 0) G.SPK = 115;
  if (G.OBJ === G.BEAR && G.PROP[G.BEAR] === 1) G.SPK = 169;
  if (G.OBJ === G.CHAIN && G.PROP[G.BEAR] !== 0) G.SPK = 170;
  if (G.OBJ === G.URN) G.SPK = 215;
  if (G.OBJ === G.CAVITY) G.SPK = 217;
  if (G.OBJ === G.BLOOD) G.SPK = 239;
  if (G.OBJ === G.RUG && G.PROP[G.RUG] === 2) G.SPK = 222;
  if (G.OBJ === G.SIGN) G.SPK = 196;
  if (G.OBJ !== G.MESSAG) { /* goto 9011 */ } else {
    G.SPK = 190;
    destroy(G, G.MESSAG);
  }
  // L9011
  if (G.FIXED[G.OBJ] !== 0) return 2011;
  if (G.OBJ !== G.WATER && G.OBJ !== G.OIL) { /* goto 9017 */ } else {
    G.K = G.OBJ;
    G.OBJ = G.BOTTLE;
    if (HERE(G, G.BOTTLE) && LIQ(G) === G.K) { /* goto 9017 */ } else {
      if (TOTING(G, G.BOTTLE) && G.PROP[G.BOTTLE] === 1) return doFill(G);
      if (G.PROP[G.BOTTLE] !== 1) G.SPK = 105;
      if (!TOTING(G, G.BOTTLE)) G.SPK = 104;
      return 2011;
    }
  }
  // L9017
  G.SPK = 92;
  if (G.HOLDNG >= 7) return 2011;
  if (G.OBJ === G.BIRD && G.PROP[G.BIRD] !== 1 && -1 - G.PROP[G.BIRD] !== 1) {
    if (G.PROP[G.BIRD] === 2) {
      // L9015
      G.SPK = 238;
      destroy(G, G.BIRD);
      return 2011;
    }
    if (!TOTING(G, G.CAGE)) G.SPK = 27;
    if (TOTING(G, G.ROD)) G.SPK = 26;
    if (Math.floor(G.SPK / 2) === 13) return 2011;
    G.PROP[G.BIRD] = 1;
  }
  // L9014
  if ((G.OBJ === G.BIRD || G.OBJ === G.CAGE) && (G.PROP[G.BIRD] === 1 || -1 - G.PROP[G.BIRD] === 1)) {
    carry(G, G.BIRD + G.CAGE - G.OBJ, G.LOC);
  }
  carry(G, G.OBJ, G.LOC);
  G.K = LIQ(G);
  if (G.OBJ === G.BOTTLE && G.K !== 0) G.PLACE[G.K] = -1;
  if (!GSTONE(G, G.OBJ) || G.PROP[G.OBJ] === 0) return 2009;
  G.PROP[G.OBJ] = 0;
  G.PROP[G.CAVITY] = 1;
  return 2009;
}

// ---- discard (drop/throw) - from actions2.c ----
function doDiscard(G, justDoIt) {
  if (justDoIt) { /* goto 9021 */ } else {
    if (TOTING(G, G.ROD2) && G.OBJ === G.ROD && !TOTING(G, G.ROD)) G.OBJ = G.ROD2;
    if (!TOTING(G, G.OBJ)) return 2011;
    if (G.OBJ !== G.BIRD || !HERE(G, G.SNAKE)) { /* goto 9023 */ } else {
      rspeak(G, 30);
      if (G.CLOSED) return 19000;
      destroy(G, G.SNAKE);
      G.PROP[G.SNAKE] = 1;
      // fall through to 9021
      return doDiscard9021(G);
    }
    // L9023
    if (GSTONE(G, G.OBJ) && AT(G, G.CAVITY) && G.PROP[G.CAVITY] !== 0) {
      // gemstone + cavity
      rspeak(G, 218);
      G.PROP[G.OBJ] = 1;
      G.PROP[G.CAVITY] = 0;
      if (HERE(G, G.RUG) && ((G.OBJ === G.EMRALD && G.PROP[G.RUG] !== 2) ||
          (G.OBJ === G.RUBY && G.PROP[G.RUG] === 2))) {
        G.SPK = 219;
        if (TOTING(G, G.RUG)) G.SPK = 220;
        if (G.OBJ === G.RUBY) G.SPK = 221;
        rspeak(G, G.SPK);
        if (G.SPK !== 220) {
          G.K = 2 - G.PROP[G.RUG];
          G.PROP[G.RUG] = G.K;
          if (G.K === 2) G.K = G.data.plac[G.SAPPH];
          move(G, G.RUG + 100, G.K);
        }
      }
      return doDiscard9021(G);
    }
    // L9024
    if (G.OBJ === G.COINS && HERE(G, G.VEND)) {
      destroy(G, G.COINS);
      drop(G, G.BATTER, G.LOC);
      pspeak(G, G.BATTER, 0);
      return 2012;
    }
    // L9025
    if (G.OBJ === G.BIRD && AT(G, G.DRAGON) && G.PROP[G.DRAGON] === 0) {
      rspeak(G, 154);
      destroy(G, G.BIRD);
      G.PROP[G.BIRD] = 0;
      return 2012;
    }
    // L9026
    if (G.OBJ === G.BEAR && AT(G, G.TROLL)) {
      rspeak(G, 163);
      move(G, G.TROLL, 0);
      move(G, G.TROLL + 100, 0);
      move(G, G.TROLL2, G.data.plac[G.TROLL]);
      move(G, G.TROLL2 + 100, G.data.fixd[G.TROLL]);
      juggle(G, G.CHASM);
      G.PROP[G.TROLL] = 2;
      return doDiscard9021(G);
    }
    // L9027
    if (G.OBJ === G.VASE && G.LOC !== G.data.plac[G.PILLOW]) {
      // L9028
      G.PROP[G.VASE] = 2;
      if (AT(G, G.PILLOW)) G.PROP[G.VASE] = 0;
      pspeak(G, G.VASE, G.PROP[G.VASE] + 1);
      if (G.PROP[G.VASE] !== 0) G.FIXED[G.VASE] = -1;
      return doDiscard9021(G);
    }
    rspeak(G, 54);
  }
  return doDiscard9021(G);
}

function doDiscard9021(G) {
  G.K = LIQ(G);
  if (G.K === G.OBJ) G.OBJ = G.BOTTLE;
  if (G.OBJ === G.BOTTLE && G.K !== 0) G.PLACE[G.K] = 0;
  if (G.OBJ === G.CAGE && G.PROP[G.BIRD] === 1) drop(G, G.BIRD, G.LOC);
  drop(G, G.OBJ, G.LOC);
  if (G.OBJ !== G.BIRD) return 2012;
  G.PROP[G.BIRD] = 0;
  if (FOREST(G.LOC)) G.PROP[G.BIRD] = 2;
  return 2012;
}

// ---- attack - from actions2.c ----
async function doAttack(G) {
  G.I = atdwrf(G, G.LOC);
  if (G.OBJ !== 0) { /* goto 9124 */ } else {
    if (G.I > 0) G.OBJ = G.DWARF;
    if (HERE(G, G.SNAKE)) G.OBJ = G.OBJ * 100 + G.SNAKE;
    if (AT(G, G.DRAGON) && G.PROP[G.DRAGON] === 0) G.OBJ = G.OBJ * 100 + G.DRAGON;
    if (AT(G, G.TROLL)) G.OBJ = G.OBJ * 100 + G.TROLL;
    if (AT(G, G.OGRE)) G.OBJ = G.OBJ * 100 + G.OGRE;
    if (HERE(G, G.BEAR) && G.PROP[G.BEAR] === 0) G.OBJ = G.OBJ * 100 + G.BEAR;
    if (G.OBJ > 100) return 8000;
    if (G.OBJ !== 0) { /* goto 9124 */ } else {
      if (HERE(G, G.BIRD) && G.VERB !== G.THROW) G.OBJ = G.BIRD;
      if (HERE(G, G.VEND) && G.VERB !== G.THROW) G.OBJ = G.OBJ * 100 + G.VEND;
      if (HERE(G, G.CLAM) || HERE(G, G.OYSTER)) G.OBJ = 100 * G.OBJ + G.CLAM;
      if (G.OBJ > 100) return 8000;
    }
  }
  // L9124
  if (G.OBJ === G.BIRD) {
    G.SPK = 137;
    if (G.CLOSED) return 2011;
    destroy(G, G.BIRD);
    G.PROP[G.BIRD] = 0;
    G.SPK = 45;
  }
  // L9125
  if (G.OBJ === G.VEND) {
    pspeak(G, G.VEND, G.PROP[G.VEND] + 2);
    G.PROP[G.VEND] = 3 - G.PROP[G.VEND];
    return 2012;
  }
  // L9126
  if (G.OBJ === 0) G.SPK = 44;
  if (G.OBJ === G.CLAM || G.OBJ === G.OYSTER) G.SPK = 150;
  if (G.OBJ === G.SNAKE) G.SPK = 46;
  if (G.OBJ === G.DWARF) G.SPK = 49;
  if (G.OBJ === G.DWARF && G.CLOSED) return 19000;
  if (G.OBJ === G.DRAGON) G.SPK = 167;
  if (G.OBJ === G.TROLL) G.SPK = 157;
  if (G.OBJ === G.OGRE) G.SPK = 203;
  if (G.OBJ === G.OGRE && G.I > 0) {
    // L9128
    rspeak(G, G.SPK);
    rspeak(G, 6);
    destroy(G, G.OGRE);
    G.K = 0;
    for (G.I = 1; G.I <= 5; G.I++) {
      if (G.DLOC[G.I] !== G.LOC) continue;
      G.K++;
      G.DLOC[G.I] = 61;
      G.DSEEN[G.I] = 0;
    }
    G.SPK = G.SPK + 1 + Math.floor(1 / G.K);
    return 2011;
  }
  if (G.OBJ === G.BEAR) G.SPK = 165 + Math.floor((G.PROP[G.BEAR] + 1) / 2);
  if (G.OBJ !== G.DRAGON || G.PROP[G.DRAGON] !== 0) return 2011;

  // Dragon: confirm with yes/no
  rspeak(G, 49);
  G.VERB = 0;
  G.OBJ = 0;
  const ok = await getin(G);
  if (!ok) return 2;
  const yesWord = makewd_from_string('YES');
  const yWord = makewd_from_string('Y');
  if (G.WD1 !== yWord && G.WD1 !== yesWord) return 2607;

  pspeak(G, G.DRAGON, 3);
  G.PROP[G.DRAGON] = 1;
  G.PROP[G.RUG] = 0;
  G.K = Math.floor((G.data.plac[G.DRAGON] + G.data.fixd[G.DRAGON]) / 2);
  move(G, G.DRAGON + 100, -1);
  move(G, G.RUG + 100, 0);
  move(G, G.DRAGON, G.K);
  move(G, G.RUG, G.K);
  drop(G, G.BLOOD, G.K);
  for (G.OBJ = 1; G.OBJ <= 100; G.OBJ++) {
    if (G.PLACE[G.OBJ] === G.data.plac[G.DRAGON] || G.PLACE[G.OBJ] === G.data.fixd[G.DRAGON]) {
      move(G, G.OBJ, G.K);
    }
  }
  G.LOC = G.K;
  G.K = G.NUL;
  return 8;
}

// ---- throw - from actions2.c ----
async function doThrow(G) {
  if (TOTING(G, G.ROD2) && G.OBJ === G.ROD && !TOTING(G, G.ROD)) G.OBJ = G.ROD2;
  if (!TOTING(G, G.OBJ)) return 2011;
  if (G.OBJ >= 50 && G.OBJ <= G.MAXTRS && AT(G, G.TROLL)) {
    // L9178
    G.SPK = 159;
    drop(G, G.OBJ, 0);
    move(G, G.TROLL, 0);
    move(G, G.TROLL + 100, 0);
    drop(G, G.TROLL2, G.data.plac[G.TROLL]);
    drop(G, G.TROLL2 + 100, G.data.fixd[G.TROLL]);
    juggle(G, G.CHASM);
    return 2011;
  }
  if (G.OBJ === G.FOOD && HERE(G, G.BEAR)) {
    G.OBJ = G.BEAR;
    return doFeed(G);
  }
  if (G.OBJ !== G.AXE) return doDiscard(G, false);

  G.I = atdwrf(G, G.LOC);
  if (G.I > 0) {
    // L9172
    G.SPK = 48;
    if (G.rng.range(7) < G.DFLAG) {
      // L9175
      rspeak(G, G.SPK);
      drop(G, G.AXE, G.LOC);
      G.K = G.NUL;
      return 8;
    }
    G.DSEEN[G.I] = 0;
    G.DLOC[G.I] = 0;
    G.SPK = 47;
    G.DKILL++;
    if (G.DKILL === 1) G.SPK = 149;
    rspeak(G, G.SPK);
    drop(G, G.AXE, G.LOC);
    G.K = G.NUL;
    return 8;
  }

  G.SPK = 152;
  if (AT(G, G.DRAGON) && G.PROP[G.DRAGON] === 0) {
    rspeak(G, G.SPK);
    drop(G, G.AXE, G.LOC);
    G.K = G.NUL;
    return 8;
  }
  G.SPK = 158;
  if (AT(G, G.TROLL)) {
    rspeak(G, G.SPK);
    drop(G, G.AXE, G.LOC);
    G.K = G.NUL;
    return 8;
  }
  G.SPK = 203;
  if (AT(G, G.OGRE)) {
    rspeak(G, G.SPK);
    drop(G, G.AXE, G.LOC);
    G.K = G.NUL;
    return 8;
  }
  if (HERE(G, G.BEAR) && G.PROP[G.BEAR] === 0) {
    // L9176
    G.SPK = 164;
    drop(G, G.AXE, G.LOC);
    G.FIXED[G.AXE] = -1;
    G.PROP[G.AXE] = 1;
    juggle(G, G.BEAR);
    return 2011;
  }
  G.OBJ = 0;
  return doAttack(G);
}

// ---- feed - from actions2.c ----
function doFeed(G) {
  if (G.OBJ === G.BIRD) {
    G.SPK = 100;
    return 2011;
  }
  if (G.OBJ === G.SNAKE || G.OBJ === G.DRAGON || G.OBJ === G.TROLL) {
    G.SPK = 102;
    if (G.OBJ === G.DRAGON && G.PROP[G.DRAGON] !== 0) G.SPK = 110;
    if (G.OBJ === G.TROLL) G.SPK = 182;
    if (G.OBJ !== G.SNAKE || G.CLOSED || !HERE(G, G.BIRD)) return 2011;
    G.SPK = 101;
    destroy(G, G.BIRD);
    G.PROP[G.BIRD] = 0;
    return 2011;
  }
  if (G.OBJ === G.DWARF) {
    if (!HERE(G, G.FOOD)) return 2011;
    G.SPK = 103;
    G.DFLAG += 2;
    return 2011;
  }
  if (G.OBJ === G.BEAR) {
    if (G.PROP[G.BEAR] === 0) G.SPK = 102;
    if (G.PROP[G.BEAR] === 3) G.SPK = 110;
    if (!HERE(G, G.FOOD)) return 2011;
    destroy(G, G.FOOD);
    G.PROP[G.BEAR] = 1;
    G.FIXED[G.AXE] = 0;
    G.PROP[G.AXE] = 0;
    G.SPK = 168;
    return 2011;
  }
  if (G.OBJ === G.OGRE) {
    if (HERE(G, G.FOOD)) G.SPK = 202;
    return 2011;
  }
  G.SPK = 14;
  return 2011;
}

// ---- fill - from actions2.c ----
function doFill(G) {
  if (G.OBJ === G.VASE) {
    // L9222
    G.SPK = 29;
    if (LIQLOC(G, G.LOC) === 0) G.SPK = 144;
    if (LIQLOC(G, G.LOC) === 0 || !TOTING(G, G.VASE)) return 2011;
    rspeak(G, 145);
    G.PROP[G.VASE] = 2;
    G.FIXED[G.VASE] = -1;
    return doDiscard(G, true);
  }
  if (G.OBJ === G.URN) {
    // L9224
    G.SPK = 213;
    if (G.PROP[G.URN] !== 0) return 2011;
    G.SPK = 144;
    G.K = LIQ(G);
    if (G.K === 0 || !HERE(G, G.BOTTLE)) return 2011;
    G.PLACE[G.K] = 0;
    G.PROP[G.BOTTLE] = 1;
    if (G.K === G.OIL) G.PROP[G.URN] = 1;
    G.SPK = 211 + G.PROP[G.URN];
    return 2011;
  }
  if (G.OBJ !== 0 && G.OBJ !== G.BOTTLE) return 2011;
  if (G.OBJ === 0 && !HERE(G, G.BOTTLE)) return 8000;
  G.SPK = 107;
  if (LIQLOC(G, G.LOC) === 0) G.SPK = 106;
  if (HERE(G, G.URN) && G.PROP[G.URN] !== 0) G.SPK = 214;
  if (LIQ(G) !== 0) G.SPK = 105;
  if (G.SPK !== 107) return 2011;
  G.PROP[G.BOTTLE] = MOD(G.data.cond[G.LOC], 4) / 2 * 2;
  G.PROP[G.BOTTLE] = Math.floor(G.PROP[G.BOTTLE]);
  G.K = LIQ(G);
  if (TOTING(G, G.BOTTLE)) G.PLACE[G.K] = -1;
  if (G.K === G.OIL) G.SPK = 108;
  return 2011;
}

// ---- Main action dispatcher ----
// Returns a label number for the main loop to goto.
export async function action(G, startAt) {
  switch (startAt) {
    case 4000: break;       // verb analysis
    case 4090: return doTransitive(G);
    case 5000: return doObject(G);
  }

  // L4000: verb analysis
  G.VERB = G.K;
  G.SPK = G.data.actspk[G.VERB];
  if (G.WD2 > 0 && G.VERB !== G.SAY) return 2800;
  if (G.VERB === G.SAY) G.OBJ = G.WD2;
  if (G.OBJ > 0) return doTransitive(G);

  // Intransitive verb dispatch
  return doIntransitive(G);
}

async function doIntransitive(G) {
  switch (G.VERB) {
    case 1: return doIntransCarry(G);
    case 2: return 8000;  // DROP
    case 3: return 8000;  // SAY
    case 4: return doIntransLock(G);
    case 5: return 2009;  // NOTHING
    case 6: return doIntransLock(G);
    case 7: return doIntransLight(G);
    case 8: return doIntransExtinguish(G);
    case 9: return 8000;  // WAVE
    case 10: return 8000; // CALM
    case 11: return 2011; // WALK
    case 12: return await doAttack(G);
    case 13: return doIntransPour(G);
    case 14: return doIntransEat(G);
    case 15: return doIntransDrink(G);
    case 16: return 8000; // RUB
    case 17: return 8000; // TOSS
    case 18: return await doQuit(G);
    case 19: return 8000; // FIND
    case 20: return doInventory(G);
    case 21: return 8000; // FEED
    case 22: return doFill(G);
    case 23: return await doBlast(G);
    case 24: return await doScore(G);
    case 25: return doFoobar(G);
    case 26: return doBrief(G);
    case 27: return doIntransRead(G);
    case 28: return 8000; // BREAK
    case 29: return 8000; // WAKE
    case 30: return await doSuspend(G);
    case 31: return await doResume(G);
    case 32: return doIntransFly(G);
    case 33: return doListen(G);
    case 34: return doZzzz(G);
    default: bug(G, 23);
  }
}

async function doTransitive(G) {
  switch (G.VERB) {
    case 1: return doCarry(G);
    case 2: return doDiscard(G, false);
    case 3: return doSay(G);
    case 4: return doLockUnlock(G);
    case 5: return 2009;  // NOTHING
    case 6: return doLockUnlock(G);
    case 7: return doTransLight(G);
    case 8: return doTransExtinguish(G);
    case 9: return doWave(G);
    case 10: return 2011; // CALM
    case 11: return 2011; // WALK
    case 12: return await doAttack(G);
    case 13: return doPour(G);
    case 14: return doTransEat(G);
    case 15: return doIntransDrink(G);
    case 16: return doRub(G);
    case 17: return await doThrow(G);
    case 18: return 2011; // QUIT
    case 19: return doFind(G);
    case 20: return doFind(G);
    case 21: return doFeed(G);
    case 22: return doFill(G);
    case 23: return await doBlast(G);
    case 24: return 2011; // SCORE
    case 25: return 2011; // FOO
    case 26: return 2011; // BRIEF
    case 27: return await doTransRead(G);
    case 28: return doBreak(G);
    case 29: return doWake(G);
    case 30: return 2011; // SUSPEND
    case 31: return 2011; // RESUME
    case 32: return doTransFly(G);
    case 33: return 2011; // LISTEN
    case 34: return doZzzz(G);
    default: bug(G, 24);
  }
}

// L5000: Object analysis
function doObject(G) {
  G.OBJ = G.K;
  if (!HERE(G, G.K)) {
    // L5100
    if (G.K === G.GRATE) {
      if (G.LOC === 1 || G.LOC === 4 || G.LOC === 7) G.K = G.DPRSSN;
      if (G.LOC > 9 && G.LOC < 15) G.K = G.ENTRNC;
      if (G.K !== G.GRATE) return 8;
    }
    if (G.K === G.DWARF && atdwrf(G, G.LOC) > 0) { /* goto 5010 */ } else
    if ((LIQ(G) === G.K && HERE(G, G.BOTTLE)) || G.K === LIQLOC(G, G.LOC)) { /* goto 5010 */ } else
    if (G.OBJ === G.OIL && HERE(G, G.URN) && G.PROP[G.URN] !== 0) {
      G.OBJ = G.URN;
    } else if (G.OBJ === G.PLANT && AT(G, G.PLANT2) && G.PROP[G.PLANT2] !== 0) {
      G.OBJ = G.PLANT2;
    } else if (G.OBJ === G.KNIFE && G.KNFLOC === G.LOC) {
      G.KNFLOC = -1;
      G.SPK = 116;
      return 2011;
    } else if (G.OBJ === G.ROD && HERE(G, G.ROD2)) {
      G.OBJ = G.ROD2;
    } else if ((G.VERB === G.FIND || G.VERB === G.INVENT) && G.WD2 <= 0) {
      /* goto 5010 */
    } else {
      setprm(G, 1, G.wd1, G.wd1x);
      rspeak(G, 256);
      return 2012;
    }
  }
  // L5010
  if (G.WD2 > 0) return 2800;
  if (G.VERB !== 0) return doTransitive(G);
  setprm(G, 1, G.wd1, G.wd1x);
  rspeak(G, 255);
  return 2600;
}

// ---- Individual verb implementations ----

// Intransitive carry
function doIntransCarry(G) {
  if (G.ATLOC[G.LOC] === 0 || G.LINK[G.ATLOC[G.LOC]] !== 0 || atdwrf(G, G.LOC) > 0) return 8000;
  G.OBJ = G.ATLOC[G.LOC];
  return doCarry(G);
}

// Intransitive/transitive lock/unlock
function doIntransLock(G) {
  G.SPK = 28;
  if (HERE(G, G.CLAM)) G.OBJ = G.CLAM;
  if (HERE(G, G.OYSTER)) G.OBJ = G.OYSTER;
  if (AT(G, G.DOOR)) G.OBJ = G.DOOR;
  if (AT(G, G.GRATE)) G.OBJ = G.GRATE;
  if (G.OBJ !== 0 && HERE(G, G.CHAIN)) return 8000;
  if (HERE(G, G.CHAIN)) G.OBJ = G.CHAIN;
  if (G.OBJ === 0) return 2011;
  return doLockUnlock(G);
}

function doLockUnlock(G) {
  if (G.OBJ === G.CLAM || G.OBJ === G.OYSTER) {
    // L9046
    G.K = 0;
    if (G.OBJ === G.OYSTER) G.K = 1;
    G.SPK = 124 + G.K;
    if (TOTING(G, G.OBJ)) G.SPK = 120 + G.K;
    if (!TOTING(G, G.TRIDNT)) G.SPK = 122 + G.K;
    if (G.VERB === G.LOCK) G.SPK = 61;
    if (G.SPK !== 124) return 2011;
    destroy(G, G.CLAM);
    drop(G, G.OYSTER, G.LOC);
    drop(G, G.PEARL, 105);
    return 2011;
  }
  if (G.OBJ === G.DOOR) G.SPK = 111;
  if (G.OBJ === G.DOOR && G.PROP[G.DOOR] === 1) G.SPK = 54;
  if (G.OBJ === G.CAGE) G.SPK = 32;
  if (G.OBJ === G.KEYS) G.SPK = 55;
  if (G.OBJ === G.GRATE || G.OBJ === G.CHAIN) G.SPK = 31;
  if (G.SPK !== 31 || !HERE(G, G.KEYS)) return 2011;

  if (G.OBJ === G.CHAIN) {
    // L9048
    if (G.VERB === G.LOCK) {
      // L9049
      G.SPK = 172;
      if (G.PROP[G.CHAIN] !== 0) G.SPK = 34;
      if (G.LOC !== G.data.plac[G.CHAIN]) G.SPK = 173;
      if (G.SPK !== 172) return 2011;
      G.PROP[G.CHAIN] = 2;
      if (TOTING(G, G.CHAIN)) drop(G, G.CHAIN, G.LOC);
      G.FIXED[G.CHAIN] = -1;
      return 2011;
    }
    G.SPK = 171;
    if (G.PROP[G.BEAR] === 0) G.SPK = 41;
    if (G.PROP[G.CHAIN] === 0) G.SPK = 37;
    if (G.SPK !== 171) return 2011;
    G.PROP[G.CHAIN] = 0;
    G.FIXED[G.CHAIN] = 0;
    if (G.PROP[G.BEAR] !== 3) G.PROP[G.BEAR] = 2;
    G.FIXED[G.BEAR] = 2 - G.PROP[G.BEAR];
    return 2011;
  }

  // Grate
  if (G.CLOSNG) {
    G.K = 130;
    if (!G.PANIC) G.CLOCK2 = 15;
    G.PANIC = 1;
    return 2010;
  }
  G.K = 34 + G.PROP[G.GRATE];
  G.PROP[G.GRATE] = 1;
  if (G.VERB === G.LOCK) G.PROP[G.GRATE] = 0;
  G.K = G.K + 2 * G.PROP[G.GRATE];
  return 2010;
}

// SAY
function doSay(G) {
  setprm(G, 1, G.wd2 || G.wd1, G.wd2x || G.wd1x);
  if (G.WD2 <= 0) setprm(G, 1, G.wd1, G.wd1x);
  if (G.WD2 > 0) { G.WD1 = G.WD2; G.wd1 = G.wd2; G.wd1x = G.wd2x; }
  const i = vocab(G, G.WD1, -1);
  if (i === 62 || i === 65 || i === 71 || i === 2025 || i === 2034) {
    G.WD2 = 0; G.wd2 = '';
    G.OBJ = 0;
    return 2630;
  }
  rspeak(G, 258);
  return 2012;
}

// Light
function doIntransLight(G) {
  if (HERE(G, G.LAMP) && G.PROP[G.LAMP] === 0 && G.LIMIT >= 0) G.OBJ = G.LAMP;
  if (HERE(G, G.URN) && G.PROP[G.URN] === 1) G.OBJ = G.OBJ * 100 + G.URN;
  if (G.OBJ === 0 || G.OBJ > 100) return 8000;
  return doTransLight(G);
}

function doTransLight(G) {
  if (G.OBJ === G.URN) {
    G.SPK = 38;
    if (G.PROP[G.URN] === 0) return 2011;
    G.SPK = 209;
    G.PROP[G.URN] = 2;
    return 2011;
  }
  if (G.OBJ !== G.LAMP) return 2011;
  G.SPK = 184;
  if (G.LIMIT < 0) return 2011;
  G.PROP[G.LAMP] = 1;
  rspeak(G, 39);
  if (G.WZDARK) return 2000;
  return 2012;
}

// Extinguish
function doIntransExtinguish(G) {
  if (HERE(G, G.LAMP) && G.PROP[G.LAMP] === 1) G.OBJ = G.LAMP;
  if (HERE(G, G.URN) && G.PROP[G.URN] === 2) G.OBJ = G.OBJ * 100 + G.URN;
  if (G.OBJ === 0 || G.OBJ > 100) return 8000;
  return doTransExtinguish(G);
}

function doTransExtinguish(G) {
  if (G.OBJ === G.URN) {
    G.PROP[G.URN] = Math.floor(G.PROP[G.URN] / 2);
    G.SPK = 210;
    return 2011;
  }
  if (G.OBJ === G.LAMP) {
    G.PROP[G.LAMP] = 0;
    rspeak(G, 40);
    if (DARK(G)) rspeak(G, 16);
    return 2012;
  }
  if (G.OBJ === G.DRAGON || G.OBJ === G.VOLCAN) G.SPK = 146;
  return 2011;
}

// Wave
function doWave(G) {
  if (!TOTING(G, G.OBJ) && (G.OBJ !== G.ROD || !TOTING(G, G.ROD2))) G.SPK = 29;
  if (G.OBJ !== G.ROD || !TOTING(G, G.OBJ) || (!HERE(G, G.BIRD) && (G.CLOSNG || !AT(G, G.FISSUR)))) {
    return 2011;
  }
  if (HERE(G, G.BIRD)) G.SPK = 206 + MOD(G.PROP[G.BIRD], 2);
  if (G.SPK === 206 && G.LOC === G.PLACE[G.STEPS] && G.PROP[G.JADE] < 0) {
    // L9094
    drop(G, G.JADE, G.LOC);
    G.PROP[G.JADE] = 0;
    G.TALLY--;
    G.SPK = 208;
    return 2011;
  }
  if (G.CLOSED) return 18999;
  if (G.CLOSNG || !AT(G, G.FISSUR)) return 2011;
  if (HERE(G, G.BIRD)) rspeak(G, G.SPK);
  G.PROP[G.FISSUR] = 1 - G.PROP[G.FISSUR];
  pspeak(G, G.FISSUR, 2 - G.PROP[G.FISSUR]);
  return 2012;
}

// Pour
function doIntransPour(G) {
  if (G.OBJ === G.BOTTLE || G.OBJ === 0) G.OBJ = LIQ(G);
  if (G.OBJ === 0) return 8000;
  return doPour(G);
}

function doPour(G) {
  if (G.OBJ === G.BOTTLE || G.OBJ === 0) G.OBJ = LIQ(G);
  if (G.OBJ === 0) return 8000;
  if (!TOTING(G, G.OBJ)) return 2011;
  G.SPK = 78;
  if (G.OBJ !== G.OIL && G.OBJ !== G.WATER) return 2011;
  if (HERE(G, G.URN) && G.PROP[G.URN] === 0) {
    G.OBJ = G.URN;
    return doFill(G);
  }
  G.PROP[G.BOTTLE] = 1;
  G.PLACE[G.OBJ] = 0;
  G.SPK = 77;
  if (!(AT(G, G.PLANT) || AT(G, G.DOOR))) return 2011;
  if (AT(G, G.DOOR)) {
    G.PROP[G.DOOR] = 0;
    if (G.OBJ === G.OIL) G.PROP[G.DOOR] = 1;
    G.SPK = 113 + G.PROP[G.DOOR];
    return 2011;
  }
  G.SPK = 112;
  if (G.OBJ !== G.WATER) return 2011;
  pspeak(G, G.PLANT, G.PROP[G.PLANT] + 3);
  G.PROP[G.PLANT] = MOD(G.PROP[G.PLANT] + 1, 3);
  G.PROP[G.PLANT2] = G.PROP[G.PLANT];
  G.K = G.NUL;
  return 8;
}

// Eat
function doIntransEat(G) {
  if (!HERE(G, G.FOOD)) return 8000;
  destroy(G, G.FOOD);
  G.SPK = 72;
  return 2011;
}

function doTransEat(G) {
  if (G.OBJ === G.FOOD) {
    destroy(G, G.FOOD);
    G.SPK = 72;
    return 2011;
  }
  if (G.OBJ === G.BIRD || G.OBJ === G.SNAKE || G.OBJ === G.CLAM || G.OBJ === G.OYSTER ||
      G.OBJ === G.DWARF || G.OBJ === G.DRAGON || G.OBJ === G.TROLL || G.OBJ === G.BEAR ||
      G.OBJ === G.OGRE) G.SPK = 71;
  return 2011;
}

// Drink
function doIntransDrink(G) {
  if (G.OBJ === 0 && LIQLOC(G, G.LOC) !== G.WATER && (LIQ(G) !== G.WATER || !HERE(G, G.BOTTLE))) {
    return 8000;
  }
  if (G.OBJ === G.BLOOD) {
    destroy(G, G.BLOOD);
    G.PROP[G.DRAGON] = 2;
    G.data.objsnd[G.BIRD] = G.data.objsnd[G.BIRD] + 3;
    G.SPK = 240;
    return 2011;
  }
  if (G.OBJ !== 0 && G.OBJ !== G.WATER) G.SPK = 110;
  if (G.SPK === 110 || LIQ(G) !== G.WATER || !HERE(G, G.BOTTLE)) return 2011;
  G.PROP[G.BOTTLE] = 1;
  G.PLACE[G.WATER] = 0;
  G.SPK = 74;
  return 2011;
}

// Rub
function doRub(G) {
  if (G.OBJ !== G.LAMP) G.SPK = 76;
  if (G.OBJ !== G.URN || G.PROP[G.URN] !== 2) return 2011;
  destroy(G, G.URN);
  drop(G, G.AMBER, G.LOC);
  G.PROP[G.AMBER] = 1;
  G.TALLY--;
  drop(G, G.CAVITY, G.LOC);
  G.SPK = 216;
  return 2011;
}

// Quit
async function doQuit(G) {
  if (await yes(G, 22, 54, 54)) {
    const { score } = await import('./score.js');
    score(G, 1);
  }
  return 2012;
}

// Find
function doFind(G) {
  if (AT(G, G.OBJ) || (LIQ(G) === G.OBJ && AT(G, G.BOTTLE)) || G.K === LIQLOC(G, G.LOC) ||
      (G.OBJ === G.DWARF && atdwrf(G, G.LOC) > 0)) G.SPK = 94;
  if (G.CLOSED) G.SPK = 138;
  if (TOTING(G, G.OBJ)) G.SPK = 24;
  return 2011;
}

// Inventory
function doInventory(G) {
  G.SPK = 98;
  for (G.I = 1; G.I <= 100; G.I++) {
    if (G.I === G.BEAR || !TOTING(G, G.I)) continue;
    if (G.SPK === 98) rspeak(G, 99);
    const savedBlklin = G.BLKLIN;
    G.BLKLIN = 0;
    pspeak(G, G.I, -1);
    G.BLKLIN = savedBlklin;
    G.SPK = 0;
  }
  if (TOTING(G, G.BEAR)) G.SPK = 141;
  return 2011;
}

// Blast
async function doBlast(G) {
  if (G.PROP[G.ROD2] < 0 || !G.CLOSED) return 2011;
  G.BONUS = 133;
  if (G.LOC === 115) G.BONUS = 134;
  if (HERE(G, G.ROD2)) G.BONUS = 135;
  rspeak(G, G.BONUS);
  const { score } = await import('./score.js');
  score(G, 0);
  return 2011; // unreachable
}

// Score (intransitive)
async function doScore(G) {
  const { score } = await import('./score.js');
  score(G, -1);
  setprm(G, 1, G.SCORE, G.MXSCOR);
  setprm(G, 3, G.TURNS, G.TURNS);
  rspeak(G, 259);
  return 2012;
}

// FEE FIE FOE FOO
function doFoobar(G) {
  G.K = vocab(G, G.WD1, 3);
  G.SPK = 42;
  if (G.FOOBAR === 1 - G.K) {
    G.FOOBAR = G.K;
    if (G.K !== 4) return 2009;
    G.FOOBAR = 0;
    if (G.PLACE[G.EGGS] === G.data.plac[G.EGGS] ||
        (TOTING(G, G.EGGS) && G.LOC === G.data.plac[G.EGGS])) return 2011;
    if (G.PLACE[G.EGGS] === 0 && G.PLACE[G.TROLL] === 0 && G.PROP[G.TROLL] === 0) {
      G.PROP[G.TROLL] = 1;
    }
    G.K = 2;
    if (HERE(G, G.EGGS)) G.K = 1;
    if (G.LOC === G.data.plac[G.EGGS]) G.K = 0;
    move(G, G.EGGS, G.data.plac[G.EGGS]);
    pspeak(G, G.EGGS, G.K);
    return 2012;
  }
  if (G.FOOBAR !== 0) G.SPK = 151;
  return 2011;
}

// Brief
function doBrief(G) {
  G.SPK = 156;
  G.ABBNUM = 10000;
  G.DETAIL = 3;
  return 2011;
}

// Read (intransitive)
function doIntransRead(G) {
  for (G.I = 1; G.I <= 100; G.I++) {
    if (HERE(G, G.I) && G.data.objtxt[G.I] !== 0 && G.PROP[G.I] >= 0) {
      G.OBJ = G.OBJ * 100 + G.I;
    }
  }
  if (G.OBJ > 100 || G.OBJ === 0 || DARK(G)) return 8000;
  return doTransRead(G);
}

// Read (transitive)
async function doTransRead(G) {
  if (DARK(G)) {
    setprm(G, 1, G.wd1, G.wd1x);
    rspeak(G, 256);
    return 2012;
  }
  if (G.data.objtxt[G.OBJ] === 0 || G.PROP[G.OBJ] < 0) return 2011;
  if (G.OBJ === G.OYSTER && !G.CLSHNT) {
    G.CLSHNT = await yes(G, 192, 193, 54);
    return 2012;
  }
  pspeak(G, G.OBJ, G.data.objtxt[G.OBJ] + G.PROP[G.OBJ]);
  return 2012;
}

// Break
function doBreak(G) {
  if (G.OBJ === G.MIRROR) G.SPK = 148;
  if (G.OBJ === G.VASE && G.PROP[G.VASE] === 0) {
    G.SPK = 198;
    if (TOTING(G, G.VASE)) drop(G, G.VASE, G.LOC);
    G.PROP[G.VASE] = 2;
    G.FIXED[G.VASE] = -1;
    return 2011;
  }
  if (G.OBJ !== G.MIRROR || !G.CLOSED) return 2011;
  G.SPK = 197;
  return 18999;
}

// Wake
function doWake(G) {
  if (G.OBJ !== G.DWARF || !G.CLOSED) return 2011;
  G.SPK = 199;
  return 18999;
}

// Suspend
async function doSuspend(G) {
  G.SPK = 201;
  rspeak(G, 260);
  if (!await yes(G, 200, 54, 54)) return 2012;
  // Save not implemented in JS version
  rspeak(G, 266);
  return 2012;
}

// Resume
async function doResume(G) {
  rspeak(G, 268);
  if (!await yes(G, 200, 54, 54)) return 2012;
  // Restore not implemented in JS version
  rspeak(G, 270);
  return 2012;
}

// Fly
function doIntransFly(G) {
  if (G.PROP[G.RUG] !== 2) G.SPK = 224;
  if (!HERE(G, G.RUG)) G.SPK = 225;
  if (Math.floor(G.SPK / 2) === 112) return 2011;
  G.OBJ = G.RUG;
  return doTransFly(G);
}

function doTransFly(G) {
  if (G.OBJ !== G.RUG) return 2011;
  G.SPK = 223;
  if (G.PROP[G.RUG] !== 2) return 2011;
  G.OLDLC2 = G.OLDLOC;
  G.OLDLOC = G.LOC;
  G.NEWLOC = G.PLACE[G.RUG] + G.FIXED[G.RUG] - G.LOC;
  G.SPK = 226;
  if (G.PROP[G.SAPPH] >= 0) G.SPK = 227;
  rspeak(G, G.SPK);
  return 2;
}

// Listen
function doListen(G) {
  G.SPK = 228;
  G.K = G.data.locsnd[G.LOC];
  if (G.K !== 0) {
    rspeak(G, IABS(G.K));
    if (G.K < 0) return 2012;
    G.SPK = 0;
  }
  setprm(G, 1, G.ZZWORD, 0);
  for (G.I = 1; G.I <= 100; G.I++) {
    if (!HERE(G, G.I) || G.data.objsnd[G.I] === 0 || G.PROP[G.I] < 0) continue;
    pspeak(G, G.I, G.data.objsnd[G.I] + G.PROP[G.I]);
    G.SPK = 0;
    if (G.I === G.BIRD && G.data.objsnd[G.I] + G.PROP[G.I] === 8) destroy(G, G.BIRD);
  }
  return 2011;
}

// Z'ZZZ
function doZzzz(G) {
  if (!AT(G, G.RESER) && G.LOC !== G.FIXED[G.RESER] - 1) return 2011;
  pspeak(G, G.RESER, G.PROP[G.RESER] + 1);
  G.PROP[G.RESER] = 1 - G.PROP[G.RESER];
  if (AT(G, G.RESER)) return 2012;
  G.OLDLC2 = G.LOC;
  G.NEWLOC = 0;
  rspeak(G, 241);
  return 2;
}
