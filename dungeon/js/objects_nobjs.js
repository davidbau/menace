// objects_nobjs.js - New objects (NOBJS) handlers and complex object handlers (OAPPLI)
//
// Ported from objects.f (Fortran) / dobjs.c (C)
// COPYRIGHT 1980, 1990, INFOCOM COMPUTERS AND COMMUNICATIONS, CAMBRIDGE MA.
// Faithful port to JavaScript by machine translation.

import {
  // Array/size params
  OMAX, HFACTR,

  // Room indices
  WHOUS, EHOUS, KITCH, LROOM, CELLA, MTROL,
  FORE1, FORE3, CLEAR, STREA,
  SLIDE, MMACH, MTORC, LLD1, LLD2, MCYCL,
  TREAS, SBEACH, FALLS, MRAIN, POG,
  VAIR1, VAIR2, VAIR3, VAIR4,
  MSAFE, CAGER, CAGED, TWELL, BWELL,
  ALICE, ALISM, ALITR, MTREE, BKENT,
  BKBOX, CRYPT,
  MREYE, MRA, MRB, MRC, MRD, MRG,
  FDOOR, MRAE,
  INMIR, NCORR, SCORR,
  CELL, PCELL, NCELL,
  CPANT, CPUZZ, PRM, PALRM, CAROU,

  // Verb indices
  FRSTQW, INXW, OUTXW, DEADXW,
  FIGHTW, HELLOW,
  GTHROW, RINGW, DIGW,
  LOCKW, UNLOKW,
  READW, MELTW, ALARMW, PLUGW,
  KICKW, WAVEW, RAISEW, LOWERW, RUBW, PUSHW,
  TIEW, TURNW, KNOCKW,
  LOOKW, EXAMIW, MOVEW, TRNONW, TRNOFW,
  OPENW, CLOSEW, FINDW, WAITW, SPINW,
  TAKEW, EATW, DRINKW, BURNW, MUNGW, KILLW,
  SWINGW, ATTACW, WALKW, PUTW, DROPW, GIVEW,
  POURW, THROWW, LOOKIW, LOOKUW,
  WINDW, CLMBW, CLMBUW, CLMBDW, TRNTOW, PORONW,
  PUTUNW, SENDW,

  // Object flag bits (oflag1)
  VISIBT, READBT, TAKEBT, DOORBT, TRANBT, FOODBT,
  NDSCBT, CONTBT, LITEBT, VICTBT, BURNBT,
  FLAMBT, TOOLBT, ONBT,

  // Object flag bits (oflag2)
  FINDBT, SCRDBT, TIEBT, CLMBBT, ACTRBT,
  WEAPBT, FITEBT, VILLBT, STAGBT, TRYBT, NOCHBT,
  OPENBT, TCHBT, VEHBT, SCHBT,

  // Object indices
  GARLI, FOOD, WATER, ROPE, KNIFE, SWORD, LAMP,
  LEAVE, TROLL, AXE, KEYS, RKNIF, ICE,
  MACHI, COFFI, TORCH, TIMBE, IRBOX, STRAD,
  GHOST, TRUNK, BELL, BOOK, CANDL, GUIDE, MATCH,
  TUBE, PUTTY, WRENC, SCREW, CYCLO, CHALI, THIEF, STILL,
  WINDO, GRATE, DOOR, HPOLE,
  LEAK, POT, STATU, IBOAT, STICK,
  BARRE, GUANO, BALLO, RECEP,
  SAFE, CARD, BRICK, FUSE,
  GNOME, BLABE, DBALL, TOMB, HEADS, LCASE, CAGE,
  SPHER, SQBUT, FLASK, POOL, SAFFR, BUCKE, ECAKE, ORICE,
  RDICE, BLICE, ROBOT, RBTLB, BILLS, PORTR,
  SCOL, ZGNOM, EGG, BEGG, BAUBL, CANAR, BCANA,
  YLWAL, RDWAL, PINDR, RBEAM, ODOOR, QDOOR, LDOOR, CDOOR,
  NUM1, NUM8, WARNI, CSLIT, GCARD, STLDR, HBELL, PLEAK,
  BROCH, STAMP, PDOOR, PLID1, PLID2, PKH1, PKH2, PKEY,
  PALAN, MAT, PAL3,

  // Pseudo/global objects
  OPLAY, HANDS, AVIAT, GBROCH, GWATE, MASTER, WNORT,

  // Actor indices
  PLAYER, AROBOT,

  // Room flags
  RSEEN, RMUNG, RNWALL,

  // Clock events
  CEVMAT, CEVCND, CEVBAL, CEVBRN, CEVFUS,
  CEVBUC, CEVSPH, CEVSCL, CEVZGI, CEVZGO,
  CEVSTE, CEVMRS, CEVPIN, CEVINQ,
  CEVCYC, CEVXBH,

  // Misc
  XNORM, XNORTH,

  // Support functions
  rspeak, rspsub,
  qhere, qempty, newsta, oappli,
  lit, findxt, moveto, rmdesc, princo,
  prob, rnd,
  clockd, jigsup,
  robadv, robrm,
  opncls, mrhere, cpgoto, princr,
} from './support.js';

import {
  cpinfo,
} from './rooms.js';

// ---------------------------------------------------------------
// Helper: qopen — test if object has OPENBT set in oflag2
// ---------------------------------------------------------------

function qopen(G, obj) {
  return (G.oflag2[obj - 1] & OPENBT) !== 0;
}

// ---------------------------------------------------------------
// Helper: qon — test if object has ONBT set in oflag1
// ---------------------------------------------------------------

function qon(G, obj) {
  return (G.oflag1[obj - 1] & ONBT) !== 0;
}

// ---------------------------------------------------------------
// MIRPAN — Processor for global mirror/panel
// ---------------------------------------------------------------

function mirpan(G, st, pnf) {
  const num = mrhere(G, G.here);
  if (num === 0) {
    rspeak(G, st); // no mirror/panel here
    return true;
  }

  if (G.prsa === MOVEW || G.prsa === OPENW) {
    rspeak(G, st + 1); // can't open or move
    return true;
  }

  let mrbf = 0;
  if ((num === 1 && !G.mr1f) || (num === 2 && !G.mr2f)) mrbf = 1;

  if (!pnf && (G.prsa === LOOKIW || G.prsa === EXAMIW || G.prsa === LOOKW)) {
    rspeak(G, 844 + mrbf); // look in mirror
    return true;
  }

  if (G.prsa === MUNGW) {
    rspeak(G, st + 2 + mrbf); // break it
    if (num === 1 && !pnf) G.mr1f = false;
    if (num === 2 && !pnf) G.mr2f = false;
    return true;
  }

  if (pnf || mrbf === 0) {
    // not broken mirror, or panel
    if (G.prsa === PUSHW) {
      rspeak(G, st + 3 + num); // push
      return true;
    }
  } else {
    // broken mirror
    rspeak(G, 846);
    return true;
  }

  return false; // can't handle it
}

// ---------------------------------------------------------------
// NOBJS — New objects processor (ri 32-77)
// ---------------------------------------------------------------

export function nobjs(G, ri, arg) {
  let odo2 = 0;
  let odi2 = 0;
  if (G.prso !== 0 && G.prso <= OMAX) odo2 = G.odesc2[G.prso - 1];
  if (G.prsi !== 0) odi2 = G.odesc2[G.prsi - 1];
  const av = G.avehic[G.winner - 1];
  const waslit = lit(G, G.here);

  let result;
  switch (ri - 31) {
    case 1: result = n_bills(G, odo2, odi2); break;               // 32
    case 2: result = n_screen_of_light(G, odo2, odi2); break;     // 33
    case 3: result = n_gnome_zurich(G, odo2, odi2); break;        // 34
    case 4: result = n_egg(G, odo2, odi2); break;                 // 35
    case 5: result = n_canary(G, odo2, odi2); break;              // 36
    case 6: result = n_white_cliffs(G); break;                    // 37
    case 7: result = n_wall(G); break;                            // 38
    case 8: result = n_bird(G); break;                            // 39
    case 9: result = n_puzzle_walls(G, odo2, odi2); break;        // 40
    case 10: result = n_short_pole(G); break;                     // 41
    case 11: result = n_mirror_switch(G); break;                  // 42
    case 12: result = n_beam(G, odo2, odi2); break;               // 43
    case 13: result = n_bronze_door(G); break;                    // 44
    case 14: result = n_quiz_door(G); break;                      // 45
    case 15: result = n_locked_door(G); break;                    // 46
    case 16: result = n_cell_door(G); break;                      // 47
    case 17: result = n_dialbutton(G); break;                     // 48
    case 18: result = n_dial_indicator(G, odo2, odi2); break;     // 49
    case 19: result = n_global_mirror(G); break;                  // 50
    case 20: result = n_global_panel(G); break;                   // 51
    case 21: result = n_puzzle_slit(G, odo2, odi2); break;        // 52
    case 22: result = n_brochure(G, odo2, odi2); break;           // 53
    case 23: result = n_global_ground(G); break;                  // 54
    case 24: result = n_granite_wall(G); break;                   // 55
    case 25: result = n_global_house(G); break;                   // 56
    case 26: result = n_barred_window(G); break;                  // 57
    case 27: result = n_global_well(G, odo2); break;              // 58
    case 28: result = n_global_rope(G); break;                    // 59
    case 29: result = n_global_slide(G, odo2); break;             // 60
    case 30: result = n_barrel(G, arg); break;                    // 61
    case 31: result = n_hot_bell(G, odo2, odi2); break;           // 62
    case 32: result = n_axe(G); break;                            // 63
    case 33: result = n_timber(G, odo2); break;                   // 64
    case 34: result = n_guano(G); break;                          // 65
    case 35: result = n_alice_leak(G); break;                     // 66
    case 36: result = n_sand(G); break;                           // 67
    case 37: result = n_torch(G); break;                          // 68
    case 38: result = n_tool_chests(G); break;                    // 69
    case 39: result = n_palantir_door(G, odo2, odi2); break;      // 70
    case 40: result = n_palantir_window(G); break;                // 71
    case 41: result = n_keyhole_lids(G); break;                   // 72
    case 42: result = n_keyholes(G, odo2, odi2); break;           // 73
    case 43: result = n_rusty_key(G); break;                      // 74
    case 44: result = n_palantirs(G); break;                      // 75
    case 45: result = n_mat(G, odo2); break;                      // 76
    case 46: result = n_stove(G, odo2); break;                    // 77
    default: return false;
  }

  // If result is 'checklit', test for light source change
  if (result === 'checklit') {
    if (waslit && !lit(G, G.here)) rspeak(G, 406);
    return true;
  }
  return result;
}

// ---------------------------------------------------------------
// O32 — Bills
// ---------------------------------------------------------------

