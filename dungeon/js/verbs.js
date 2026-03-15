// verbs.js - Verb action handlers for DUNGEON
//
// Ported from verbs.f (Fortran) / dverb1.c, dverb2.c (C)
// COPYRIGHT 1980, 1990, INFOCOM COMPUTERS AND COMMUNICATIONS, CAMBRIDGE MA.
// Faithful port to JavaScript by machine translation.

import {
  // Array/size params
  OMAX, FMAX, WRDLNT, HFACTR,

  // Room indices
  WHOUS, SHOUS, EHOUS, KITCH, LROOM, CELLA, MTROL, MAZE1,
  MGRAT, MAZ15, FORE1, FORE2, FORE3, CLEAR, RESER, STREA,
  EGYPT, ECHOR, SLIDE, TSHAF, BSHAF, MMACH, DOME, MTORC,
  CAROU, RIDDL, LLD1, LLD2, TEMP1, TEMP2, MAINT, MCYCL,
  BLROO, TREAS, RIVR1, RIVR2, RIVR3, RIVR4, RIVR5,
  FCHMP, SBEACH, FALLS, MRAIN, POG, VLBOT,
  VAIR1, VAIR2, VAIR3, VAIR4, LEDG2, LEDG3, LEDG4,
  MSAFE, CAGER, CAGED, TWELL, BWELL, ALICE, ALISM, ALITR,
  MTREE, BKENT, BKVW, BKVE, BKTWI, BKVAU, BKBOX,
  CRYPT, TSTRS, MRANT, MREYE, MRA, MRB, MRC, MRG, MRD,
  FDOOR, MRAE, MRCE, MRCW, MRGE, MRGW, MRDW, INMIR,
  SCORR, NCORR, PARAP, CELL, PCELL, NCELL,
  CPANT, CPOUT, CPUZZ, PRM, PALRM, SLID1, SLEDG,

  // Verb indices
  CINTW, DEADXW, FRSTQW, INXW, OUTXW, WALKIW,
  FIGHTW, FOOW, SQUEEW, STAYW, PRAYW, BLASTW,
  SCOREW, QUITW, FOLLOW, GTHROW, RINGW, DIGW, LEAPW,
  LOCKW, UNLOKW, DIAGNW, COUNTW,
  READW, MELTW, INFLAW, DEFLAW, ALARMW, EXORCW, PLUGW,
  KICKW, WAVEW, RAISEW, LOWERW, RUBW, PUSHW,
  UNTIEW, TIEW, TIEUPW, TURNW, BREATW, KNOCKW,
  LOOKW, EXAMIW, SHAKEW, MOVEW, TRNONW, TRNOFW,
  OPENW, CLOSEW, FINDW, WAITW, SPINW, BOARDW, UNBOAW,
  TAKEW, INVENW, EATW, DRINKW, BURNW, MUNGW, KILLW,
  SWINGW, ATTACW, WALKW, TELLW, PUTW, DROPW, GIVEW,
  POURW, THROWW, HELLOW, LOOKIW, LOOKUW,
  PUMPW, WINDW, CLMBW, CLMBUW, CLMBDW, TRNTOW, PORONW,
  PUTUNW, UTFRMW, MAKEW, OILW, PLAYW, SENDW,

  // Object flag bits (oflag1)
  VISIBT, READBT, TAKEBT, DOORBT, TRANBT, FOODBT,
  NDSCBT, DRNKBT, CONTBT, LITEBT, VICTBT, BURNBT,
  FLAMBT, TOOLBT, TURNBT, ONBT,

  // Object flag bits (oflag2)
  FINDBT, DIGBT, SCRDBT, TIEBT, CLMBBT, ACTRBT,
  WEAPBT, FITEBT, VILLBT, STAGBT, TRYBT, NOCHBT,
  OPENBT, TCHBT, VEHBT, SCHBT,

  // Object indices
  GARLI, FOOD, GUNK, COAL, MACHI, DIAMO, TCASE, BOTTL,
  WATER, ROPE, KNIFE, SWORD, LAMP, BLAMP, RUG, LEAVE,
  TROLL, AXE, KEYS, RKNIF, BAGCO, BAR, ICE, COFFI,
  TORCH, TBASK, FBASK, TIMBE, IRBOX, STRAD, GHOST,
  TRUNK, BELL, BOOK, CANDL, GUIDE, MATCH, MAILB,
  TUBE, PUTTY, WRENC, SCREW, CYCLO, CHALI, THIEF, STILL,
  WINDO, GRATE, DOOR, HPOLE, RAILI, LEAK, RBUTT,
  POT, STATU, IBOAT, DBOAT, PUMP, RBOAT, LABEL, STICK,
  BARRE, BUOY, SHOVE, GUANO, BALLO, RECEP, BROPE,
  HOOK1, HOOK2, ZORKM, SAFE, CARD, SSLOT, BRICK, FUSE,
  GNOME, BLABE, DBALL, TOMB, HEADS, COKES, LCASE, CAGE, RCAGE,
  SPHER, SQBUT, FLASK, POOL, SAFFR, BUCKE, ECAKE, ORICE,
  RDICE, BLICE, ROBOT, RBTLB, TTREE, FTREE, BILLS, PORTR,
  SCOL, ZGNOM, NEST, EGG, BEGG, BAUBL, CANAR, BCANA,
  YLWAL, RDWAL, PINDR, RBEAM, ODOOR, QDOOR, LDOOR, CDOOR,
  NUM1, NUM8, WARNI, CSLIT, GCARD, STLDR, HBELL, PLEAK,
  BROCH, STAMP, PDOOR, PLID1, PLID2, PKH1, PKH2, PKEY,
  PALAN, MAT, PAL3,

  // Pseudo/global objects
  ITOBJ, OPLAY, EVERY, VALUA, POSSE, SAILO, TEETH, WALL,
  HANDS, LUNGS, AVIAT, GBROCH, GWISH, GLOBAL, GRWAL,
  WNORT, GWATE, MASTER, BUNOBJ,

  // Actor indices
  PLAYER, AROBOT, AMASTR,

  // Room flags
  RSEEN, RLIGHT, RLAND, RWATER, RAIR, RSACRD,
  RFILL, RMUNG, RBUCK, RHOUSE, RNWALL, REND,

  // Exit/direction constants
  XMIN, XNORTH, XNE, XEAST, XSE, XSOUTH, XSW, XWEST, XNW,
  XUP, XDOWN, XLAUN, XLAND, XENTER, XEXIT, XCROSS,
  XLFLAG, XDMASK, XRMASK, XFMASK, XFSHFT, XASHFT,
  XNORM, XNO, XCOND, XDOOR,

  // Clock events
  CEVCUR, CEVMNT, CEVLNT, CEVMAT, CEVCND, CEVBAL,
  CEVBRN, CEVFUS, CEVLED, CEVSAF, CEVVLG, CEVGNO,
  CEVBUC, CEVSPH, CEVEGH, CEVFOR, CEVSCL, CEVZGI, CEVZGO,
  CEVSTE, CEVMRS, CEVPIN, CEVINQ, CEVFOL, CEVBRO,
  CEVCYC, CEVSLI, CEVXB, CEVXC, CEVXBH,

  // Support functions
  rspeak, rspsub, rspsb2, bug,
  qhere, qempty, newsta, jirone, objact, oappli,
  lit, findxt, moveto, rmdesc, princo, invent,
  score, scrupd,
  prob, rnd,
  clockd, jigsup, fightd,
  weighr, fights,
  opncls, yesno,
  encryp, nblen,
  cpgoto, mrhere,
  oactor,
} from './support.js';

// ---------------------------------------------------------------
// Flags array accessor — maps index to game state boolean flag
// Matches Fortran FLAGS(1..FMAX) = TROLLF, CAGESF, BUCKTF, ...
// ---------------------------------------------------------------

const FLAG_NAMES = [
  'trollf',  'cagesf',  'bucktf',  'caroff',  'carozf',  'lwtidf',   // 1-6
  'domef',   'glacrf',  'echof',   'riddlf',  'lldf',    'cyclof',   // 7-12
  'magicf',  'litldf',  'safef',   'gnomef',  'gnodrf',  'mirrmf',   // 13-18
  'egyptf',  'onpolf',  'blabf',   'brieff',  'superf',  'buoyf',    // 19-24
  'grunlf',  'gatef',   'rainbf',  'cagetf',  'empthf',  'deflaf',   // 25-30
  'glacmf',  'frobzf',  'endgmf',  'badlkf',  'thfenf',  'singsf',  // 31-36
  'mrpshf',  'mropnf',  'wdopnf',  'mr1f',    'mr2f',    'inqstf',   // 37-42
  'follwf',  'spellf',  'cpoutf',  'cpushf',                          // 43-46
  'deadf',   'zgnomf',  'matf',    'plookf',  'ptoucf',               // 47-51
  'broc1f',  'broc2f',  'exorbf',  'exorcf',  'punlkf',              // 52-56
];

function getFlag(G, idx) {
  if (idx < 1 || idx > FLAG_NAMES.length) return false;
  return !!G[FLAG_NAMES[idx - 1]];
}

// ---------------------------------------------------------------
// Helper: qopen — test if object has OPENBT set in oflag2
// ---------------------------------------------------------------

function qopen(G, obj) {
  return (G.oflag2[obj - 1] & OPENBT) !== 0;
}

// ---------------------------------------------------------------
// Helper: edible — test if object has FOODBT set in oflag1
// ---------------------------------------------------------------

function edible(G, obj) {
  return (G.oflag1[obj - 1] & FOODBT) !== 0;
}

// ---------------------------------------------------------------
// Helper: drinkable — test if object has DRNKBT set in oflag1
// ---------------------------------------------------------------

function drkble(G, obj) {
  return (G.oflag1[obj - 1] & DRNKBT) !== 0;
}

// ---------------------------------------------------------------
// JOKES and ANSWER data (from Fortran DATA statements)
// ---------------------------------------------------------------

const JOKES = [4, 5, 3, 304, 305, 306, 307, 308, 309, 310, 311, 312,
  313, 5314, 5319, 324, 325, 883, 884, 120, 120, 0, 0, 0, 0];

const NUMANS = 16;
const ANSWER = [0, 1, 2, 2, 3, 4, 4, 4, 4, 4, 5, 5, 5, 6, 7, 7];
const ANSSTR = ['TEMPLE', 'FOREST', '30003', '30,003', 'FLASK', 'RUB',
  'FONDLE', 'CARESS', 'FEEL', 'TOUCH', 'BONES', 'BODY',
  'SKELETON', 'RUSTY KNIFE', 'NONE', 'NOWHERE'];

