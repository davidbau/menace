// timefnc.js - Clock events, demons, and actors for DUNGEON
//
// Ported from timefnc.f (Fortran V4.0)
// COPYRIGHT 1980, 1990, INFOCOM COMPUTERS AND COMMUNICATIONS, CAMBRIDGE MA.
// ALL RIGHTS RESERVED, COMMERCIAL USAGE STRICTLY PROHIBITED
// WRITTEN BY R. M. SUPNIK
//
// Faithful port to JavaScript by machine translation.

import {
  // Actor indices
  PLAYER, AROBOT, AMASTR,
  // Actor flags
  ASTAG,
  // Room flags
  RLAND, RSACRD, REND, RLIGHT, RSEEN, RMUNG, RHOUSE,
  // Exit constants
  XMIN, XMAX, XNORTH, XSOUTH, XENTER,
  // Object flag bits
  VISIBT, TAKEBT, LITEBT, FLAMBT, ONBT, NDSCBT, OPENBT,
  FITEBT, STAGBT, WEAPBT, TCHBT,
  // Clock event indices
  CEVCUR, CEVMNT, CEVLNT, CEVMAT, CEVCND,
  CEVBAL, CEVBRN, CEVLED, CEVSAF, CEVVLG, CEVGNO,
  CEVBUC, CEVSPH, CEVEGH, CEVFOR, CEVSCL,
  CEVZGI, CEVZGO, CEVSTE, CEVMRS, CEVINQ,
  CEVFOL, CEVBRO, CEVCYC, CEVSLI,
  // Room constants
  MAINT, MCYCL, TREAS, VLBOT, VAIR1, VAIR2, VAIR3, VAIR4,
  LEDG2, LEDG3, LEDG4, MSAFE, CAGER, CRYPT, TSTRS, MRANT, INMIR,
  FORE1, CLEAR, MTREE, BKTWI, BKVAU,
  LLD1, TEMP2, MAZE1, MAZ15, SLID1, SLEDG, CELLA,
  FDOOR, SCORR, NCORR, CELL, PCELL,
  LROOM, EGYPT,
  // Room constants for MRx (endgame)
  MRG, MRGE, MRGW,
  // Object constants
  LAMP, CANDL, MATCH, FUSE, BRICK, BALLO, DBALL, RECEP,
  GNOME, WATER, BUCKE, SAFE, SSLOT, EGG,
  THIEF, STILL, TROLL, CYCLO, SWORD, ROPE,
  BELL, HBELL, MASTER, ZGNOM, BROCH, MAILB,
  TCASE, CAGE, RCAGE, ROBOT, SPHER, QDOOR,
  // Verb constants
  INXW, FRSTQW, FIGHTW, DEADXW, OUTXW,
  WALKW, ATTACW, MUNGW, KILLW, SWINGW, KICKW, BLASTW,
  OPENW, CLOSEW, EATW, DRINKW, INFLAW, DEFLAW,
  TURNW, TIEW, RUBW, COUNTW, BURNW, UNTIEW,
  TRNONW, SCOREW, QUITW, TELLW, TAKEW, DROPW, THROWW, INVENW,
  DIAGNW, LOOKW, PRAYW, WALKIW, RAISEW, READW,
  PUTW, PUSHW, LEAPW, SPINW, TRNTOW, STAYW, FOLLOW,
  // Misc constants
  BSHAF, HFACTR,
  // Functions
  rspeak, rspsub, bug, qhere, newsta, jigsup,
  findxt, moveto, rmdesc,
  prob, rnd, lit, scrupd,
  fights, fwim, vilstr, winnin,
  robrm, robadv, oappli,
} from './support.js';

// ---------------------------------------------------------------
// Fortran .OR. and .AND. do NOT short-circuit — all operands are
// always evaluated, including function calls with side effects like
// PROB() and RND(). To match RNG consumption order, use these helpers
// instead of JS || and && when the chain contains prob/rnd calls.
// ---------------------------------------------------------------
function OR(...args) { return args.some(Boolean); }
function AND(...args) { return args.every(Boolean); }

// ---------------------------------------------------------------
// CLOCKD — Intermove clock events demon
// ---------------------------------------------------------------

/**
 * CLOCKD — Process all active clock events.
 * Returns true if any event fired.
 */
export function clockd(G) {
  let ret = false;
  for (let i = 1; i <= G.clnt; i++) {
    if (!G.cflag[i - 1]) continue;
    if (G.ctick[i - 1] === 0) continue;
    if (G.ctick[i - 1] < 0) {
      // permanent entry — fire immediately (no tick decrement)
      ret = true;
      cevapp(G, G.cactio[i - 1]);
    } else {
      G.ctick[i - 1]--;
      if (G.ctick[i - 1] !== 0) continue;
      ret = true;
      cevapp(G, G.cactio[i - 1]);
    }
  }
  return ret;
}

// ---------------------------------------------------------------
// CEVAPP — Clock event applicables
// ---------------------------------------------------------------

// Tick tables for LITINT (1-indexed; first half = intervals, second = messages)
const CNDTCK = [50, 20, 10, 5, 0, 156, 156, 156, 157, 0];   // 10 entries
const LMPTCK = [50, 30, 20, 10, 4, 0, 154, 154, 154, 154, 155, 0]; // 12 entries

/**
 * CEVAPP(ri) — Dispatch clock event handler.
 */
export function cevapp(G, ri) {
  if (ri === 0) return;
  const waslit = lit(G, G.here);

  switch (ri) {
    case 1:  cev1(G);  return; // CEV1 always returns
    case 2:  cev2(G);  return; // CEV2 always returns
    case 3:  cev3(G, waslit);  return; // handles goto50 itself
    case 4:  cev4(G, waslit);  return;
    case 5:  cev5(G, waslit);  return;
    case 6:  cev6(G);   return;
    case 7:  cev7(G);   return;
    case 8:  cev8(G);   return;
    case 9:  cev9(G);   return;
    case 10: cev10(G);  return;
    case 11: cev11(G);  return;
    case 12: cev12(G);  return;
    case 13: cev13(G);  return;
    case 14: cev14(G);  return;
    case 15: cev15(G);  return;
    case 16: cev16(G);  return;
    case 17: cev17(G);  return;
    case 18: cev18(G);  return;
    case 19: cev19(G);  return;
    case 20: cev20(G);  return;
    case 21: cev21(G);  return;
    case 22: cev22(G);  return;
    case 23: cev23(G);  return;
    case 24: cev24(G);  return;
    case 25: cev25(G);  return;
    case 26: cev26(G);  return;
    case 27: cev27(G);  return;
    case 28: cev28(G);  return;
    case 29: cev29(G);  return;
    case 30: cev30(G);  return;
    default: bug(G, 3, ri); return;
  }
}

