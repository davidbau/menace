// rooms.js - Room action handlers for DUNGEON
//
// Ported from rooms.f (Fortran) / rooms.c, nrooms.c (C)
// COPYRIGHT 1980, 1990, INFOCOM COMPUTERS AND COMMUNICATIONS, CAMBRIDGE MA.
// Faithful port to JavaScript by machine translation.

import {
  PLAYER, AROBOT,
  XMIN, XNORTH, XNORM,
  RLIGHT, RLAND, RWATER, RAIR, RSEEN, RMUNG, RFILL, RNWALL, RBUCK,
  LOOKW, LOOKIW, WALKIW, WALKW, TAKEW, PUTW, DROPW, THROWW, SHAKEW,
  LEAPW, RINGW, READW, EXORCW, OPENW, CLOSEW, BURNW, TRNONW, FOOW,
  HFACTR,
  OPENBT, ONBT, TCHBT, FITEBT, VISIBT, NDSCBT, SCRDBT, TAKEBT,
  WINDO, DOOR, GRATE, MACHI, TCASE, THIEF, CHALI, CANDL, TORCH,
  MATCH, BELL, BOOK, HBELL, GHOST, HPOLE, RBOAT, BUOY, EGG, BEGG,
  CANAR, BCANA, IRBOX, TTREE, NEST, FTREE, RBEAM, WARNI, TOMB,
  ODOOR, QDOOR, CDOOR, GARLI, COFFI, WATER, ROBOT, PLID1, PLID2,
  PKH1, PKH2, SCREW, STICK, PKEY, KEYS, MAT, PDOOR, PALAN, PAL3,
  WHOUS, SHOUS, EHOUS, KITCH, LROOM, CELLA, MTROL,
  MAZE1, MGRAT, MAZ15, FORE1, FORE2, FORE3, CLEAR,
  RESER, STREA, EGYPT, ECHOR, SLIDE, TSHAF, BSHAF, MMACH,
  DOME, MTORC, CAROU, RIDDL, LLD1, LLD2, TEMP1, TEMP2,
  MAINT, MCYCL, BLROO, TREAS,
  RIVR1, RIVR2, RIVR3, RIVR4, RIVR5, FCHMP, SBEACH,
  FALLS, MRAIN, POG, VLBOT,
  VAIR1, VAIR2, VAIR3, VAIR4, LEDG2, LEDG3, LEDG4,
  MSAFE, CAGER, CAGED, TWELL, BWELL,
  ALICE, ALISM, ALITR, MTREE,
  BKENT, BKVW, BKVE, BKTWI, BKVAU, BKBOX, CRYPT, TSTRS,
  MRANT, MREYE, MRA, MRB, MRC, MRG, MRD, FDOOR,
  MRAE, MRCE, MRCW, MRGE, MRGW, MRDW, INMIR,
  SCORR, NCORR, PARAP, CELL, PCELL, NCELL,
  CPANT, CPOUT, CPUZZ, PRM, PALRM, SLID1, SLEDG,
  CEVFOR, CEVCYC, CEVSLI, CEVCND, CEVFOL, CEVBRO, CEVXB, CEVXBH, CEVXC, CEVPIN, CEVINQ, CEVSPH, CEVSTE,
  rspeak, rspsub, rspsb2, newsta, qhere, qempty,
  moveto, rmdesc, lit, prob, rnd, scrupd, jigsup, score,
  robadv, robrm, mrhere, cpgoto, princr,
  bug,
} from './support.js';

// ---------------------------------------------------------------
// Helper macros
// ---------------------------------------------------------------

function qopen(G, obj) {
  return (G.oflag2[obj - 1] & OPENBT) !== 0;
}

function qon(G, obj) {
  return (G.oflag1[obj - 1] & ONBT) !== 0;
}

// ---------------------------------------------------------------
// RAPPLI — Room action dispatch
// ---------------------------------------------------------------

