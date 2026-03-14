// objects_sobjs.js - Simple objects processor (handlers 1-31)
//
// Ported from objects.f SOBJS function (Fortran Dungeon V4.0)
// COPYRIGHT 1980, 1990, INFOCOM COMPUTERS AND COMMUNICATIONS, CAMBRIDGE MA.
// Faithful port to JavaScript by machine translation.

import {
  // Array/size params
  OMAX,

  // Room indices
  DOME, MTORC, SLIDE, TSHAF, BSHAF, CLEAR, RESER, TREAS,
  LROOM, CELLA, MGRAT, FORE3, MTREE, LLD2,
  CPANT, CPUZZ,

  // Verb indices
  TAKEW, THROWW, MUNGW, TIEW, UNTIEW, CLMBDW, DROPW,
  RAISEW, LOWERW, MOVEW, LOOKUW, LOOKW, LOOKIW, EXAMIW,
  RUBW, TURNW, OILW, OPENW, CLOSEW, BURNW,
  PUSHW, INFLAW, DEFLAW, PLUGW, SQUEEW, PUTW,
  GIVEW, FINDW, BOARDW, TRNONW, TRNOFW,

  // Object flag bits (oflag1)
  VISIBT, NDSCBT,

  // Object flag bits (oflag2)
  OPENBT, CLMBBT, SCRDBT, FITEBT,

  // Object indices
  GUNK, BOTTL, ROPE, SWORD, LAMP, BLAMP, RUG, DOOR,
  TIMBE, COFFI, GHOST, TUBE, PUTTY, WRENC, SCREW, CHALI,
  THIEF, GRATE, RAILI, LEAK, RBUTT, IBOAT, DBOAT, RBOAT,
  PUMP, STICK, BROPE, HOOK1, HOOK2, SAFE, BRICK, FUSE,
  GNOME, COKES, ROBOT, WATER, COAL, MACHI, DIAMO,
  TRUNK, TBASK, FBASK, LUNGS,

  // Actor indices
  PLAYER, AROBOT,

  // Room flags
  RLIGHT, RLAND, RWATER, RFILL, RSEEN,

  // Clock events
  CEVLNT, CEVMNT, CEVBAL, CEVFUS, CEVVLG, CEVGNO,

} from './constants.js';

import {
  rspeak, rspsub, newsta, opncls,
  lit, moveto, robadv, robrm, rnd,
} from './support.js';

// ---------------------------------------------------------------
// Helper: qopen — test if object has OPENBT set in oflag2
// ---------------------------------------------------------------

function qopen(G, obj) {
  return (G.oflag2[obj - 1] & OPENBT) !== 0;
}

// ---------------------------------------------------------------
// SOBJS — Simple objects dispatcher (ri = 1..31)
// ---------------------------------------------------------------

export function sobjs(G, ri, arg) {
  let odo2 = 0;
  let odi2 = 0;
  if (G.prso !== 0 && G.prso <= OMAX) odo2 = G.odesc2[G.prso - 1];
  if (G.prsi !== 0) odi2 = G.odesc2[G.prsi - 1];
  const av = G.avehic[G.winner - 1];
  const waslit = lit(G, G.here);

  let result;
  switch (ri) {
    case 1: result = o_gunk(G); break;
    case 2: result = o_trophy_case(G); break;
    case 3: result = o_bottle(G); break;
    case 4: result = o_rope(G, odo2, odi2, waslit); break;
    case 5: result = o_sword(G); break;
    case 6: result = o_lantern(G, waslit); break;
    case 7: result = o_rug(G); break;
    case 8: result = o_skeleton(G); break;
    case 9: result = o_mirror(G); break;
    case 10: result = o_dumbwaiter(G, waslit); break;
    case 11: result = o_ghost(G); break;
    case 12: result = o_tube(G); break;
    case 13: result = o_chalice(G); break;
    case 14: result = o_painting(G); break;
    case 15: result = o_bolt(G, odi2); break;
    case 16: result = o_grating(G, waslit); break;
    case 17: result = o_trapdoor(G); break;
    case 18: result = o_durable_door(G); break;
    case 19: result = o_master_switch(G, odi2); break;
    case 20: result = o_leak(G, odi2); break;
    case 21: result = o_buttons(G, waslit); break;
    case 22: result = o_iboat(G, odi2); break;
    case 23: result = o_dboat(G, odi2); break;
    case 24: result = o_rboat(G, arg, av, waslit); break;
    case 25: result = o_braided_rope(G, odo2); break;
    case 26: result = o_safe(G); break;
    case 27: result = o_fuse(G); break;
    case 28: result = o_gnome(G, odo2, waslit); break;
    case 29: result = o_coke_bottles(G, odo2); break;
    case 30: result = o_robot(G, odo2, waslit); break;
    case 31: result = o_grue(G); break;
    default: return true; // BUG(6, ri)
  }
  return result;
}