// ---- CEV1: Cure clock. Let player slowly recover. ----
function cev1(G) {
  G.astren[PLAYER - 1] = Math.min(0, G.astren[PLAYER - 1] + 1);
  if (G.astren[PLAYER - 1] >= 0) return; // fully recovered
  G.cflag[CEVCUR - 1] = true;
  G.ctick[CEVCUR - 1] = 30;
}

// ---- CEV2: Maintenance room leak. Raise water level. ----
function cev2(G) {
  if (G.here === MAINT) rspeak(G, 71 + Math.floor(G.rvmnt / 2));
  G.rvmnt++;
  if (G.rvmnt <= 16) return; // not full yet
  G.ctick[CEVMNT - 1] = 0;
  G.rflag[MAINT - 1] |= RMUNG;
  G.rdesc1[MAINT - 1] = 80;
  if (G.here === MAINT) jigsup(G, 81);
}

// ---- CEV3: Lantern growing dimness. ----
function cev3(G, waslit) {
  litint(G, LAMP, 'orlamp', CEVLNT, LMPTCK, 12);
  if (waslit && !lit(G, G.here)) rspeak(G, 406);
}

// ---- CEV4: Match out. ----
function cev4(G, waslit) {
  rspeak(G, 153);
  G.oflag1[MATCH - 1] &= ~(ONBT | FLAMBT | LITEBT);
  if (waslit && !lit(G, G.here)) rspeak(G, 406);
}

// ---- CEV5: Candle growing dimness. ----
function cev5(G, waslit) {
  litint(G, CANDL, 'orcand', CEVCND, CNDTCK, 10);
  if (waslit && !lit(G, G.here)) rspeak(G, 406);
}

// ---- CEV6: Balloon. ----
function cev6(G) {
  G.cflag[CEVBAL - 1] = true;
  G.ctick[CEVBAL - 1] = 3;
  const f = G.avehic[G.winner - 1] === BALLO;
  const qledge = (r) => r === LEDG2 || r === LEDG3 || r === LEDG4;
  const qopen  = (r) => (G.oflag2[r - 1] & OPENBT) !== 0;

  if (G.bloc === VLBOT) {
    // At bottom — go up if inflated and recep open
    if (G.binff === 0 || !qopen(RECEP)) return;
    G.bloc = VAIR1;
    newsta(G, BALLO, 0, G.bloc, 0, 0);
    if (f) {
      moveto(G, G.bloc, G.winner);
      rspeak(G, 542);
      rmdesc(G, 0);
    } else {
      if (qledge(G.here) || G.here === VLBOT) rspeak(G, 541);
    }
    return;
  }

  if (qledge(G.bloc)) {
    // On ledge — move to midair
    G.bloc = G.bloc + (VAIR2 - LEDG2);
    newsta(G, BALLO, 0, G.bloc, 0, 0);
    if (f) {
      moveto(G, G.bloc, G.winner);
      rspeak(G, 540);
      rmdesc(G, 0);
    } else {
      if (qledge(G.here) || G.here === VLBOT) rspeak(G, 539);
      G.cflag[CEVVLG - 1] = true;
      G.ctick[CEVVLG - 1] = 10;
    }
    return;
  }

  if (qopen(RECEP) && G.binff !== 0) {
    // Inflated and open — go up
    if (G.bloc !== VAIR4) {
      G.bloc++;
      newsta(G, BALLO, 0, G.bloc, 0, 0);
      if (f) {
        moveto(G, G.bloc, G.winner);
        rspeak(G, 538);
        rmdesc(G, 0);
      } else {
        if (qledge(G.here) || G.here === VLBOT) rspeak(G, 537);
      }
    } else {
      // At VAIR4 — crash
      G.cflag[CEVBRN - 1] = false;
      G.cflag[CEVBAL - 1] = false;
      G.binff = 0;
      G.bloc = VLBOT;
      newsta(G, BALLO, 0, 0, 0, 0);
      newsta(G, DBALL, 0, G.bloc, 0, 0);
      if (G.lastit === BALLO) G.lastit = DBALL;
      if (f) {
        jigsup(G, 536);
      } else {
        if (qledge(G.here)) rspeak(G, 535);
        if (G.here === VLBOT) rspeak(G, 925);
      }
    }
    return;
  }

  // Deflated in midair — fall
  if (G.bloc !== VAIR1) {
    G.bloc--;
    newsta(G, BALLO, 0, G.bloc, 0, 0);
    if (f) {
      moveto(G, G.bloc, G.winner);
      rspeak(G, 534);
      rmdesc(G, 0);
    } else {
      if (qledge(G.here) || G.here === VLBOT) rspeak(G, 533);
    }
  } else {
    // In VAIR1 — land at bottom
    G.bloc = VLBOT;
    newsta(G, BALLO, 0, G.bloc, 0, 0);
    if (f) {
      moveto(G, G.bloc, G.winner);
      if (G.binff !== 0) {
        rspeak(G, 531);
        rmdesc(G, 0);
      } else {
        // Deflated balloon crashes
        newsta(G, BALLO, 532, 0, 0, 0);
        newsta(G, DBALL, 0, G.bloc, 0, 0);
        if (G.lastit === BALLO) G.lastit = DBALL;
        G.avehic[G.winner - 1] = 0;
        G.cflag[CEVBAL - 1] = false;
        G.cflag[CEVBRN - 1] = false;
      }
    } else {
      if (qledge(G.here) || G.here === VLBOT) rspeak(G, 530);
    }
  }
}

// ---- CEV7: Balloon burnup. ----
function cev7(G) {
  let burning = 0;
  for (let i = 1; i <= G.olnt; i++) {
    if (G.ocan[i - 1] === RECEP && (G.oflag1[i - 1] & FLAMBT) !== 0) {
      burning = i;
      break;
    }
  }
  if (burning === 0) { bug(G, 4, 0); return; }
  newsta(G, burning, 0, 0, 0, 0);
  G.binff = 0;
  if (G.here === G.bloc) rspsub(G, 292, G.odesc2[burning - 1]);
}