export function rappli(G, ri) {
  if (ri === 0) return;

  const handlers = [
    null,  // 0 unused
    room_ehous,   // 1 - East of House
    room_kitch,   // 2 - Kitchen
    room_lroom,   // 3 - Living Room
    room_cella,   // 4 - Cellar
    room_grate,   // 5 - Grating Room
    room_clear,   // 6 - Clearing
    room_ressou,  // 7 - Reservoir South
    room_reser,   // 8 - Reservoir
    room_resnor,  // 9 - Reservoir North
    room_glacie,  // 10 - Glacier Room
    room_forest,  // 11 - Forest Room
    room_mirror,  // 12 - Mirror Room
    room_cave2,   // 13 - Cave2
    room_boom,    // 14 - Boom Room
    room_noobjs,  // 15 - No-objs
    room_mmach,   // 16 - Machine Room
    room_bat,     // 17 - Bat Room
    room_dome,    // 18 - Dome Room
    room_torch,   // 19 - Torch Room
    room_carou,   // 20 - Carousel Room
    room_lld,     // 21 - Land of the Living Dead
    room_lld2,    // 22 - LLD interior
    room_dam,     // 23 - Dam Room
    room_tree,    // 24 - Tree Room
    room_cyclo,   // 25 - Cyclops Room
    room_bkbox,   // 26 - Bank Box Room
    room_treas,   // 27 - Treasure Room
    room_cliff,   // 28 - Cliff Room
    room_rivr4,   // 29 - Rivr4 Room
    room_overf,   // 30 - Overfalls
    room_sledge,  // 31 - Slide Ledge
    room_slide,   // 32 - Slide
    room_falls,   // 33 - Aragain Falls
    room_ledge,   // 34 - Ledge Room
    room_safe,    // 35 - Safe Room
    room_magnet,  // 36 - Magnet Room
    room_cage,    // 37 - Cage Room
    room_mird,    // 38 - Mirror D Room
    room_mirg,    // 39 - Mirror G Room
    room_mirc,    // 40 - Mirror C Room
    room_mirb,    // 41 - Mirror B Room
    room_mira,    // 42 - Mirror A Room
    room_mirce,   // 43 - Mirror C East/West
    room_mirbe,   // 44 - Mirror B East/West
    room_mirae,   // 45 - Mirror A East/West
    room_inmir,   // 46 - Inside Mirror
    room_mreye,   // 47 - Mirror Eye Room
    room_crypt,   // 48 - Inside Crypt
    room_scorr,   // 49 - South Corridor
    room_bdoor,   // 50 - Behind Door
    room_fdoor,   // 51 - Front Door
    room_ncorr,   // 52 - North Corridor
    room_parap,   // 53 - Parapet
    room_cell,    // 54 - Cell
    room_pcell,   // 55 - Prison Cell
    room_ncell,   // 56 - Nirvana Cell
    room_nirva,   // 57 - Nirvana and end of game
    room_tomb,    // 58 - Tomb Room
    room_pside,   // 59 - Puzzle Side Room
    room_cpuzz,   // 60 - Puzzle Room
    room_palrm,   // 61 - Palantir Room
    room_prm,     // 62 - Prm Room
    room_inslide, // 63 - Inslide
    room_cpant,   // 64 - Puzzle Anteroom
  ];

  if (ri < 1 || ri >= handlers.length || !handlers[ri]) {
    bug(G, 1, ri);
    return;
  }

  handlers[ri](G);
}

// ---------------------------------------------------------------
// R1 — East of House
// ---------------------------------------------------------------

function room_ehous(G) {
  if (G.prsa !== LOOKW) return;
  let i = 13; // assume closed
  if (qopen(G, WINDO)) i = 12; // if open, ajar
  rspsub(G, 11, i);
}

// ---------------------------------------------------------------
// R2 — Kitchen
// ---------------------------------------------------------------

function room_kitch(G) {
  if (G.prsa !== LOOKW) {
    // walkin check for brochure
    if (G.prsa !== WALKIW || G.deadf || !G.broc1f || G.broc2f) return;
    G.cflag[CEVBRO - 1] = true;
    G.ctick[CEVBRO - 1] = 3;
    return;
  }
  let i = 13;
  if (qopen(G, WINDO)) i = 12;
  rspsub(G, 14, i);
}

// ---------------------------------------------------------------
// R3 — Living Room
// ---------------------------------------------------------------

function room_lroom(G) {
  if (G.prsa !== LOOKW) {
    // Not a look word, reevaluate trophy case
    if (G.prsa !== TAKEW && (G.prsa !== PUTW || G.prsi !== TCASE)) return;
    G.ascore[G.winner - 1] = G.rwscor;
    for (let i = 1; i <= G.olnt; i++) {
      let j = i;
      while (true) {
        j = G.ocan[j - 1];
        if (j === 0) break;
        if (j === TCASE) {
          G.ascore[G.winner - 1] += G.otval[i - 1];
          break;
        }
      }
    }
    scrupd(G, 0);
    return;
  }
  let i = 15; // assume no hole
  if (G.magicf) i = 16; // cyclops hole
  rspeak(G, i);
  i = 17 + G.orrug; // initial state
  if (qopen(G, DOOR)) i = i + 2; // door open?
  rspeak(G, i);
}

// ---------------------------------------------------------------
// R4 — Cellar
// ---------------------------------------------------------------

function room_cella(G) {
  if (G.prsa !== LOOKW) {
    if (G.prsa !== WALKIW) return;
    if ((G.oflag2[DOOR - 1] & (OPENBT + TCHBT)) !== OPENBT) return;
    G.oflag2[DOOR - 1] = (G.oflag2[DOOR - 1] | TCHBT) & ~OPENBT;
    rspeak(G, 22); // slam and bolt door
    return;
  }
  rspeak(G, 21);
  if (qopen(G, DOOR)) rspeak(G, 623);
}

// ---------------------------------------------------------------
// R5 — Grating Room
// ---------------------------------------------------------------

function room_grate(G) {
  if (G.prsa !== LOOKW) return;
  rspeak(G, 23);
  let i = 24; // assume locked
  if (G.grunlf) i = 26; // unlocked
  if (qopen(G, GRATE)) i = 25; // open
  rspeak(G, i);
}

// ---------------------------------------------------------------
// R6 — Clearing
// ---------------------------------------------------------------