// ---------------------------------------------------------------
// O1 — Gunk
// ---------------------------------------------------------------

function o_gunk(G) {
  if (G.ocan[GUNK - 1] === 0) return false;         // not inside? f
  newsta(G, GUNK, 122, 0, 0, 0);                     // falls apart.
  return true;
}

// ---------------------------------------------------------------
// O2 — Trophy case
// ---------------------------------------------------------------

function o_trophy_case(G) {
  if (G.prsa !== TAKEW) return false;                 // take?
  rspeak(G, 128);                                     // cant.
  return true;
}

// ---------------------------------------------------------------
// O3 — Bottle
// ---------------------------------------------------------------

function o_bottle(G) {
  if (G.prsa === THROWW && G.prso === BOTTL) {
    newsta(G, BOTTL, 129, 0, 0, 0);                  // breaks.
    return true;
  }
  if (G.prsa === MUNGW) {
    newsta(G, BOTTL, 131, 0, 0, 0);                  // breaks.
    return true;
  }
  return false;
}

// ---------------------------------------------------------------
// O4 — Rope
// ---------------------------------------------------------------

function o_rope(G, odo2, odi2, waslit) {
  // Check if NOT in dome/slide/no-indirect/timber/coffin context
  if (G.here !== DOME && G.here !== SLIDE && G.prsi !== 0 &&
      G.prsi !== TIMBE && G.prsi !== COFFI) {
    if (G.prsa === TIEW) rspeak(G, 135);             // tie, cant do it.
    // Clean up rope status (label 6050)
    rope_cleanup(G);
    return true;
  }

  // Climb down from above puzzle room (6100)
  if (G.prsa === CLMBDW && G.here === CPANT) {
    if (G.ttie === 0 || G.oroom[G.ttie - 1] !== G.here) {
      // Not tied or not tied here (6150)
      rspeak(G, 1029);                               // not tied.
      return false;
    }
    // Tied here — tumbles after you (6100)
    rspsub(G, 1028, G.odesc2[G.ttie - 1]);
    newsta(G, ROPE, 0, CPUZZ, 0, 0);                 // now in puzzle room.
    newsta(G, G.ttie, 0, CPUZZ, 0, 0);
    return false;                                     // not handled here.
  }

  // Tie rope (6200)
  if (G.prsa === TIEW) {
    if (G.prsi === RAILI) {                           // to railing? (6200)
      if (G.domef || G.ttie !== 0) {                  // already tied? (6250)
        rspeak(G, 136);
        return true;
      }
      G.domef = true;                                 // now tied.
      newsta(G, ROPE, 137, DOME, 0, 0);              // put in dome room.
      rope_make_climbable(G);                         // label 6225
      return true;
    }
    // Tie to timber or coffin (6300)
    if (G.prsi !== TIMBE && G.prsi !== COFFI) return false;
    if (G.domef || G.ttie !== 0) {                    // already done? (6250)
      rspeak(G, 136);
      return true;
    }
    if (G.oroom[G.prsi - 1] === 0) {                 // target on ground? (6350)
      rspeak(G, 1025);                               // too clumsy.
      return true;
    }
    rspsub(G, 961, odi2);                             // now tied to object.
    G.ttie = G.prsi;
    if (G.prsi === TIMBE) G.odesc1[TIMBE - 1] = 1030;
    if (G.prsi === COFFI) G.odesc1[COFFI - 1] = 1031;
    if (G.here === CPANT) rspeak(G, 1056);            // room-specific words.
    if (G.here === SLIDE) rspeak(G, 339);
    if (G.here === SLIDE) G.oflag1[G.prsi - 1] |= NDSCBT;
    newsta(G, ROPE, 0, G.here, 0, 0);                // put rope in room.
    rope_make_climbable(G);                           // label 6225
    return true;
  }

  // Untie rope (6400)
  if (G.prsa === UNTIEW) {
    if (!G.domef && G.ttie === 0) {                   // not tied? (6500)
      rspeak(G, 134);
      return true;
    }
    rspeak(G, 139);                                   // report
    rope_cleanup(G);                                  // clean up all status (6050)
    return true;
  }

  // Drop in dome while untied (6600)
  if (!G.domef && G.prsa === DROPW && G.here === DOME) {
    newsta(G, ROPE, 140, MTORC, 0, 0);               // drop.
    return true;
  }

  // Take while tied to railing (6700)
  if (G.prsa === TAKEW && G.domef) {
    rspeak(G, 141);                                   // take & tied.
    return true;
  }

  // Take while tied to timber/coffin (6800)
  if (G.prsa === TAKEW && G.ttie !== 0) {
    rspsub(G, 926, G.odesc2[G.ttie - 1]);            // take & tied.
    return true;
  }

  return false;
}