// ---- CEV8: Fuse function. ----
function cev8(G) {
  if (G.ocan[FUSE - 1] !== BRICK) {
    if (qhere(G, FUSE, G.here) || G.oadv[FUSE - 1] === G.winner) rspeak(G, 152);
    newsta(G, FUSE, 0, 0, 0, 0);
    return;
  }
  let br = G.oroom[BRICK - 1];
  const bc = G.ocan[BRICK - 1];
  if (br === 0 && bc !== 0) br = G.oroom[bc - 1];
  if (br === 0) br = G.here;
  newsta(G, FUSE, 0, 0, 0, 0);
  newsta(G, BRICK, 0, 0, 0, 0);
  if (br !== G.here) {
    rspeak(G, 151);
    G.mungrm = br;
    G.cflag[CEVSAF - 1] = true;
    G.ctick[CEVSAF - 1] = 5;
    if (br === MSAFE) {
      if (bc !== SSLOT) return;
      newsta(G, SSLOT, 0, 0, 0, 0);
      G.oflag2[SAFE - 1] |= OPENBT;
      G.safef = true;
    } else {
      for (let i = 1; i <= G.olnt; i++) {
        if (qhere(G, i, br) && (G.oflag1[i - 1] & TAKEBT) !== 0) newsta(G, i, 0, 0, 0, 0);
      }
      if (br === LROOM) {
        for (let i = 1; i <= G.olnt; i++) {
          if (G.ocan[i - 1] === TCASE) newsta(G, i, 0, 0, 0, 0);
        }
      }
    }
    return;
  }
  G.rflag[G.here - 1] |= RMUNG;
  G.rdesc1[G.here - 1] = 114;
  jigsup(G, 150);
}

// ---- CEV9: Ledge munge. ----
function cev9(G) {
  G.rflag[LEDG4 - 1] |= RMUNG;
  G.rdesc1[LEDG4 - 1] = 109;
  if (G.here !== LEDG4) {
    rspeak(G, 110);
    return;
  }
  if (G.avehic[G.winner - 1] === 0) {
    jigsup(G, 111);
    return;
  }
  if (G.btief === 0) {
    rspeak(G, 112);
    return;
  }
  G.bloc = VLBOT;
  newsta(G, BALLO, 0, 0, 0, 0);
  newsta(G, DBALL, 0, G.bloc, 0, 0);
  if (G.lastit === BALLO) G.lastit = DBALL;
  G.odesc1[G.btief - 1] = 1073;
  G.btief = 0;
  G.binff = 0;
  G.cflag[CEVBAL - 1] = false;
  G.cflag[CEVBRN - 1] = false;
  jigsup(G, 113);
}

// ---- CEV10: Safe munge. ----
function cev10(G) {
  G.rflag[G.mungrm - 1] |= RMUNG;
  G.rdesc1[G.mungrm - 1] = 114;
  if (G.here !== G.mungrm) {
    rspeak(G, 115);
    if (G.mungrm !== MSAFE) return;
    G.cflag[CEVLED - 1] = true;
    G.ctick[CEVLED - 1] = 8;
    return;
  }
  let i = 116;
  if ((G.rflag[G.here - 1] & RHOUSE) !== 0) i = 117;
  jigsup(G, i);
}

// ---- CEV11: Volcano gnome entrance. ----
function cev11(G) {
  const qledge = (r) => r === LEDG2 || r === LEDG3 || r === LEDG4;
  if (!qledge(G.here)) {
    G.cflag[CEVVLG - 1] = true;
    G.ctick[CEVVLG - 1] = 1;
    return;
  }
  newsta(G, GNOME, 118, G.here, 0, 0);
}

// ---- CEV12: Volcano gnome exit. ----
function cev12(G) {
  if (G.oroom[GNOME - 1] === G.here) rspeak(G, 149);
  newsta(G, GNOME, 0, 0, 0, 0);
}

// ---- CEV13: Bucket. ----
function cev13(G) {
  if (G.ocan[WATER - 1] === BUCKE) newsta(G, WATER, 0, 0, 0, 0);
}

// ---- CEV14: Sphere. If expires, he's trapped. ----
function cev14(G) {
  G.rflag[CAGER - 1] |= RMUNG;
  G.rdesc1[CAGER - 1] = 147;
  G.winner = PLAYER;
  jigsup(G, 148);
}

// ---- CEV15: End game herald. ----
function cev15(G) {
  G.endgmf = true;
  rspeak(G, 119);
}

// ---- CEV16: Forest murmurs. ----
function cev16(G) {
  G.cflag[CEVFOR - 1] = (G.here === MTREE) || (G.here >= FORE1 && G.here < CLEAR);
  if (AND(G.cflag[CEVFOR - 1], prob(G, 10, 10))) rspeak(G, 635);
}

// ---- CEV17: Scol alarm. ----
function cev17(G) {
  if (G.here === BKVAU) jigsup(G, 636);
  if (G.zgnomf || G.here !== BKTWI) return;
  G.zgnomf = true;
  G.cflag[CEVZGI - 1] = true;
  G.ctick[CEVZGI - 1] = 5;
}

// ---- CEV18: Gnome of Zurich entrance. ----
function cev18(G) {
  if (G.here !== BKTWI) return;
  G.cflag[CEVZGO - 1] = true;
  G.ctick[CEVZGO - 1] = 12;
  newsta(G, ZGNOM, 637, BKTWI, 0, 0);
}

// ---- CEV19: Gnome of Zurich exits. ----
function cev19(G) {
  newsta(G, ZGNOM, 0, 0, 0, 0);
  if (G.here === BKTWI) rspeak(G, 638);
}

// ---- CEV20: Start of endgame. ----
function cev20(G) {
  if (!G.spellf) {
    if (G.here !== CRYPT) return;
    if (lit(G, G.here)) {
      G.cflag[CEVSTE - 1] = true;
      G.ctick[CEVSTE - 1] = 3;
      return;
    }
    rspeak(G, 727);
  }
  // Strip player of all objects (reset to their original locations)
  for (let i = 1; i <= G.olnt; i++) {
    newsta(G, i, 0, G.oroom[i - 1], G.ocan[i - 1], 0);
  }
  newsta(G, LAMP, 0, 0, 0, PLAYER);
  newsta(G, SWORD, 0, 0, 0, PLAYER);

  G.oflag1[LAMP - 1] = (G.oflag1[LAMP - 1] | LITEBT) & ~ONBT;
  G.oflag2[LAMP - 1] |= TCHBT;
  G.cflag[CEVLNT - 1] = false;
  G.ctick[CEVLNT - 1] = 350;
  G.orlamp = 0;
  G.oflag2[SWORD - 1] |= TCHBT;
  G.swdact = true;
  G.swdsta = 0;

  G.thfact = false;
  G.endgmf = true;
  G.cflag[CEVEGH - 1] = false;
  G.cflag[CEVMAT - 1] = false;
  G.cflag[CEVCND - 1] = false;

  scrupd(G, G.rval[CRYPT - 1]);
  G.rval[CRYPT - 1] = 0;
  moveto(G, TSTRS, G.winner);
  rmdesc(G, 3);
}