function room_clear(G) {
  if (G.prsa !== LOOKW) return;
  rspeak(G, 27);
  let i = 0; // assume no grating
  if (G.rvclr !== 0) i = 28; // leaves moved
  if (qopen(G, GRATE)) i = 29; // grate open
  rspeak(G, i);
}

// ---------------------------------------------------------------
// R7 — Reservoir South
// ---------------------------------------------------------------

function room_ressou(G) {
  if (G.prsa !== LOOKW) return;
  let i = 31;
  if (G.lwtidf) i = 32;
  rspeak(G, i);
  rspeak(G, 33);
}

// ---------------------------------------------------------------
// R8 — Reservoir
// ---------------------------------------------------------------

function room_reser(G) {
  if (G.prsa !== LOOKW) return;
  let i = 34;
  if (G.lwtidf) i = 35;
  rspeak(G, i);
}

// ---------------------------------------------------------------
// R9 — Reservoir North
// ---------------------------------------------------------------

function room_resnor(G) {
  if (G.prsa !== LOOKW) return;
  let i = 36;
  if (G.lwtidf) i = 37;
  rspeak(G, i);
  rspeak(G, 38);
}

// ---------------------------------------------------------------
// R10 — Glacier Room
// ---------------------------------------------------------------

function room_glacie(G) {
  if (G.prsa !== LOOKW) return;
  rspeak(G, 39);
  let i = 0;
  if (G.glacmf) i = 40;
  if (G.glacrf) i = 41;
  rspeak(G, i);
}

// ---------------------------------------------------------------
// R11 — Forest Room
// ---------------------------------------------------------------

function room_forest(G) {
  if (G.prsa !== WALKIW) return;
  G.cflag[CEVFOR - 1] = true;
  G.ctick[CEVFOR - 1] = -1;
}

// ---------------------------------------------------------------
// R12 — Mirror Room
// ---------------------------------------------------------------

function room_mirror(G) {
  if (G.prsa !== LOOKW) return;
  rspeak(G, 42);
  if (G.mirrmf) rspeak(G, 43);
}

// ---------------------------------------------------------------
// R13 — Cave2
// ---------------------------------------------------------------

function room_cave2(G) {
  if (G.prsa !== WALKIW) return;
  if (prob(G, 50, 20) || G.oadv[CANDL - 1] !== G.winner || !qon(G, CANDL)) return;
  G.oflag1[CANDL - 1] &= ~ONBT;
  rspeak(G, 47);
  G.cflag[CEVCND - 1] = false;
  if (!lit(G, G.here)) rspeak(G, 406);
}

// ---------------------------------------------------------------
// R14 — Boom Room
// ---------------------------------------------------------------

function room_boom(G) {
  let j = G.odesc2[CANDL - 1];
  if (G.oadv[CANDL - 1] === G.winner && qon(G, CANDL)) {
    // has lit candle
  } else {
    j = G.odesc2[TORCH - 1];
    if (G.oadv[TORCH - 1] === G.winner && qon(G, TORCH)) {
      // has lit torch
    } else {
      j = G.odesc2[MATCH - 1];
      if (G.oadv[MATCH - 1] === G.winner && qon(G, MATCH)) {
        // has lit match
      } else {
        return; // safe
      }
    }
  }

  if (G.prsa !== TRNONW && G.prsa !== BURNW) {
    if (G.prsa !== WALKIW) return;
    rspsub(G, 295, j); // boom!
    jigsup(G, 44);
    return;
  }
  rspsub(G, 294, j); // boom!
  jigsup(G, 44);
}

// ---------------------------------------------------------------
// R15 — No-objs (also bottom of light shaft)
// ---------------------------------------------------------------

function room_noobjs(G) {
  G.empthf = true;
  for (let i = 1; i <= G.olnt; i++) {
    if (G.oadv[i - 1] === G.winner) G.empthf = false;
  }
  if (G.here !== BSHAF || !lit(G, G.here)) return;
  scrupd(G, G.ltshft);
  G.ltshft = 0;
}

// ---------------------------------------------------------------
// R16 — Machine Room
// ---------------------------------------------------------------

function room_mmach(G) {
  if (G.prsa !== LOOKW) return;
  let i = 46; // assume lid closed
  if (qopen(G, MACHI)) i = 12; // if open, open
  rspsub(G, 45, i);
}

// ---------------------------------------------------------------
// R17 — Bat Room
// ---------------------------------------------------------------

function room_bat(G) {
  if (G.prsa !== LOOKW) {
    if (G.prsa !== WALKIW || G.oadv[GARLI - 1] === G.winner || G.deadf) return;
    rspeak(G, 50);
    moveto(G, G.batdrp[rnd(9)], G.winner);
    rmdesc(G, 0);
    G.prscon = 0;
    return;
  }
  rspeak(G, 48);
  if (G.oadv[GARLI - 1] === G.winner) rspeak(G, 49);
}

// ---------------------------------------------------------------
// R18 — Dome Room
// ---------------------------------------------------------------