// Rope helper: label 6050 — clean up rope status
function rope_cleanup(G) {
  G.domef = false;                                    // not tied in dome.
  G.ttie = 0;                                        // not tied to timber.
  G.oflag1[TIMBE - 1] &= ~NDSCBT;
  G.oflag1[COFFI - 1] &= ~NDSCBT;
  G.odesc1[TIMBE - 1] = 1032;                        // restore timber, coffin
  G.odesc1[COFFI - 1] = 1033;
  G.oflag1[ROPE - 1] &= ~NDSCBT;
  G.oflag2[ROPE - 1] &= ~CLMBBT;                    // rope not climbable
}

// Rope helper: label 6225 — make rope climbable
function rope_make_climbable(G) {
  G.oflag1[ROPE - 1] |= NDSCBT;
  G.oflag2[ROPE - 1] |= CLMBBT;                     // now climbable
}

// ---------------------------------------------------------------
// O5 — Sword
// ---------------------------------------------------------------

function o_sword(G) {
  if (G.prsa === TAKEW && G.winner === PLAYER) {
    G.swdact = true;                                  // turn on demon.
  }
  return false;
}

// ---------------------------------------------------------------
// O6 — Lantern
// ---------------------------------------------------------------

function o_lantern(G, waslit) {
  if (G.prsa === THROWW && G.prso === LAMP) {
    newsta(G, LAMP, 0, 0, 0, 0);                     // kill lamp,
    newsta(G, BLAMP, 142, G.here, 0, 0);             // replace with broken.
    if (G.here === MTREE) newsta(G, BLAMP, 0, FORE3, 0, 0);
    if (G.lastit === LAMP) G.lastit = BLAMP;          // fix last it reference.
    G.cflag[CEVLNT - 1] = false;                     // turn off timer.
    // Check light change (label 50)
    if (waslit && !lit(G, G.here)) rspeak(G, 406);
    return true;
  }
  if (G.prsa === TRNONW) G.cflag[CEVLNT - 1] = true;
  if (G.prsa === TRNOFW) G.cflag[CEVLNT - 1] = false;
  return false;
}

// ---------------------------------------------------------------
// O7 — Rug
// ---------------------------------------------------------------

function o_rug(G) {
  if (G.prsa === RAISEW) {
    rspeak(G, 143);                                   // cant
    return true;
  }
  if (G.prsa === TAKEW) {
    rspeak(G, 144);                                   // cant
    return true;
  }
  if (G.prsa === MOVEW) {
    rspeak(G, 145 + G.orrug);
    G.orrug = 1;
    G.oflag1[DOOR - 1] |= VISIBT;                   // reveal door.
    return true;
  }
  if (G.prsa === LOOKUW && G.orrug === 0 && !qopen(G, DOOR)) {
    rspeak(G, 345);                                   // look under rug?
    return true;
  }
  return false;
}

// ---------------------------------------------------------------
// O8 — Skeleton
// ---------------------------------------------------------------