// ---- CEV21: Mirror closes. ----
function cev21(G) {
  G.mrpshf = false;
  G.mropnf = false;
  if (G.here === MRANT) rspeak(G, 728);
  // mrhere(HERE).EQ.1 — simplified: east/west rooms or inmir
  if (G.here === INMIR) rspeak(G, 729);
  else if (_mrhere1(G, G.here)) rspeak(G, 729);
}

// Check if here is a mirror-adjacent room (mirrors are east/west of main rooms)
function _mrhere1(G, rm) {
  const MRAE = 167, MRDW = 176;
  return rm >= MRAE && rm <= MRDW;
}

// ---- CEV22: Door closes. ----
function cev22(G) {
  if (G.wdopnf) rspeak(G, 730);
  G.wdopnf = false;
}

// ---- CEV23: Inquisitor's question. ----
function cev23(G) {
  if (G.aroom[PLAYER - 1] !== FDOOR) return;
  rspeak(G, 769);
  rspeak(G, 770 + G.quesno);
  G.cflag[CEVINQ - 1] = true;
  G.ctick[CEVINQ - 1] = 2;
}

// ---- CEV24: Master follows. ----
function cev24(G) {
  if (G.aroom[AMASTR - 1] === G.here) return;
  if (G.here === CELL || G.here === PCELL) {
    if (G.follwf) rspeak(G, 811);
    G.follwf = false;
    return;
  }
  G.follwf = true;
  let i = 812; // assume catches up
  for (let j = XMIN; j <= XMAX; j += XMIN) {
    const fx = findxt(G, j, G.aroom[AMASTR - 1]);
    if (fx.found && G.xroom1 === G.here) i = 813; // follows
  }
  rspeak(G, i);
  newsta(G, MASTER, 0, G.here, 0, 0);
  G.aroom[AMASTR - 1] = G.here;
}

// ---- CEV25: Brochure arrives. ----
function cev25(G) {
  newsta(G, BROCH, 948, 0, MAILB, 0);
  G.broc2f = true;
}

// ---- CEV26: Cyclops. ----
function cev26(G) {
  if (G.here !== MCYCL || G.magicf) {
    G.cflag[CEVCYC - 1] = false;
    return;
  }
  if (G.cyclof) return; // asleep
  if (Math.abs(G.rvcyc) > 5) {
    G.cflag[CEVCYC - 1] = false;
    jigsup(G, 188);
    return;
  }
  if (G.rvcyc < 0) G.rvcyc--;
  if (G.rvcyc >= 0) G.rvcyc++;
  rspeak(G, 193 + Math.abs(G.rvcyc));
}

// ---- CEV27: Slippery slide. ----
function cev27(G) {
  if (G.here < SLID1 || G.here >= SLEDG) return;
  rspeak(G, 1034);
  moveto(G, CELLA, G.winner);
  rmdesc(G, 3);
}

// ---- CEV28: Exorcism bell. ----
function cev28(G) {
  if (!G.exorcf && G.here === LLD1) rspeak(G, 970);
  G.exorbf = false;
}

// ---- CEV29: Exorcism candles. ----
function cev29(G) {
  G.exorcf = false;
  // goto 28000 logic
  if (!G.exorcf && G.here === LLD1) rspeak(G, 970);
  G.exorbf = false;
}

// ---- CEV30: Hot bell cools down. ----
function cev30(G) {
  newsta(G, HBELL, 0, 0, 0, 0);
  newsta(G, BELL, 0, LLD1, 0, 0);
  if (G.lastit === HBELL) G.lastit = BELL;
  if (G.here === LLD1) rspeak(G, 971);
}

// ---------------------------------------------------------------
// LITINT — Light interrupt processor
// ---------------------------------------------------------------

/**
 * LITINT(obj, ctrName, cev, ticks, tickln)
 * Fortran: SUBROUTINE LITINT(OBJ, CTR, CEV, TICKS, TICKLN)
 *
 * obj:     object index (1-based)
 * ctrName: name of counter field on G (e.g. 'orlamp', 'orcand')
 * cev:     clock event index (1-based)
 * ticks:   tick table (JS 0-indexed array; Fortran was 1-indexed)
 * tickln:  length of ticks array
 */
export function litint(G, obj, ctrName, cev, ticks, tickln) {
  G[ctrName]++;                              // CTR = CTR + 1
  const ctr = G[ctrName];                   // current counter value (1-based)
  G.ctick[cev - 1] = ticks[ctr - 1];        // CTICK(CEV) = TICKS(CTR)

  if (G.ctick[cev - 1] !== 0) {
    // Not expired — re-arm and print dim message
    G.cflag[cev - 1] = true;
    if (G.oroom[obj - 1] === G.here || G.oadv[obj - 1] === G.winner) {
      // Message is in second half: TICKS(CTR + TICKLN/2)
      rspeak(G, ticks[ctr - 1 + Math.floor(tickln / 2)]);
    }
    return;
  }

  // Expired — put light out
  G.oflag1[obj - 1] &= ~(LITEBT | FLAMBT | ONBT);
  if (G.oroom[obj - 1] === G.here || G.oadv[obj - 1] === G.winner) {
    rspsub(G, 293, G.odesc2[obj - 1]);
  }
}

// ---------------------------------------------------------------
// FIGHTD — Intermove fight demon
// ---------------------------------------------------------------

/**
 * FIGHTD — Process all villain encounters each move.
 * Fortran: SUBROUTINE FIGHTD
 */