function room_dome(G) {
  if (G.prsa !== LOOKW) {
    if (G.prsa === LEAPW) jigsup(G, 53);
    return;
  }
  rspeak(G, 51);
  if (G.domef) rspeak(G, 52);
}

// ---------------------------------------------------------------
// R19 — Torch Room
// ---------------------------------------------------------------

function room_torch(G) {
  if (G.prsa !== LOOKW) return;
  rspeak(G, 54);
  if (G.domef) rspeak(G, 55);
}

// ---------------------------------------------------------------
// R20 — Carousel Room
// ---------------------------------------------------------------

function room_carou(G) {
  if (G.prsa !== LOOKW) {
    if (G.prsa === WALKIW && G.carozf && !G.deadf) jigsup(G, 58);
    return;
  }
  rspeak(G, 56);
  if (!(G.caroff || G.deadf)) rspeak(G, 57);
}

// ---------------------------------------------------------------
// R21 — Land of the Living Dead
// ---------------------------------------------------------------

function room_lld(G) {
  if (G.prsa !== LOOKW) {
    // Not look
    if (!G.lldf && G.prsa === RINGW && G.prso === BELL) {
      // Ring bell
      G.exorbf = true;
      newsta(G, BELL, 0, 0, 0, 0);
      newsta(G, HBELL, 967, G.here, 0, 0);
      if (G.lastit === BELL) G.lastit = HBELL;
      if (!qon(G, CANDL) || G.oadv[CANDL - 1] !== G.winner) {
        // not carrying lit candles, skip dropping
      } else {
        newsta(G, CANDL, 968, G.here, 0, 0);
        G.oflag1[CANDL - 1] &= ~ONBT;
        G.cflag[CEVCND - 1] = false;
      }
      G.cflag[CEVXB - 1] = true;
      G.ctick[CEVXB - 1] = 6;
      G.cflag[CEVXBH - 1] = true;
      G.ctick[CEVXBH - 1] = 20;
      return;
    }

    if (G.exorbf && !G.exorcf && G.oadv[CANDL - 1] === G.winner &&
        (G.oflag1[CANDL - 1] & ONBT) !== 0) {
      // Exorcism candle phase
      G.exorcf = true;
      rspeak(G, 969);
      G.cflag[CEVXB - 1] = false;
      G.cflag[CEVXC - 1] = true;
      G.ctick[CEVXC - 1] = 3;
      return;
    }

    if (G.exorcf && G.prsa === READW && G.prso === BOOK) {
      // Read book - exorcism complete
      newsta(G, GHOST, 63, 0, 0, 0);
      G.lldf = true;
      G.cflag[CEVXC - 1] = false;
      return;
    }

    if (G.prsa !== EXORCW) return;
    if (G.lldf) {
      jigsup(G, 61); // twice, exorcise you
      return;
    }
    if (G.oadv[BELL - 1] === G.winner && G.oadv[BOOK - 1] === G.winner &&
        G.oadv[CANDL - 1] === G.winner && qon(G, CANDL)) {
      rspeak(G, 1044); // must do it the hard way
      return;
    }
    rspeak(G, 62); // not equipped
    return;
  }
  // Look
  rspeak(G, 59);
  if (!G.lldf) rspeak(G, 60);
}

// ---------------------------------------------------------------
// R22 — LLD interior
// ---------------------------------------------------------------

function room_lld2(G) {
  if (G.prsa !== LOOKW) return;
  rspeak(G, 64);
  if (G.onpolf) rspeak(G, 65);
}

// ---------------------------------------------------------------
// R23 — Dam Room
// ---------------------------------------------------------------

function room_dam(G) {
  if (G.prsa !== LOOKW) return;
  rspeak(G, 66);
  let i = 67;
  if (G.lwtidf) i = 68;
  rspeak(G, i);
  rspeak(G, 69);
  if (G.gatef) rspeak(G, 70);
}

// ---------------------------------------------------------------
// R24 — Tree Room
// ---------------------------------------------------------------

function room_tree(G) {
  if (G.prsa === LOOKW) {
    rspeak(G, 660);
    let i = 661;
    for (let j = 1; j <= G.olnt; j++) {
      if (!qhere(G, j, FORE3) || j === FTREE) continue;
      rspeak(G, i);
      i = 0;
      rspsub(G, 502, G.odesc2[j - 1]);
    }
    return;
  }

  if (G.prsa === WALKIW) {
    G.cflag[CEVFOR - 1] = true;
    G.ctick[CEVFOR - 1] = -1;
    return;
  }

  if (G.prsa !== DROPW && G.prsa !== THROWW && G.prsa !== SHAKEW) return;

  for (let i = 1; i <= G.olnt; i++) {
    if (i === TTREE || i === NEST || !qhere(G, i, G.here)) continue;
    if (i === EGG) {
      newsta(G, EGG, 0, 0, 0, 0);
      newsta(G, BEGG, 658, FORE3, 0, 0);
      if (G.lastit === EGG) G.lastit = BEGG;
      G.otval[BEGG - 1] = 2;
      if (G.ocan[CANAR - 1] !== EGG) {
        G.otval[BCANA - 1] = 1;
      } else {
        newsta(G, BCANA, 0, 0, 0, 0);
      }
      continue;
    }
    newsta(G, i, 0, FORE3, 0, 0);
    rspsub(G, 659, G.odesc2[i - 1]);
  }
}