// ---------------------------------------------------------------
// Verb dispatch parameters
// ---------------------------------------------------------------

const MXNOP = 39;
const MXJOKE = 64;
const MXSMP = 99;

// ---------------------------------------------------------------
// CXAPPL — Conditional exit processors
// ---------------------------------------------------------------

function cxappl(G, ri) {
  if (ri === 0) return 0;

  switch (ri) {
    case 1: // C1 — Coffin curse
      G.egyptf = G.oadv[COFFI - 1] !== G.winner;
      return 0;

    case 2: // C2 — Carousel exit
      if (G.caroff) return 0;
      rspeak(G, 121); // spin the compass
      // fall through to C5
      return cxappl_c5(G);

    case 3: { // C3 — Chimney function
      G.litldf = false;
      let j = 0;
      for (let i = 0; i < G.olnt; i++) {
        if (G.oadv[i] === G.winner) j++;
      }
      if (j > 2) return 0; // carrying too much
      G.xstrng = 446; // assume no lamp
      if (G.oadv[LAMP - 1] !== G.winner) return 0;
      G.litldf = true;
      if ((G.oflag2[DOOR - 1] & OPENBT) === 0) {
        G.oflag2[DOOR - 1] &= ~TCHBT;
      }
      return 0;
    }

    case 4: // C4 — Frobozz flag (magnet room, fake exit)
      if (G.caroff) {
        rspeak(G, 121);
        return cxappl_c5(G);
      }
      G.frobzf = false;
      return 0;

    case 5: // C5 — Carousel out
      return cxappl_c5(G);

    case 6: // C6 — Frobozz flag (magnet room, real exit)
      if (G.caroff) {
        rspeak(G, 121);
        return cxappl_c5(G);
      }
      G.frobzf = true;
      return 0;

    case 7: // C7 — Frobozz flag (bank alarm)
      G.frobzf = G.oroom[BILLS - 1] !== 0 && G.oroom[PORTR - 1] !== 0;
      return 0;

    case 8: { // C8 — Frobozz flag (MRGO)
      G.frobzf = false;
      if (G.mloc !== G.xroom1) {
        // Mirror not in way
        return G.xroom1;
      }
      if (G.prso === XNORTH || G.prso === XSOUTH) {
        // N-S movement
        G.xstrng = 814; // structure blocks
        if (G.mdir % 180 === 0) return 0; // mirror N-S, done
        // Mirror is E-W
        let ldir = G.mdir;
        if (G.prso === XSOUTH) ldir = 180;
        G.xstrng = 815;
        if ((ldir > 180 && !G.mr1f) || (ldir < 180 && !G.mr2f)) {
          G.xstrng = 816;
        }
        return 0;
      }
      if (G.mdir % 180 !== 0) {
        // Mirror not N-S
        let ldir = G.mdir;
        if (G.prso === XSOUTH) ldir = 180;
        G.xstrng = 815;
        if ((ldir > 180 && !G.mr1f) || (ldir < 180 && !G.mr2f)) {
          G.xstrng = 816;
        }
        return 0;
      }
      // Mirror is N-S, calc east room
      G.xroom1 = ((G.xroom1 - MRA) * 2) + MRAE;
      if (G.prso > XSOUTH) G.xroom1++; // SW/NW = west side
      return G.xroom1;
    }

    case 9: // C9 — Frobozz flag (MIRIN)
      if (mrhere(G, G.here) === 1) {
        if (G.mr1f) G.xstrng = 805; // broken
        G.frobzf = G.mropnf;
        return 0;
      }
      G.frobzf = false;
      G.xstrng = 817;
      return 0;

    case 10: { // C10 — Frobozz flag (mirror exit)
      G.frobzf = false;
      const ldir = Math.floor((G.prso - XNORTH) / XNORTH) * 45;
      if (G.mropnf && ((G.mdir + 270) % 360 === ldir || G.prso === XEXIT)) {
        G.xroom1 = ((G.mloc - MRA) * 2) + MRAE + 1 - Math.floor(G.mdir / 180);
        if (G.mdir % 180 === 0) {
          // N-S, ok
        } else {
          G.xroom1 = G.mloc + 1;
          if (G.mdir > 180) G.xroom1 = G.mloc - 1;
        }
        return G.xroom1;
      }
      if (G.wdopnf && ((G.mdir + 180) % 360 === ldir || G.prso === XEXIT)) {
        G.xroom1 = G.mloc + 1;
        if (G.mdir === 0) G.xroom1 = G.mloc - 1;
        rspeak(G, 818); // close door
        G.wdopnf = false;
        return G.xroom1;
      }
      return 0;
    }

    case 11: // C11 — Maybe door
      if (G.lcell !== 4) G.xstrng = 678;
      return 0;

    case 12: // C12 — Frobzf (puzzle room main entrance)
      G.frobzf = true;
      G.cphere = 10;
      return 0;

    case 13: // C13 — Cpoutf (puzzle room side entrance)
      G.cphere = 52;
      return 0;

    case 14: { // C14 — Frobzf (puzzle room transitions)
      G.frobzf = false;
      if (G.prso === XUP) {
        if (G.cphere !== 10) return 0;
        G.xstrng = 881; // no ladder
        if (G.cpvec[G.cphere] !== -2) return 0;
        rspeak(G, 882);
        G.frobzf = true;
        return 0;
      }
      if (G.cphere === 52 && G.prso === XWEST && G.cpoutf) {
        G.frobzf = true;
        return 0;
      }
      // Locate exit
      let di = -1;
      for (let i = 0; i < 16; i += 2) {
        if (G.prso === G.cpdr[i]) { di = i; break; }
      }
      if (di < 0) return 0; // no such exit
      const j = G.cpdr[di + 1];
      const nxt = G.cphere + j;
      let k = 8;
      if (j < 0) k = -8;
      if ((Math.abs(j) === 1 || Math.abs(j) === 8 ||
           (G.cpvec[G.cphere + k - 1] === 0 || G.cpvec[nxt - k - 1] === 0)) &&
          G.cpvec[nxt - 1] === 0) {
        cpgoto(G, nxt);
        G.xroom1 = CPUZZ;
        return G.xroom1;
      }
      return 0;
    }

    default:
      bug(G, 5, ri);
      return 0;
  }
}

// C5 helper — random carousel exit
function cxappl_c5(G) {
  const xelnt = [1, 2, 3, 3];
  const i = xelnt[XCOND - 1] * rnd(8);
  G.xroom1 = G.travel[G.rexit[G.here - 1] + i - 1] & XRMASK;
  return G.xroom1;
}

// ---------------------------------------------------------------
// WALK — Move in specified direction
// ---------------------------------------------------------------

function walk(G) {
  // Fortran .OR. does NOT short-circuit — prob() must always be called.
  const p = prob(G, 25, 25);
  if (G.winner !== PLAYER || lit(G, G.here) || p) {
    // Room is lit, or winner is not player (no grue)
    return walkLit(G);
  }

  // In the dark — check for grue
  if (!findxt(G, G.prso, G.here).found) {
    jigsup(G, 522); // grue!
    return true;
  }

  switch (G.xtype) {
    case 1: // XNORM
      if (lit(G, G.xroom1)) return walkGo(G);
      jigsup(G, 522);
      return true;
    case 2: // XNO
      jigsup(G, 523);
      return true;
    case 3: // XCOND
      if (cxappl(G, G.xactio) !== 0) {
        if (lit(G, G.xroom1)) return walkGo(G);
        jigsup(G, 522);
        return true;
      }
      if (getFlag(G, G.xobj)) {
        if (lit(G, G.xroom1)) return walkGo(G);
        jigsup(G, 522);
        return true;
      }
      jigsup(G, 523);
      return true;
    case 4: // XDOOR
      if (cxappl(G, G.xactio) !== 0) {
        if (lit(G, G.xroom1)) return walkGo(G);
        jigsup(G, 522);
        return true;
      }
      if (qopen(G, G.xobj)) {
        if (lit(G, G.xroom1)) return walkGo(G);
        jigsup(G, 522);
        return true;
      }
      jigsup(G, 523);
      return true;
    default:
      bug(G, 9, G.xtype);
      return true;
  }
}

function walkLit(G) {
  const fx = findxt(G, G.prso, G.here);
  if (!fx.found) {
    // No exit
    G.xstrng = 678; // wall
    if (G.prso === XUP) G.xstrng = 679;
    if (G.prso === XDOWN) G.xstrng = 680;
    if ((G.rflag[G.here - 1] & RNWALL) !== 0 && G.winner === PLAYER) {
      G.xstrng = 524;
    }
    rspeak(G, G.xstrng);
    G.prscon = 1;
    return true;
  }

  switch (G.xtype) {
    case 1: // XNORM
      return walkGo(G);
    case 2: { // XNO
      if (G.xstrng === 0) {
        // No reason, use standard
        G.xstrng = 678;
        if (G.prso === XUP) G.xstrng = 679;
        if (G.prso === XDOWN) G.xstrng = 680;
        if ((G.rflag[G.here - 1] & RNWALL) !== 0 && G.winner === PLAYER) {
          G.xstrng = 524;
        }
      }
      rspeak(G, G.xstrng);
      G.prscon = 1;
      return true;
    }
    case 3: { // XCOND
      if (cxappl(G, G.xactio) !== 0) return walkGo(G);
      if (getFlag(G, G.xobj)) return walkGo(G);
      if (G.xstrng === 0) {
        G.xstrng = 678;
        if (G.prso === XUP) G.xstrng = 679;
        if (G.prso === XDOWN) G.xstrng = 680;
        if ((G.rflag[G.here - 1] & RNWALL) !== 0 && G.winner === PLAYER) {
          G.xstrng = 524;
        }
      }
      rspeak(G, G.xstrng);
      G.prscon = 1;
      return true;
    }
    case 4: { // XDOOR
      if (cxappl(G, G.xactio) !== 0) return walkGo(G);
      if (qopen(G, G.xobj)) return walkGo(G);
      if (G.xstrng === 0) G.xstrng = 525;
      rspsub(G, G.xstrng, G.odesc2[G.xobj - 1]);
      G.prscon = 1;
      return true;
    }
    default:
      bug(G, 9, G.xtype);
      return true;
  }
}

function walkGo(G) {
  if (!moveto(G, G.xroom1, G.winner)) return true;
  rmdesc(G, 0);
  return true;
}