export function fightd(G) {
  const ROUT_CODE = 1;

  // Phase 1: Update villain states
  for (let i = 1; i <= G.vlnt; i++) {
    G.vopps[i - 1] = 0;                     // clear opponent slot
    const obj = G.villns[i - 1];            // villain object index
    const ra  = G.oactio[obj - 1];          // villain action

    if (G.here !== G.oroom[obj - 1]) {
      // Villain not in player's room
      if ((G.oflag2[obj - 1] & FITEBT) !== 0 && ra !== 0) {
        G.prsa = FIGHTW;
        oappli(G, ra, 0);
      }
      if (obj === THIEF) G.thfenf = false;
      G.aflag[PLAYER - 1] &= ~ASTAG;
      G.oflag2[obj - 1] &= ~(STAGBT | FITEBT);
      if (G.ocapac[obj - 1] < 0 && ra !== 0) {
        G.prsa = INXW;
        oappli(G, ra, 0);
        G.ocapac[obj - 1] = Math.abs(G.ocapac[obj - 1]);
      }
      continue;
    }

    // Villain in same room as player
    if (obj === THIEF && G.thfenf) {
      G.thfenf = false;
      continue;
    }

    if (G.ocapac[obj - 1] < 0) {
      // Villain asleep
      // Fortran: IF((VPROB(I).EQ.0).OR..NOT.PROB(...)) — .OR. doesn't short-circuit
      if (!OR(G.vprob[i - 1] === 0,
              !prob(G, G.vprob[i - 1], Math.floor((100 + G.vprob[i - 1]) / 2)))) {
        // Wakes up
        G.ocapac[obj - 1] = Math.abs(G.ocapac[obj - 1]);
        G.vprob[i - 1] = 0;
        if (ra !== 0) {
          G.prsa = INXW;
          oappli(G, ra, 0);
        }
      } else {
        G.vprob[i - 1] += 10;
      }
      continue;
    }

    if ((G.oflag2[obj - 1] & FITEBT) !== 0) {
      G.vopps[i - 1] = obj;
      continue;
    }

    if (ra === 0) continue;
    G.prsa = FRSTQW;
    if (!oappli(G, ra, 0)) continue;
    G.oflag2[obj - 1] |= FITEBT;
    G.vopps[i - 1] = obj;
    G.prscon = 0;
  }

  // Phase 2: Counterblows
  let out = 0;
  do {
    for (let i = 1; i <= G.vlnt; i++) {
      const j = G.vopps[i - 1];
      if (j === 0) continue;
      G.prscon = 0;
      const ra = G.oactio[j - 1];
      if (ra !== 0) {
        G.prsa = FIGHTW;
        if (oappli(G, ra, 0)) continue; // villain handled it specially
      }
      const res = blow(G, PLAYER, j, G.vmelee[i - 1], false, out);
      if (res < 0) return; // hero dead
      if (res === ROUT_CODE) out = 2 + rnd(3);
    }
    out--;
  } while (out > 0);
}

// ---------------------------------------------------------------
// BLOW — Strike blow
// ---------------------------------------------------------------

// Combat result codes
const RMISS = 0; // miss
const ROUT  = 1; // out (unconscious)
const RKILL = 2; // killed
const RXXX  = 3; // light wound
const RSER  = 4; // serious wound
const RSTAG = 5; // staggered
const RLOSE = 6; // lose weapon
const RHES  = 7; // hesitates
const RSIT  = 8; // sitting duck

// Defense tables (Fortran 1-indexed; JS 0-indexed with [0] unused)
const DEF1R = [0, 1, 2, 3];           // DEF1R(1..3)
const DEF2R = [0, 13, 23, 24, 25];    // DEF2R(1..4)
const DEF3R = [0, 35, 36, 46, 47, 57]; // DEF3R(1..5)

// Result vector (Fortran 1-indexed 66 entries; JS 0-indexed)
const RVECTR = [
  // TBL=1  entries 1-12
  0, 0, 0, 0, 5, 5, 1, 1, 2, 2, 2, 2,
  // TBL=13 entries 13-22
  0, 0, 0, 0, 0, 5, 5, 3, 3, 1,
  // TBL=23 entries 23-34
  0, 0, 0, 5, 5, 3, 3, 3, 1, 2, 2, 2,
  // TBL=35 entries 35-45
  0, 0, 0, 0, 0, 5, 5, 3, 3, 4, 4,
  // TBL=46 entries 46-56
  0, 0, 0, 5, 5, 3, 3, 3, 4, 4, 4,
  // TBL=57 entries 57-66
  0, 5, 5, 3, 3, 3, 3, 4, 4, 4,
];

// RSTATE: 45 entries, 1-indexed in Fortran, 0-indexed here.
// Indexed as RSTATE[((RMK-1)*9) + RES]  (0-based)
const RSTATE = [
  5000, 3005, 3008, 4011, 3015, 3018, 1021,    0,    0,  // RMK=1
  5022, 3027, 3030, 4033, 3037, 3040, 1043,    0,    0,  // RMK=2
  4044, 2048, 4050, 4054, 5058, 4063, 4067, 3071, 1074,  // RMK=3
  4075, 1079, 4080, 4084, 4088, 4092, 4096, 4100, 1104,  // RMK=4
  4105, 2109, 4111, 4115, 4119, 4123, 4127, 3131, 3134,  // RMK=5
];

/**
 * BLOW(h, v, rmk, hflg, out) — Resolve a single combat blow.
 * h:    hero (adventurer index, 1-based)
 * v:    villain (object index, 1-based)
 * rmk:  melee style (1-5)
 * hflg: true = hero is attacker; false = villain is attacker
 * out:  hero-is-out counter
 * Returns result code, or -1 if hero is dead.
 */