function o_skeleton(G) {
  const i = robrm(G, G.here, 100, LLD2, 0, 0) +
            robadv(G, G.winner, LLD2, 0, 0);
  rspeak(G, 162);                                     // curses.
  return true;
}

// ---------------------------------------------------------------
// O9 — Mirror
// ---------------------------------------------------------------

function o_mirror(G) {
  if (!G.mirrmf && G.prsa === RUBW) {
    const mroom = G.here ^ 1;                         // calculate new rm (IEOR).
    for (let i = 0; i < G.olnt; i++) {                // interchange objs.
      if (G.oroom[i] === G.here) G.oroom[i] = -1;
      if (G.oroom[i] === mroom) G.oroom[i] = G.here;
      if (G.oroom[i] === -1) G.oroom[i] = mroom;
    }
    moveto(G, mroom, G.winner);
    rspeak(G, 163);                                   // shake world.
    return true;
  }
  if (G.prsa === LOOKW || G.prsa === LOOKIW || G.prsa === EXAMIW) {
    let i = 164;                                      // mirror ok.
    if (G.mirrmf) i = 165;                            // mirror dead.
    rspeak(G, i);
    return true;
  }
  if (G.prsa === TAKEW) {
    rspeak(G, 166);                                   // joke.
    return true;
  }
  if (G.prsa === MUNGW || G.prsa === THROWW) {
    let i = 167;                                      // mirror breaks.
    if (G.mirrmf) i = 168;                            // mirror already broken.
    G.mirrmf = true;
    G.badlkf = true;
    rspeak(G, i);
    return true;
  }
  return false;
}

// ---------------------------------------------------------------
// O10 — Dumbwaiter
// ---------------------------------------------------------------

function o_dumbwaiter(G, waslit) {
  if (G.prsa === RAISEW) {
    if (G.cagetf) {                                   // already at top? (16400)
      rspeak(G, 125 + rnd(3));
      return true;
    }
    newsta(G, TBASK, 175, TSHAF, 0, 0);              // raise basket.
    newsta(G, FBASK, 0, BSHAF, 0, 0);
    if (G.here === TSHAF) G.lastit = TBASK;
    if (G.here === BSHAF) G.lastit = FBASK;
    G.cagetf = true;                                  // at top.
    return true;
  }
  if (G.prsa === LOWERW) {
    if (!G.cagetf) {                                  // already at bottom? (16400)
      rspeak(G, 125 + rnd(3));
      return true;
    }
    newsta(G, TBASK, 176, BSHAF, 0, 0);              // lower basket.
    newsta(G, FBASK, 0, TSHAF, 0, 0);
    if (G.here === TSHAF) G.lastit = FBASK;
    if (G.here === BSHAF) G.lastit = TBASK;
    G.cagetf = false;
    // Check light change (label 50)
    if (waslit && !lit(G, G.here)) rspeak(G, 406);
    return true;
  }
  if (G.prso === FBASK || G.prsi === FBASK) {
    rspeak(G, 130);                                   // wrong basket.
    return true;
  }
  if (G.prsa === TAKEW) {
    rspeak(G, 177);                                   // joke.
    return true;
  }
  return false;
}

// ---------------------------------------------------------------
// O11 — Ghost
// ---------------------------------------------------------------

function o_ghost(G) {
  if (G.prso === GHOST) {
    rspeak(G, 178);                                   // joke.
    return true;
  }
  rspeak(G, 179);                                     // joke.
  return false;                                       // don't handle.
}

// ---------------------------------------------------------------
// O12 — Tube
// ---------------------------------------------------------------

function o_tube(G) {
  if (G.prsa === PUTW && G.prsi === TUBE) {
    rspeak(G, 186);                                   // cant put back in.
    return true;
  }
  if (G.prsa !== SQUEEW) return false;                // squeeze?
  if (!qopen(G, G.prso)) {
    rspeak(G, 909);                                   // no, can't do it.
    return true;
  }
  if (G.ocan[PUTTY - 1] !== G.prso) {
    rspeak(G, 910);                                   // no, doesn't work.
    return true;
  }
  newsta(G, PUTTY, 911, 0, 0, G.winner);             // putty now in hand.
  return true;
}