// ---------------------------------------------------------------
// TAKE — Basic take sequence
// ---------------------------------------------------------------

function take(G, flg) {
  // Star or nocheck object?
  if (G.prso > G.strbit || (G.oflag2[G.prso - 1] & NOCHBT) !== 0) {
    return objact(G);
  }

  let x = G.ocan[G.prso - 1]; // container

  // take x from ocan(x)?
  if (G.prsi !== 0 && G.prsi !== x) {
    rspeak(G, 1038); // not in that
    return false;
  }

  // His vehicle?
  if (G.prso === G.avehic[G.winner - 1]) {
    rspeak(G, 672);
    return false;
  }

  // Takeable?
  if ((G.oflag1[G.prso - 1] & TAKEBT) === 0) {
    if (!oappli(G, G.oactio[G.prso - 1], 0)) {
      rspeak(G, 552 + rnd(6));
    }
    return false;
  }

  // Object is takeable and in position to be taken
  if (x === 0 && !qhere(G, G.prso, G.here)) {
    let i = 103;
    if (G.winner !== PLAYER) i = 1080;
    if (G.oadv[G.prso - 1] === G.winner) rspeak(G, i); // already got it
    return false;
  }

  // Check weight
  if (x === 0 || G.oadv[x - 1] !== G.winner) {
    if (weighr(G, G.prso, G.winner) + G.osize[G.prso - 1] > G.mxload) {
      let i = 558;
      if (G.winner !== PLAYER) i = 1079;
      rspeak(G, i);
      G.prscon = 0;
      return false;
    }
  }

  // At last — take it
  if (oappli(G, G.oactio[G.prso - 1], 0)) return true;
  newsta(G, G.prso, 0, 0, 0, G.winner);
  G.oflag2[G.prso - 1] |= TCHBT;
  scrupd(G, G.ofval[G.prso - 1]);
  G.ofval[G.prso - 1] = 0;
  if (flg) rspeak(G, 559); // "Taken."
  return true;
}

// ---------------------------------------------------------------
// DROP — Drop verb processor (also throw, pour water)
// ---------------------------------------------------------------

function drop(G, flg) {
  // Nocheck?
  if ((G.oflag2[G.prso - 1] & NOCHBT) !== 0) {
    return objact(G);
  }

  let x = G.ocan[G.prso - 1];

  if (x !== 0) {
    // Inside something
    if (G.oadv[x - 1] !== G.winner) {
      let i = 527;
      if (G.winner !== PLAYER) i = 1078;
      rspeak(G, i);
      return true;
    }
    if ((G.oflag2[x - 1] & OPENBT) === 0) {
      rspsub(G, 525, G.odesc2[x - 1]);
      return true;
    }
    // Fall through to vehicle/room check
  } else {
    // Not inside, check if carrying
    if (G.oadv[G.prso - 1] !== G.winner) {
      let i = 527;
      if (G.winner !== PLAYER) i = 1078;
      rspeak(G, i);
      return true;
    }
  }

  // In vehicle?
  if (G.avehic[G.winner - 1] !== 0) {
    G.prsi = G.avehic[G.winner - 1];
    const f = put(G, true);
    G.prsi = 0;
    return true;
  }

  // Drop into room
  newsta(G, G.prso, 0, G.here, 0, 0);
  // Special: dropping from tree
  if (G.here === MTREE) newsta(G, G.prso, 0, FORE3, 0, 0);
  scrupd(G, G.ofval[G.prso - 1]);
  G.ofval[G.prso - 1] = 0;
  G.oflag2[G.prso - 1] |= TCHBT;

  if (objact(G)) return true;

  let i = 0;
  if (G.prsa === DROPW) i = 528;
  if (G.prsa === THROWW) i = 529;
  if (i !== 0 && G.here === MTREE) i = 659;
  rspsub(G, i, G.odesc2[G.prso - 1]);
  return true;
}

// ---------------------------------------------------------------
// PUT — Put verb processor
// ---------------------------------------------------------------

function put(G, flg) {
  // Nocheck?
  if ((G.oflag2[G.prso - 1] & NOCHBT) !== 0) {
    return objact(G);
  }

  // Star?
  if (G.prso > G.strbit || G.prsi > G.strbit) {
    if (!objact(G)) rspeak(G, 560);
    return true;
  }

  // Is it a valid container/vehicle?
  if (!qopen(G, G.prsi) &&
      (G.oflag1[G.prsi - 1] & (DOORBT + CONTBT)) === 0 &&
      (G.oflag2[G.prsi - 1] & VEHBT) === 0) {
    rspeak(G, 561); // can't put in that
    return false;
  }

  // Is it open?
  if (!qopen(G, G.prsi)) {
    rspeak(G, 562); // not open
    return false;
  }

  // Into itself?
  if (G.prso === G.prsi) {
    rspeak(G, 563);
    return false;
  }

  // Already inside?
  if (G.ocan[G.prso - 1] === G.prsi) {
    rspsb2(G, 564, G.odesc2[G.prso - 1], G.odesc2[G.prsi - 1]);
    return true;
  }

  // Check capacity
  if (weighr(G, G.prso, 0) + weighr(G, G.prsi, 0) + G.osize[G.prso - 1] >
      G.ocapac[G.prsi - 1]) {
    if (G.prsi === G.avehic[G.winner - 1]) {
      rspsub(G, 889, G.odesc2[G.prsi - 1]);
    } else {
      rspeak(G, 565);
    }
    return false;
  }

  // See if object (or its container) is in room
  let j = G.prso;
  while (j !== 0) {
    if (qhere(G, j, G.here)) {
      // Object is here — need to pick it up first
      if (G.prso !== WATER && G.prso !== GWATE) {
        const svo = G.prso;
        const svi = G.prsi;
        G.prsa = TAKEW;
        G.prsi = 0;
        if (!take(G, false)) return false;
        G.prsa = PUTW;
        G.prso = svo;
        G.prsi = svi;
      }
      // Fall through to put
      break;
    }
    j = G.ocan[j - 1];
    if (j === 0) break;
  }

  if (j === 0) {
    // Not in room, check if on person
    if (G.ocan[G.prso - 1] !== 0) {
      if (qopen(G, G.ocan[G.prso - 1])) {
        scrupd(G, G.ofval[G.prso - 1]);
        G.ofval[G.prso - 1] = 0;
        G.oflag2[G.prso - 1] |= TCHBT;
        newsta(G, G.prso, 0, 0, 0, G.winner);
      } else {
        rspsub(G, 566, G.odesc2[G.prso - 1]);
        return false;
      }
    }
  }

  // Give object a shot
  if (objact(G)) return true;
  newsta(G, G.prso, 2, 0, G.prsi, 0); // "Done." and contained inside
  return true;
}

// ---------------------------------------------------------------
// VALUAC — Handle collective objects (valuables, everything, possessions, bunch)
// ---------------------------------------------------------------

function qbunch(G, obj) {
  if (G.bunlnt === 0) return false;
  for (let i = 0; i < G.bunlnt; i++) {
    if (obj === G.bunvec[i]) return true;
  }
  return false;
}

function valuac(G, v) {
  const av = G.avehic[G.winner - 1];

  // Nohere check helper
  function nohere(r) {
    if (av === 0) return !qhere(G, r, G.here);
    return G.ocan[r - 1] !== av;
  }

  // Nothis check helper
  function nothis(r) {
    if (v === BUNOBJ && qbunch(G, r)) return true;
    if (G.otval[r - 1] <= 0 && (v === VALUA || (v === BUNOBJ && G.bunsub === VALUA))) return true;
    if (G.oadv[r - 1] !== G.winner && (v === POSSE || (v === BUNOBJ && G.bunsub === POSSE))) return true;
    return false;
  }

  // Count possessions
  if (G.prsa === COUNTW && G.prso === POSSE) {
    let k = 0;
    for (let j = 0; j < G.olnt; j++) {
      if (G.oadv[j] === G.winner) k++;
    }
    if (k === 1) {
      G.output(` You have ${k} possession.`);
    } else {
      G.output(` You have ${k} possessions.`);
    }
    G.telflg = true;
    return;
  }

  // Count valuables
  if (G.prsa === COUNTW && G.prso === VALUA) {
    let k = 0;
    let l = 0;
    for (let j = 0; j < G.olnt; j++) {
      if (G.oadv[j] === G.winner && G.otval[j] > 0) k++;
      if (G.ocan[j] === TCASE && G.otval[j] > 0) l++;
    }
    if (k === 1) {
      G.output(` You have ${k} valuable.`);
    } else {
      G.output(` You have ${k} valuables.`);
    }
    G.telflg = true;
    if (G.here !== LROOM) return;
    if (l === 1) {
      G.output(` Your adventure has netted ${l} treasure.`);
    } else {
      G.output(` Your adventure has netted ${l} treasures.`);
    }
    return;
  }

  // Take/Drop/Put
  const savep = G.prso;
  const saveh = G.here;
  let f = true;
  let i = 579; // assume not lit

  if (G.prsa === TAKEW) {
    // Take
    if (!lit(G, G.here)) { if (f) rspeak(G, i); G.prso = savep; G.bunsub = 0; return; }
    if (G.prso === BUNOBJ && G.bunsub === 0) {
      // Bunch with no except
      for (let bi = 0; bi < G.bunlnt; bi++) {
        G.prso = G.bunvec[bi];
        f = false;
        rspsub(G, 580, G.odesc2[G.prso - 1]);
        take(G, true);
        if (saveh !== G.here) { if (f) rspeak(G, i); G.prso = savep; G.bunsub = 0; return; }
      }
    } else {
      // Loop through all objects
      for (let obj = 1; obj <= G.olnt; obj++) {
        if (((G.oflag1[obj - 1] & TAKEBT) === 0 && (G.oflag2[obj - 1] & TRYBT) === 0) ||
            (G.oflag1[obj - 1] & VISIBT) === 0 ||
            (G.oflag2[obj - 1] & ACTRBT) !== 0 ||
            nothis(obj)) continue;
        if (nohere(obj)) {
          const jc = G.ocan[obj - 1];
          if (jc === 0 || obj === WATER) continue;
          if ((G.oflag2[jc - 1] & OPENBT) === 0 ||
              (nohere(jc) && G.oadv[jc - 1] !== G.winner)) continue;
        }
        G.prso = obj;
        f = false;
        rspsub(G, 580, G.odesc2[G.prso - 1]);
        take(G, true);
        if (saveh !== G.here) { if (f) rspeak(G, i); G.prso = savep; G.bunsub = 0; return; }
      }
    }
    // Clean up
    i = 581;
    if (savep === VALUA) i = 582;
    if (f) rspeak(G, i);
    G.prso = savep;
    G.bunsub = 0;
    return;
  }

  if (G.prsa === DROPW) {
    if (G.prso === BUNOBJ && G.bunsub === 0) {
      for (let bi = 0; bi < G.bunlnt; bi++) {
        G.prso = G.bunvec[bi];
        f = false;
        rspsub(G, 580, G.odesc2[G.prso - 1]);
        drop(G, true);
        if (saveh !== G.here) { if (f) rspeak(G, i); G.prso = savep; G.bunsub = 0; return; }
      }
    } else {
      for (let obj = 1; obj <= G.olnt; obj++) {
        if (G.oadv[obj - 1] !== G.winner || nothis(obj)) continue;
        G.prso = obj;
        f = false;
        rspsub(G, 580, G.odesc2[G.prso - 1]);
        drop(G, true);
        if (saveh !== G.here) { if (f) rspeak(G, i); G.prso = savep; G.bunsub = 0; return; }
      }
    }
    i = 581;
    if (savep === VALUA) i = 582;
    if (f) rspeak(G, i);
    G.prso = savep;
    G.bunsub = 0;
    return;
  }

  if (G.prsa === PUTW) {
    if (!lit(G, G.here)) { if (f) rspeak(G, i); G.prso = savep; G.bunsub = 0; return; }
    if (G.prso === BUNOBJ && G.bunsub === 0) {
      for (let bi = 0; bi < G.bunlnt; bi++) {
        G.prso = G.bunvec[bi];
        f = false;
        rspsub(G, 580, G.odesc2[G.prso - 1]);
        put(G, true);
        if (saveh !== G.here) { if (f) rspeak(G, i); G.prso = savep; G.bunsub = 0; return; }
      }
    } else {
      for (let obj = 1; obj <= G.olnt; obj++) {
        if ((G.oadv[obj - 1] !== G.winner &&
            (nohere(obj) || ((G.oflag1[obj - 1] & TAKEBT) === 0 && (G.oflag2[obj - 1] & TRYBT) === 0))) ||
            obj === G.prsi || nothis(obj) ||
            (G.oflag1[obj - 1] & VISIBT) === 0) continue;
        G.prso = obj;
        f = false;
        rspsub(G, 580, G.odesc2[G.prso - 1]);
        put(G, true);
        if (saveh !== G.here) { if (f) rspeak(G, i); G.prso = savep; G.bunsub = 0; return; }
      }
    }
    i = 581;
    if (savep === VALUA) i = 582;
    if (f) rspeak(G, i);
    G.prso = savep;
    G.bunsub = 0;
    return;
  }

  // Wrong verb
  i = 677;
  if (f) rspeak(G, i);
  G.prso = savep;
  G.bunsub = 0;
}