function n_bills(G, odo2, odi2) {
  if (G.prsa === EATW) {
    rspeak(G, 639); // joke
    return true;
  }
  if (G.prsa === BURNW) rspeak(G, 640); // burn? joke
  return false;
}

// ---------------------------------------------------------------
// O33 — Screen of light
// ---------------------------------------------------------------

function n_screen_of_light(G, odo2, odi2) {
  let target = SCOL;
  return n_scol_handler(G, target, odo2, odi2);
}

function n_scol_handler(G, target, odo2, odi2) {
  if (G.prso === target) {
    if (G.prsa === PUSHW || G.prsa === MOVEW ||
        G.prsa === TAKEW || G.prsa === RUBW) {
      rspeak(G, 673); // hand passes thru
      return true;
    }
    if (G.prsa === KILLW || G.prsa === ATTACW || G.prsa === MUNGW) {
      rspsub(G, 674, idi2_for(G)); // passes thru
      return true;
    }
  }

  if (G.prsa !== THROWW || G.prsi !== target) return false;

  if (G.here === BKBOX) {
    // in box room, throw thru scol
    if (G.scolrm === 0) {
      rspeak(G, 213); // can't do it
      return true;
    }
    newsta(G, G.prso, 0, G.scolrm, 0, 0);
    rspsub(G, 676, odo2);
    G.ctick[CEVSCL - 1] = 0;
    G.scolrm = 0;
    return 'checklit';
  }

  // not in box room, throw thru wall
  newsta(G, G.prso, 0, BKBOX, 0, 0);
  rspsub(G, 675, odo2);
  G.ctick[CEVSCL - 1] = 0;
  G.scolrm = 0;
  return 'checklit';
}

function idi2_for(G) {
  if (G.prsi !== 0) return G.odesc2[G.prsi - 1];
  return 0;
}

// ---------------------------------------------------------------
// O34 — Gnome of Zurich
// ---------------------------------------------------------------

function n_gnome_zurich(G, odo2, odi2) {
  if (G.prsa === GIVEW || G.prsa === THROWW) {
    if (G.otval[G.prso - 1] !== 0) {
      // throw a treasure
      newsta(G, G.prso, 0, 0, 0, 0);
      rspsub(G, 642, odo2);
      newsta(G, ZGNOM, 0, 0, 0, 0);
      G.cflag[CEVZGO - 1] = false;
      moveto(G, BKENT, G.winner);
      return true;
    }
    // check for bomb
    if (G.prso === BRICK && G.ocan[FUSE - 1] === BRICK &&
        G.ctick[CEVFUS - 1] !== 0) {
      newsta(G, ZGNOM, 931, 0, 0, 0);
      newsta(G, BRICK, 0, G.here, 0, 0);
      G.cflag[CEVZGO - 1] = false;
      G.cflag[CEVZGI - 1] = false;
      return true;
    }
    newsta(G, G.prso, 641, 0, 0, 0); // go pop
    return true;
  }

  if (G.prsa === ATTACW || G.prsa === KILLW || G.prsa === MUNGW) {
    newsta(G, ZGNOM, 643, 0, 0, 0);
    G.cflag[CEVZGO - 1] = false;
    return true;
  }

  rspeak(G, 644); // gnome is impatient
  return true;
}

// ---------------------------------------------------------------
// O35 — Egg
// ---------------------------------------------------------------

function n_egg(G, odo2, odi2) {
  if (G.prsa === OPENW && G.prso === EGG) {
    if (qopen(G, EGG)) {
      rspeak(G, 649); // already open
      return true;
    }
    if (G.prsi === 0) {
      rspeak(G, 650); // can't without something
      return true;
    }
    if (G.prsi === HANDS) {
      rspeak(G, 651); // not recommended
      return true;
    }
    let i = 652; // mung message
    if ((G.oflag1[G.prsi - 1] & TOOLBT) !== 0 ||
        (G.oflag2[G.prsi - 1] & WEAPBT) !== 0) {
      // tool or weapon — break it open
      return n_egg_break(G, i);
    }
    i = 653; // novelty 1
    if ((G.oflag2[G.prso - 1] & FITEBT) !== 0) i = 654; // novelty 2
    G.oflag2[G.prso - 1] |= FITEBT;
    rspsub(G, i, idi2_for(G));
    return true;
  }

  if (G.prsa !== MUNGW) return false;
  let i = 655; // you blew it
  return n_egg_break(G, i);
}

function n_egg_break(G, i) {
  newsta(G, BEGG, i, G.oroom[EGG - 1], G.ocan[EGG - 1], G.oadv[EGG - 1]);
  newsta(G, EGG, 0, 0, 0, 0);
  if (G.lastit === EGG) G.lastit = BEGG;
  G.otval[BEGG - 1] = 2;
  if (G.ocan[CANAR - 1] !== EGG) {
    // canary was NOT inside
    newsta(G, BCANA, 0, 0, 0, 0);
    return true;
  }
  // canary WAS inside
  rspeak(G, G.odesco[BCANA - 1]);
  G.otval[BCANA - 1] = 1;
  return true;
}

// ---------------------------------------------------------------
// O36 — Canary
// ---------------------------------------------------------------

function n_canary(G, odo2, odi2) {
  if (G.prsa !== WINDW) return false;
  if (G.prso !== CANAR) {
    rspeak(G, 645); // bad canary
    return true;
  }
  if (!G.singsf && (G.here === MTREE ||
      (G.here >= FORE1 && G.here < CLEAR))) {
    G.singsf = true;
    newsta(G, BAUBL, 647, G.here, 0, 0);
    if (G.here === MTREE) newsta(G, BAUBL, 0, FORE3, 0, 0);
    return true;
  }
  rspeak(G, 646); // mediocre news
  return true;
}

// ---------------------------------------------------------------
// O37 — White cliffs
// ---------------------------------------------------------------

function n_white_cliffs(G) {
  if (G.prsa !== CLMBW && G.prsa !== CLMBUW && G.prsa !== CLMBDW) return false;
  rspeak(G, 648);
  return true;
}

// ---------------------------------------------------------------
// O38 — Wall
// ---------------------------------------------------------------

function n_wall(G) {
  if (Math.abs(G.here - G.mloc) === 1 && mrhere(G, G.here) === 0 && G.endgmf) {
    if (G.prsa !== PUSHW) return false;
    rspeak(G, 860); // pushed mirror wall
    return true;
  }
  if ((G.rflag[G.here - 1] & RNWALL) !== 0) {
    rspeak(G, 662); // no wall
    return true;
  }
  return false;
}

// ---------------------------------------------------------------
// O39 — Global bird
// ---------------------------------------------------------------

function n_bird(G) {
  if (G.prsa === FINDW) { rspeak(G, 666); return true; }
  if (G.prsa === EXAMIW) { rspeak(G, 667); return true; }
  return false;
}

// ---------------------------------------------------------------
// O40 — Puzzle/Scol walls
// ---------------------------------------------------------------

function n_puzzle_walls(G, odo2, odi2) {
  if (G.here === CPUZZ) {
    if (G.prsa !== PUSHW) return false;
    // locate wall
    let walli = -1;
    for (let ii = 0; ii < 8; ii += 2) {
      if (G.prso === G.cpwl[ii]) { walli = ii; break; }
    }
    if (walli < 0) return false;

    const j = G.cpwl[walli + 1];
    const nxt = G.cphere + j;
    const wl = G.cpvec[nxt];
    // wl: -3=immovable, -2=ladder, -1=wall, 0=clear, 1=movable
    // mapped to switch cases: wl+4 => 1,2,3,4,5
    if (wl === 0) {
      // clear corridor
      rspeak(G, 876);
      return true;
    }
    if (wl === -3 || wl === -2 || wl === -1) {
      // movable wall types (-3, -2, -1)
      if (G.cpvec[nxt + j] === 0) {
        // room to move
        let i = 878;
        if (G.cpushf) i = 879;
        G.cpushf = true;
        G.cpvec[nxt + j] = wl;
        G.cpvec[nxt] = 0;
        cpgoto(G, nxt);
        cpinfo(G, i, nxt);
        princr(G, true, G.here);
        return true;
      }
      // immovable, no room
      rspeak(G, 877);
      return true;
    }
    if (wl === 1) {
      // immovable
      rspeak(G, 877);
      return true;
    }
    return false;
  }

  if (G.here === G.scolac) {
    // in scol active room
    for (let ii = 0; ii < 12; ii += 3) {
      if (G.scolwl[ii] === G.here) {
        const target = G.scolwl[ii + 1];
        return n_scol_handler(G, target, odo2, idi2_for(G));
      }
    }
  }

  if (G.here === BKBOX) {
    const target = WNORT;
    return n_scol_handler(G, target, odo2, idi2_for(G));
  }

  return false;
}

// ---------------------------------------------------------------
// O41 — Short pole
// ---------------------------------------------------------------

function n_short_pole(G) {
  if (G.prsa === RAISEW) {
    let i = 749;
    if (G.poleuf === 2) i = 750;
    rspeak(G, i);
    G.poleuf = 2;
    return true;
  }
  if (G.prsa === LOWERW || G.prsa === PUSHW) {
    if (G.poleuf === 0) {
      rspeak(G, 751); // can't
      return true;
    }
    if (G.mdir % 180 === 0) {
      G.poleuf = 0;
      rspeak(G, 752); // channel
      return true;
    }
    if (G.mdir === 270 && G.mloc === MRB) {
      G.poleuf = 0;
      rspeak(G, 753); // hole
      return true;
    }
    rspeak(G, 753 + G.poleuf); // poleuf = 1 or 2
    G.poleuf = 1;
    return true;
  }
  return false;
}

// ---------------------------------------------------------------
// O42 — Mirror switch
// ---------------------------------------------------------------

function n_mirror_switch(G) {
  if (G.prsa !== PUSHW) return false;
  if (G.mrpshf) {
    rspeak(G, 758); // already pushed
    return true;
  }
  rspeak(G, 756); // button goes in
  // check if something blocks beam
  let blocked = false;
  for (let i = 1; i <= G.olnt; i++) {
    if (qhere(G, i, MREYE) && i !== RBEAM) { blocked = true; break; }
  }
  if (!blocked) {
    rspeak(G, 757); // nothing in beam
    return true;
  }
  G.cflag[CEVMRS - 1] = true;
  G.ctick[CEVMRS - 1] = 7;
  G.mrpshf = true;
  G.mropnf = true;
  return true;
}

// ---------------------------------------------------------------
// O43 — Beam function
// ---------------------------------------------------------------