export function blow(G, h, v, rmk, hflg, out) {
  const ra = G.oactio[v - 1];
  const dv = G.odesc2[v - 1];
  let res = RMISS;
  let att, def, oa, od, dweap;
  let pblose;

  if (hflg) {
    // Hero is attacker
    pblose = 10;
    G.oflag2[v - 1] |= FITEBT;
    if ((G.aflag[h - 1] & ASTAG) !== 0) {
      rspeak(G, 591);
      G.aflag[h - 1] &= ~ASTAG;
      return RMISS;
    }
    att   = Math.max(1, fights(G, h, true));
    oa    = att;
    def   = vilstr(G, v);
    od    = def;
    dweap = 0;
    for (let i = 1; i <= G.olnt; i++) {
      if (G.ocan[i - 1] === v && (G.oflag2[i - 1] & WEAPBT) !== 0) dweap = i;
    }
    if (v === G.aobj[PLAYER - 1]) { jigsup(G, 593); return RMISS; }
    if (def === 0) { rspsub(G, 592, dv); return RMISS; }
  } else {
    // Villain is attacker
    G.prscon = 0;
    pblose = 50;
    G.aflag[h - 1] &= ~ASTAG;
    if ((G.oflag2[v - 1] & STAGBT) !== 0) {
      G.oflag2[v - 1] &= ~STAGBT;
      rspsub(G, 594, dv);
      return RMISS;
    }
    att  = vilstr(G, v);
    oa   = att;
    def  = fights(G, h, true);
    if (def <= 0) return RMISS;
    od   = fights(G, h, false);
    dweap = Math.abs(fwim(G, 0, WEAPBT, 0, 0, h, true));
  }

  // --- label 2000: parties equipped ---
  if (def <= 0) {
    res = RKILL;
    if (hflg) rspsub(G, 595, dv);
  } else {
    // Choose table
    let tbl;
    if (def < 2) {
      att = Math.min(att, 3);
      tbl = DEF1R[att];
    } else if (def === 2) {
      att = Math.min(att, 4);
      tbl = DEF2R[att];
    } else {
      att = Math.min(2, Math.max(-2, att - def)) + 3;
      tbl = DEF3R[att];
    }

    // RVECTR(TBL + RND(10))  — Fortran 1-indexed, so JS index = tbl-1 + rnd(10)
    res = RVECTR[tbl - 1 + rnd(10)];

    // If hero was out, stagger->hesitate, other->sitting duck
    if (out !== 0) {
      if (res === RSTAG) res = RHES;
      else               res = RSIT;
    }

    // Weapon loss check
    // Fortran: IF((RES.EQ.RSTAG).AND.(DWEAP.NE.0).AND.PROB(25,PBLOSE))
    if (AND(res === RSTAG, dweap !== 0, prob(G, 25, pblose))) res = RLOSE;
  }

  // Print message
  const mi = RSTATE[((rmk - 1) * 9) + res];
  if (mi !== 0) {
    const i = (mi % 1000) + rnd(Math.floor(mi / 1000)) + G.mbase + 1;
    let j = dv;
    if (!hflg && dweap !== 0) j = G.odesc2[dweap - 1];
    rspsub(G, i, j);
  }

  // --- label 3000: apply result ---
  switch (res) {
    case ROUT:
      if (hflg) def = -def; // villain unconscious
      break;
    case RKILL:
    case RSIT:
      def = 0;
      break;
    case RXXX:
      def = Math.max(0, def - 1);
      break;
    case RSER:
      def = Math.max(0, def - 2);
      break;
    case RSTAG:
      if (hflg) G.oflag2[v - 1] |= STAGBT;
      else       G.aflag[h - 1]  |= ASTAG;
      break;
    case RLOSE:
      newsta(G, dweap, 0, G.here, 0, 0);
      dweap = 0;
      if (!hflg) {
        dweap = Math.abs(fwim(G, 0, WEAPBT, 0, 0, h, true));
        if (dweap !== 0) rspsub(G, 605, G.odesc2[dweap - 1]);
      }
      break;
    // RMISS, RHES: no effect on def
  }

  // --- label 4000: return result ---
  if (hflg) {
    // Hero attacked villain
    G.ocapac[v - 1] = def;
    if (def !== 0) {
      if (res === ROUT && ra !== 0) {
        G.prsa = OUTXW;
        oappli(G, ra, 0);
      }
      return res;
    }
    // Villain dead
    G.oflag2[v - 1] &= ~FITEBT;
    rspsub(G, 572, dv);
    newsta(G, v, 0, 0, 0, 0);
    if (ra !== 0) {
      G.prsa = DEADXW;
      oappli(G, ra, 0);
    }
    return res;
  }

  // --- label 4500: villain attacked hero ---
  G.astren[h - 1] = -10000; // assume dead
  if (def !== 0) G.astren[h - 1] = def - od;
  if (def < od) {
    G.ctick[CEVCUR - 1] = 30;
    G.cflag[CEVCUR - 1] = true;
  }
  if (fights(G, h, true) > 0) return res;
  G.astren[h - 1] = 1 - fights(G, h, false);
  jigsup(G, 596);
  return -1;
}

// ---------------------------------------------------------------
// SWORDD — Intermove sword demon
// ---------------------------------------------------------------

/**
 * SWORDD — Update sword glow based on nearby villains.
 */
export function swordd(G) {
  if (G.oadv[SWORD - 1] !== PLAYER) {
    G.swdact = false; // dropped sword, disable demon
    return;
  }

  let ng = 2; // assume villain close (in this room)
  if (infest(G, G.here)) {
    // villain here — ng stays 2
  } else {
    ng = 1;
    let found = false;
    for (let j = XMIN; j <= XMAX; j += XMIN) {
      const fx = findxt(G, j, G.here);
      if (!fx.found) continue;
      // GO TO (50,200,50,50),XTYPE — type 2 (XNO) skips, types 1,3,4 continue
      if (G.xtype === 2) continue;
      if (infest(G, G.xroom1)) { found = true; break; }
    }
    if (!found) ng = 0;
  }

  if (ng === G.swdsta) return;
  rspeak(G, ng + 495);
  G.swdsta = ng;
}

// ---------------------------------------------------------------
// INFEST — Test for infested room
// ---------------------------------------------------------------

/**
 * INFEST(r) — Returns true if room r contains a villain.
 */
export function infest(G, r) {
  if (!G.endgmf) {
    return (G.oroom[CYCLO - 1] === r) ||
           (G.oroom[TROLL - 1] === r) ||
           (G.oroom[THIEF - 1] === r && G.thfact);
  }
  // Endgame — guardian rooms
  return r === MRG || r === MRGE || r === MRGW ||
         (r === INMIR && G.mloc === MRG);
}

// ---------------------------------------------------------------
// AAPPLI — Applicables for adventurers
// ---------------------------------------------------------------

/**
 * AAPPLI(ri) — Dispatch actor action handler.
 * Returns true if action was handled (AAPPLI = .TRUE.)
 */
export function aappli(G, ri) {
  if (ri === 0) return false;

  switch (ri) {
    case 1: return a1_deadPlayer(G);
    case 2: return a2_robot(G);
    case 3: return a3_master(G);
    default: bug(G, 11, ri); return true;
  }
}