// ---------------------------------------------------------------
// VAPPLI — Main verb processing routine
// ---------------------------------------------------------------

export function vappli(G, ri) {
  let odo2 = 0;
  let odi2 = 0;
  if (G.prso !== 0 && G.prso <= OMAX) odo2 = G.odesc2[G.prso - 1];
  if (G.prsi !== 0) odi2 = G.odesc2[G.prsi - 1];
  const av = G.avehic[G.winner - 1];
  const rmk = 372 + rnd(6);

  if (ri === 0) return false;            // zero is false
  if (ri <= MXNOP) return true;          // nop
  if (ri <= MXJOKE) {                    // joke
    let i = JOKES[ri - MXNOP - 1];
    const j = Math.floor(i / 1000);
    if (j !== 0) i = (i % 1000) + rnd(j);
    rspeak(G, i);
    return true;
  }
  if (ri <= MXSMP) {
    // Simple verbs dispatch
    return simpleVerb(G, ri - MXJOKE, odo2, odi2, av, rmk);
  }

  // Complex verbs
  const waslit = lit(G, G.here);
  const verbIdx = ri - MXSMP;

  switch (verbIdx) {
    case 1: return v_read(G, odo2, odi2);           // V100 Read
    case 2: return v_melt(G, odo2, odi2);           // V101 Melt
    case 3: return v_inflate(G, odo2, odi2);        // V102 Inflate
    case 4: return v_deflate(G, odo2, odi2);        // V103 Deflate
    case 5: return v_alarm(G, odo2, odi2);          // V104 Alarm
    case 6: return v_exorcise(G);                   // V105 Exorcise
    case 7: return v_plug(G);                       // V106 Plug
    case 8: return v_kick(G, odo2, rmk);            // V107 Kick
    case 9: return v_wave(G, odo2, rmk);            // V108 Wave
    case 10: return v_raiselower(G, odo2, rmk);     // V109 Raise
    case 11: return v_raiselower(G, odo2, rmk);     // V110 Lower
    case 12: return v_rub(G, odo2, rmk);            // V111 Rub
    case 13: return v_push(G, odo2, rmk);           // V112 Push
    case 14: return v_untie(G, odo2);               // V113 Untie
    case 15: return v_tie(G, odo2, odi2);           // V114 Tie
    case 16: return v_tieup(G, odo2, odi2);         // V115 Tie up
    case 17: return v_turn(G, odo2, odi2);          // V116 Turn
    case 18: return v_breathe(G, odo2, odi2);       // V117 Breathe
    case 19: return v_knock(G, odo2);               // V118 Knock
    case 20: return v_look(G);                      // V119 Look
    case 21: return v_examine(G, odo2);             // V120 Examine
    case 22: return v_shake(G, odo2, av);           // V121 Shake
    case 23: return v_move(G, odo2);                // V122 Move
    case 24: return v_turnon(G, odo2);              // V123 Turn on
    case 25: return v_turnoff(G, odo2, waslit);     // V124 Turn off
    case 26: return v_open(G, odo2);                // V125 Open
    case 27: return v_close(G, odo2);               // V126 Close
    case 28: return v_find(G, odo2);                // V127 Find
    case 29: return v_wait(G);                      // V128 Wait
    case 30: return v_spin(G, odo2);                // V129 Spin
    case 31: return v_board(G, odo2, av);           // V130 Board
    case 32: return v_disembark(G, odo2, av);       // V131 Disembark
    case 33: { const r = take(G, true); return r; } // V132 Take
    case 34: { invent(G, G.winner); return true; }  // V133 Inventory
    case 35: return v_fill(G, odo2, odi2);          // V134 Fill
    case 36: return v_eat(G, odo2, odi2);           // V135 Eat
    case 37: return v_drink(G, odo2, odi2);         // V136 Drink
    case 38: return v_burn(G, odo2, odi2, av);      // V137 Burn
    case 39: return v_mung(G, odo2, rmk);           // V138 Mung
    case 40: return v_kill(G, odo2, odi2, rmk);     // V139 Kill
    case 41: return v_swing(G, odo2, odi2);         // V140 Swing
    case 42: return v_attack(G, odo2, odi2, rmk);   // V141 Attack
    case 43: { return walk(G); }                    // V142 Walk
    case 44: { rspeak(G, 603); G.prscon = 0; return true; } // V143 Tell
    case 45: { return put(G, true); }               // V144 Put
    case 46: { return drop(G, true); }              // V145 Drop
    case 47: return v_give(G, odo2);                // V146 Give
    case 48: return v_pour(G, odo2);                // V147 Pour
    case 49: { return drop(G, true); }              // V148 Throw
    case 50: return v_save(G);                      // V149 Save
    case 51: return v_restore(G);                   // V150 Restore
    case 52: return v_hello(G, odo2);               // V151 Hello
    case 53: return v_lookinto(G, odo2);            // V152 Look into
    case 54: return v_lookunder(G);                 // V153 Look under
    case 55: return v_pump(G);                      // V154 Pump
    case 56: return v_wind(G, odo2);                // V155 Wind
    case 57: return v_climb(G, odo2);               // V156 Climb
    case 58: return v_climb(G, odo2);               // V157 Climb up
    case 59: return v_climb(G, odo2);               // V158 Climb down
    case 60: return v_spin(G, odo2);                // V159 Turn to (same as spin)
    case 61: return v_pouron(G, odo2, odi2, waslit); // V160 Pour on
    case 62: return v_putunder(G, odo2);            // V161 Put under
    case 63: return v_untiefrom(G, odo2);           // V162 Untie from
    case 64: return v_make(G, odo2);                // V163 Make
    case 65: return v_oil(G, odo2);                 // V164 Oil
    case 66: return v_play(G, odo2, odi2);          // V165 Play
    case 67: return v_send(G, odo2);                // V166 Send
    case 68: return v_enter(G);                     // V167 Enter
    case 69: return v_leave(G);                     // V168 Leave
    case 70: return v_wish(G);                      // V169 Wish
    default:
      bug(G, 7, ri);
      return false;
  }
}

// ---------------------------------------------------------------
// Simple verb dispatch (V65–V97)
// ---------------------------------------------------------------

function simpleVerb(G, idx, odo2, odi2, av, rmk) {
  switch (idx) {
    case 1:  return v_room(G);              // V65 Room
    case 2:  return v_objects(G);           // V66 Objects
    case 3:  return v_rname(G);             // V67 Rname
    case 4:  return v_squeeze(G, odo2);     // V68 Squeeze
    case 5:  return v_smell(G, odo2);       // V69 Smell
    case 6:  return v_brief(G);             // V70 Brief
    case 7:  return v_verbose(G);           // V71 Verbose
    case 8:  return v_superbrief(G);        // V72 Superbrief
    case 9:  return v_stay(G);              // V73 Stay
    case 10: return v_version(G);           // V74 Version
    case 11: return v_swim(G);              // V75 Swim
    case 12: return v_geronimo(G, av);      // V76 Geronimo
    case 13: return v_sinbad(G);            // V77 Sinbad
    case 14: return false;                  // V78 unused
    case 15: return v_pray(G);             // V79 Pray
    case 16: return v_treasure(G);         // V80 Treasure
    case 17: return v_temple(G);           // V81 Temple
    case 18: return v_blast(G);            // V82 Blast
    case 19: { score(G, false); return true; } // V83 Score
    case 20: return v_quit(G);             // V84 Quit
    case 21: return v_follow(G, odo2);     // V85 Follow
    case 22: return v_walkthrough(G, odo2); // V86 Walk through
    case 23: return v_ring(G);             // V87 Ring
    case 24: return v_brush(G, odo2, odi2); // V88 Brush
    case 25: return v_dig(G, odo2, odi2);  // V89 Dig
    case 26: return v_time(G);             // V90 Time
    case 27: return v_leap(G, odo2);       // V91 Leap
    case 28: return v_lock(G);             // V92 Lock
    case 29: return v_unlock(G, odi2);     // V93 Unlock
    case 30: return v_diagnose(G);         // V94 Diagnose
    case 31: return v_incant(G);           // V95 Incant
    case 32: return v_answer(G);           // V96 Answer
    case 33: return v_count(G, odo2);      // V97 Count
    default:
      bug(G, 7, idx + MXJOKE);
      return false;
  }
}