function n_beam(G, odo2, odi2) {
  if (G.prsa === TAKEW && G.prso === RBEAM) {
    rspeak(G, 759); // take beam joke
    return true;
  }
  let i = G.prso;
  if (G.prsa === PUTW && G.prsi === RBEAM) {
    // put x in beam — block with dirobj
  } else if (G.prsa === MUNGW && G.prso === RBEAM && G.prsi !== 0) {
    i = G.prsi; // break beam with x
  } else {
    return false;
  }
  if (G.oadv[i - 1] === G.winner) {
    newsta(G, i, 0, G.here, 0, 0);
    rspsub(G, 760, G.odesc2[i - 1]);
    return true;
  }
  let j = 761;
  if (qhere(G, i, G.here)) j = 762;
  rspsub(G, j, G.odesc2[i - 1]);
  return true;
}

// ---------------------------------------------------------------
// O44 — Bronze door
// ---------------------------------------------------------------

function n_bronze_door(G) {
  if ((G.here === NCELL) ||
      (G.lcell === 4 && (G.here === CELL || G.here === SCORR))) {
    if (!opncls(G, ODOOR, 764, 765)) return false;
    if (G.here === NCELL && qopen(G, ODOOR)) rspeak(G, 766);
    return true;
  }
  rspeak(G, 763); // door not there
  return true;
}

// ---------------------------------------------------------------
// O45 — Quiz door
// ---------------------------------------------------------------

function n_quiz_door(G) {
  if (G.prsa === OPENW || G.prsa === CLOSEW) {
    rspeak(G, 767); // door won't move
    return true;
  }
  if (G.prsa !== KNOCKW) return false;
  if (G.inqstf) {
    rspeak(G, 798); // no reply
    return true;
  }
  G.inqstf = true;
  G.cflag[CEVINQ - 1] = true;
  G.ctick[CEVINQ - 1] = 2;
  G.quesno = rnd(8);
  G.nqatt = 0;
  G.corrct = 0;
  rspeak(G, 768);
  rspeak(G, 769);
  rspeak(G, 770 + G.quesno);
  return true;
}

// ---------------------------------------------------------------
// O46 — Locked door
// ---------------------------------------------------------------

function n_locked_door(G) {
  if (G.prsa !== OPENW) return false;
  rspeak(G, 778);
  return true;
}

// ---------------------------------------------------------------
// O47 — Cell door
// ---------------------------------------------------------------

function n_cell_door(G) {
  return opncls(G, CDOOR, 779, 780);
}

// ---------------------------------------------------------------
// O48 — Dialbutton
// ---------------------------------------------------------------

function n_dialbutton(G) {
  if (G.prsa !== PUSHW) return false;
  rspeak(G, 809); // click
  if (qopen(G, CDOOR)) rspeak(G, 810); // close cell door
  G.oflag2[CDOOR - 1] &= ~OPENBT;
  G.oflag2[ODOOR - 1] &= ~OPENBT;
  if (G.lcell === G.pnumb) return true; // no change

  // relocate old cell contents to hyper, new from hyper
  for (let i = 1; i <= G.olnt; i++) {
    if (G.oroom[i - 1] === CELL && (G.oflag1[i - 1] & DOORBT) === 0) {
      newsta(G, i, 0, G.lcell * HFACTR, 0, 0);
    }
    if (G.oroom[i - 1] === G.pnumb * HFACTR) {
      newsta(G, i, 0, CELL, 0, 0);
    }
  }

  G.oflag1[ODOOR - 1] &= ~VISIBT;
  if (G.pnumb === 4) G.oflag1[ODOOR - 1] |= VISIBT;

  if (G.aroom[PLAYER - 1] === CELL) {
    if (G.lcell === 4) {
      G.oflag1[ODOOR - 1] |= VISIBT;
      moveto(G, NCELL, PLAYER);
    } else {
      moveto(G, PCELL, PLAYER);
    }
  }

  G.lcell = G.pnumb;
  return true;
}

// ---------------------------------------------------------------
// O49 — Dial indicator
// ---------------------------------------------------------------

function n_dial_indicator(G, odo2, odi2) {
  if (G.prsa === OPENW && G.prso === BOOK) {
    G.pnumb = rnd(8) + 1;
    rspsub(G, 797, 712 + G.pnumb);
    return true;
  }
  if (G.prsa !== MOVEW && G.prsa !== PUTW && G.prsa !== TRNTOW) return false;
  if (G.prsi === 0) {
    rspeak(G, 806); // must specify
    return true;
  }
  if (G.prsi >= NUM1 && G.prsi <= NUM8) {
    G.pnumb = G.prsi - NUM1 + 1;
    rspsub(G, 808, 712 + G.pnumb);
    return true;
  }
  rspeak(G, 807); // must be digit
  return true;
}

// ---------------------------------------------------------------
// O50 — Global mirror
// ---------------------------------------------------------------

function n_global_mirror(G) {
  return mirpan(G, 832, false);
}

// ---------------------------------------------------------------
// O51 — Global panel
// ---------------------------------------------------------------

function n_global_panel(G) {
  if (G.here === FDOOR) {
    if (G.prsa !== OPENW && G.prsa !== CLOSEW) return false;
    rspeak(G, 843); // panel in door, no go
    return true;
  }
  return mirpan(G, 838, true);
}

// ---------------------------------------------------------------
// O52 — Puzzle Room slit
// ---------------------------------------------------------------

function n_puzzle_slit(G, odo2, odi2) {
  if (G.prsa !== PUTW || G.prsi !== CSLIT) return false;
  if (G.prso === GCARD) {
    newsta(G, G.prso, 863, 0, 0, 0);
    G.cpoutf = true;
    return true;
  }
  if ((G.oflag1[G.prso - 1] & VICTBT) !== 0 ||
      (G.oflag2[G.prso - 1] & VILLBT) !== 0) {
    rspeak(G, 552 + rnd(6));
    return true;
  }
  newsta(G, G.prso, 0, 0, 0, 0);
  rspsub(G, 864, odo2);
  return true;
}

// ---------------------------------------------------------------
// O53 — Brochure / stamp
// ---------------------------------------------------------------

function n_brochure(G, odo2, odi2) {
  if (G.prso === STAMP) {
    if (G.prsa === TAKEW) G.oflag1[BROCH - 1] &= ~CONTBT;
    return false; // do normal take
  }

  if (G.prso === BROCH && (G.prsa === EXAMIW || G.prsa === READW)) {
    rspeak(G, 942);
    if (G.ocan[STAMP - 1] === BROCH) rspeak(G, 943);
    return true;
  }

  if (G.prsa === FINDW && G.broc1f) {
    rspeak(G, 944);
    return true;
  }

  if (G.prsa === SENDW) {
    if (G.broc2f) rspeak(G, 945);
    if (G.broc1f && !G.broc2f) rspeak(G, 944);
    if (!G.broc1f) rspeak(G, 947);
    G.broc1f = true;
    return true;
  }

  if (G.prso === GBROCH) {
    rspeak(G, 1071); // pretend it's not there
    return true;
  }

  return false;
}

// ---------------------------------------------------------------
// O54 — Global ground
// ---------------------------------------------------------------

function n_global_ground(G) {
  if (G.here === SBEACH) return n_sand(G); // at sandy beach? dig sand
  if (G.prsa !== DIGW) return false;
  rspeak(G, 924);
  return true;
}

// ---------------------------------------------------------------
// O55 — Granite wall
// ---------------------------------------------------------------

function n_granite_wall(G) {
  let i = 916;
  if (G.prsa === TAKEW) {
    rspeak(G, i);
    return true;
  }
  i = 918; // temple, treasure find
  if (G.here === SLIDE) i = 917;
  if (G.prsa !== FINDW) return false;
  rspeak(G, i);
  return true;
}

// ---------------------------------------------------------------
// O56 — Global house
// ---------------------------------------------------------------

function n_global_house(G) {
  if (G.here >= WHOUS && G.here <= EHOUS) {
    if (G.prsa === FINDW) { rspeak(G, 895); return true; }
    if (G.prsa === EXAMIW) { rspeak(G, 896); return true; }
    if (G.prsa === BURNW) { rspeak(G, 897); return true; }
    if (G.prsa === GTHROW) {
      if (G.here !== EHOUS) { rspeak(G, 898); return true; }
      if (!qopen(G, WINDO)) { rspeak(G, 899); return true; }
      moveto(G, KITCH, G.winner);
      rmdesc(G, 0);
      return true;
    }
    return false;
  }

  if (G.prsa === FINDW) {
    let i = 892;
    if (G.here === CLEAR) i = 893;
    rspeak(G, i);
    return true;
  }
  rspeak(G, 894); // not there
  return true;
}

// ---------------------------------------------------------------
// O57 — Barred window
// ---------------------------------------------------------------

function n_barred_window(G) {
  if (G.prsa === OPENW || G.prsa === LOOKIW || G.prsa === GTHROW) {
    rspeak(G, 1039); // barred
    return true;
  }
  if (G.prsa === CLOSEW) {
    rspeak(G, 1040); // already closed
    return true;
  }
  return false;
}

// ---------------------------------------------------------------
// O58 — Global well
// ---------------------------------------------------------------

function n_global_well(G, odo2) {
  if ((G.oflag1[G.prso - 1] & TAKEBT) === 0 || G.prso === WATER ||
      (G.prsa !== THROWW && G.prsa !== PUTW && G.prsa !== DROPW)) return false;
  rspsub(G, 939, odo2);
  newsta(G, G.prso, 0, BWELL, 0, 0);
  return 'checklit';
}

// ---------------------------------------------------------------
// O59 — Global rope
// ---------------------------------------------------------------

function n_global_rope(G) {
  if (G.prsa === TAKEW) {
    rspeak(G, 1006);
    return true;
  }
  if (G.prsa === DROPW) {
    rspeak(G, 1007); // you lose
    moveto(G, CELLA, G.winner);
    rmdesc(G, 3);
    return true;
  }
  if (G.prsa === CLMBW || G.prsa === CLMBUW || G.prsa === CLMBDW) return false;
  rspeak(G, 1008);
  return true;
}

// ---------------------------------------------------------------
// O60 — Global slide
// ---------------------------------------------------------------

function n_global_slide(G, odo2) {
  if (G.prsa === GTHROW ||
      (G.prsa === PUTW && G.prso === G.aobj[G.winner - 1])) {
    rspeak(G, 1010); // down the slide
    moveto(G, CELLA, G.winner);
    rmdesc(G, 3);
    return true;
  }

  if (G.prsa !== PUTW) return false;

  if ((G.oflag1[G.prso - 1] & TAKEBT) === 0) {
    rspeak(G, 552 + rnd(6));
    return true;
  }

  if (G.prso === G.ttie) {
    G.oflag1[G.ttie - 1] &= ~NDSCBT;
    G.oflag1[ROPE - 1] &= ~NDSCBT;
    G.oflag2[ROPE - 1] &= ~CLMBBT;
    G.odesc1[TIMBE - 1] = 1032;
    G.odesc1[COFFI - 1] = 1033;
    G.ttie = 0;
    newsta(G, ROPE, 0, CELLA, 0, 0);
  }
  rspsub(G, 1011, odo2);
  newsta(G, G.prso, 0, CELLA, 0, 0);
  if (G.prso === WATER) newsta(G, G.prso, 0, 0, 0, 0);
  return 'checklit';
}