// ---- A1: Dead player. ----
function a1_deadPlayer(G) {
  // Attack-type verbs
  if (G.prsa === ATTACW || G.prsa === MUNGW  || G.prsa === KILLW  ||
      G.prsa === SWINGW || G.prsa === KICKW   || G.prsa === BLASTW) {
    rspeak(G, 949);
    return true;
  }

  // Simple manipulation verbs
  if (G.prsa === OPENW  || G.prsa === CLOSEW  || G.prsa === EATW   ||
      G.prsa === DRINKW || G.prsa === INFLAW  || G.prsa === DEFLAW ||
      G.prsa === TURNW  || G.prsa === TIEW    || G.prsa === RUBW   ||
      G.prsa === COUNTW || G.prsa === BURNW   || G.prsa === UNTIEW) {
    rspeak(G, 950);
    return true;
  }

  if (G.prsa === TRNONW) { rspeak(G, 951); return true; }
  if (G.prsa === SCOREW) { rspeak(G, 952); return true; }
  if (G.prsa === TELLW)  { rspeak(G, 953); return true; }
  if (G.prsa === TAKEW)  { rspeak(G, 954); return true; }

  if (G.prsa === DROPW || G.prsa === THROWW || G.prsa === INVENW) {
    rspeak(G, 955);
    return true;
  }

  if (G.prsa === DIAGNW) { rspeak(G, 956); return true; }

  if (G.prsa === LOOKW) {
    let i = 957;
    for (let j = 1; j <= G.olnt; j++) {
      if (qhere(G, j, G.here)) { i = 958; break; }
    }
    rspeak(G, i);
    if ((G.rflag[G.here - 1] & RLIGHT) === 0) rspeak(G, 959);
    return false; // goto 10: don't handle
  }

  if (G.prsa === PRAYW) {
    if (G.here !== TEMP2) {
      rspeak(G, 960);
      return true;
    }
    // Praying in temple — back to life
    G.oflag1[LAMP - 1] |= VISIBT;
    G.aactio[PLAYER - 1] = 0;
    G.deadf = false;
    moveto(G, FORE1, G.winner);
    rspeak(G, 9);
    return true;
  }

  if (G.prsa === WALKW) {
    const fx = findxt(G, G.prso, G.here);
    if (!fx.found) return false; // goto 10: no exit found
    if (G.xroom1 !== BSHAF) return false; // goto 10: not bshaft
    rspeak(G, 962);
    return true;
  }

  if (G.prsa === QUITW) return false; // goto 10: let it be handled

  rspeak(G, 963);
  return true;
}

// ---- A2: Robot. ----
function a2_robot(G) {
  if (G.prsa === RAISEW && G.prso === RCAGE) {
    G.cflag[CEVSPH - 1] = false;
    G.winner = PLAYER;
    moveto(G, CAGER, G.winner);
    newsta(G, CAGE, 567, CAGER, 0, 0);
    newsta(G, ROBOT, 0, CAGER, 0, 0);
    G.aroom[AROBOT - 1] = CAGER;
    G.cagesf = true;
    G.oflag1[ROBOT - 1] &= ~NDSCBT;
    G.oflag1[SPHER - 1] |= TAKEBT;
    G.prscon = 0;
    return true;
  }

  if (G.prsa === DRINKW || G.prsa === EATW) { rspeak(G, 568); return true; }
  if (G.prsa === READW)                     { rspeak(G, 569); return true; }

  if (G.prsa === WALKW || G.prsa === TAKEW  || G.prsa === DROPW  ||
      G.prsa === PUTW  || G.prsa === PUSHW  || G.prsa === LEAPW  ||
      G.prsa === TURNW) {
    rspeak(G, 930);
    return false; // goto 10: let robot handle it
  }

  rspeak(G, 570);
  return true;
}

// ---- A3: Master. ----
function a3_master(G) {
  if ((G.oflag2[QDOOR - 1] & OPENBT) === 0) {
    rspeak(G, 783);
    return true;
  }

  if (G.prsa === WALKW) {
    let i = 784;
    if ((G.here === SCORR && (G.prso === XNORTH || G.prso === XENTER)) ||
        (G.here === NCORR && (G.prso === XSOUTH || G.prso === XENTER))) {
      i = 785; // can't go to prison
    }
    rspeak(G, i);
    return true;
  }

  if (G.prsa === STAYW  || G.prsa === FOLLOW || G.prsa === KILLW  ||
      G.prsa === MUNGW  || G.prsa === ATTACW) {
    return false; // goto 10: let it proceed
  }

  if (G.prsa === TAKEW  || G.prsa === DROPW  || G.prsa === PUTW   ||
      G.prsa === THROWW || G.prsa === PUSHW  || G.prsa === TURNW  ||
      G.prsa === SPINW  || G.prsa === TRNTOW || G.prsa === OPENW  ||
      G.prsa === CLOSEW) {
    rspeak(G, 1057); // polite reply
    return false;    // goto 10: let it proceed
  }

  rspeak(G, 786);
  return true;
}

// ---------------------------------------------------------------
// THIEFD — Intermove thief demon
// ---------------------------------------------------------------

/**
 * THIEFD — Move thief, rob player/rooms.
 * Fortran: SUBROUTINE THIEFD
 *
 * The Fortran structure has a loop: label 1025 is entered twice (ONCE flag).
 * From the various sub-sections, control falls to label 1700.
 * At 1700: handle rope, check ONCE, advance room, loop to 1025.
 * At 1800: drop junk and return.
 */