// ---------------------------------------------------------------
// Individual verb handlers
// ---------------------------------------------------------------

// V100 — Read
function v_read(G, odo2, odi2) {
  if (!lit(G, G.here)) { rspeak(G, 356); return true; }
  if (G.prsi !== 0) {
    if ((G.oflag1[G.prsi - 1] & TRANBT) === 0) {
      rspsub(G, 357, odi2);
      return true;
    }
  }
  if (objact(G)) return true;
  if ((G.oflag1[G.prso - 1] & READBT) !== 0) {
    rspeak(G, G.oread[G.prso - 1]);
    return true;
  }
  rspsub(G, 358, odo2);
  return true;
}

// V101 — Melt
function v_melt(G, odo2, odi2) {
  if (!objact(G)) rspsub(G, 361, odo2);
  return true;
}

// V102 — Inflate
function v_inflate(G, odo2, odi2) {
  if ((G.oflag1[G.prsi - 1] & TOOLBT) !== 0) {
    if (!objact(G)) rspeak(G, 368);
    return true;
  }
  rspsub(G, 301, odi2);
  return true;
}

// V103 — Deflate
function v_deflate(G, odo2, odi2) {
  if (!objact(G)) rspeak(G, 369);
  return true;
}

// V104 — Alarm
function v_alarm(G, odo2, odi2) {
  if ((G.oflag2[G.prso - 1] & VILLBT) !== 0) {
    if (!objact(G)) rspsub(G, 370, odo2);
    return true;
  }
  rspeak(G, 552 + rnd(6));
  return true;
}

// V105 — Exorcise
function v_exorcise(G) {
  objact(G);
  return true;
}

// V106 — Plug
function v_plug(G) {
  if (!objact(G)) rspeak(G, 371);
  return true;
}

// V107 — Kick
function v_kick(G, odo2, rmk) {
  if (!objact(G)) rspsb2(G, 378, odo2, rmk);
  return true;
}

// V108 — Wave
function v_wave(G, odo2, rmk) {
  if (!objact(G)) rspsb2(G, 379, odo2, rmk);
  return true;
}

// V109/V110 — Raise/Lower
function v_raiselower(G, odo2, rmk) {
  if (!objact(G)) rspsb2(G, 380, odo2, rmk);
  return true;
}

// V111 — Rub
function v_rub(G, odo2, rmk) {
  if (!objact(G)) rspsb2(G, 381, odo2, rmk);
  return true;
}

// V112 — Push
function v_push(G, odo2, rmk) {
  if (!objact(G)) rspsb2(G, 382, odo2, rmk);
  return true;
}

// V113 — Untie
function v_untie(G, odo2) {
  if (objact(G)) return true;
  let i = 383;
  if ((G.oflag2[G.prso - 1] & TIEBT) === 0) i = 384;
  rspeak(G, i);
  return true;
}

// V114 — Tie
function v_tie(G, odo2, odi2) {
  if ((G.oflag2[G.prso - 1] & TIEBT) === 0) {
    rspeak(G, 385);
    return true;
  }
  if (objact(G)) return true;
  let i = 386;
  if (G.prsi === OPLAY) i = 919;
  rspsub(G, 386, odo2);
  return true;
}

// V115 — Tie up
function v_tieup(G, odo2, odi2) {
  if ((G.oflag2[G.prsi - 1] & TIEBT) === 0) {
    rspsub(G, 387, odo2);
    return true;
  }
  let i = 388;
  if ((G.oflag2[G.prso - 1] & VILLBT) === 0) i = 389;
  rspsub(G, i, odo2);
  return true;
}

// V116 — Turn
function v_turn(G, odo2, odi2) {
  if ((G.oflag1[G.prso - 1] & TURNBT) === 0) {
    rspeak(G, 390);
    return true;
  }
  if ((G.oflag1[G.prsi - 1] & TOOLBT) === 0) {
    rspsub(G, 391, odi2);
    return true;
  }
  return objact(G);
}

// V117 — Breathe
function v_breathe(G, odo2, odi2) {
  G.prsa = INFLAW;
  G.prsi = LUNGS;
  return v_inflate(G, odo2, G.odesc2[LUNGS - 1]);
}

// V118 — Knock
function v_knock(G, odo2) {
  if (objact(G)) return true;
  let i = 394;
  if ((G.oflag1[G.prso - 1] & DOORBT) === 0) i = 395;
  rspsub(G, i, odo2);
  return true;
}

// V119 — Look
function v_look(G) {
  if (G.prso !== 0) return v_lookexamine(G);
  rmdesc(G, 3);
  return true;
}

// V120 — Examine
function v_examine(G, odo2) {
  if (G.prso !== 0) return v_lookexamine(G);
  rmdesc(G, 0);
  return true;
}

// Common look/examine at object
function v_lookexamine(G) {
  if (objact(G)) return true;
  const i = G.oread[G.prso - 1];
  if (i !== 0) rspeak(G, i);
  if (i === 0) rspsub(G, 429, G.odesc2[G.prso - 1]);
  G.prsa = FOOW; // defuse room processors
  return true;
}

// V121 — Shake
function v_shake(G, odo2, av) {
  if (objact(G)) return true;
  if (G.prso === GWATE) return false; // global water fails
  if ((G.oflag2[G.prso - 1] & VILLBT) !== 0) {
    rspeak(G, 371);
    return true;
  }
  if (G.prso === av) {
    rspeak(G, 672);
    return true;
  }
  if ((G.oflag1[G.prso - 1] & TAKEBT) === 0) {
    rspeak(G, 923);
    return true;
  }
  if (G.oadv[G.prso - 1] !== G.winner) {
    rspeak(G, 527);
    return true;
  }
  if (qempty(G, G.prso)) return false;
  if (qopen(G, G.prso)) {
    // Spill the works
    rspsub(G, 397, odo2);
    for (let i = 1; i <= G.olnt; i++) {
      if (G.ocan[i - 1] !== G.prso) continue;
      G.oflag2[i - 1] |= TCHBT;
      if (av !== 0) {
        newsta(G, i, 0, 0, av, 0);
      } else {
        newsta(G, i, 0, G.here, 0, 0);
        if (i === WATER) newsta(G, i, 133, 0, 0, 0);
      }
    }
    return true;
  }
  rspsub(G, 396, odo2); // describe noise
  return true;
}

// V122 — Move
function v_move(G, odo2) {
  if (!qhere(G, G.prso, G.here)) {
    rspeak(G, 398);
    return true;
  }
  if (objact(G)) return true;
  let i = 399;
  if ((G.oflag1[G.prso - 1] & TAKEBT) !== 0) i = 887;
  rspsub(G, i, odo2);
  return true;
}

// V123 — Turn on
function v_turnon(G, odo2) {
  if (objact(G)) return true;
  if ((G.oflag1[G.prso - 1] & LITEBT) === 0 || G.oadv[G.prso - 1] !== G.winner) {
    rspeak(G, 400);
    return true;
  }
  if ((G.oflag1[G.prso - 1] & ONBT) !== 0) {
    rspeak(G, 401);
    return true;
  }
  G.oflag1[G.prso - 1] |= ONBT;
  rspsub(G, 404, odo2);
  return true;
}

// V124 — Turn off
function v_turnoff(G, odo2, waslit) {
  if (objact(G)) return true;
  if ((G.oflag1[G.prso - 1] & LITEBT) === 0 || G.oadv[G.prso - 1] !== G.winner) {
    rspeak(G, 402);
    return true;
  }
  if ((G.oflag1[G.prso - 1] & ONBT) === 0) {
    rspeak(G, 403);
    return true;
  }
  G.oflag1[G.prso - 1] &= ~ONBT;
  rspsub(G, 405, odo2);
  if (waslit && !lit(G, G.here)) rspeak(G, 406);
  return true;
}

// V125 — Open
function v_open(G, odo2) {
  if (objact(G)) return true;
  if ((G.oflag1[G.prso - 1] & DOORBT) !== 0) {
    rspsub(G, 408, odo2);
    return true;
  }
  if ((G.oflag1[G.prso - 1] & CONTBT) === 0) {
    rspsub(G, 407, odo2);
    return true;
  }
  if (G.ocapac[G.prso - 1] === 0) {
    rspsub(G, 408, odo2);
    return true;
  }
  if (qopen(G, G.prso)) {
    rspeak(G, 412);
    return true;
  }
  G.oflag2[G.prso - 1] |= OPENBT;
  if ((G.oflag1[G.prso - 1] & TRANBT) !== 0 || qempty(G, G.prso)) {
    rspeak(G, 409);
    return true;
  }
  princo(G, G.prso, 410, false);
  return true;
}

// V126 — Close
function v_close(G, odo2) {
  if (objact(G)) return true;
  if ((G.oflag1[G.prso - 1] & DOORBT) !== 0) {
    rspsub(G, 411, odo2);
    return true;
  }
  if ((G.oflag1[G.prso - 1] & CONTBT) === 0) {
    rspsub(G, 407, odo2);
    return true;
  }
  if (G.ocapac[G.prso - 1] === 0) {
    rspsub(G, 411, odo2);
    return true;
  }
  if (!qopen(G, G.prso)) {
    rspeak(G, 413);
    return true;
  }
  G.oflag2[G.prso - 1] &= ~OPENBT;
  rspeak(G, 414);
  // Note: Fortran checks light after close (GO TO 50)
  // We return true and rely on the main loop to check
  return true;
}

// V127 — Find
function v_find(G, odo2) {
  if (objact(G)) return true;
  if (qhere(G, G.prso, G.here)) {
    rspsub(G, 415, odo2);
    return true;
  }
  if (G.oadv[G.prso - 1] === G.winner) {
    rspsub(G, 416, odo2);
    return true;
  }
  const j = G.ocan[G.prso - 1];
  if (j === 0) return false;
  if ((G.oflag1[j - 1] & TRANBT) === 0 &&
      (!qopen(G, j) || (G.oflag1[j - 1] & (DOORBT + CONTBT)) === 0)) {
    return false;
  }
  if (qhere(G, j, G.here)) {
    rspsub(G, 417, G.odesc2[j - 1]);
    return true;
  }
  if (G.oadv[j - 1] === G.winner) {
    rspsub(G, 418, G.odesc2[j - 1]);
    return true;
  }
  return false;
}