// ---------------------------------------------------------------
// O61 — Barrel
// ---------------------------------------------------------------

function n_barrel(G, arg) {
  if (arg !== 1) return false;
  let i = 0;
  if (G.prsa === WALKW) i = 920;
  if (G.prsa === LOOKW) i = 921;
  if (G.prsa === BURNW) i = 922;
  if (G.prsa === TAKEW) i = 552 + rnd(6);
  rspeak(G, i);
  return i !== 0;
}

// ---------------------------------------------------------------
// O62 — Hot bell
// ---------------------------------------------------------------

function n_hot_bell(G, odo2, odi2) {
  if (G.prsa === TAKEW) {
    rspeak(G, 972); // too hot
    return true;
  }
  if (G.prsa === RINGW) {
    if (G.prsi === 0) {
      rspeak(G, 973); // too hot
      return true;
    }
    if ((G.oflag1[G.prsi - 1] & BURNBT) !== 0) {
      rspsub(G, 974, idi2_for(G)); // burnable consumed
      newsta(G, G.prsi, 0, 0, 0, 0);
      return true;
    }
    let i = 975;
    if (G.prsi === HANDS) i = 973;
    rspeak(G, i);
    return true;
  }
  if (G.prsa === PORONW) {
    newsta(G, HBELL, 0, 0, 0, 0);
    newsta(G, BELL, 976, LLD1, 0, 0);
    if (G.lastit === HBELL) G.lastit = BELL;
    newsta(G, G.prso, 0, 0, 0, 0); // vanish water
    G.ctick[CEVXBH - 1] = 0;
    return true;
  }
  return false;
}

// ---------------------------------------------------------------
// O63 — Axe
// ---------------------------------------------------------------

function n_axe(G) {
  if (G.prsa !== TAKEW) return false;
  rspeak(G, 891); // too hot
  return true;
}

// ---------------------------------------------------------------
// O64 — Timber (also coffin)
// ---------------------------------------------------------------

function n_timber(G, odo2) {
  if (G.prsa !== TAKEW || G.prso !== G.ttie) return false;
  rspsub(G, 1009, odo2); // rope becomes untied
  G.oflag1[G.ttie - 1] &= ~NDSCBT;
  G.oflag1[ROPE - 1] &= ~NDSCBT;
  G.oflag2[ROPE - 1] &= ~CLMBBT;
  G.odesc1[TIMBE - 1] = 1032;
  G.odesc1[COFFI - 1] = 1033;
  G.ttie = 0;
  newsta(G, ROPE, 0, G.here, 0, 0);
  return false; // don't handle (go to 10)
}

// ---------------------------------------------------------------
// O65 — Guano
// ---------------------------------------------------------------

function n_guano(G) {
  if (G.prsa !== DIGW) return false;
  G.rvgua = Math.min(4, G.rvgua + 1);
  rspeak(G, 91 + G.rvgua);
  return true;
}

// ---------------------------------------------------------------
// O66 — Alice room leak
// ---------------------------------------------------------------

function n_alice_leak(G) {
  if (G.prsa === TAKEW) {
    rspeak(G, 552 + rnd(6));
    return true;
  }
  if (G.prsa === PLUGW && G.prso === PLEAK) {
    rspeak(G, 929); // can't reach
    return true;
  }
  return false;
}

// ---------------------------------------------------------------
// O67 — Sand
// ---------------------------------------------------------------

function n_sand(G) {
  if (G.prsa !== DIGW) return false;
  G.rvsnd = G.rvsnd + 1;
  if (G.rvsnd >= 1 && G.rvsnd <= 3) {
    rspeak(G, 85 + G.rvsnd);
    return true;
  }
  if (G.rvsnd === 4) {
    if ((G.oflag1[STATU - 1] & VISIBT) === 0) rspeak(G, 89);
    G.oflag1[STATU - 1] |= VISIBT;
    return true;
  }
  if (G.rvsnd === 5) {
    G.rvsnd = 0;
    if (G.oroom[STATU - 1] === G.here) {
      G.oflag1[STATU - 1] &= ~VISIBT;
    }
    jigsup(G, 90);
    return true;
  }
  return false;
}

// ---------------------------------------------------------------
// O68 — Torch
// ---------------------------------------------------------------

function n_torch(G) {
  if (G.prsa !== TRNOFW) return false;
  rspeak(G, 900);
  return true;
}

// ---------------------------------------------------------------
// O69 — Tool chests
// ---------------------------------------------------------------

function n_tool_chests(G) {
  if (G.prsa === EXAMIW) { rspeak(G, 907); return true; }
  if (G.prsa === TAKEW) { rspeak(G, 908); return true; }
  return false;
}

// ---------------------------------------------------------------
// O70 — Palantir door
// ---------------------------------------------------------------

function n_palantir_door(G, odo2, odi2) {
  if (G.prsa === LOOKUW && G.matf) {
    rspeak(G, 995); // mat under door
    return true;
  }

  if (G.prsa === UNLOKW) {
    if (G.prsi !== PKEY) {
      let i = 997;
      if (G.prsi === KEYS) i = 998;
      rspeak(G, i);
      return true;
    }
    // with rusty key — check keyhole
    const kh = G.here - PRM + PKH1;
    if (G.ocan[PKEY - 1] !== kh && !qempty(G, kh)) {
      rspeak(G, 991); // no
      return true;
    }
    rspeak(G, 996);
    G.punlkf = true;
    return true;
  }

  if (G.prsa === LOCKW) {
    if (G.prsi !== PKEY) {
      rspeak(G, 999);
      return true;
    }
    const kh = G.here - PRM + PKH1;
    if (G.ocan[PKEY - 1] !== kh && !qempty(G, kh)) {
      rspeak(G, 991); // no
      return true;
    }
    rspeak(G, 1000);
    G.punlkf = false;
    return true;
  }

  if (G.prsa === PUTUNW &&
      (G.prso === BLABE || G.prso === LABEL || G.prso === CARD ||
       G.prso === WARNI || G.prso === RBTLB || G.prso === GUIDE)) {
    newsta(G, G.prso, 1001, G.here ^ 1, 0, 0); // put in other room
    return true;
  }

  if (G.prsa === OPENW || G.prsa === CLOSEW) {
    if (!G.punlkf) {
      rspeak(G, 1000); // door locked
      return true;
    }
    return opncls(G, G.prso, 1002, 1003);
  }

  return false;
}

// ---------------------------------------------------------------
// O71 — Palantir window
// ---------------------------------------------------------------

function n_palantir_window(G) {
  if (G.prsa === GTHROW) {
    rspeak(G, 1004);
    return true;
  }
  if (G.prsa !== LOOKIW) return false;
  if (qopen(G, PDOOR)) {
    rspeak(G, 1005); // door open
    return true;
  }
  G.plookf = true;
  const otherRoom = G.here ^ 1;
  const svflag = G.rflag[otherRoom - 1];
  moveto(G, otherRoom, G.winner);
  rmdesc(G, 3);
  moveto(G, otherRoom ^ 1, G.winner); // come back (XOR twice = original here)
  // Actually: XOR(here^1, 1) won't always give original here.
  // The Fortran does IEOR(HERE,1) then IEOR(IEOR(HERE,1),1) = HERE.
  // We did moveto(otherRoom, ...) then need to go back to original here.
  // Let's fix: otherRoom = here^1, so otherRoom^1 = here^1^1 = here. Correct for XOR.
  G.rflag[otherRoom - 1] = svflag;
  return true;
}

// ---------------------------------------------------------------
// O72 — Keyhole lids
// ---------------------------------------------------------------

function n_keyhole_lids(G) {
  if (G.prsa === OPENW || G.prsa === RAISEW) {
    rspeak(G, 985);
    G.oflag2[G.prso - 1] |= OPENBT;
    return true;
  }
  if (G.prsa === CLOSEW || G.prsa === LOWERW) {
    const kh = G.prso - PLID1 + PKH1;
    if (!qempty(G, kh)) {
      rspeak(G, 986); // can't do it
      return true;
    }
    rspeak(G, 987);
    G.oflag2[G.prso - 1] &= ~OPENBT;
    return true;
  }
  return false;
}

// ---------------------------------------------------------------
// O73 — Keyholes
// ---------------------------------------------------------------

function n_keyholes(G, odo2, odi2) {
  if (G.prsa === LOOKIW) {
    let i = 988;
    if (qopen(G, PLID1) && qopen(G, PLID2) &&
        qempty(G, PKH1) && qempty(G, PKH2) &&
        lit(G, G.here ^ 1)) i = 989;
    rspeak(G, i);
    return true;
  }
  if (G.prsa !== PUTW) return false;
  if (!qopen(G, G.prsi - PKH1 + PLID1)) {
    rspeak(G, 990); // lid not open
    return true;
  }
  if (!qempty(G, G.prsi)) {
    rspeak(G, 991); // keyhole not empty
    return true;
  }
  if (G.prso === SCREW || G.prso === KEYS ||
      G.prso === STICK || G.prso === PKEY) {
    const otherKh = G.prsi ^ 1;
    if (qempty(G, otherKh)) return false; // nothing to shove, normal put
    // find obj in other keyhole
    for (let i = 1; i <= G.olnt; i++) {
      if (G.ocan[i - 1] === otherKh) {
        newsta(G, i, 992, G.here ^ 1, 0, 0); // obj falls to floor
        if (G.matf) G.matobj = i;
        return false; // finish put
      }
    }
    return false;
  }
  rspsub(G, 993, odo2); // doesn't fit
  return true;
}

// ---------------------------------------------------------------
// O74 — Rusty key
// ---------------------------------------------------------------

function n_rusty_key(G) {
  if (G.prsa !== TURNW) return false;
  if (G.punlkf) {
    // unlock -> lock (same as 39600)
    const kh = G.here - PRM + PKH1;
    if (G.ocan[PKEY - 1] !== kh && !qempty(G, kh)) {
      rspeak(G, 991);
      return true;
    }
    rspeak(G, 1000);
    G.punlkf = false;
    return true;
  }
  // lock -> unlock (same as 39200)
  const kh = G.here - PRM + PKH1;
  if (G.ocan[PKEY - 1] === kh || qempty(G, kh)) {
    rspeak(G, 996);
    G.punlkf = true;
    return true;
  }
  rspeak(G, 991);
  return true;
}