// ---------------------------------------------------------------
// O13 — Chalice
// ---------------------------------------------------------------

function o_chalice(G) {
  if (G.prsa === TAKEW && G.ocan[G.prso - 1] === 0 &&
      G.oroom[G.prso - 1] === TREAS &&
      G.oroom[THIEF - 1] === TREAS &&
      (G.oflag2[THIEF - 1] & FITEBT) === 0 &&
      G.thfact) {
    rspeak(G, 204);                                   // cant take.
    return true;
  }
  return false;
}

// ---------------------------------------------------------------
// O14 — Painting
// ---------------------------------------------------------------

function o_painting(G) {
  if (G.prsa !== MUNGW) return false;                 // mung?
  rspeak(G, 205);                                     // destroy painting.
  G.ofval[G.prso - 1] = 0;
  G.otval[G.prso - 1] = 0;
  G.odesc1[G.prso - 1] = 207;
  G.odesc2[G.prso - 1] = 206;
  return true;
}

// ---------------------------------------------------------------
// O15 — Bolt
// ---------------------------------------------------------------

function o_bolt(G, odi2) {
  if (G.prsa === TURNW) {
    if (G.prsi !== WRENC) {                           // with wrench? (27500)
      rspsub(G, 299, odi2);                           // not with that.
      return true;
    }
    if (!G.gatef) {                                   // proper button pushed? (27100)
      rspeak(G, 210);                                 // no, lose.
      return true;
    }
    if (G.lwtidf) {                                   // low tide now? (27200)
      G.lwtidf = false;                               // yes, fill dam.
      rspeak(G, 212);
      if (G.oroom[TRUNK - 1] === RESER) {
        G.oflag1[TRUNK - 1] &= ~VISIBT;
      }
      G.rflag[RESER - 1] = (G.rflag[RESER - 1] | RWATER) & ~RLAND;
      return true;
    }
    // Empty dam (27100 path)
    G.lwtidf = true;
    rspeak(G, 211);
    G.oflag2[COFFI - 1] &= ~SCRDBT;
    G.oflag1[TRUNK - 1] |= VISIBT;                  // materialize trunk.
    G.rflag[RESER - 1] = (G.rflag[RESER - 1] | RLAND) & ~(RWATER + RSEEN);
    return true;
  }
  if (G.prsa === OILW) {
    rspeak(G, 906);                                   // trouble.
    return true;
  }
  return false;
}

// ---------------------------------------------------------------
// O16 — Grating
// ---------------------------------------------------------------

function o_grating(G, waslit) {
  if (G.prsa !== OPENW && G.prsa !== CLOSEW) return false;
  if (!G.grunlf) {                                   // unlocked?
    rspeak(G, 214);                                   // no, locked.
    return true;
  }
  let i = 215;                                        // unlocked, view frm below.
  if (G.here === CLEAR) i = 216;                      // view from clearing.
  const result = opncls(G, GRATE, i, 885);            // open/close.
  G.rflag[MGRAT - 1] &= ~RLIGHT;                    // set light/dark.
  if (!qopen(G, GRATE)) {                            // if not open, done.
    if (waslit && !lit(G, G.here)) rspeak(G, 406);
    return result;
  }
  G.rflag[MGRAT - 1] |= RLIGHT;                     // now lit.
  G.rvclr = 1;                                       // leaves shoved aside.
  newsta(G, GRATE, 0, CLEAR, 0, 0);                  // grating in clearing.
  return true;
}

// ---------------------------------------------------------------
// O17 — Trap door
// ---------------------------------------------------------------

function o_trapdoor(G) {
  if (G.here === LROOM) {
    return opncls(G, DOOR, 218, 219);                 // open/close from living room.
  }
  if (G.here !== CELLA) return false;                 // from cellar?
  if (G.prsa === OPENW && !qopen(G, DOOR)) {
    rspeak(G, 220);                                   // cant open closed door.
    return true;
  }
  return opncls(G, DOOR, 0, 22);                      // normal open/close.
}

// ---------------------------------------------------------------
// O18 — Durable door
// ---------------------------------------------------------------