// V128 — Wait
function v_wait(G) {
  rspeak(G, 419);
  for (let i = 0; i < 3; i++) {
    if (clockd(G)) return true;
    if (!G.deadf) fightd(G);
    if (G.prscon === 0) return true;
  }
  return true;
}

// V129/V159 — Spin / Turn to
function v_spin(G, odo2) {
  if (objact(G)) return true;
  if ((G.oflag1[G.prso - 1] & TURNBT) !== 0) {
    rspsub(G, 663, odo2);
    return true;
  }
  rspeak(G, 390);
  return true;
}

// V130 — Board
function v_board(G, odo2, av) {
  if ((G.oflag2[G.prso - 1] & VEHBT) === 0) {
    rspsub(G, 421, odo2);
    G.prscon = 0;
    return true;
  }
  if (!qhere(G, G.prso, G.here)) {
    rspsub(G, 420, odo2);
    G.prscon = 0;
    return true;
  }
  if (av !== 0) {
    rspsub(G, 422, odo2);
    G.prscon = 0;
    return true;
  }
  if (objact(G)) return true;
  rspsub(G, 423, odo2);
  G.avehic[G.winner - 1] = G.prso;
  if (G.winner !== PLAYER) newsta(G, G.aobj[G.winner - 1], 0, 0, G.prso, 0);
  return true;
}

// V131 — Disembark
function v_disembark(G, odo2, av) {
  if (av !== G.prso) {
    rspeak(G, 424);
    G.prscon = 0;
    return true;
  }
  if (objact(G)) return true;
  if ((G.rflag[G.here - 1] & RLAND) === 0) {
    rspeak(G, 425);
    G.prscon = 0;
    return true;
  }
  G.avehic[G.winner - 1] = 0;
  rspeak(G, 426);
  if (G.winner !== PLAYER) newsta(G, G.aobj[G.winner - 1], 0, G.here, 0, 0);
  return true;
}

// V134 — Fill
function v_fill(G, odo2, odi2) {
  if (G.prsi !== 0) {
    // fill x with y => put y in x
    G.prsa = PUTW;
    const i = G.prso;
    G.prso = G.prsi;
    G.prsi = i;
    return put(G, true);
  }
  if ((G.rflag[G.here - 1] & (RWATER + RFILL)) !== 0) {
    G.prsi = GWATE;
    G.prsa = PUTW;
    const i = G.prso;
    G.prso = G.prsi;
    G.prsi = i;
    return put(G, true);
  }
  rspeak(G, 516);
  G.prswon = false;
  // Orphan: fill obj with ...
  // In JS we just set prscon to 0 instead of calling ORPHAN
  G.prscon = 0;
  return false;
}

// V135/V136 — Eat / Drink
function v_eat(G, odo2, odi2) {
  return v_eatdrink(G, odo2, odi2);
}

function v_drink(G, odo2, odi2) {
  return v_eatdrink(G, odo2, odi2);
}

function v_eatdrink(G, odo2, odi2) {
  if (objact(G)) return true;
  if (G.prso === GWATE) {
    // Drink global water
    newsta(G, G.prso, 458, 0, 0, 0);
    return true;
  }
  if (edible(G, G.prso)) {
    if (G.oadv[G.prso - 1] !== G.winner) {
      rspsub(G, 454, odo2);
      return true;
    }
    if (G.prsa === DRINKW) {
      rspeak(G, 456);
      return true;
    }
    newsta(G, G.prso, 455, 0, 0, 0);
    return true;
  }
  if (drkble(G, G.prso)) {
    if (G.ocan[G.prso - 1] === 0) {
      rspsub(G, 454, odo2);
      return true;
    }
    if (G.oadv[G.ocan[G.prso - 1] - 1] !== G.winner) {
      rspsub(G, 454, odo2);
      return true;
    }
    if (qopen(G, G.ocan[G.prso - 1])) {
      newsta(G, G.prso, 458, 0, 0, 0);
      return true;
    }
    rspeak(G, 457);
    return true;
  }
  rspsub(G, 453, odo2);
  return true;
}

// V137 — Burn
function v_burn(G, odo2, odi2, av) {
  if ((G.oflag1[G.prsi - 1] & (FLAMBT + LITEBT + ONBT)) !== (FLAMBT + LITEBT + ONBT)) {
    rspsub(G, 301, odi2);
    return true;
  }
  if (objact(G)) return true;
  if ((G.oflag1[G.prso - 1] & BURNBT) === 0) {
    rspsub(G, 463, odo2);
    return true;
  }
  if (G.oadv[G.prso - 1] === G.winner) {
    rspsub(G, 459, odo2);
    jigsup(G, 460);
    return true;
  }
  if (qhere(G, G.prso, G.here)) {
    rspsub(G, 462, odo2);
    newsta(G, G.prso, 0, 0, 0, 0);
    return true;
  }
  const j = G.ocan[G.prso - 1];
  if (j === 0) {
    rspeak(G, 461);
    return true;
  }
  if (!qopen(G, j)) {
    rspeak(G, 461);
    return true;
  }
  if (j === RECEP) {
    return oappli(G, G.oactio[BALLO - 1], 0);
  }
  if (G.oadv[j - 1] === G.winner) {
    rspsub(G, 459, odo2);
    jigsup(G, 460);
    return true;
  }
  if (qhere(G, j, G.here)) {
    rspsub(G, 462, odo2);
    newsta(G, G.prso, 0, 0, 0, 0);
    return true;
  }
  rspeak(G, 461);
  return true;
}

// V138 — Mung
function v_mung(G, odo2, rmk) {
  const i = 466;
  if ((G.oflag2[G.prso - 1] & VILLBT) !== 0) {
    return v_attackCommon(G, i, odo2, G.odesc2[G.prsi > 0 ? G.prsi - 1 : 0], rmk);
  }
  if (!objact(G)) rspsb2(G, 466, odo2, rmk);
  return true;
}

// V139 — Kill
function v_kill(G, odo2, odi2, rmk) {
  return v_attackCommon(G, 467, odo2, odi2, rmk);
}

// V140 — Swing
function v_swing(G, odo2, odi2) {
  // Invert prso/prsi
  const j = G.prso;
  G.prso = G.prsi;
  G.prsi = j;
  const jd = odo2;
  odo2 = odi2;
  odi2 = jd;
  G.prsa = ATTACW;
  const rmk = 372 + rnd(6);
  return v_attackCommon(G, 468, odo2, odi2, rmk);
}

// V141 — Attack
function v_attack(G, odo2, odi2, rmk) {
  return v_attackCommon(G, 468, odo2, odi2, rmk);
}

// Common mung/attack/swing/kill code
function v_attackCommon(G, i, odo2, odi2, rmk) {
  if (G.prso === 0) {
    rspeak(G, 469);
    return true;
  }
  if (objact(G)) return true;
  if ((G.oflag2[G.prso - 1] & VILLBT) === 0) {
    if ((G.oflag1[G.prso - 1] & VICTBT) === 0) {
      rspsub(G, 470, odo2);
    }
    return true;
  }
  let j = 471; // no weapon
  if (G.prsi === 0) {
    rspsb2(G, i, odo2, j);
    return true;
  }
  if ((G.oflag2[G.prsi - 1] & WEAPBT) === 0) {
    j = 472;
    rspsb2(G, i, odo2, j);
    return true;
  }
  // Strike blow — call blow function
  // blow(G, PLAYER, G.prso, melee, true, 0)
  let melee = 1; // assume sword
  if (G.prsi !== SWORD) melee = 2;
  blow(G, PLAYER, G.prso, melee, true, 0);
  return true;
}

// BLOW — Strike a blow (simplified stub that delegates to support.js blow if available)
function blow(G, h, v, rmk, hflg, out) {
  // The blow function is in timefnc.f/fights.c
  // Since it's not yet ported, we provide a basic combat implementation
  if (typeof G._blow === 'function') {
    return G._blow(h, v, rmk, hflg, out);
  }
  // Fallback: basic combat
  const def = G.ocapac[v - 1]; // villain strength
  const off = fights(G, h, true);
  if (off <= 0) {
    rspeak(G, 476); // can't fight
    return 0;
  }
  // Simple probability-based combat
  if (prob(G, 50 + (off - def) * 10, 30 + (off - def) * 10)) {
    // Hit!
    G.ocapac[v - 1]--;
    if (G.ocapac[v - 1] <= 0) {
      rspsub(G, 1140, G.odesc2[v - 1]); // try to say "killed"
      newsta(G, v, 0, 0, 0, 0);
      G.oflag2[v - 1] &= ~FITEBT;
      return -1; // killed
    }
    rspeak(G, 511 + rnd(4)); // generic hit messages
    return 1;
  }
  // Miss
  rspeak(G, 515 + rnd(4)); // generic miss messages
  return 0;
}

// V146 — Give
function v_give(G, odo2) {
  if (G.oadv[G.prso - 1] === G.winner) {
    return objact(G);
  }
  const x = G.ocan[G.prso - 1];
  if (x !== 0 && qopen(G, x) && G.oadv[x - 1] === G.winner) {
    return objact(G);
  }
  rspeak(G, 527);
  return true;
}

// V147 — Pour
function v_pour(G, odo2) {
  if (G.prso !== WATER) {
    rspeak(G, 1075);
    return true;
  }
  if (G.prsi === 0) {
    return drop(G, true);
  }
  G.prsa = PUTW;
  return put(G, true);
}

// V149 — Save
function v_save(G) {
  if ((G.rflag[TSTRS - 1] & RSEEN) !== 0) {
    rspeak(G, 828);
    return true;
  }
  if (typeof G.doSave === 'function') {
    G.doSave();
    rspeak(G, 597); // "Saved."
  } else {
    G.output(' Save unavailable.');
  }
  G.prswon = false;
  G.prscon = 0;
  return true;
}

// V150 — Restore
function v_restore(G) {
  if ((G.rflag[TSTRS - 1] & RSEEN) !== 0) {
    rspeak(G, 829);
    return true;
  }
  if (typeof G.doRestore === 'function' && G.doRestore()) {
    G.output('Saved game restored.');
    rmdesc(G, 3);
  } else {
    rspeak(G, 598); // "Can't do it."
  }
  G.prswon = false;
  G.prscon = 0;
  return true;
}