// ---------------------------------------------------------------
// O75 — Palantirs
// ---------------------------------------------------------------

function n_palantirs(G) {
  if (G.prsa !== LOOKIW) return false;
  let obj = PALAN;
  if (G.prso === PALAN) obj = PAL3;
  if (G.prso === PAL3) obj = SPHER;
  const j_orig = G.here;
  let j = j_orig;
  const k = G.ocan[obj - 1];
  if (G.oroom[obj - 1] !== 0) j = G.oroom[obj - 1];
  if (k !== 0) j = G.oroom[k - 1];
  if (j === 0 || G.oadv[obj - 1] === -THIEF) {
    rspeak(G, 1023); // nothing to see
    return true;
  }
  if (!lit(G, j)) {
    rspeak(G, 1023);
    return true;
  }
  if (k !== 0) {
    if ((G.oflag1[k - 1] & TRANBT) === 0 && !qopen(G, k)) {
      rspeak(G, 1023);
      return true;
    }
  }
  rspeak(G, 1024); // start vision
  G.oflag1[obj - 1] &= ~VISIBT;
  const svhere = G.here;
  const svflag = G.rflag[j - 1];
  moveto(G, j, G.winner);
  rmdesc(G, 3);
  if (j === svhere) rspeak(G, 1026);
  moveto(G, svhere, G.winner);
  G.rflag[j - 1] = svflag;
  G.oflag1[obj - 1] |= VISIBT;
  return true;
}

// ---------------------------------------------------------------
// O76 — Mat
// ---------------------------------------------------------------

function n_mat(G, odo2) {
  if (G.prsa === PUTUNW && G.prsi === PDOOR) {
    G.matf = true;
    newsta(G, G.prso, 983, G.here, 0, 0);
    return true;
  }
  if ((G.prsa === TAKEW || G.prsa === MOVEW) && G.matobj !== 0) {
    newsta(G, G.matobj, 0, G.here, 0, 0);
    rspsub(G, 984, G.odesc2[G.matobj - 1]);
    G.matobj = 0;
    G.matf = false;
    if (G.prsa === TAKEW) return false; // do normal take
    return true; // move is done
  }
  return false;
}

// ---------------------------------------------------------------
// O77 — Stove
// ---------------------------------------------------------------

function n_stove(G, odo2) {
  if (G.prsa === TAKEW || G.prsa === RUBW ||
      G.prsa === ATTACW || G.prsa === MUNGW) {
    rspeak(G, 994); // too hot
    return true;
  }
  if (G.prsa !== THROWW) return false;
  if (G.prso === WATER) {
    newsta(G, WATER, 978, 0, 0, 0); // evaporates
    return true;
  }
  if ((G.oflag1[G.prso - 1] & BURNBT) !== 0) {
    rspsub(G, 974, odo2); // burns up
    newsta(G, G.prso, 0, 0, 0, 0);
    return true;
  }
  return false;
}

// ===============================================================
// OAPPLI COMPLEX OBJECT HANDLERS (cases 1-32, ri > MXSMP)
// ===============================================================

export function oappli_complex(G, ri, arg) {
  let odo2 = 0;
  let odi2 = 0;
  if (G.prso !== 0 && G.prso <= OMAX) odo2 = G.odesc2[G.prso - 1];
  if (G.prsi !== 0) odi2 = G.odesc2[G.prsi - 1];
  const av = G.avehic[G.winner - 1];
  const flobts = FLAMBT | LITEBT | ONBT;
  const waslit = lit(G, G.here);

  let result;
  switch (ri) {
    case 1: result = oc_machine(G); break;
    case 2: result = oc_water(G, odo2, odi2, av); break;
    case 3: result = oc_leaves(G); break;
    case 4: result = trollp_checklit(G, arg, waslit); break;
    case 5: result = oc_rusty_knife(G); break;
    case 6: result = oc_glacier(G, odo2, odi2, flobts); break;
    case 7: result = oc_black_book(G); break;
    case 8: result = oc_candles(G, odi2, flobts, waslit); break;
    case 9: result = oc_matches(G, flobts, waslit); break;
    case 10: result = cyclop_checklit(G, arg, waslit); break;
    case 11: result = thiefp_checklit(G, arg, waslit); break;
    case 12: result = oc_window(G); break;
    case 13: result = oc_bodies(G); break;
    case 14: result = oc_bat(G); break;
    case 15: result = oc_stick(G); break;
    case 16: result = ballop_checklit(G, arg); break;
    case 17: result = oc_heads(G); break;
    case 18: result = oc_sphere(G, arg, waslit); break;
    case 19: result = oc_geo_buttons(G); break;
    case 20: result = oc_flask(G); break;
    case 21: result = oc_bucket(G, arg, av, waslit); break;
    case 22: result = oc_eatme_cake(G); break;
    case 23: result = oc_icings(G, odo2); break;
    case 24: result = oc_brick(G); break;
    case 25: result = oc_myself(G, odo2); break;
    case 26: result = oc_panels(G); break;
    case 27: result = oc_ends(G); break;
    case 28: result = oc_guardians(G); break;
    case 29: result = oc_master(G); break;
    case 30: result = oc_numeral_five(G); break;
    case 31: result = oc_crypt(G); break;
    case 32: result = oc_global_ladder(G); break;
    default: return false;
  }

  if (result === 'checklit') {
    if (waslit && !lit(G, G.here)) rspeak(G, 406);
    return true;
  }
  return result;
}

// Wrappers for external handlers that need checklit
function trollp_checklit(G, arg, waslit) {
  const r = trollp(G, arg);
  if (waslit && !lit(G, G.here)) rspeak(G, 406);
  return r;
}

function cyclop_checklit(G, arg, waslit) {
  const r = cyclop(G, arg);
  if (waslit && !lit(G, G.here)) rspeak(G, 406);
  return r;
}

function thiefp_checklit(G, arg, waslit) {
  const r = thiefp(G, arg);
  if (waslit && !lit(G, G.here)) rspeak(G, 406);
  return r;
}

function ballop_checklit(G, arg) {
  return ballop(G, arg);
}

// ---------------------------------------------------------------
// O100 — Machine
// ---------------------------------------------------------------

function oc_machine(G) {
  if (G.here !== MMACH) return false;
  return opncls(G, MACHI, 123, 124);
}

// ---------------------------------------------------------------
// O101 — Water
// ---------------------------------------------------------------

function oc_water(G, odo2, odi2, av) {
  if (G.prsa === GTHROW) {
    rspeak(G, 331 + rnd(3));
    return true;
  }

  if (G.prso !== WATER && G.prso !== GWATE) {
    rspeak(G, 561); // water is indirect
    return true;
  }

  if (G.prsa === TAKEW) {
    if (G.prsi !== 0) {
      // take water from x
      if (G.ocan[G.prso - 1] === G.prsi) {
        rspeak(G, 1038); // not in that
        return true;
      }
      if (!qopen(G, G.prsi)) {
        rspsub(G, 525, odi2);
        return true;
      }
      // fall to take from open container
    } else {
      // take water (no from)
      if (G.oadv[BOTTL - 1] === G.winner && G.ocan[G.prso - 1] !== BOTTL) {
        // have bottle, water not in bottle -> put in bottle
        if (qopen(G, BOTTL)) {
          if (qempty(G, BOTTL)) {
            newsta(G, WATER, 614, 0, BOTTL, 0);
            return true;
          }
          rspeak(G, 613); // already full
          return true;
        }
        rspeak(G, 612); // bottle not open
        return true;
      }
      if (G.ocan[G.prso - 1] === BOTTL) {
        if (G.oadv[BOTTL - 1] === G.winner) {
          rspeak(G, 103); // already have water
          return true;
        }
        G.prso = BOTTL; // take bottle instead
        return false;
      }
      if (G.ocan[G.prso - 1] !== 0) {
        G.prsi = G.ocan[G.prso - 1];
        if (!qopen(G, G.prsi)) {
          rspsub(G, 525, G.odesc2[G.prsi - 1]);
          return true;
        }
      }
    }
    // take from open or room
    if (av !== 0) {
      // in vehicle, put there
      newsta(G, WATER, 0, 0, av, 0);
      rspsub(G, 296, G.odesc2[av - 1]);
      return true;
    }
    let i = 615;
    if (G.winner !== PLAYER) i = 1081;
    rspeak(G, i); // slips thru fingers
    return true;
  }

  if (G.prsa === PUTW) {
    if (G.prsi === BOTTL) {
      if (!qopen(G, BOTTL)) { rspeak(G, 612); return true; }
      if (!qempty(G, BOTTL)) { rspeak(G, 613); return true; }
      newsta(G, WATER, 614, 0, BOTTL, 0);
      return true;
    }
    if ((G.oflag2[G.prsi - 1] & VEHBT) !== 0 ||
        (av !== 0 && G.prsi === av)) {
      newsta(G, WATER, 0, 0, G.prsi, 0);
      rspsub(G, 296, G.odesc2[G.prsi - 1]);
      return true;
    }
    rspsub(G, 297, odi2); // won't go elsewhere
    newsta(G, G.prso, 0, 0, 0, 0);
    return true;
  }

  if (G.prsa === DROPW || G.prsa === POURW) {
    if (av !== 0) {
      newsta(G, WATER, 0, 0, av, 0);
      rspsub(G, 296, G.odesc2[av - 1]);
      return true;
    }
    newsta(G, G.prso, 133, 0, 0, 0);
    return true;
  }

  if (G.prsa === THROWW) {
    newsta(G, G.prso, 132, 0, 0, 0);
    return true;
  }

  return false;
}

// ---------------------------------------------------------------
// O102 — Leaf pile
// ---------------------------------------------------------------

function oc_leaves(G) {
  if (G.prsa === BURNW) {
    if (qopen(G, GRATE) || G.rvclr !== 0) {
      // grate already visible
    } else {
      G.rvclr = 1;
      newsta(G, GRATE, 30, G.here, 0, 0);
    }
    if (G.oadv[G.prso - 1] === PLAYER) {
      newsta(G, LEAVE, 0, G.here, 0, 0);
      if (G.here === MTREE) newsta(G, LEAVE, 0, FORE3, 0, 0);
      jigsup(G, 159);
      return true;
    }
    newsta(G, LEAVE, 158, 0, 0, 0);
    return true;
  }
  if (G.prsa === MOVEW) {
    rspeak(G, 2);
    if (qopen(G, GRATE) || G.rvclr !== 0) return true;
    G.rvclr = 1;
    newsta(G, GRATE, 30, G.here, 0, 0);
    return true;
  }
  if (G.prsa === TAKEW) {
    if (!qopen(G, GRATE) && G.rvclr === 0) {
      G.rvclr = 1;
      newsta(G, GRATE, 30, G.here, 0, 0);
    }
    return false; // don't handle here
  }
  if (G.prsa === LOOKUW && !qopen(G, GRATE) && G.rvclr === 0) {
    rspeak(G, 344);
    return true;
  }
  return false;
}