// ---------------------------------------------------------------
// R25 — Cyclops Room
// ---------------------------------------------------------------

function room_cyclo(G) {
  if (G.prsa !== LOOKW) {
    if (G.prsa !== WALKIW || G.rvcyc === 0 || G.deadf) return;
    G.cflag[CEVCYC - 1] = true;
    G.ctick[CEVCYC - 1] = -1;
    return;
  }
  rspeak(G, 606);
  let i = 607;
  if (G.rvcyc > 0) i = 608;
  if (G.rvcyc < 0) i = 609;
  if (G.cyclof) i = 610;
  if (G.magicf) i = 611;
  rspeak(G, i);
}

// ---------------------------------------------------------------
// R26 — Bank Box Room
// ---------------------------------------------------------------

function room_bkbox(G) {
  if (G.prsa !== WALKIW) return;
  for (let i = 0; i < 8; i += 2) {
    if (G.fromdr === G.scoldr[i]) G.scolrm = G.scoldr[i + 1];
  }
}

// ---------------------------------------------------------------
// R27 — Treasure Room
// ---------------------------------------------------------------

function room_treas(G) {
  if (G.prsa !== WALKIW || G.deadf || !G.thfact) return;
  if (G.oroom[THIEF - 1] !== G.here) newsta(G, THIEF, 82, G.here, 0, 0);
  G.thfpos = G.here;
  G.oflag2[THIEF - 1] |= FITEBT;
  // Vanish everything in room
  let j = 0;
  for (let i = 1; i <= G.olnt; i++) {
    if (i === CHALI || i === THIEF || !qhere(G, i, G.here)) continue;
    j = 83;
    G.oflag1[i - 1] &= ~VISIBT;
  }
  rspeak(G, j);
}

// ---------------------------------------------------------------
// R28 — Cliff Room
// ---------------------------------------------------------------

function room_cliff(G) {
  G.deflaf = G.oadv[RBOAT - 1] !== G.winner;
}

// ---------------------------------------------------------------
// R29 — Rivr4 Room
// ---------------------------------------------------------------

function room_rivr4(G) {
  if (G.buoyf || G.oadv[BUOY - 1] !== G.winner) return;
  rspeak(G, 84);
  G.buoyf = true;
}

// ---------------------------------------------------------------
// R30 — Overfalls
// ---------------------------------------------------------------

function room_overf(G) {
  if (G.prsa !== LOOKW) jigsup(G, 85);
}

// ---------------------------------------------------------------
// R31 — Slide Ledge
// ---------------------------------------------------------------

function room_sledge(G) {
  if (G.prsa !== WALKIW) return;
  G.cflag[CEVSLI - 1] = false;
}

// ---------------------------------------------------------------
// R32 — Slide
// ---------------------------------------------------------------

function room_slide(G) {
  if (G.prsa !== LOOKW) return;
  rspeak(G, 1012);
  if (G.ttie === 0) return;
  if (G.oroom[G.ttie - 1] === G.here) rspsub(G, 1013, G.odesc2[G.ttie - 1]);
}

// ---------------------------------------------------------------
// R33 — Aragain Falls
// ---------------------------------------------------------------

function room_falls(G) {
  if (G.prsa !== LOOKW) return;
  rspeak(G, 96);
  let i = 97;
  if (G.rainbf) i = 98;
  rspeak(G, i);
}

// ---------------------------------------------------------------
// R34 — Ledge Room
// ---------------------------------------------------------------

function room_ledge(G) {
  if (G.prsa !== LOOKW) return;
  rspeak(G, 100);
  let i = 102;
  if ((G.rflag[MSAFE - 1] & RMUNG) !== 0) i = 101;
  rspeak(G, i);
}

// ---------------------------------------------------------------
// R35 — Safe Room
// ---------------------------------------------------------------

function room_safe(G) {
  if (G.prsa !== LOOKW) return;
  rspeak(G, 104);
  let i = 105;
  if (G.safef) i = 106;
  rspeak(G, i);
}

// ---------------------------------------------------------------
// R36 — Magnet Room
// ---------------------------------------------------------------

function room_magnet(G) {
  if (G.prsa !== LOOKW) {
    if (G.prsa !== WALKIW || G.deadf || !G.caroff) return;
    if (G.carozf) {
      let i = 58;
      if (G.winner !== PLAYER) i = 99;
      jigsup(G, i);
      return;
    }
    if (G.winner === PLAYER) rspeak(G, 108);
    return;
  }
  rspeak(G, 107);
}

// ---------------------------------------------------------------
// R37 — Cage Room
// ---------------------------------------------------------------

function room_cage(G) {
  if (G.cagesf) moveto(G, CAGER, G.winner);
}

// ---------------------------------------------------------------
// R38 — Mirror D Room
// ---------------------------------------------------------------

function room_mird(G) {
  if (G.prsa === LOOKW) lookto(G, FDOOR, MRG, 0, 682, 681);
}