function o_durable_door(G) {
  let i = 0;                                          // assume no appl.
  if (G.prsa === OPENW) i = 221;                      // open?
  if (G.prsa === BURNW) i = 222;                      // burn?
  if (G.prsa === MUNGW) i = 223 + rnd(3);             // mung?
  if (i === 0) return false;
  rspeak(G, i);
  return true;
}

// ---------------------------------------------------------------
// O19 — Master switch
// ---------------------------------------------------------------

function o_master_switch(G, odi2) {
  if (G.prsa !== TURNW) return false;                 // turn?
  if (G.prsi !== SCREW) {                             // with screwdriver? (31500)
    rspsub(G, 300, odi2);                             // cant turn with that.
    return true;
  }
  if (qopen(G, MACHI)) {                             // lid up? (31600)
    rspeak(G, 227);                                   // lid is up.
    return true;
  }
  rspeak(G, 226);                                     // no, activate.
  if (G.ocan[COAL - 1] === MACHI) {                  // coal inside?
    newsta(G, COAL, 0, 0, 0, 0);                     // kill coal,
    newsta(G, DIAMO, 0, 0, MACHI, 0);                // replace with diamond.
    return true;
  }
  // Kill noncoal objects (31400)
  for (let i = 0; i < G.olnt; i++) {
    if (G.ocan[i] !== MACHI) continue;                // inside machine?
    newsta(G, i + 1, 0, 0, 0, 0);                    // kill object and contents.
    newsta(G, GUNK, 0, 0, MACHI, 0);                 // reduce to gunk.
  }
  return true;
}

// ---------------------------------------------------------------
// O20 — Leak
// ---------------------------------------------------------------

function o_leak(G, odi2) {
  if (G.prso !== LEAK || G.prsa !== PLUGW || G.rvmnt <= 0)
    return false;                                     // plug active leak?
  if (G.prsi !== PUTTY) {                             // with putty? (33100)
    rspsub(G, 301, odi2);                             // cant with that.
    return true;
  }
  G.rvmnt = -1;                                      // disable leak.
  G.ctick[CEVMNT - 1] = 0;
  rspeak(G, 577);
  return true;
}

// ---------------------------------------------------------------
// O21 — Drowning buttons
// ---------------------------------------------------------------

function o_buttons(G, waslit) {
  if (G.prsa !== PUSHW) return false;                 // push?
  const btnIdx = G.prso - RBUTT + 1;                 // 1-based button index
  switch (btnIdx) {
    case 1: {                                         // red (34100)
      G.rflag[G.here - 1] ^= RLIGHT;                 // zap lights.
      let i = 230;
      if ((G.rflag[G.here - 1] & RLIGHT) !== 0) i = 231;
      rspeak(G, i);
      if (waslit && !lit(G, G.here)) rspeak(G, 406);
      return true;
    }
    case 2:                                           // yellow (34200)
      G.gatef = true;                                 // release gate.
      rspeak(G, 232);
      return true;
    case 3:                                           // brown (34300)
      G.gatef = false;                                // interlock gate.
      rspeak(G, 232);
      return true;
    case 4:                                           // blue (34400)
      if (G.rvmnt !== 0) {                            // leak already started? (34500)
        rspeak(G, 234);                               // button jammed.
        return true;
      }
      rspeak(G, 233);                                 // start leak.
      G.rvmnt = 1;
      G.cflag[CEVMNT - 1] = true;
      G.ctick[CEVMNT - 1] = -1;
      G.rflag[G.here - 1] |= RFILL;                 // water present.
      G.oflag1[LEAK - 1] |= VISIBT;                 // bring on the leak.
      return true;
    default:
      return false;                                   // not a button.
  }
}

// ---------------------------------------------------------------
// O22 — Inflatable boat
// ---------------------------------------------------------------

function o_iboat(G, odi2) {
  if (G.prsa !== INFLAW) return false;                // inflate?
  if (G.oroom[IBOAT - 1] === 0) {                    // in room?
    rspeak(G, 235);                                   // no, joke.
    return true;
  }
  if (G.prsi === PUMP) {                              // with pump? (36100)
    newsta(G, IBOAT, 0, 0, 0, 0);                    // kill defl boat,
    newsta(G, RBOAT, 236, G.here, 0, 0);             // repl with inf.
    if (G.lastit === IBOAT) G.lastit = RBOAT;
    G.deflaf = false;
    return true;
  }
  // Jokes (36200)
  let i = 237;
  if (G.prsi !== LUNGS) i = 303;
  rspsub(G, i, odi2);
  return true;
}