// ---------------------------------------------------------------
// O104 — Rusty knife
// ---------------------------------------------------------------

function oc_rusty_knife(G) {
  if (G.prsa === TAKEW) {
    if (G.oadv[SWORD - 1] === G.winner) rspeak(G, 160);
    return false;
  }
  if (((G.prsa === ATTACW || G.prsa === KILLW) && G.prsi === RKNIF) ||
      ((G.prsa === SWINGW || G.prsa === THROWW) && G.prso === RKNIF)) {
    newsta(G, RKNIF, 0, 0, 0, 0);
    jigsup(G, 161);
    return true;
  }
  return false;
}

// ---------------------------------------------------------------
// O105 — Glacier
// ---------------------------------------------------------------

function oc_glacier(G, odo2, odi2, flobts) {
  if (G.prsa === THROWW) {
    if (G.prso === TORCH) {
      newsta(G, ICE, 169, 0, 0, 0);
      G.odesc1[TORCH - 1] = 174;
      G.odesc2[TORCH - 1] = 173;
      G.oflag1[TORCH - 1] &= ~flobts;
      newsta(G, TORCH, 0, STREA, 0, 0);
      G.glacrf = true;
      if (!lit(G, G.here)) rspeak(G, 170);
      return true;
    }
    rspeak(G, 171);
    return false;
  }
  if (G.prsa === MELTW && G.prso === ICE) {
    if ((G.oflag1[G.prsi - 1] & flobts) === flobts) {
      G.glacmf = true;
      if (G.prsi === TORCH) {
        G.odesc1[TORCH - 1] = 174;
        G.odesc2[TORCH - 1] = 173;
        G.oflag1[TORCH - 1] &= ~flobts;
      }
      jigsup(G, 172);
      return true;
    }
    rspsub(G, 298, idi2_for(G));
    return true;
  }
  return false;
}

// ---------------------------------------------------------------
// O106 — Black book
// ---------------------------------------------------------------

function oc_black_book(G) {
  if (G.prsa === OPENW) { rspeak(G, 180); return true; }
  if (G.prsa === CLOSEW) { rspeak(G, 181); return true; }
  if (G.prsa === BURNW) {
    newsta(G, BOOK, 0, 0, 0, 0);
    jigsup(G, 182);
    return true;
  }
  return false;
}

// ---------------------------------------------------------------
// O107 — Candles
// ---------------------------------------------------------------

function oc_candles(G, odi2, flobts, waslit) {
  if (G.orcand === 0) {
    G.orcand = 1;
    G.cflag[CEVCND - 1] = true;
    G.ctick[CEVCND - 1] = 50;
  }
  if (G.prsi === CANDL) return false; // ignore ind refs

  if (G.prsa === TRNOFW) {
    let i = 513;
    if (qon(G, CANDL)) i = 514;
    G.cflag[CEVCND - 1] = false;
    G.oflag1[CANDL - 1] &= ~ONBT;
    rspeak(G, i);
    return 'checklit';
  }

  if (G.prsa === BURNW || G.prsa === TRNONW) {
    if ((G.oflag1[CANDL - 1] & LITEBT) === 0) {
      rspeak(G, 515); // candles too short
      return true;
    }
    if (G.prsi === 0) {
      rspeak(G, 516); // no flame
      // orphan "light candle with" — simplified, just return
      G.prswon = false;
      G.prscon = 0;
      return true;
    }
    if (G.prsi === MATCH && qon(G, MATCH)) {
      let i = 517;
      if (qon(G, CANDL)) i = 518;
      G.oflag1[CANDL - 1] |= ONBT;
      G.cflag[CEVCND - 1] = true;
      rspeak(G, i);
      return true;
    }
    if (G.prsi === TORCH && qon(G, TORCH)) {
      if (qon(G, CANDL)) {
        rspeak(G, 520); // already on
        return true;
      }
      newsta(G, CANDL, 521, 0, 0, 0); // vaporize
      return true;
    }
    rspeak(G, 519); // can't light with that
    return true;
  }
  return false;
}

// ---------------------------------------------------------------
// O108 — Matches
// ---------------------------------------------------------------

function oc_matches(G, flobts, waslit) {
  if (G.prsa === TRNONW && G.prso === MATCH) {
    if (G.ormtch === 0) {
      rspeak(G, 183); // no matches left
      return true;
    }
    G.ormtch--;
    G.oflag1[MATCH - 1] |= flobts;
    G.cflag[CEVMAT - 1] = true;
    G.ctick[CEVMAT - 1] = 2;
    rspeak(G, 184);
    return true;
  }
  if (G.prsa === TRNOFW && (G.oflag1[MATCH - 1] & ONBT) !== 0) {
    G.oflag1[MATCH - 1] &= ~flobts;
    G.ctick[CEVMAT - 1] = 0;
    rspeak(G, 185);
    return 'checklit';
  }
  return false;
}

// ---------------------------------------------------------------
// O111 — Window
// ---------------------------------------------------------------

function oc_window(G) {
  return opncls(G, WINDO, 208, 209);
}

// ---------------------------------------------------------------
// O112 — Pile of bodies
// ---------------------------------------------------------------

function oc_bodies(G) {
  if (G.prsa === TAKEW) {
    rspeak(G, 228);
    return true;
  }
  if (G.prsa === BURNW || G.prsa === MUNGW) {
    if (G.onpolf) return true;
    G.onpolf = true;
    newsta(G, HPOLE, 0, LLD2, 0, 0);
    jigsup(G, 229);
    return true;
  }
  return false;
}

// ---------------------------------------------------------------
// O113 — Vampire bat
// ---------------------------------------------------------------

function oc_bat(G) {
  rspeak(G, 50);
  moveto(G, G.batdrp[rnd(9)], G.winner);
  rmdesc(G, 0);
  G.prscon = 0;
  return true;
}

// ---------------------------------------------------------------
// O114 — Stick
// ---------------------------------------------------------------

function oc_stick(G) {
  if (G.prsa !== WAVEW) return false;
  if (G.here === MRAIN) {
    G.rainbf = false;
    jigsup(G, 247);
    return true;
  }
  if (G.here === POG || G.here === FALLS) {
    G.oflag1[POT - 1] |= VISIBT;
    G.rainbf = !G.rainbf;
    let i = 245;
    if (G.rainbf) i = 246;
    rspeak(G, i);
    return true;
  }
  rspeak(G, 244); // nothing happens
  return true;
}

// ---------------------------------------------------------------
// O116 — Heads
// ---------------------------------------------------------------

function oc_heads(G) {
  if (G.prsa === HELLOW) {
    rspeak(G, 633);
    return true;
  }
  if (G.prsa === KILLW || G.prsa === MUNGW || G.prsa === RUBW ||
      G.prsa === OPENW || G.prsa === TAKEW || G.prsa === BURNW ||
      G.prsa === SPINW || G.prsa === ATTACW || G.prsa === KICKW) {
    rspeak(G, 260);
    const i = robadv(G, G.winner, 0, LCASE, 0) + robrm(G, G.here, 100, 0, LCASE, 0);
    if (i !== 0) newsta(G, LCASE, 0, LROOM, 0, 0);
    jigsup(G, 261);
    return true;
  }
  return false;
}

// ---------------------------------------------------------------
// O117 — Sphere
// ---------------------------------------------------------------

function oc_sphere(G, arg, waslit) {
  if (!G.cagesf && G.prsa === TAKEW) {
    if (G.winner !== PLAYER) {
      // robot tried
      newsta(G, SPHER, 0, 0, 0, 0);
      newsta(G, ROBOT, 264, 0, 0, 0);
      newsta(G, CAGE, 0, G.here, 0, 0);
      if (waslit && !lit(G, G.here)) rspeak(G, 406);
      return true;
    }
    rspeak(G, 263); // player takes sphere
    if (G.oroom[ROBOT - 1] !== G.here) {
      // robot not here
      newsta(G, SPHER, 0, 0, 0, 0);
      G.rflag[CAGER - 1] |= RMUNG;
      G.rdesc1[CAGER - 1] = 147;
      jigsup(G, 148);
      return true;
    }
    // robot here
    moveto(G, CAGED, G.winner);
    newsta(G, ROBOT, 0, CAGED, 0, 0);
    G.aroom[AROBOT - 1] = CAGED;
    G.oflag1[ROBOT - 1] |= NDSCBT;
    G.cflag[CEVSPH - 1] = true;
    G.ctick[CEVSPH - 1] = 10;
    return true;
  }

  if (G.prsa === LOOKIW) {
    // look in sphere — do palantir function
    return nobjs(G, G.oactio[PALAN - 1], arg);
  }
  return false;
}

// ---------------------------------------------------------------
// O118 — Geometrical buttons
// ---------------------------------------------------------------