// ---------------------------------------------------------------
// R39 — Mirror G Room
// ---------------------------------------------------------------

function room_mirg(G) {
  if (G.prsa === WALKIW) jigsup(G, 685);
}

// ---------------------------------------------------------------
// R40 — Mirror C Room
// ---------------------------------------------------------------

function room_mirc(G) {
  if (G.prsa === LOOKW) lookto(G, MRG, MRB, 683, 0, 681);
}

// ---------------------------------------------------------------
// R41 — Mirror B Room
// ---------------------------------------------------------------

function room_mirb(G) {
  if (G.prsa === LOOKW) lookto(G, MRC, MRA, 0, 0, 681);
}

// ---------------------------------------------------------------
// R42 — Mirror A Room
// ---------------------------------------------------------------

function room_mira(G) {
  if (G.prsa === LOOKW) lookto(G, MRB, 0, 0, 684, 681);
}

// ---------------------------------------------------------------
// R43 — Mirror C East/West
// ---------------------------------------------------------------

function room_mirce(G) {
  if (G.prsa === LOOKW) ewtell(G, G.here, 683);
}

// ---------------------------------------------------------------
// R44 — Mirror B East/West
// ---------------------------------------------------------------

function room_mirbe(G) {
  if (G.prsa === LOOKW) ewtell(G, G.here, 686);
}

// ---------------------------------------------------------------
// R45 — Mirror A East/West
// ---------------------------------------------------------------

function room_mirae(G) {
  if (G.prsa === LOOKW) ewtell(G, G.here, 687);
}

// ---------------------------------------------------------------
// R46 — Inside Mirror
// ---------------------------------------------------------------

function room_inmir(G) {
  if (G.prsa !== LOOKW) return;
  rspeak(G, 688);
  // Describe pole state
  let i = 689; // assume case 5
  if (G.mdir === 270 && G.mloc === MRB) {
    i = 690 + Math.min(G.poleuf, 1); // cases 1,2
  }
  if (G.mdir % 180 === 0) {
    i = 692 + Math.min(G.poleuf, 1); // cases 3,4
  }
  rspeak(G, i);
  rspsub(G, 694, 695 + Math.floor(G.mdir / 45));
}

// ---------------------------------------------------------------
// R47 — Mirror Eye Room
// ---------------------------------------------------------------

function room_mreye(G) {
  if (G.prsa !== LOOKW) return;
  let i = 704; // assume beam stop
  let j = 0;
  for (j = 1; j <= G.olnt; j++) {
    if (qhere(G, j, G.here) && j !== RBEAM) break;
  }
  if (j > G.olnt) {
    i = 703;
    j = RBEAM; // fallback
  }
  rspsub(G, i, G.odesc2[j - 1]);
  lookto(G, MRA, 0, 0, 0, 0);
}

// ---------------------------------------------------------------
// R48 — Inside Crypt
// ---------------------------------------------------------------

function room_crypt(G) {
  if (G.prsa !== LOOKW) return;
  let i = 46;
  if (qopen(G, TOMB)) i = 12;
  rspsub(G, 705, i);
}

// ---------------------------------------------------------------
// R49 — South Corridor
// ---------------------------------------------------------------

function room_scorr(G) {
  if (G.prsa !== LOOKW) return;
  rspeak(G, 706);
  let i = 46;
  if (qopen(G, ODOOR)) i = 12;
  if (G.lcell === 4) rspsub(G, 707, i);
}

// ---------------------------------------------------------------
// R50 — Behind Door
// ---------------------------------------------------------------

function room_bdoor(G) {
  if (G.prsa !== WALKIW) {
    if (G.prsa !== LOOKW) return;
    let i = 46;
    if (qopen(G, QDOOR)) i = 12;
    rspsub(G, 708, i);
    return;
  }
  G.cflag[CEVFOL - 1] = true;
  G.ctick[CEVFOL - 1] = -1;
}

// ---------------------------------------------------------------
// R51 — Front Door
// ---------------------------------------------------------------

function room_fdoor(G) {
  if (G.prsa === WALKIW) G.ctick[CEVFOL - 1] = 0;
  if (G.prsa !== LOOKW) return;
  lookto(G, 0, MRD, 709, 0, 0);
  let i = 46;
  if (G.cflag[CEVINQ - 1] && G.ctick[CEVINQ - 1] !== 0) i = 12;
  let j = 46;
  if (qopen(G, QDOOR)) j = 12;
  rspsb2(G, 710, i, j);
}

// ---------------------------------------------------------------
// R52 — North Corridor
// ---------------------------------------------------------------

function room_ncorr(G) {
  if (G.prsa !== LOOKW) return;
  let i = 46;
  if (qopen(G, CDOOR)) i = 12;
  rspsub(G, 711, i);
}

// ---------------------------------------------------------------
// R53 — Parapet
// ---------------------------------------------------------------

function room_parap(G) {
  if (G.prsa === LOOKW) rspsub(G, 712, 712 + G.pnumb);
}

// ---------------------------------------------------------------
// R54 — Cell
// ---------------------------------------------------------------