// V151 — Hello
function v_hello(G, odo2) {
  if (G.prso === 0) {
    rspeak(G, 346 + rnd(4));
    return true;
  }
  if (G.prso === AVIAT) {
    rspeak(G, 350);
    return true;
  }
  if (G.prso === SAILO) {
    G.hs++;
    let i = 351;
    if (G.hs % 10 === 0) i = 352;
    if (G.hs % 20 === 0) i = 353;
    rspeak(G, i);
    return true;
  }
  if (objact(G)) return true;
  let i = 354;
  if ((G.oflag2[G.prso - 1] & (VILLBT + ACTRBT)) === 0) i = 355;
  rspsub(G, i, odo2);
  return true;
}

// V152 — Look into
function v_lookinto(G, odo2) {
  if (objact(G)) return true;
  if ((G.oflag1[G.prso - 1] & DOORBT) !== 0) {
    if (qopen(G, G.prso)) {
      rspsub(G, 628, odo2);
    } else {
      rspsub(G, 525, odo2);
    }
    return true;
  }
  if ((G.oflag1[G.prso - 1] & CONTBT) !== 0) {
    if (qopen(G, G.prso) || (G.oflag1[G.prso - 1] & TRANBT) !== 0) {
      if (qempty(G, G.prso)) {
        rspsub(G, 629, odo2);
      } else {
        princo(G, G.prso, 573, true);
      }
    } else {
      rspsub(G, 525, odo2);
    }
    return true;
  }
  if (qopen(G, G.prso)) {
    if (qempty(G, G.prso)) {
      rspsub(G, 1054, odo2);
    } else {
      princo(G, G.prso, 573, true);
    }
    return true;
  }
  rspsub(G, 630, odo2);
  return true;
}

// V153 — Look under
function v_lookunder(G) {
  if (!objact(G)) rspeak(G, 631);
  return true;
}

// V154 — Pump
function v_pump(G) {
  if (G.oroom[PUMP - 1] !== G.here && G.oadv[PUMP - 1] !== G.winner) {
    rspeak(G, 632);
    return true;
  }
  G.prsi = PUMP;
  G.prsa = INFLAW;
  return v_inflate(G, G.odesc2[G.prso - 1], G.odesc2[PUMP - 1]);
}

// V155 — Wind
function v_wind(G, odo2) {
  if (!objact(G)) rspsub(G, 634, odo2);
  return true;
}

// V156/V157/V158 — Climb / Climb up / Climb down
function v_climb(G, odo2) {
  if (objact(G)) return true;
  let dir = XUP;
  if (G.prsa === CLMBDW) dir = XDOWN;
  const f = (G.oflag2[G.prso - 1] & CLMBBT) !== 0;
  if (f && findxt(G, dir, G.here).found) {
    G.prsa = WALKW;
    G.prso = dir;
    return walk(G);
  }
  let i = 657;
  if (f) i = 524;
  if (!f && (G.prso === WALL || G.prso === GRWAL ||
             (G.prso >= WNORT && G.prso <= WNORT + 3))) {
    i = 656;
  }
  rspeak(G, i);
  return true;
}

// V160 — Pour on
function v_pouron(G, odo2, odi2, waslit) {
  if (G.prso !== WATER) {
    rspeak(G, 981);
    return true;
  }
  if (objact(G)) return true;
  newsta(G, WATER, 0, 0, 0, 0); // vanish water
  if (G.ocan[G.prsi - 1] === RECEP) {
    rspsub(G, 977, odi2);
    return true;
  }
  if ((G.oflag1[G.prsi - 1] & (LITEBT + FLAMBT + ONBT)) === (LITEBT + FLAMBT + ONBT)) {
    if (G.prsi === TORCH) {
      rspeak(G, 978);
      return true;
    }
    G.oflag1[G.prsi - 1] &= ~ONBT;
    rspsub(G, 979, odi2);
    if (G.prsi === CANDL) G.cflag[CEVCND - 1] = false;
    if (G.prsi === MATCH) G.ctick[CEVMAT - 1] = 0;
    if (waslit && !lit(G, G.here)) rspeak(G, 406);
    return true;
  }
  rspsub(G, 980, odi2);
  return true;
}

// V161 — Put under
function v_putunder(G, odo2) {
  if (objact(G)) return true;
  let i = 1037;
  if ((G.oflag1[G.prso - 1] & DOORBT) !== 0) i = 982;
  rspeak(G, i);
  return true;
}

// V162 — Untie from
function v_untiefrom(G, odo2) {
  if ((G.prso === BROPE && G.btief !== 0) ||
      (G.prso === ROPE && G.ttie === G.prsi) ||
      (G.prso === ROPE && G.prsi === RAILI && G.domef)) {
    G.prsa = UNTIEW;
    return v_untie(G, odo2);
  }
  rspeak(G, 1070);
  return true;
}

// V163 — Make / V169 — Wish
function v_make(G, odo2) {
  if (G.prso !== GWISH) return false;
  return v_wish(G);
}

function v_wish(G) {
  if (G.here !== BWELL) {
    rspeak(G, 937);
    return true;
  }
  if (G.oroom[BAGCO - 1] === G.here) {
    newsta(G, BAGCO, 938, 0, 0, 0);
    return true;
  }
  if (G.oroom[ZORKM - 1] === G.here) {
    newsta(G, ZORKM, 938, 0, 0, 0);
    return true;
  }
  rspeak(G, 937);
  return true;
}

// V164 — Oil
function v_oil(G, odo2) {
  if (G.prsi === PUTTY) {
    if (objact(G)) return true;
    rspeak(G, 904);
    return true;
  }
  rspeak(G, 905);
  return true;
}

// V165 — Play
function v_play(G, odo2, odi2) {
  if (G.prso === STRAD) {
    if (G.prsi !== 0 && (G.oflag2[G.prsi - 1] & WEAPBT) !== 0) {
      G.otval[STRAD - 1] = 0;
      rspeak(G, 933);
      return true;
    }
    rspeak(G, 934);
    return true;
  }
  if ((G.oflag2[G.prso - 1] & VILLBT) === 0) return false;
  rspsub(G, 935, odo2);
  jigsup(G, 0);
  return true;
}

// V166 — Send
function v_send(G, odo2) {
  if (objact(G)) return true;
  let i = 940;
  if ((G.oflag2[G.prso - 1] & VILLBT) !== 0) i = 941;
  rspsub(G, i, odo2);
  return true;
}

// V167 — Enter
function v_enter(G) {
  G.prsa = WALKW;
  G.prso = XENTER;
  return walk(G);
}

// V168 — Leave
function v_leave(G) {
  G.prsa = WALKW;
  G.prso = XEXIT;
  return walk(G);
}

// V65 — Room
function v_room(G) {
  rmdesc(G, 2);
  return true;
}

// V66 — Objects
function v_objects(G) {
  rmdesc(G, 1);
  if (!G.telflg) rspeak(G, 138);
  return true;
}

// V67 — Rname
function v_rname(G) {
  rspeak(G, G.rdesc2 - G.here);
  return true;
}

// V68 — Squeeze
function v_squeeze(G, odo2) {
  if (objact(G)) return true;
  let i = 901;
  if ((G.oflag2[G.prso - 1] & VILLBT) !== 0) i = 902;
  rspsub(G, i, odo2);
  return true;
}

// V69 — Smell
function v_smell(G, odo2) {
  rspsub(G, 903, odo2);
  return true;
}

// V70 — Brief
function v_brief(G) {
  G.brieff = true;
  G.superf = false;
  rspeak(G, 326);
  return true;
}

// V71 — Verbose
function v_verbose(G) {
  G.brieff = false;
  G.superf = false;
  rspeak(G, 327);
  return true;
}

// V72 — Superbrief
function v_superbrief(G) {
  G.superf = true;
  rspeak(G, 328);
  return true;
}

// V73 — Stay
function v_stay(G) {
  if (G.winner === AMASTR) {
    rspeak(G, 781);
    G.ctick[CEVFOL - 1] = 0;
    return true;
  }
  if (G.winner === PLAYER) rspeak(G, 664);
  return true;
}

// V74 — Version
function v_version(G) {
  G.output(` V${G.vmaj}.${G.vmin}${G.vedit || ''}`);
  G.telflg = true;
  return true;
}

// V75 — Swim
function v_swim(G) {
  let i = 330;
  if ((G.rflag[G.here - 1] & (RWATER + RFILL)) === 0) {
    i = 331 + rnd(3);
  }
  rspeak(G, i);
  return true;
}

// V76 — Geronimo
function v_geronimo(G, av) {
  if (av === BARRE) {
    jigsup(G, 335);
    return true;
  }
  rspeak(G, 334);
  return true;
}

// V77 — Sinbad
function v_sinbad(G) {
  if (G.here === MCYCL && G.oroom[CYCLO - 1] === G.here) {
    newsta(G, CYCLO, 337, 0, 0, 0);
    G.cyclof = true;
    G.magicf = true;
    G.oflag2[CYCLO - 1] &= ~FITEBT;
    return true;
  }
  rspeak(G, 336);
  return true;
}

// V79 — Pray
function v_pray(G) {
  if (G.here !== TEMP2) {
    rspeak(G, 340);
    return true;
  }
  if (moveto(G, FORE1, G.winner)) {
    rmdesc(G, 3);
    return true;
  }
  rspeak(G, 340);
  return true;
}

// V80 — Treasure
function v_treasure(G) {
  if (G.here !== TEMP1) {
    rspeak(G, 341);
    return true;
  }
  if (moveto(G, TREAS, G.winner)) {
    rmdesc(G, 3);
    return true;
  }
  rspeak(G, 341);
  return true;
}

// V81 — Temple
function v_temple(G) {
  if (G.here !== TREAS) {
    rspeak(G, 341);
    return true;
  }
  if (moveto(G, TEMP1, G.winner)) {
    rmdesc(G, 3);
    return true;
  }
  rspeak(G, 341);
  return true;
}

// V82 — Blast
function v_blast(G) {
  let i = 342;
  if (G.prso === SAFE) i = 252;
  rspeak(G, i);
  return true;
}

// V84 — Quit
function v_quit(G) {
  score(G, true);
  // Async yesno not supported in synchronous vappli — just quit
  // In the full game, this would be: if (yesno(343, 10, 0)) G.gameOver = true;
  // For now, mark game over
  G.gameOver = true;
  return true;
}