// ---------------------------------------------------------------
// O23 — Deflated boat
// ---------------------------------------------------------------

function o_dboat(G, odi2) {
  if (G.prsa === INFLAW) {
    rspeak(G, 238);                                   // joke.
    return true;
  }
  if (G.prsa !== PLUGW) return false;                 // plug?
  if (G.prsi !== PUTTY) {                             // with putty? (33100)
    rspsub(G, 301, odi2);                             // cant with that.
    return true;
  }
  newsta(G, IBOAT, 239, G.oroom[DBOAT - 1], G.ocan[DBOAT - 1], G.oadv[DBOAT - 1]);
  newsta(G, DBOAT, 0, 0, 0, 0);                      // kill defl boat, repl.
  if (G.lastit === DBOAT) G.lastit = IBOAT;
  return true;
}

// ---------------------------------------------------------------
// O24 — Rubber boat
// ---------------------------------------------------------------

function o_rboat(G, arg, av, waslit) {
  if (arg !== 0) return false;                        // dismiss readin, out.
  if (G.prsa === BOARDW && G.oadv[STICK - 1] === G.winner) {
    newsta(G, RBOAT, 0, 0, 0, 0);                    // kill infl boat,
    newsta(G, DBOAT, 240, G.here, 0, 0);             // repl with dead.
    if (G.lastit === RBOAT) G.lastit = DBOAT;
    G.deflaf = true;
    if (waslit && !lit(G, G.here)) rspeak(G, 406);
    return true;
  }
  if (G.prsa === INFLAW) {
    rspeak(G, 367);                                   // yes, joke.
    return true;
  }
  if (G.prsa === DEFLAW) {
    if (av === RBOAT) {                               // in boat? (38300)
      rspeak(G, 242);
      return true;
    }
    if (G.oroom[RBOAT - 1] === 0) {                  // on ground? (38400)
      rspeak(G, 243);
      return true;
    }
    newsta(G, RBOAT, 0, 0, 0, 0);                    // kill infl boat,
    newsta(G, IBOAT, 241, G.here, 0, 0);             // repl with defl.
    if (G.lastit === RBOAT) G.lastit = IBOAT;
    G.deflaf = true;
    if (waslit && !lit(G, G.here)) rspeak(G, 406);
    return true;
  }
  return false;
}

// ---------------------------------------------------------------
// O25 — Braided rope (also balloon receptacle, cloth bag)
// ---------------------------------------------------------------

function o_braided_rope(G, odo2) {
  if (G.prsa === TIEW && G.prso === BROPE &&
      (G.prsi === HOOK1 || G.prsi === HOOK2)) {
    G.btief = G.prsi;                                 // record location.
    G.odesc1[G.btief - 1] = 1072;                    // change description.
    G.cflag[CEVBAL - 1] = false;                     // stall ascent.
    rspeak(G, 248);
    return true;
  }
  if (G.prsa === UNTIEW && G.prso === BROPE) {
    if (G.btief === 0) {                              // tied up? (41200)
      rspeak(G, 249);                                 // no, joke.
      return true;
    }
    rspeak(G, 250);
    G.odesc1[G.btief - 1] = 1073;                    // restore description.
    G.btief = 0;                                      // untie.
    G.cflag[CEVBAL - 1] = true;
    G.ctick[CEVBAL - 1] = 3;                         // restart clock.
    return true;
  }
  if (G.prsa === FINDW || G.prsa === EXAMIW) {
    rspsub(G, 1063, odo2);                            // describe.
    return true;
  }
  if (G.prsa === TAKEW) {
    rspsub(G, 1064, odo2);                            // can't.
    if (G.prso === BROPE) rspeak(G, 1065);            // rope can be tied.
    return true;
  }
  return false;
}

// ---------------------------------------------------------------
// O26 — Safe
// ---------------------------------------------------------------