function room_cell(G) {
  if (G.prsa !== LOOKW) return;
  let i = 721;
  if (qopen(G, CDOOR)) i = 722;
  rspeak(G, i);
  i = 46;
  if (qopen(G, ODOOR)) i = 12;
  if (G.lcell === 4) rspsub(G, 723, i);
}

// ---------------------------------------------------------------
// R55 — Prison Cell
// ---------------------------------------------------------------

function room_pcell(G) {
  if (G.prsa === LOOKW) rspeak(G, 724);
}

// ---------------------------------------------------------------
// R56 — Nirvana Cell
// ---------------------------------------------------------------

function room_ncell(G) {
  if (G.prsa !== LOOKW) return;
  let i = 46;
  if (qopen(G, ODOOR)) i = 12;
  rspsub(G, 725, i);
}

// ---------------------------------------------------------------
// R57 — Nirvana and end of game
// ---------------------------------------------------------------

function room_nirva(G) {
  if (G.prsa !== WALKIW) return;
  rspeak(G, 726);
  score(G, false);
  G.gameOver = true;
}

// ---------------------------------------------------------------
// R58 — Tomb Room
// ---------------------------------------------------------------

function room_tomb(G) {
  if (G.prsa !== LOOKW) return;
  let i = 46;
  if (qopen(G, TOMB)) i = 12;
  rspsub(G, 792, i);
}

// ---------------------------------------------------------------
// R59 — Puzzle Side Room
// ---------------------------------------------------------------

function room_pside(G) {
  if (G.prsa !== LOOKW) return;
  let i = 861;
  if (G.cpoutf) i = 862;
  rspeak(G, i);
}

// ---------------------------------------------------------------
// R60 — Puzzle Room
// ---------------------------------------------------------------

function room_cpuzz(G) {
  if (G.prsa !== LOOKW) return;
  if (G.cpushf) {
    cpinfo(G, 880, G.cphere);
    return;
  }
  rspeak(G, 868);
  if ((G.oflag2[WARNI - 1] & TCHBT) !== 0) rspeak(G, 869);
}

// ---------------------------------------------------------------
// R61 — Palantir Room
// ---------------------------------------------------------------

function room_palrm(G) {
  if (G.prsa === LOOKW) {
    rspeak(G, 1015);
    let i = 699; // string is south
    palantir_room_common(G, i);
    return;
  }
  palantir_room_tail(G);
}

// ---------------------------------------------------------------
// R62 — Prm Room
// ---------------------------------------------------------------

function room_prm(G) {
  if (G.prsa === LOOKW) {
    rspeak(G, 1016);
    let i = 695; // string is north
    palantir_room_common(G, i);
    return;
  }
  palantir_room_tail(G);
}

// Common code for palantir/prm room look
function palantir_room_common(G, i) {
  if (G.plookf) {
    palantir_room_tail(G);
    return;
  }
  rspsub(G, 1017, i);
  let lidObj = G.here - PRM + PLID1;
  let ii = 1018; // assume lid open
  if (!qopen(G, lidObj)) ii = 1019;
  rspeak(G, ii);
  let khObj = G.here - PRM + PKH1;
  for (let k = 1; k <= G.olnt; k++) {
    if (G.ocan[k - 1] !== khObj) continue;
    rspsub(G, 1020, G.odesc2[k - 1]);
    break;
  }
  if (qopen(G, PDOOR)) rspeak(G, 1042);
  if (G.matf) {
    rspeak(G, 1021);
    if (G.matobj !== 0 && (G.here === PALRM || qopen(G, PDOOR))) {
      rspsub(G, 1022, G.odesc2[G.matobj - 1]);
    }
  }
  palantir_room_tail(G);
}

// Common tail for palantir rooms
function palantir_room_tail(G) {
  G.plookf = false;
  if (G.prso === 0) return;
  if (G.prsa === TAKEW && qempty(G, G.here - PRM + PKH1) &&
      (G.prso === SCREW || G.prso === STICK || G.prso === PKEY || G.prso === KEYS)) {
    if (!G.ptoucf) {
      let lidObj = G.here - PRM + PLID1;
      if (qopen(G, lidObj)) rspeak(G, 1043);
      G.oflag2[lidObj - 1] &= ~OPENBT;
    }
    G.ptoucf = true;
  }

  // Update NDSCBT flags for objects in keyholes
  G.oflag1[SCREW - 1] &= ~NDSCBT;
  if (G.ocan[SCREW - 1] === PKH1 || G.ocan[SCREW - 1] === PKH2) {
    G.oflag1[SCREW - 1] |= NDSCBT;
  }
  G.oflag1[STICK - 1] &= ~NDSCBT;
  if (G.ocan[STICK - 1] === PKH1 || G.ocan[STICK - 1] === PKH2) {
    G.oflag1[STICK - 1] |= NDSCBT;
  }
  G.oflag1[PKEY - 1] &= ~NDSCBT;
  if (G.ocan[PKEY - 1] === PKH1 || G.ocan[PKEY - 1] === PKH2) {
    G.oflag1[PKEY - 1] |= NDSCBT;
  }
  G.oflag1[KEYS - 1] &= ~NDSCBT;
  if (G.ocan[KEYS - 1] === PKH1 || G.ocan[KEYS - 1] === PKH2) {
    G.oflag1[KEYS - 1] |= NDSCBT;
  }
  if (G.oroom[MAT - 1] !== PRM && G.oroom[MAT - 1] !== PALRM) G.matf = false;
  G.oflag1[MAT - 1] &= ~NDSCBT;
  if (!G.matf) return;
  G.oflag1[MAT - 1] |= NDSCBT;
  newsta(G, MAT, 0, G.here, 0, 0);
}