// V85 — Follow
function v_follow(G, odo2) {
  if (G.winner === AMASTR) {
    rspeak(G, 782);
    G.cflag[CEVFOL - 1] = true;
    G.ctick[CEVFOL - 1] = -1;
    return true;
  }
  let i = 10;
  if (G.prso !== 0) {
    i = 964;
    if ((G.oflag2[G.prso - 1] & VILLBT) !== 0) i = 965;
  }
  rspeak(G, i);
  return true;
}

// V86 — Walk through
function v_walkthrough(G, odo2) {
  if (objact(G)) return true;

  // Screen of light
  if (G.scolrm !== 0 && (G.prso === SCOL ||
      (G.prso === WNORT && G.here === BKBOX))) {
    G.scolac = G.scolrm;
    G.prso = 0;
    G.cflag[CEVSCL - 1] = true;
    G.ctick[CEVSCL - 1] = 6;
    rspeak(G, 668);
    moveto(G, G.scolrm, G.winner);
    rmdesc(G, 0);
    return true;
  }

  // On other side of scol?
  if (G.here === G.scolac) {
    for (let i = 0; i < 12; i += 3) {
      if (G.scolwl[i] === G.here && G.scolwl[i + 1] === G.prso) {
        // Through scol wall
        G.prso = G.scolwl[i + 2];
        for (let j = 0; j < 8; j += 2) {
          if (G.prso === G.scoldr[j]) G.scolrm = G.scoldr[j + 1];
        }
        G.ctick[CEVSCL - 1] = 0;
        rspeak(G, 668);
        moveto(G, BKBOX, G.winner);
        rmdesc(G, 0);
        return true;
      }
    }
  }

  // Takeable?
  if ((G.oflag1[G.prso - 1] & TAKEBT) !== 0) {
    let i = 671;
    if (G.oroom[G.prso - 1] !== 0) i = 552 + rnd(6);
    rspeak(G, i);
    return true;
  }

  let i = 669;
  if (G.prso === SCOL) i = 670;
  rspsub(G, i, odo2);
  return true;
}

// V87 — Ring
function v_ring(G) {
  if (objact(G)) return true;
  let i = 359;
  if (G.prso === BELL) i = 360;
  rspeak(G, i);
  return true;
}

// V88 — Brush
function v_brush(G, odo2, odi2) {
  if (G.prso !== TEETH) {
    rspeak(G, 362);
    return true;
  }
  if (G.prsi === 0) {
    rspeak(G, 363);
    return true;
  }
  if (G.prsi === PUTTY && G.oadv[PUTTY - 1] === G.winner) {
    jigsup(G, 365);
    return true;
  }
  rspsub(G, 364, odi2);
  return true;
}

// V89 — Dig
function v_dig(G, odo2, odi2) {
  if (G.prsi === SHOVE) {
    return objact(G);
  }
  let i = 392;
  if ((G.oflag1[G.prsi - 1] & TOOLBT) === 0) i = 393;
  rspsub(G, i, odi2);
  return true;
}

// V90 — Time
function v_time(G) {
  const k = G.pltime || 0;
  const hours = Math.floor(k / 60);
  const mins = k % 60;
  let s = ' You have been playing Dungeon for ';
  if (hours !== 0) {
    s += `${hours} hour`;
    if (hours >= 2) s += 's';
    s += ' and ';
  }
  s += `${mins} minute`;
  if (mins !== 1) s += 's';
  s += '.';
  G.output(s);
  G.telflg = true;
  return true;
}

// V91 — Leap
function v_leap(G, odo2) {
  if (G.prso !== 0) {
    if (!qhere(G, G.prso, G.here)) {
      rspeak(G, 447);
      return true;
    }
    if ((G.oflag2[G.prso - 1] & VILLBT) !== 0) {
      rspsub(G, 448, odo2);
      return true;
    }
    rspeak(G, 314 + rnd(5));
    return true;
  }
  // No object — check for down exit
  if (findxt(G, XDOWN, G.here).found) {
    if (G.xtype === XNO) {
      // Invalid exit
      if (G.winner === PLAYER) {
        jigsup(G, 449 + rnd(4));
      } else {
        jigsup(G, 452);
      }
      return true;
    }
    if (G.xtype === XCOND) {
      if (!getFlag(G, G.xobj)) {
        // Blocked
        if (G.winner === PLAYER) {
          jigsup(G, 449 + rnd(4));
        } else {
          jigsup(G, 452);
        }
        return true;
      }
    }
  }
  rspeak(G, 314 + rnd(5));
  return true;
}

// V92 — Lock
function v_lock(G) {
  if (objact(G)) return true;
  if (G.prso === GRATE && !qopen(G, GRATE) && G.here === MGRAT) {
    G.grunlf = false;
    rspeak(G, 214);
    G.travel[G.rexit[G.here - 1] + 1 - 1] = 214;
    return true;
  }
  rspeak(G, 464);
  return true;
}

// V93 — Unlock
function v_unlock(G, odi2) {
  if (objact(G)) return true;
  if (G.prso !== GRATE || G.here !== MGRAT) {
    rspeak(G, 464);
    return true;
  }
  if (G.prsi !== KEYS) {
    rspsub(G, 465, odi2);
    return true;
  }
  G.grunlf = true;
  rspeak(G, 217);
  G.travel[G.rexit[G.here - 1] + 1 - 1] = 1041;
  return true;
}

// V94 — Diagnose
function v_diagnose(G) {
  const fi = fights(G, G.winner, false);
  let j = G.astren[G.winner - 1];
  const k = Math.min(fi + j, 4);
  if (!G.cflag[CEVCUR - 1]) j = 0;
  const l = Math.min(4, Math.abs(j));
  rspeak(G, 473 + l);
  const wait = (30 * (-j - 1)) + G.ctick[CEVCUR - 1];
  if (j !== 0) G.output(` You will be cured after ${wait} moves.`);
  rspeak(G, 478 + k);
  if (G.deaths !== 0) rspeak(G, 482 + G.deaths);
  return true;
}

// V95 — Incant
function v_incant(G) {
  if (G.winner !== PLAYER) return false;
  if ((G.rflag[MREYE - 1] & RSEEN) !== 0) {
    rspeak(G, 855);
    G.prscon = 0;
    return true;
  }
  if (G.sublnt === 0) {
    rspeak(G, 856);
    G.prscon = 0;
    return true;
  }

  // Parse two words from subbuf
  const pw = ['', ''];
  let wp = 0;
  let inWord = false;
  for (let i = 0; i < G.sublnt; i++) {
    const ch = G.subbuf.charAt(i);
    if (ch === ' ') {
      if (inWord) {
        wp = Math.min(1, wp + 1);
        inWord = false;
      }
    } else {
      if (pw[wp].length < WRDLNT) pw[wp] += ch;
      inWord = true;
    }
  }

  if (pw[0] === '') {
    rspeak(G, 856);
    G.prscon = 0;
    return true;
  }

  const ch = encryp(G, pw[0]);

  if (pw[1] === '') {
    // One phrase
    if (G.spellf) {
      rspeak(G, 857);
      G.prscon = 0;
      return true;
    }
    if ((G.rflag[TSTRS - 1] & RSEEN) === 0) {
      rspeak(G, 858);
      G.prscon = 0;
      return true;
    }
    G.spellf = true;
    G.telflg = true;
    const trimmed = pw[0].substring(0, nblen(pw[0]));
    G.output(` A hollow voice replies: "${trimmed} ${ch}".`);
    return true;
  }

  // Two phrases
  const ch2 = encryp(G, pw[1]);
  if (G.spellf || (pw[0] !== ch2 && pw[1] !== ch)) {
    rspeak(G, 1052);
    G.prscon = 0;
    return true;
  }
  G.spellf = true;
  rspeak(G, 859);
  G.cflag[CEVSTE - 1] = true;
  G.ctick[CEVSTE - 1] = 1;
  return true;
}

// V96 — Answer
function v_answer(G) {
  if (G.winner !== PLAYER) return false;
  if (G.sublnt === 0) {
    rspeak(G, 799);
    G.prscon = 0;
    return true;
  }

  // Riddle room?
  if (G.here === RIDDL && !G.riddlf) {
    if (G.subbuf === 'WELL') {
      G.riddlf = true;
      rspeak(G, 338);
      return true;
    }
    rspeak(G, 799);
    G.prscon = 0;
    return true;
  }

  // End game front door?
  if (G.here !== FDOOR) {
    rspeak(G, 799);
    G.prscon = 0;
    return true;
  }

  if (!G.inqstf || G.nqatt >= 5 || G.corrct >= 3) {
    rspeak(G, 783);
    G.prscon = 0;
    return true;
  }

  // Check answers
  let found = false;
  for (let j = 0; j < NUMANS; j++) {
    if (G.quesno !== ANSWER[j]) continue;
    if (G.subbuf === ANSSTR[j].substring(0, nblen(ANSSTR[j]))) {
      found = true;
      break;
    }
  }

  if (!found) {
    G.prscon = 0;
    G.nqatt++;
    if (G.nqatt >= 5) {
      rspeak(G, 826);
      G.cflag[CEVINQ - 1] = false;
      return true;
    }
    rspeak(G, 800 + G.nqatt);
    return true;
  }

  // Correct answer
  G.corrct++;
  rspeak(G, 800);
  if (G.corrct >= 3) {
    rspeak(G, 827);
    G.cflag[CEVINQ - 1] = false;
    G.oflag2[QDOOR - 1] |= OPENBT;
    return true;
  }
  G.cflag[CEVINQ - 1] = true;
  G.ctick[CEVINQ - 1] = 2;
  G.quesno = (G.quesno + 3) % 8;
  G.nqatt = 0;
  rspeak(G, 769);
  rspeak(G, 770 + G.quesno);
  return true;
}

// V97 — Count
function v_count(G, odo2) {
  if (G.prso === MATCH) {
    if (G.ormtch === 1) {
      G.output(` You have ${G.ormtch} match.`);
    } else {
      G.output(` You have ${G.ormtch} matches.`);
    }
    G.telflg = true;
    return true;
  }
  let i = 1062;
  if (G.prso === BAGCO) i = 561;
  if (G.prso === CANDL) i = 1058;
  if (G.prso === BILLS) i = 1059;
  if (G.prso === LEAVE) i = 1060;
  if (G.prso === GWISH) i = 1061;
  if (G.prso === HEADS) i = 1084;
  rspeak(G, i);
  return true;
}

// ---------------------------------------------------------------
// Export valuac replacement
// ---------------------------------------------------------------

export { valuac, cxappl, walk, take, drop, put, getFlag };