function o_safe(G) {
  let i = 0;                                          // assume unprocessed.
  if (G.prsa === TAKEW) i = 251;                      // take?
  if (G.prsa === OPENW && G.safef) i = 253;           // open after blast?
  if (G.prsa === OPENW && !G.safef) i = 254;          // open before blast?
  if (G.prsa === CLOSEW && G.safef) i = 253;          // close after?
  if (G.prsa === CLOSEW && !G.safef) i = 255;
  if (i === 0) return false;
  rspeak(G, i);
  return true;
}

// ---------------------------------------------------------------
// O27 — Fuse
// ---------------------------------------------------------------

function o_fuse(G) {
  if (G.prsa !== BURNW) return false;                 // burn?
  rspeak(G, 256);
  G.cflag[CEVFUS - 1] = true;
  G.ctick[CEVFUS - 1] = 2;                           // start countdown.
  return true;
}

// ---------------------------------------------------------------
// O28 — Gnome
// ---------------------------------------------------------------

function o_gnome(G, odo2, waslit) {
  if (G.prsa === GIVEW || G.prsa === THROWW) {
    if (G.otval[G.prso - 1] !== 0) {                  // treasure?
      rspsub(G, 257, odo2);                           // yes, get door.
      newsta(G, G.prso, 0, 0, 0, 0);
      newsta(G, GNOME, 0, 0, 0, 0);                  // vanish gnome.
      G.gnodrf = true;
      if (waslit && !lit(G, G.here)) rspeak(G, 406);
      return true;
    }
    if (G.prso === BRICK && G.ocan[FUSE - 1] === BRICK &&
        G.ctick[CEVFUS - 1] !== 0) {                  // a bomb? (44100)
      newsta(G, GNOME, 927, 0, 0, 0);                // gnome leaves.
      newsta(G, BRICK, 0, G.here, 0, 0);             // brick on floor.
      G.cflag[CEVVLG - 1] = false;                   // turn off gnome clocks.
      G.cflag[CEVGNO - 1] = false;
      return true;
    }
    // No, lose object (44200)
    rspsub(G, 258, odo2);
    newsta(G, G.prso, 0, 0, 0, 0);
    if (waslit && !lit(G, G.here)) rspeak(G, 406);
    return true;
  }
  // Other actions — nervous gnome (44500)
  rspeak(G, 259);
  if (G.gnomef) return true;
  G.cflag[CEVGNO - 1] = true;
  G.ctick[CEVGNO - 1] = 5;                           // schedule byebye.
  G.gnomef = true;
  return true;
}

// ---------------------------------------------------------------
// O29 — Coke bottles
// ---------------------------------------------------------------

function o_coke_bottles(G, odo2) {
  if (G.prsa !== THROWW && G.prsa !== MUNGW) return false;
  newsta(G, COKES, 262, 0, 0, 0);                    // mung bottles.
  if (G.prsi !== COKES) return true;                  // with cokes?
  rspsub(G, 1066, odo2);                             // kill direct object, too.
  newsta(G, G.prso, 0, 0, 0, 0);
  return true;
}

// ---------------------------------------------------------------
// O30 — Robot
// ---------------------------------------------------------------

function o_robot(G, odo2, waslit) {
  if (G.prsa === GIVEW) {
    if (G.prso === WATER) {
      newsta(G, WATER, 1081, 0, 0, 0);               // slips through fingers.
      return true;
    }
    // Put on robot (53100)
    newsta(G, G.prso, 0, 0, 0, AROBOT);
    rspsub(G, 302, odo2);
    return true;
  }
  if ((G.prsa === MUNGW || G.prsa === THROWW) &&
      (G.prso === ROBOT || G.prsi === ROBOT)) {
    newsta(G, ROBOT, 285, 0, 0, 0);                  // kill robot.
    if (waslit && !lit(G, G.here)) rspeak(G, 406);
    return true;
  }
  return false;
}

// ---------------------------------------------------------------
// O31 — Grue
// ---------------------------------------------------------------

function o_grue(G) {
  if (G.prsa === EXAMIW) {
    rspeak(G, 288);                                   // examine?
    return true;
  }
  if (G.prsa === FINDW) {
    rspeak(G, 289);                                   // find?
    return true;
  }
  return false;
}