function oc_geo_buttons(G) {
  if (G.prsa !== PUSHW) return false;
  const i = G.prso - SQBUT + 1;
  if (i <= 0 || i >= 4) return false;
  if (G.winner === PLAYER) {
    jigsup(G, 265);
    return true;
  }
  // robot pushes
  switch (i) {
    case 1: { // square, speed up
      let msg = 267;
      if (G.carozf) msg = 266;
      G.carozf = true;
      rspeak(G, msg);
      return true;
    }
    case 2: { // round, slow down
      let msg = 266;
      if (G.carozf) msg = 268;
      G.carozf = false;
      rspeak(G, msg);
      return true;
    }
    case 3: { // triangle, flip carousel
      G.caroff = !G.caroff;
      if (G.oroom[IRBOX - 1] === CAROU) {
        rspeak(G, 269);
        G.oflag1[IRBOX - 1] ^= VISIBT;
        if (G.caroff) G.rflag[CAROU - 1] &= ~RSEEN;
        return true;
      }
      rspeak(G, 232); // click
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------
// O119 — Flask function
// ---------------------------------------------------------------

function oc_flask(G) {
  if (G.prsa === OPENW) {
    G.rflag[G.here - 1] |= RMUNG;
    G.rdesc1[G.here - 1] = 271;
    jigsup(G, 272);
    return true;
  }
  if (G.prsa === MUNGW || G.prsa === THROWW) {
    newsta(G, FLASK, 270, 0, 0, 0);
    G.rflag[G.here - 1] |= RMUNG;
    G.rdesc1[G.here - 1] = 271;
    jigsup(G, 272);
    return true;
  }
  return false;
}

// ---------------------------------------------------------------
// O120 — Bucket function
// ---------------------------------------------------------------

function oc_bucket(G, arg, av, waslit) {
  if (arg === 1) return false; // read in
  if (arg === 2) {
    // read out
    if (G.ocan[WATER - 1] === BUCKE && !G.bucktf) {
      G.bucktf = true;
      G.cflag[CEVBUC - 1] = true;
      G.ctick[CEVBUC - 1] = 100;
      newsta(G, BUCKE, 290, TWELL, 0, 0);
      if (av === BUCKE) {
        moveto(G, G.oroom[BUCKE - 1], G.winner);
        rmdesc(G, 0);
      }
      return true;
    }
    if (G.ocan[WATER - 1] !== BUCKE && G.bucktf) {
      G.bucktf = false;
      newsta(G, BUCKE, 291, BWELL, 0, 0);
      if (av === BUCKE) {
        moveto(G, G.oroom[BUCKE - 1], G.winner);
        rmdesc(G, 0);
      }
      return true;
    }
    return false;
  }
  // arg === 0 (normal action)
  if (G.prsa === BURNW) {
    rspeak(G, 928);
    return true;
  }
  if (G.prsa === KICKW) {
    jigsup(G, 1067);
    return true;
  }
  return false;
}

// ---------------------------------------------------------------
// O121 — Eat-me cake
// ---------------------------------------------------------------

function oc_eatme_cake(G) {
  if (G.prsa !== EATW || G.prso !== ECAKE || G.here !== ALICE) return false;
  newsta(G, ECAKE, 273, 0, 0, 0);
  G.oflag1[ROBOT - 1] &= ~VISIBT;
  for (let i = 1; i <= G.olnt; i++) {
    if (G.oroom[i - 1] === ALICE && G.osize[i - 1] !== 10000) {
      G.osize[i - 1] *= 64;
      G.oroom[i - 1] = ALISM;
    }
  }
  return moveto(G, ALISM, G.winner);
}

// ---------------------------------------------------------------
// O122 — Icings
// ---------------------------------------------------------------

function oc_icings(G, odo2) {
  if (G.prsa === READW) {
    let i = 274;
    if (G.prsi !== 0) i = 275;
    if (G.prsi === BOTTL) i = 276;
    if (G.prsi === FLASK) i = 277 + (G.prso - ORICE);
    rspeak(G, i);
    return true;
  }
  if (G.prsa === THROWW && G.prso === RDICE && G.prsi === POOL) {
    newsta(G, POOL, 280, 0, 0, 0);
    G.oflag1[SAFFR - 1] |= VISIBT;
    return true;
  }
  if (G.here !== ALICE && G.here !== ALISM && G.here !== ALITR) return false;

  if ((G.prsa === EATW || G.prsa === THROWW) && G.prso === ORICE) {
    newsta(G, ORICE, 0, 0, 0, 0);
    G.rflag[G.here - 1] |= RMUNG;
    G.rdesc1[G.here - 1] = 281;
    jigsup(G, 282);
    return true;
  }
  if (G.prsa === EATW && G.prso === BLICE) {
    newsta(G, BLICE, 283, 0, 0, 0);
    if (G.here === ALISM) {
      G.oflag1[ROBOT - 1] |= VISIBT;
      for (let i = 1; i <= G.olnt; i++) {
        if (G.oroom[i - 1] === G.here && G.osize[i - 1] !== 10000) {
          G.oroom[i - 1] = ALICE;
          G.osize[i - 1] = Math.floor(G.osize[i - 1] / 64);
        }
      }
      return moveto(G, ALICE, G.winner);
    }
    jigsup(G, 284);
    return true;
  }
  return false;
}

// ---------------------------------------------------------------
// O123 — Brick
// ---------------------------------------------------------------

function oc_brick(G) {
  if (G.prsa !== BURNW) return false;
  newsta(G, BRICK, 0, 0, 0, 0);
  jigsup(G, 150);
  return true;
}

// ---------------------------------------------------------------
// O124 — Myself
// ---------------------------------------------------------------

function oc_myself(G, odo2) {
  if (G.prsa === GIVEW && (G.oflag2[G.prso - 1] & NOCHBT) === 0) {
    if (G.prso === WATER) {
      newsta(G, WATER, 615, 0, 0, 0);
      return true;
    }
    newsta(G, G.prso, 2, 0, 0, PLAYER);
    return true;
  }
  if (G.prsa === TAKEW) {
    rspeak(G, 286);
    return true;
  }
  if ((G.prsa === KILLW || G.prsa === MUNGW) && G.prso === OPLAY) {
    G.winner = PLAYER;
    jigsup(G, 287);
    return true;
  }
  return false;
}

// ---------------------------------------------------------------
// O125 — Panels inside mirror
// ---------------------------------------------------------------

function oc_panels(G) {
  if (G.prsa !== PUSHW) return false;
  if (G.poleuf === 0) {
    let i = 731;
    if (G.mdir % 180 === 0) i = 732;
    rspeak(G, i);
    return true;
  }
  if (G.mloc === MRG) {
    rspeak(G, 733);
    jigsup(G, 685);
    return true;
  }
  let i = 831;
  if (G.prso === RDWAL || G.prso === YLWAL) i = 830;
  rspeak(G, i);
  G.mdir = (G.mdir + 45 + 270 * (i - 830)) % 360;
  rspsub(G, 734, 695 + Math.floor(G.mdir / 45));
  if (G.wdopnf) rspeak(G, 730);
  G.wdopnf = false;
  return true;
}

// ---------------------------------------------------------------
// O126 — Ends inside mirror
// ---------------------------------------------------------------

function oc_ends(G) {
  if (G.prsa !== PUSHW) return false;
  if (G.mdir % 180 !== 0) {
    rspeak(G, 735); // won't budge
    return true;
  }
  if (G.prso === PINDR) {
    // push pine wall
    if ((G.mloc === MRC && G.mdir === 180) ||
        (G.mloc === MRD && G.mdir === 0) ||
        G.mloc === MRG) {
      rspeak(G, 737); // garden sees you
      jigsup(G, 685);
      return true;
    }
    rspeak(G, 736); // opens
    G.wdopnf = true;
    G.cflag[CEVPIN - 1] = true;
    G.ctick[CEVPIN - 1] = 5;
    return true;
  }
  // push mirror end
  let nloc = G.mloc - 1;
  if (G.mdir === 0) nloc = G.mloc + 1;
  if (nloc >= MRA && nloc <= MRD) {
    let i = 699;
    if (G.mdir === 0) i = 695;
    let j = 739;
    if (G.poleuf !== 0) j = 740;
    rspsub(G, j, i);
    G.mloc = nloc;
    if (G.mloc === MRG) {
      if (G.poleuf !== 0) {
        rspeak(G, 741);
        jigsup(G, 743);
        return true;
      }
      if (G.mropnf || G.wdopnf) {
        rspeak(G, 744);
        jigsup(G, 743);
        return true;
      }
      if (G.mr1f && G.mr2f) return true;
      rspeak(G, 742);
      jigsup(G, 743);
      return true;
    }
    return true;
  }
  rspeak(G, 738); // reached end
  return true;
}

// ---------------------------------------------------------------
// O127 — Global guardians
// ---------------------------------------------------------------

function oc_guardians(G) {
  if (G.prsa === ATTACW || G.prsa === KILLW || G.prsa === MUNGW) {
    jigsup(G, 745);
    return true;
  }
  if (G.prsa === HELLOW) {
    rspeak(G, 746);
    return true;
  }
  return false;
}

// ---------------------------------------------------------------
// O128 — Global master
// ---------------------------------------------------------------

function oc_master(G) {
  if ((G.prsa === ATTACW || G.prsa === KILLW || G.prsa === MUNGW) &&
      G.prso === MASTER && G.prsi !== MASTER) {
    G.winner = PLAYER;
    jigsup(G, 747);
    return true;
  }
  if (G.prsa === TAKEW) {
    rspeak(G, 748);
    return true;
  }
  return false;
}

// ---------------------------------------------------------------
// O129 — Numeral five (take five)
// ---------------------------------------------------------------

function oc_numeral_five(G) {
  if (G.prsa !== TAKEW) return false;
  rspeak(G, 419); // time passes
  for (let i = 0; i < 3; i++) {
    if (clockd(G)) return true;
  }
  return true;
}

// ---------------------------------------------------------------
// O130 — Crypt function
// ---------------------------------------------------------------

function oc_crypt(G) {
  if (!G.endgmf) return oc_heads(G); // if not endgame, same as heads
  if (G.prsa === OPENW) {
    let i = 793;
    if (qopen(G, TOMB)) i = 794;
    rspeak(G, i);
    G.oflag2[TOMB - 1] |= OPENBT;
    return true;
  }
  if (G.prsa === CLOSEW) {
    let i = 795;
    if (qopen(G, TOMB)) i = 796;
    rspeak(G, i);
    G.oflag2[TOMB - 1] &= ~OPENBT;
    if (G.here === CRYPT) {
      G.cflag[CEVSTE - 1] = true;
      G.ctick[CEVSTE - 1] = 3;
    }
    return true;
  }
  return oc_heads(G); // fall through to heads handler
}

// ---------------------------------------------------------------
// O131 — Global ladder
// ---------------------------------------------------------------

function oc_global_ladder(G) {
  if (G.cpvec[G.cphere + 1] !== -2 && G.cpvec[G.cphere - 1] !== -3) {
    rspeak(G, 865); // no ladder here
    return true;
  }
  if (G.prsa === CLMBW || G.prsa === CLMBUW) {
    if (G.cphere === 10 && G.cpvec[G.cphere + 1] === -2) {
      moveto(G, CPANT, G.winner);
      rmdesc(G, 3);
      return true;
    }
    rspeak(G, 867); // hit your head
    return true;
  }
  rspeak(G, 866); // climb it?
  return true;
}

// ===============================================================
// EXTERNAL HANDLERS: TROLLP, CYCLOP, THIEFP, BALLOP
// ===============================================================

// ---------------------------------------------------------------
// TROLLP — Troll function
// ---------------------------------------------------------------

export function trollp(G, arg) {
  if (G.prsa === FIGHTW) {
    if (G.ocan[AXE - 1] === TROLL) return false; // got axe, nothing
    let i = 433;
    if (qhere(G, AXE, G.here) && !prob(G, 25, 10)) {
      i = 434;
      newsta(G, AXE, 0, 0, TROLL, 0);
    }
    if (qhere(G, TROLL, G.here)) rspeak(G, i);
    return true;
  }

  if (G.prsa === DEADXW) {
    G.trollf = true;
    return true;
  }

  if (G.prsa === OUTXW) {
    G.trollf = true;
    G.oflag1[AXE - 1] &= ~VISIBT;
    G.odesc1[TROLL - 1] = 435;
    return true;
  }

  if (G.prsa === INXW ||
      ((G.prsa === ALARMW || G.prsa === KICKW) && G.ocapac[TROLL - 1] < 0)) {
    G.ocapac[TROLL - 1] = Math.abs(G.ocapac[TROLL - 1]);
    G.oflag1[AXE - 1] |= VISIBT;
    G.trollf = false;
    G.odesc1[TROLL - 1] = 436;
    if (qhere(G, TROLL, G.here)) rspeak(G, 437);
    return true;
  }

  if (G.prsa === FRSTQW) {
    return prob(G, 33, 66);
  }

  if (G.prsa === MOVEW || G.prsa === TAKEW || G.prsa === MUNGW ||
      G.prsa === THROWW || G.prsa === GIVEW) {
    if (G.ocapac[TROLL - 1] < 0) {
      G.ocapac[TROLL - 1] = Math.abs(G.ocapac[TROLL - 1]);
      G.oflag1[AXE - 1] |= VISIBT;
      G.trollf = false;
      G.odesc1[TROLL - 1] = 436;
      rspeak(G, 437);
    }
    if (G.prsa === TAKEW || G.prsa === MOVEW) {
      rspeak(G, 438); // joke
      return true;
    }
    if (G.prsa === MUNGW) {
      rspeak(G, 439); // joke
      return true;
    }
    if (G.prso === 0) return false;
    let i = 440;
    if (G.prsa === GIVEW) i = 441;
    rspsub(G, i, G.odesc2[G.prso - 1]);
    if (G.prso === KNIFE) {
      rspeak(G, 443); // throws it back
      G.oflag2[TROLL - 1] |= FITEBT;
      return true;
    }
    newsta(G, G.prso, 442, 0, 0, 0); // eats it
    return true;
  }

  if (G.trollf && G.prsa === HELLOW) {
    rspeak(G, 366);
    return true;
  }

  return false;
}

// ---------------------------------------------------------------
// CYCLOP — Cyclops function
// ---------------------------------------------------------------

export function cyclop(G, arg) {
  if (G.cyclof) {
    // cyclops is asleep
    if (G.prsa === ALARMW || G.prsa === MUNGW || G.prsa === KICKW ||
        G.prsa === BURNW || G.prsa === KILLW || G.prsa === ATTACW) {
      G.cyclof = false;
      rspeak(G, 187);
      G.rvcyc = Math.abs(G.rvcyc);
      G.oflag2[CYCLO - 1] |= FITEBT;
      return true;
    }
    return false;
  }

  if (G.prsa === GIVEW) {
    if (G.prso === FOOD) {
      if (G.rvcyc >= 0) {
        newsta(G, FOOD, 189, 0, 0, 0);
        G.rvcyc = Math.min(-1, -G.rvcyc);
      }
      G.cflag[CEVCYC - 1] = true;
      G.ctick[CEVCYC - 1] = -1;
      return true;
    }
    if (G.prso === WATER) {
      if (G.rvcyc < 0) {
        newsta(G, G.prso, 190, 0, 0, 0);
        G.cyclof = true;
        G.oflag2[CYCLO - 1] &= ~FITEBT;
        G.cflag[CEVCYC - 1] = false;
        return true;
      }
      rspeak(G, 191); // not thirsty
      return false;
    }
    if (G.prso === GARLI) {
      rspeak(G, 193);
      return true;
    }
    rspeak(G, 192); // inedible
    return true;
  }

  if (G.prsa === KILLW || G.prsa === ATTACW ||
      G.prsa === MUNGW || G.prsa === THROWW) {
    G.cflag[CEVCYC - 1] = true;
    G.ctick[CEVCYC - 1] = -1;
    let i = 201;
    if (G.prsa === MUNGW) i = 912;
    rspeak(G, i);
    return true;
  }

  if (G.prsa === TAKEW) { rspeak(G, 202); return true; }
  if (G.prsa === TIEW) { rspeak(G, 203); return true; }

  return false;
}

// ---------------------------------------------------------------
// THIEFP — Thief function
// ---------------------------------------------------------------

export function thiefp(G, arg) {
  if (G.prsa === FIGHTW) {
    if (G.ocan[STILL - 1] === THIEF) return false; // got stiletto
    if (qhere(G, STILL, G.thfpos)) {
      newsta(G, STILL, 0, 0, THIEF, 0); // recover
      if (qhere(G, THIEF, G.here)) rspeak(G, 499);
      return true;
    }
    newsta(G, THIEF, 0, 0, 0, 0); // vanish
    if (qhere(G, THIEF, G.here)) rspeak(G, 498);
    return true;
  }

  if (G.prsa === DEADXW) {
    G.thfact = false;
    if (G.here === TREAS) {
      let j = 501;
      for (let i = 1; i <= G.olnt; i++) {
        if (i === CHALI || i === THIEF || !qhere(G, i, G.here)) continue;
        G.oflag1[i - 1] |= VISIBT;
        rspsub(G, j, G.odesc2[i - 1]);
        j = 502;
        if (!qempty(G, i) &&
            ((G.oflag1[i - 1] & TRANBT) !== 0 || (G.oflag2[i - 1] & OPENBT) !== 0)) {
          princo(G, i, 573, true);
        }
      }
    }
    // drop anything thief is carrying
    let j = 500;
    for (let i = 1; i <= G.olnt; i++) {
      if (G.oadv[i - 1] !== -THIEF) continue;
      newsta(G, i, 0, G.here, 0, 0);
      rspsub(G, j, G.odesc2[i - 1]);
      j = 502;
      if (!qempty(G, i) &&
          ((G.oflag1[i - 1] & TRANBT) !== 0 || (G.oflag2[i - 1] & OPENBT) !== 0)) {
        princo(G, i, 573, true);
      }
    }
    return true;
  }

  if (G.prsa === FRSTQW) {
    return prob(G, 20, 75);
  }

  if (G.prsa === HELLOW && G.ocapac[THIEF - 1] < 0) {
    rspeak(G, 626);
    return true;
  }

  if (G.prsa === OUTXW) {
    G.thfact = false;
    G.odesc1[THIEF - 1] = 504;
    G.oflag1[STILL - 1] &= ~VISIBT;
    return true;
  }

  if (G.prsa === INXW ||
      ((G.prsa === ALARMW || G.prsa === KICKW) && G.ocapac[THIEF - 1] < 0)) {
    G.ocapac[THIEF - 1] = Math.abs(G.ocapac[THIEF - 1]);
    if (qhere(G, THIEF, G.here)) rspeak(G, 505);
    G.thfact = true;
    G.odesc1[THIEF - 1] = 503;
    G.oflag1[STILL - 1] |= VISIBT;
    return true;
  }

  if (G.prsa === TAKEW) {
    rspeak(G, 506); // joke
    return true;
  }

  if (G.prsa === THROWW && G.prso === KNIFE &&
      (G.oflag2[THIEF - 1] & FITEBT) === 0) {
    if (prob(G, 10, 10)) {
      let j = 508;
      for (let i = 1; i <= G.olnt; i++) {
        if (G.oadv[i - 1] !== -THIEF) continue;
        j = 509;
        newsta(G, i, 0, G.here, 0, 0);
      }
      newsta(G, THIEF, j, 0, 0, 0);
      return true;
    }
    rspeak(G, 507); // thief gets mad
    G.oflag2[THIEF - 1] |= FITEBT;
    return true;
  }

  if ((G.prsa === THROWW || G.prsa === GIVEW) &&
      G.prso !== 0 && G.prso !== THIEF) {
    if (G.ocapac[THIEF - 1] < 0) {
      G.ocapac[THIEF - 1] = Math.abs(G.ocapac[THIEF - 1]);
      G.thfact = true;
      G.odesc1[THIEF - 1] = 503;
      G.oflag1[STILL - 1] |= VISIBT;
      rspeak(G, 510);
    }
    if (G.prso === BRICK && G.ocan[FUSE - 1] === BRICK &&
        G.ctick[CEVFUS - 1] !== 0) {
      rspeak(G, 511); // refuses bomb
      return true;
    }
    if (G.prso === WATER) {
      newsta(G, WATER, 1081, 0, 0, 0);
      return true;
    }
    newsta(G, G.prso, 0, 0, 0, -THIEF);
    if (G.otval[G.prso - 1] > 0) {
      rspsub(G, 627, G.odesc2[G.prso - 1]); // engrossed
      G.thfenf = true;
      return true;
    }
    rspsub(G, 512, G.odesc2[G.prso - 1]);
    return true;
  }

  return false;
}

// ---------------------------------------------------------------
// BALLOP — Balloon function
// ---------------------------------------------------------------

export function ballop(G, arg) {
  if (arg === 2) {
    // readout
    if (G.prsa !== LOOKW) return false;
    if (G.binff !== 0) {
      rspsub(G, 544, G.odesc2[G.binff - 1]); // inflated
    } else {
      rspeak(G, 543); // not inflated
    }
    if (G.btief !== 0) rspeak(G, 545); // hooked
    return false;
  }

  if (arg === 1) {
    // readin
    if (G.prsa === WALKW) {
      if (findxt(G, G.prso, G.here)) {
        if (G.btief !== 0) {
          rspeak(G, 547); // tied up
          return true;
        }
        if (G.xtype !== XNORM) return false;
        if ((G.rflag[G.xroom1 - 1] & RMUNG) !== 0) return false;
        G.bloc = G.xroom1;
        G.cflag[CEVBAL - 1] = true;
        G.ctick[CEVBAL - 1] = 3;
        return false;
      }
      rspeak(G, 546); // no exit
      return true;
    }
    if (G.prsa === TAKEW && G.prso === G.binff) {
      rspsub(G, 548, G.odesc2[G.binff - 1]); // recep too hot
      return true;
    }
    if (G.prsa === PUTW && G.prsi === RECEP && !qempty(G, RECEP)) {
      rspeak(G, 549); // already full
      return true;
    }
    return false;
  }

  // arg === 0 (normal action)
  if (G.prsa === BURNW && G.ocan[G.prso - 1] === RECEP) {
    rspsub(G, 550, G.odesc2[G.prso - 1]); // light fire
    G.cflag[CEVBRN - 1] = true;
    G.ctick[CEVBRN - 1] = G.osize[G.prso - 1] * 20;
    G.oflag1[G.prso - 1] = (G.oflag1[G.prso - 1] | (ONBT | FLAMBT | LITEBT)) & ~(TAKEBT | READBT);
    if (G.binff !== 0) return true; // already inflated
    if (!G.blabf) newsta(G, BLABE, 0, 0, BALLO, 0);
    G.blabf = true;
    G.binff = G.prso;
    G.cflag[CEVBAL - 1] = true;
    G.ctick[CEVBAL - 1] = 3;
    rspeak(G, 551);
    return true;
  }
  return false;
}