// ---------------------------------------------------------------
// R63 — Inslide
// ---------------------------------------------------------------

function room_inslide(G) {
  for (let i = 1; i <= G.olnt; i++) {
    if (!qhere(G, i, G.here) || (G.oflag1[i - 1] & TAKEBT) === 0) continue;
    newsta(G, i, 0, CELLA, 0, 0);
    if (i === WATER) newsta(G, i, 0, 0, 0, 0);
    rspsub(G, 1011, G.odesc2[i - 1]);
  }
}

// ---------------------------------------------------------------
// R64 — Puzzle Anteroom
// ---------------------------------------------------------------

function room_cpant(G) {
  if (G.prsa !== LOOKW) return;
  let i = 1068; // not blocked
  if (G.cpvec[9] !== 0) i = 1069; // blocked (cpvec(10) in Fortran = cpvec[9] in JS)
  rspeak(G, i);
}

// ---------------------------------------------------------------
// LOOKTO — Describe view in mirror hallway
// ---------------------------------------------------------------

export function lookto(G, nrm, srm, nt, st, ht) {
  rspeak(G, ht);
  rspeak(G, nt);
  rspeak(G, st);
  let dir = 0;
  if (Math.abs(G.mloc - G.here) === 1) {
    if (G.mloc === nrm) dir = 695;
    if (G.mloc === srm) dir = 699;
    if (G.mdir % 180 !== 0) {
      // Mirror is not n-s
      const m1 = mrhere(G, G.here);
      let mrbf = 0;
      if ((m1 === 1 && !G.mr1f) || (m1 === 2 && !G.mr2f)) mrbf = 1;
      rspsub(G, 849 + mrbf, dir);
      if (m1 === 1 && G.mropnf) rspeak(G, 823 + mrbf);
      if (mrbf !== 0) rspeak(G, 851);
    } else {
      // Mirror n-s: sees panel
      rspsub(G, 847, dir);
      rspsb2(G, 848, dir, dir);
    }
  }

  let i = 0;
  if (nt === 0 && (dir === 0 || dir === 699)) i = 852;
  if (st === 0 && (dir === 0 || dir === 695)) i = 853;
  if (nt + st + dir === 0) i = 854;
  if (ht !== 0) rspeak(G, i);
}

// ---------------------------------------------------------------
// EWTELL — Describe e/w narrow rooms
// ---------------------------------------------------------------

export function ewtell(G, rm, st) {
  const m1 = (G.mdir + ((rm - MRAE) % 2) * 180) === 180;
  let i = (rm - MRAE) % 2; // get basic e/w flag
  if ((m1 && !G.mr1f) || (!m1 && !G.mr2f)) i = i + 2; // mirror broken?
  rspeak(G, 819 + i);
  if (m1 && G.mropnf) rspeak(G, 823 + Math.floor(i / 2));
  rspeak(G, 825);
  rspeak(G, st);
}

// ---------------------------------------------------------------
// CPINFO — Describe puzzle room state
// ---------------------------------------------------------------

export function cpinfo(G, rmk, st) {
  const dgmoft = [-9, -8, -7, -1, 1, 7, 8, 9];
  const pict = ['SS', 'SS', 'SS', '  ', 'MM'];

  rspeak(G, rmk);
  const dgm = new Array(8);
  for (let i = 0; i < 8; i++) {
    const j = dgmoft[i];
    dgm[i] = pict[G.cpvec[st + j] + 3]; // +3 because pict is 0-indexed and cpvec values go from -3 to 1
    if (Math.abs(j) !== 1 && Math.abs(j) !== 8) {
      const k = j < 0 ? -8 : 8;
      const l = j - k;
      if (G.cpvec[st + k] !== 0 && G.cpvec[st + l] !== 0) dgm[i] = '??';
    }
  }

  G.output('       |' + dgm[0] + ' ' + dgm[1] + ' ' + dgm[2] + '|');
  G.output(' West  |' + dgm[3] + ' .. ' + dgm[4] + '|  East');
  G.output('       |' + dgm[5] + ' ' + dgm[6] + ' ' + dgm[7] + '|');

  if (st === 10) rspeak(G, 870); // at hole
  if (st === 37) rspeak(G, 871); // at niche
  let ii = 872;
  if (G.cpoutf) ii = 873;
  if (st === 52) rspeak(G, ii); // at door
  if (G.cpvec[st + 1] === -2) rspeak(G, 874); // east ladder
  if (G.cpvec[st - 1] === -3) rspeak(G, 875); // west ladder
}

export default rappli;