export function thiefd(G) {
  let once = false;

  const qstill = (r) => qhere(G, STILL, r) || G.oadv[STILL - 1] === -THIEF;

  // ---- label 1025: main loop ----
  while (true) {
    const waslit = lit(G, G.here);
    let rhere = G.oroom[THIEF - 1]; // 0 if invisible (thief not placed)
    if (rhere !== 0) G.thfpos = rhere;

    // Determine which case we are in, then fall to label 1700
    thief_body: {
      if (G.thfpos === G.here && !G.deadf) {
        // ---- label 1100: thief and live winner in same room ----
        if (G.thfpos === TREAS) break thief_body; // goto 1700 (nothing)
        if ((G.rflag[G.thfpos - 1] & RLIGHT) !== 0) {
          // Room is lit — goto 1400
          thief_1400(G, rhere, waslit, qstill);
          break thief_body;
        }

        // Dark room
        if (G.thfflg) {
          // ---- label 1300: thief already announced ----
          if (rhere === 0) break thief_body; // invisible, goto 1700
          // goto 1250 (fall through to shared rob path)
          if (prob(G, 70, 70)) return; // 70% do nothing
          thief_1250_rob(G, rhere, waslit, qstill);
          break thief_body;
        }

        // Thief not announced yet
        // 1088: IF((RHERE.NE.0).OR.PROB(70,70)) GO TO 1150
        if (OR(rhere !== 0, prob(G, 70, 70))) {
          // ---- label 1150 ----
          // 1094: IF((RHERE.EQ.0).OR.(FITEBT.EQ.0)) GO TO 1200
          if (rhere === 0 || (G.oflag2[THIEF - 1] & FITEBT) === 0) {
            // ---- label 1200 ----
            // 1104: IF((RHERE.EQ.0).OR.PROB(70,70)) GO TO 1250
            if (OR(rhere === 0, prob(G, 70, 70))) {
              // goto 1250 — rob
              if (prob(G, 70, 70)) return; // 70% do nothing
              thief_1250_rob(G, rhere, waslit, qstill);
            } else {
              // Vanish thief (30% chance, visible)
              newsta(G, THIEF, 585, 0, 0, 0);
              if (qstill(G.thfpos)) newsta(G, STILL, 0, 0, THIEF, 0);
              return;
            }
          } else {
            // Visible AND fighting
            if (winnin(G, THIEF, PLAYER)) {
              // ---- label 1175: thief winning ----
              if (prob(G, 90, 90)) break thief_body; // 90% stay, goto 1700
              // 10%: fall to label 1200
              if (OR(rhere === 0, prob(G, 70, 70))) {
                if (prob(G, 70, 70)) return;
                thief_1250_rob(G, rhere, waslit, qstill);
              } else {
                newsta(G, THIEF, 585, 0, 0, 0);
                if (qstill(G.thfpos)) newsta(G, STILL, 0, 0, THIEF, 0);
                return;
              }
            } else {
              // Thief losing — vanish
              newsta(G, THIEF, 584, 0, 0, 0);
              G.oflag2[THIEF - 1] &= ~FITEBT;
              if (qstill(G.thfpos)) newsta(G, STILL, 0, 0, THIEF, 0);
              return;
            }
          }
          break thief_body;
        }

        // rhere === 0 AND prob(70,70) failed (30% chance) — try to appear
        if (G.ocan[STILL - 1] !== THIEF) break thief_body; // no stilletto
        newsta(G, THIEF, 583, G.thfpos, 0, 0);
        G.thfflg = true;
        return;

      } else if (G.thfpos === TREAS) {
        // ---- Thief in treasure room, winner not there or dead ----
        if (rhere !== 0) {
          newsta(G, THIEF, 0, 0, 0, 0);
          rhere = 0;
          if (qstill(TREAS)) newsta(G, STILL, 0, 0, THIEF, 0);
          for (let i = 1; i <= G.olnt; i++) {
            if (qhere(G, i, G.thfpos)) G.oflag1[i - 1] |= VISIBT;
          }
        }
        robadv(G, -THIEF, G.thfpos, 0, 0);
        if (qhere(G, EGG, G.thfpos)) G.oflag2[EGG - 1] |= OPENBT;
        // goto 1700
        break thief_body;
      } else {
        // ---- label 1400: not in adv room, adv dead, or room lit ----
        thief_1400(G, rhere, waslit, qstill);
        break thief_body;
      }
    } // end thief_body

    // ---- label 1700 ----
    if (G.oadv[ROPE - 1] === -THIEF) {
      G.domef = false;
      G.ttie = 0;
    }

    // label 1725:
    if (once) break; // goto 1800

    once = true;

    // Advance to next valid room (label 1750)
    do {
      G.thfpos--;
      if (G.thfpos <= 0) G.thfpos = G.rlnt;
    } while ((G.rflag[G.thfpos - 1] & (RLAND | RSACRD | REND)) !== RLAND);

    G.thfflg = false;
    // goto 1025 — continue loop
  }

  // ---- label 1800: all done ----
  if (G.thfpos === TREAS) return;

  let j = 1055;
  if (G.thfpos !== G.here) j = 0;
  for (let i = 1; i <= G.olnt; i++) {
    // Fortran: IF((OADV(I).NE.-THIEF).OR.PROB(70,30).OR.(OTVAL(I).GT.0))
    // .OR. does NOT short-circuit — prob() is always called.
    const p = prob(G, 70, 30);
    if (G.oadv[i - 1] !== -THIEF || p || G.otval[i - 1] > 0) continue;
    newsta(G, i, j, G.thfpos, 0, 0);
    j = 0;
  }
}

// Helper: thief at label 1250 — robs player/room then vanishes
function thief_1250_rob(G, rhere, waslit, qstill) {
  G.thfflg = true;
  const nr = robrm(G, G.thfpos, 100, 0, 0, -THIEF) +
             robadv(G, PLAYER, 0, 0, -THIEF);
  let i = 586;
  if (rhere !== 0) i = 588;
  newsta(G, THIEF, i + Math.min(1, nr), 0, 0, 0);
  if (qstill(G.thfpos)) newsta(G, STILL, 0, 0, THIEF, 0);
  if (waslit && !lit(G, G.here) && G.here === G.aroom[PLAYER - 1]) rspeak(G, 915);
}

// Helper: thief not in adventurer's room (label 1400)
function thief_1400(G, rhere, waslit, qstill) {
  newsta(G, THIEF, 0, 0, 0, 0);
  if (qstill(G.thfpos)) newsta(G, STILL, 0, 0, THIEF, 0);
  if ((G.rflag[G.thfpos - 1] & RSEEN) === 0) return; // can't rob unseen room

  let rmk = 1045;
  robrm(G, G.thfpos, 75, 0, 0, -5555); // rob room 75% chance, put in hyperspace
  for (let i = 1; i <= G.olnt; i++) {
    if (G.oadv[i - 1] !== -5555) continue;
    newsta(G, i, 0, 0, 0, -THIEF);
    if (G.thfpos === G.here && !G.deadf) rspsub(G, rmk, G.odesc2[i - 1]);
    rmk = 1083;
  }

  // Both thief and player in maze?
  if (G.thfpos >= MAZE1 && G.thfpos <= MAZ15 &&
      G.here >= MAZE1 && G.here <= MAZ15) {
    for (let i = 1; i <= G.olnt; i++) {
      // Fortran .OR. does NOT short-circuit — prob() must always be called
      // to match RNG consumption order.
      const p = prob(G, 60, 60);
      if (!qhere(G, i, G.thfpos) || p || i === WATER ||
          (G.oflag1[i - 1] & (VISIBT | TAKEBT)) !== (VISIBT | TAKEBT)) continue;
      if (!G.deadf) rspsub(G, 590, G.odesc2[i - 1]);
      if (prob(G, 40, 20)) return; // leave without stealing
      newsta(G, i, 0, 0, 0, -THIEF);
      G.oflag2[i - 1] |= TCHBT;
      return;
    }
    return;
  }

  // Not in maze
  for (let i = 1; i <= G.olnt; i++) {
    // Fortran .OR. does NOT short-circuit — prob() must always be called
    const p = prob(G, 80, 60);
    if (!qhere(G, i, G.thfpos) || G.otval[i - 1] !== 0 ||
        p || i === WATER ||
        (G.oflag1[i - 1] & (VISIBT | TAKEBT)) !== (VISIBT | TAKEBT)) continue;
    newsta(G, i, 0, 0, 0, -THIEF);
    G.oflag2[i - 1] |= TCHBT;
    if (G.thfpos === G.here && !G.deadf) rspsub(G, rmk, G.odesc2[i - 1]);
    return;
  }
}
