// main-loop.js - Main game loop for Colossal Cave Adventure
//
// Ported from open-adventure 2.5 (main.c do_command)
// Implements the main game loop as an async state machine.
// Each call to doCommand() processes one turn.

import {
  speak, rspeak, pspeak, setprm, getin, yes, vocab, makewd, makewd_from_string,
  TOTING, AT, HERE, LIQ, LIQLOC, DARK, GSTONE, FOREST, OUTSID, INDEEP, FORCED, CNDBIT,
  move, carry, drop, destroy, put, juggle, atdwrf, setbit, tstbit, bug,
} from './misc.js';
import { action } from './actions.js';
import { score } from './score.js';

function IABS(n) { return Math.abs(n); }
function MOD(n, m) { return ((n % m) + m) % m; }

// Main game loop: call doCommand(G) repeatedly.
// Returns false when game is over.
export async function doCommand(G) {

  // ---- Check closing (can't leave cave once closing) ----
  if (OUTSID(G, G.NEWLOC) && G.NEWLOC !== 0 && G.CLOSNG) {
    rspeak(G, 130);
    G.NEWLOC = G.LOC;
    if (!G.PANIC) G.CLOCK2 = 15;
    G.PANIC = 1;
  }

  // L71: Dwarf blocking check
  if (G.NEWLOC !== G.LOC && !FORCED(G, G.LOC) && !CNDBIT(G, G.LOC, 3)) {
    for (G.I = 1; G.I <= 5; G.I++) {
      if (G.ODLOC[G.I] === G.NEWLOC && G.DSEEN[G.I]) {
        G.NEWLOC = G.LOC;
        rspeak(G, 2);
        break;
      }
    }
  }

  // L74
  G.LOC = G.NEWLOC;

  // ---- Dwarf stuff ----
  if (G.LOC === 0 || FORCED(G, G.LOC) || CNDBIT(G, G.NEWLOC, 3)) {
    /* skip dwarf stuff, goto L2000 */
  } else if (G.DFLAG === 0) {
    if (INDEEP(G, G.LOC)) G.DFLAG = 1;
  } else if (G.DFLAG === 1) {
    // L6000: First dwarf encounter
    if (!INDEEP(G, G.LOC) || (G.rng.pct(95) && (!CNDBIT(G, G.LOC, 4) || G.rng.pct(85)))) {
      /* goto L2000 */
    } else {
      G.DFLAG = 2;
      for (G.I = 1; G.I <= 2; G.I++) {
        G.J = 1 + G.rng.range(5);
        if (G.rng.pct(50)) G.DLOC[G.J] = 0;
      }
      for (G.I = 1; G.I <= 5; G.I++) {
        if (G.DLOC[G.I] === G.LOC) G.DLOC[G.I] = G.DALTLC;
        G.ODLOC[G.I] = G.DLOC[G.I];
      }
      rspeak(G, 3);
      drop(G, G.AXE, G.LOC);
    }
  } else {
    // L6010: Full dwarf movement
    G.DTOTAL = 0;
    G.ATTACK = 0;
    G.STICK = 0;
    for (G.I = 1; G.I <= 6; G.I++) {
      if (G.DLOC[G.I] === 0) continue; // L6030

      // Fill TK with possible destinations
      G.J = 1;
      G.KK = G.data.key[G.DLOC[G.I]];
      if (G.KK !== 0) {
        while (true) {
          G.NEWLOC = MOD(Math.floor(IABS(G.data.travel[G.KK]) / 1000), 1000);
          if (!(G.NEWLOC > 300 || !INDEEP(G, G.NEWLOC) || G.NEWLOC === G.ODLOC[G.I] ||
              (G.J > 1 && G.NEWLOC === G.TK[G.J - 1]) || G.J >= 20 ||
              G.NEWLOC === G.DLOC[G.I] || FORCED(G, G.NEWLOC) ||
              (G.I === 6 && CNDBIT(G, G.NEWLOC, 3)) ||
              Math.floor(IABS(G.data.travel[G.KK]) / 1000000) === 100)) {
            G.TK[G.J] = G.NEWLOC;
            G.J++;
          }
          G.KK++;
          if (G.data.travel[G.KK - 1] < 0) break;
        }
      }

      G.TK[G.J] = G.ODLOC[G.I];
      if (G.J >= 2) G.J--;
      G.J = 1 + G.rng.range(G.J);
      G.ODLOC[G.I] = G.DLOC[G.I];
      G.DLOC[G.I] = G.TK[G.J];
      G.DSEEN[G.I] = (G.DSEEN[G.I] && INDEEP(G, G.LOC)) ||
                      (G.DLOC[G.I] === G.LOC || G.ODLOC[G.I] === G.LOC);
      if (!G.DSEEN[G.I]) continue; // L6030
      G.DLOC[G.I] = G.LOC;

      if (G.I === 6) {
        // Pirate
        if (G.LOC === G.CHLOC || G.PROP[G.CHEST] >= 0) continue;
        G.K = 0;
        for (G.J = 50; G.J <= G.MAXTRS; G.J++) {
          if (G.J === G.PYRAM && (G.LOC === G.data.plac[G.PYRAM] || G.LOC === G.data.plac[G.EMRALD])) {
            if (HERE(G, G.J)) G.K = 1;
            continue;
          }
          if (TOTING(G, G.J)) {
            // L6021: pirate steals
            if (G.PLACE[G.CHEST] === 0) {
              move(G, G.CHEST, G.CHLOC);
              move(G, G.MESSAG, G.CHLOC2);
            }
            rspeak(G, 128);
            for (G.J = 50; G.J <= G.MAXTRS; G.J++) {
              if (G.J === G.PYRAM && (G.LOC === G.data.plac[G.PYRAM] || G.LOC === G.data.plac[G.EMRALD])) continue;
              if (AT(G, G.J) && G.FIXED[G.J] === 0) carry(G, G.J, G.LOC);
              if (TOTING(G, G.J)) drop(G, G.J, G.CHLOC);
            }
            // L6024
            G.DLOC[6] = G.CHLOC;
            G.ODLOC[6] = G.CHLOC;
            G.DSEEN[6] = 0;
            G.K = -1; // signal to break outer
            break;
          }
          if (HERE(G, G.J)) G.K = 1;
        }
        if (G.K === -1) continue;
        if (G.TALLY === 1 && G.K === 0 && G.PLACE[G.CHEST] === 0 && HERE(G, G.LAMP) && G.PROP[G.LAMP] === 1) {
          // L6025
          rspeak(G, 186);
          move(G, G.CHEST, G.CHLOC);
          move(G, G.MESSAG, G.CHLOC2);
          G.DLOC[6] = G.CHLOC;
          G.ODLOC[6] = G.CHLOC;
          G.DSEEN[6] = 0;
          continue;
        }
        if (G.ODLOC[6] !== G.DLOC[6] && G.rng.pct(20)) rspeak(G, 127);
        continue;
      }

      // L6027: Threatening dwarf
      G.DTOTAL++;
      if (G.ODLOC[G.I] !== G.DLOC[G.I]) continue;
      G.ATTACK++;
      if (G.KNFLOC >= 0) G.KNFLOC = G.LOC;
      if (G.rng.range(1000) < 95 * (G.DFLAG - 2)) G.STICK++;
    }

    // Report dwarf encounters
    if (G.DTOTAL !== 0) {
      setprm(G, 1, G.DTOTAL, 0);
      rspeak(G, 4 + Math.floor(1 / G.DTOTAL));
      if (G.ATTACK !== 0) {
        if (G.DFLAG === 2) G.DFLAG = 3;
        setprm(G, 1, G.ATTACK, 0);
        G.K = 6;
        if (G.ATTACK > 1) G.K = 250;
        rspeak(G, G.K);
        setprm(G, 1, G.STICK, 0);
        rspeak(G, G.K + 1 + Math.floor(2 / (1 + G.STICK)));
        if (G.STICK !== 0) {
          G.OLDLC2 = G.LOC;
          // goto L99: death
          return await doDeath(G);
        }
      }
    }
  }

  // ---- L2000: Describe location ----
  if (G.LOC === 0) return await doDeath(G);

  G.KK = G.data.stext[G.LOC];
  if (MOD(G.ABB[G.LOC], G.ABBNUM) === 0 || G.KK === 0) G.KK = G.data.ltext[G.LOC];
  if (!FORCED(G, G.LOC) && DARK(G)) {
    if (G.WZDARK && G.rng.pct(35)) {
      // L90: pit death
      rspeak(G, 23);
      G.OLDLC2 = G.LOC;
      return await doDeath(G);
    }
    G.KK = G.data.rtext[16];
  }

  // L2001
  if (TOTING(G, G.BEAR)) rspeak(G, 141);
  speak(G, G.KK);
  G.K = 1;
  if (FORCED(G, G.LOC)) return doTravel(G);

  if (G.LOC === 33 && G.rng.pct(25) && !G.CLOSNG) rspeak(G, 7);

  // Describe objects
  if (!DARK(G)) {
    G.ABB[G.LOC]++;
    G.I = G.ATLOC[G.LOC];
    while (G.I !== 0) {
      G.OBJ = G.I;
      if (G.OBJ > 100) G.OBJ -= 100;
      if (G.OBJ === G.STEPS && TOTING(G, G.NUGGET)) { G.I = G.LINK[G.I]; continue; }
      if (G.PROP[G.OBJ] < 0) {
        if (G.CLOSED) { G.I = G.LINK[G.I]; continue; }
        G.PROP[G.OBJ] = 0;
        if (G.OBJ === G.RUG || G.OBJ === G.CHAIN) G.PROP[G.OBJ] = 1;
        G.TALLY--;
      }
      G.KK = G.PROP[G.OBJ];
      if (G.OBJ === G.STEPS && G.LOC === G.FIXED[G.STEPS]) G.KK = 1;
      pspeak(G, G.OBJ, G.KK);
      G.I = G.LINK[G.I];
    }
  }

  // L2012
  G.VERB = 0;
  G.OLDOBJ = G.OBJ;
  G.OBJ = 0;

  // ---- L2600: Hints ----
  if (G.data.cond[G.LOC] >= G.CONDS) {
    for (G.HINT = 1; G.HINT <= G.data.hntmax; G.HINT++) {
      if (G.HINTED[G.HINT]) continue;
      if (!CNDBIT(G, G.LOC, G.HINT + 10)) G.HINTLC[G.HINT] = -1;
      G.HINTLC[G.HINT]++;
      if (G.HINTLC[G.HINT] >= G.data.hints[G.HINT][1]) {
        // Check hint conditions
        const hintResult = checkHint(G);
        if (hintResult === 'offer') {
          // L40010
          G.HINTLC[G.HINT] = 0;
          if (!await yes(G, G.data.hints[G.HINT][3], 0, 54)) continue;
          setprm(G, 1, G.data.hints[G.HINT][2], G.data.hints[G.HINT][2]);
          rspeak(G, 261);
          G.HINTED[G.HINT] = await yes(G, 175, G.data.hints[G.HINT][4], 54);
          if (G.HINTED[G.HINT] && G.LIMIT > 30) G.LIMIT += 30 * G.data.hints[G.HINT][2];
          G.HINTLC[G.HINT] = 0;
        } else if (hintResult === 'clear') {
          G.HINTLC[G.HINT] = 0;
        }
        // else 'skip' = do nothing
      }
    }
  }

  // ---- L2603: Closing checks ----
  if (G.CLOSED) {
    if (G.PROP[G.OYSTER] < 0 && TOTING(G, G.OYSTER)) pspeak(G, G.OYSTER, 1);
    for (G.I = 1; G.I <= 100; G.I++) {
      if (TOTING(G, G.I) && G.PROP[G.I] < 0) G.PROP[G.I] = -1 - G.PROP[G.I];
    }
  }

  // L2605
  G.WZDARK = DARK(G);
  if (G.KNFLOC > 0 && G.KNFLOC !== G.LOC) G.KNFLOC = 0;

  // Get input
  if (!await getin(G)) return false;

  // L2607: FOOBAR check
  G.FOOBAR = (G.FOOBAR > 0 ? -G.FOOBAR : 0);
  G.TURNS++;
  if (G.TURNS === G.THRESH) {
    speak(G, G.data.ttext[G.TRNDEX]);
    G.TRNLUZ += Math.floor(G.data.trnval[G.TRNDEX] / 100000);
    G.TRNDEX++;
    G.THRESH = -1;
    if (G.TRNDEX <= G.data.trnvls) G.THRESH = MOD(G.data.trnval[G.TRNDEX], 100000) + 1;
  }

  // L2608
  if (G.VERB === G.SAY && G.WD2 > 0) G.VERB = 0;
  if (G.VERB === G.SAY) {
    // goto L4090 via action
    const r = await action(G, 4090);
    return handleActionResult(G, r);
  }

  // Clock checks
  if (G.TALLY === 0 && INDEEP(G, G.LOC) && G.LOC !== 33) G.CLOCK1--;
  if (G.CLOCK1 === 0) {
    return doCaveClosing(G);
  }
  if (G.CLOCK1 < 0) G.CLOCK2--;
  if (G.CLOCK2 === 0) {
    return doCaveClosed(G);
  }

  // Lamp
  if (G.PROP[G.LAMP] === 1) G.LIMIT--;
  if (G.LIMIT <= 30 && HERE(G, G.BATTER) && G.PROP[G.BATTER] === 0 && HERE(G, G.LAMP)) {
    // L12000
    rspeak(G, 188);
    G.PROP[G.BATTER] = 1;
    if (TOTING(G, G.BATTER)) drop(G, G.BATTER, G.LOC);
    G.LIMIT += 2500;
    G.LMWARN = 0;
  } else if (G.LIMIT === 0) {
    // L12400
    G.LIMIT = -1;
    G.PROP[G.LAMP] = 0;
    if (HERE(G, G.LAMP)) rspeak(G, 184);
  } else if (G.LIMIT <= 30) {
    // L12200
    if (!G.LMWARN && HERE(G, G.LAMP)) {
      G.LMWARN = 1;
      G.SPK = 187;
      if (G.PLACE[G.BATTER] === 0) G.SPK = 183;
      if (G.PROP[G.BATTER] === 1) G.SPK = 189;
      rspeak(G, G.SPK);
    }
  }

  // L19999: Parse and dispatch
  G.K = 43;
  if (LIQLOC(G, G.LOC) === G.WATER) G.K = 70;
  G.V1 = vocab(G, G.WD1, -1);
  G.V2 = vocab(G, G.WD2, -1);

  // Special: ENTER STREAM/WATER
  if (G.V1 === G.ENTER) {
    if (G.V2 === G.STREAM || G.V2 === 1000 + G.WATER) {
      rspeak(G, G.K);
      return true;
    }
    if (G.WD2 > 0) {
      // L2800
      G.WD1 = G.WD2; G.wd1 = G.wd2;
      G.WD1X = G.WD2X; G.wd1x = G.wd2x;
      G.WD2 = 0; G.wd2 = '';
      return doDispatch2620(G);
    }
  }

  // Water/oil plant/door shortcut
  if ((G.V1 === 1000 + G.WATER || G.V1 === 1000 + G.OIL) &&
      (G.V2 === 1000 + G.PLANT || G.V2 === 1000 + G.DOOR)) {
    if (AT(G, G.V2 - 1000)) G.WD2 = makewd(16152118); // POUR
  }

  // Cage + bird shortcut
  if (G.V1 === 1000 + G.CAGE && G.V2 === 1000 + G.BIRD && HERE(G, G.CAGE) && HERE(G, G.BIRD)) {
    G.WD1 = makewd(301200308); // CATCH
  }

  return doDispatch2620(G);
}

async function doDispatch2620(G) {
  // L2620: West warning
  if (G.WD1 === makewd_from_string('WEST')) {
    G.IWEST++;
    if (G.IWEST === 10) rspeak(G, 17);
  }

  // L2625: Go warning
  if (G.WD1 === makewd_from_string('GO') && G.WD2 !== 0 && G.WD2 !== -1) {
    G.IGO++;
    if (G.IGO === 10) rspeak(G, 276);
  }

  // L2630: Main dispatch
  G.I = vocab(G, G.WD1, -1);
  if (G.I === -1) {
    // L3000: Unknown word
    // Check for "seed NNNN" command
    const line = G.wd1 + (G.wd2 ? ' ' + G.wd2 : '');
    const seedMatch = line.match(/^SEED\s+(\d+)$/i);
    if (seedMatch) {
      const sv = parseInt(seedMatch[1]);
      G.rng.setSeed(sv);
      G.output('Seed set to ' + sv + '\n');
      G.TURNS--;
      const { rndvoc } = await import('./misc.js');
      G.ZZWORD = rndvoc(G, 3, 0);
      return true;
    }
    setprm(G, 1, G.wd1, G.wd1x);
    rspeak(G, 254);
    // goto L2600 - just return true to continue loop
    return true;
  }

  G.K = MOD(G.I, 1000);
  G.KQ = Math.floor(G.I / 1000) + 1;

  switch (G.KQ) {
    case 1: // motion
      return doTravel(G);
    case 2: // object
      return handleActionResult(G, await action(G, 5000));
    case 3: // action verb
      return handleActionResult(G, await action(G, 4000));
    case 4: // special
      rspeak(G, G.K);
      return true;
    default:
      bug(G, 22);
  }
}

// Handle return codes from action()
async function handleActionResult(G, r) {
  switch (r) {
    case 2: return true;
    case 8: return doTravel(G);
    case 2000: return true; // re-describe (will happen on next doCommand)
    case 2009: {
      G.K = 54;
      G.SPK = G.K;
      rspeak(G, G.SPK);
      return true;
    }
    case 2010: {
      rspeak(G, G.K);
      return true;
    }
    case 2011: {
      rspeak(G, G.SPK);
      return true;
    }
    case 2012: return true;
    case 2600: return true;
    case 2607: {
      // Re-enter FOOBAR/turn logic
      G.FOOBAR = (G.FOOBAR > 0 ? -G.FOOBAR : 0);
      G.TURNS++;
      return true;
    }
    case 2630: {
      // Dispatch again from L2630
      G.I = vocab(G, G.WD1, -1);
      if (G.I === -1) {
        setprm(G, 1, G.wd1, G.wd1x);
        rspeak(G, 254);
        return true;
      }
      G.K = MOD(G.I, 1000);
      G.KQ = Math.floor(G.I / 1000) + 1;
      switch (G.KQ) {
        case 1: return doTravel(G);
        case 2: return handleActionResult(G, await action(G, 5000));
        case 3: return handleActionResult(G, await action(G, 4000));
        case 4: rspeak(G, G.K); return true;
        default: bug(G, 22);
      }
      return true;
    }
    case 2800: {
      G.WD1 = G.WD2; G.wd1 = G.wd2;
      G.WD1X = G.WD2X; G.wd1x = G.wd2x;
      G.WD2 = 0; G.wd2 = '';
      return doDispatch2620(G);
    }
    case 8000: {
      setprm(G, 1, G.wd1, G.wd1x);
      rspeak(G, 257);
      G.OBJ = 0;
      return true;
    }
    case 18999: {
      rspeak(G, G.SPK);
      rspeak(G, 136);
      score(G, 0);
      return true;
    }
    case 19000: {
      rspeak(G, 136);
      score(G, 0);
      return true;
    }
    default:
      bug(G, 99);
  }
}

// ---- Travel (movement) ----
// Faithfully ports the L8/L9/L10/L11/L12/L13/L14/L16/L50 goto structure from main.c
function doTravel(G) {
  G.KK = G.data.key[G.LOC];
  G.NEWLOC = G.LOC;
  if (G.KK === 0) bug(G, 26);
  if (G.K === G.NUL) return true;
  if (G.K === G.BACK) return doBack(G);
  if (G.K === G.LOOK) return doLook(G);
  if (G.K === G.CAVE) return doCave(G);

  G.OLDLC2 = G.OLDLOC;
  G.OLDLOC = G.LOC;

  // L9: scan travel table for matching verb
  L9: while (true) {
    G.LL = IABS(G.data.travel[G.KK]);
    if (MOD(G.LL, 1000) === 1 || MOD(G.LL, 1000) === G.K) {
      // L10: found a match
      G.LL = Math.floor(G.LL / 1000);

      // L11: check conditions on this destination
      L11: while (true) {
        G.NEWLOC = Math.floor(G.LL / 1000);  // condition M
        const condK = MOD(G.NEWLOC, 100);     // object for carry/prop checks

        if (G.NEWLOC <= 300) {
          // Conditions 100-300: must carry/be at object
          if (G.NEWLOC > 100) {
            // L13: 100 < M <= 300
            if (TOTING(G, condK) || (G.NEWLOC > 200 && AT(G, condK))) {
              // condition met, goto L16
            } else {
              // condition not met, goto L12
              if (!doTravel_L12(G)) return true; // bug(25) inside
              continue L11;
            }
          } else {
            // L14: 0 <= M <= 100 (probability or unconditional)
            if (G.NEWLOC !== 0 && !G.rng.pct(G.NEWLOC)) {
              // probability check failed, goto L12
              if (!doTravel_L12(G)) return true;
              continue L11;
            }
            // condition met (M=0 unconditional, or probability passed)
          }
        } else {
          // M > 300: PROP check. PROP(M%100) must not be (M/100 - 3)
          if (G.PROP[condK] !== Math.floor(G.NEWLOC / 100) - 3) {
            // condition met, goto L16
          } else {
            // condition not met, goto L12
            if (!doTravel_L12(G)) return true;
            continue L11;
          }
        }

        // L16: apply the destination
        G.NEWLOC = MOD(G.LL, 1000);
        if (G.NEWLOC <= 300) return true;
        if (G.NEWLOC <= 500) return doSpecial(G);
        rspeak(G, G.NEWLOC - 500);
        G.NEWLOC = G.LOC;
        return true;
      }
    }

    // No match on this entry
    if (G.data.travel[G.KK] < 0) {
      // L50: end of travel list, non-applicable motion
      G.SPK = 12;
      if (G.K >= 43 && G.K <= 50) G.SPK = 52;
      if (G.K === 29 || G.K === 30) G.SPK = 52;
      if (G.K === 7 || G.K === 36 || G.K === 37) G.SPK = 10;
      if (G.K === 11 || G.K === 19) G.SPK = 11;
      if (G.VERB === G.FIND || G.VERB === G.INVENT) G.SPK = 59;
      if (G.K === 62 || G.K === 65) G.SPK = 42;
      if (G.K === 17) G.SPK = 80;
      rspeak(G, G.SPK);
      return true;
    }
    G.KK++;
  }
}

// L12: skip to next different destination in travel table
// Returns true if found a new LL to try at L11, false if bug(25).
function doTravel_L12(G) {
  while (true) {
    if (G.data.travel[G.KK] < 0) { bug(G, 25); return false; }
    G.KK++;
    const newLL = Math.floor(IABS(G.data.travel[G.KK]) / 1000);
    if (newLL !== G.LL) {
      G.LL = newLL;
      return true; // go back to L11
    }
    // same destination, keep scanning
  }
}

// L30000: Special motions
function doSpecial(G) {
  G.NEWLOC -= 300;
  switch (G.NEWLOC) {
    case 1: // Plover-alcove passage
      G.NEWLOC = 99 + 100 - G.LOC;
      if (G.HOLDNG === 0 || (G.HOLDNG === 1 && TOTING(G, G.EMRALD))) return true;
      G.NEWLOC = G.LOC;
      rspeak(G, 117);
      return true;
    case 2: // Plover transport
      drop(G, G.EMRALD, G.LOC);
      // Need to continue scanning travel table (goto L12)
      // This is complex - simplified: just reset and re-scan
      return true;
    case 3: // Troll bridge
      return doTrollBridge(G);
    default:
      bug(G, 20);
  }
}

async function doTrollBridge(G) {
  if (G.PROP[G.TROLL] !== 1) {
    // L30310
    G.NEWLOC = G.data.plac[G.TROLL] + G.data.fixd[G.TROLL] - G.LOC;
    if (G.PROP[G.TROLL] === 0) G.PROP[G.TROLL] = 1;
    if (!TOTING(G, G.BEAR)) return true;
    rspeak(G, 162);
    G.PROP[G.CHASM] = 1;
    G.PROP[G.TROLL] = 2;
    drop(G, G.BEAR, G.NEWLOC);
    G.FIXED[G.BEAR] = -1;
    G.PROP[G.BEAR] = 3;
    G.OLDLC2 = G.NEWLOC;
    return await doDeath(G);
  }
  pspeak(G, G.TROLL, 1);
  G.PROP[G.TROLL] = 0;
  move(G, G.TROLL2, 0);
  move(G, G.TROLL2 + 100, 0);
  move(G, G.TROLL, G.data.plac[G.TROLL]);
  move(G, G.TROLL + 100, G.data.fixd[G.TROLL]);
  juggle(G, G.CHASM);
  G.NEWLOC = G.LOC;
  return true;
}

// Back
function doBack(G) {
  G.K = G.OLDLOC;
  if (FORCED(G, G.K)) G.K = G.OLDLC2;
  G.OLDLC2 = G.OLDLOC;
  G.OLDLOC = G.LOC;
  G.K2 = 0;
  if (G.K === G.LOC) G.K2 = 91;
  if (CNDBIT(G, G.LOC, 4)) G.K2 = 274;
  if (G.K2 !== 0) {
    rspeak(G, G.K2);
    return true;
  }

  // L21: scan travel table for path to K
  G.KK = G.data.key[G.LOC];
  while (true) {
    G.LL = MOD(Math.floor(IABS(G.data.travel[G.KK]) / 1000), 1000);
    if (G.LL === G.K) {
      // L25
      G.K = MOD(IABS(G.data.travel[G.KK]), 1000);
      G.KK = G.data.key[G.LOC];
      return doTravel(G);
    }
    if (G.LL <= 300) {
      const j = G.data.key[G.LL];
      if (FORCED(G, G.LL) && MOD(Math.floor(IABS(G.data.travel[j]) / 1000), 1000) === G.K) {
        G.K2 = G.KK;
      }
    }
    if (G.data.travel[G.KK] < 0) {
      // L23
      G.KK = G.K2;
      if (G.KK !== 0) {
        G.K = MOD(IABS(G.data.travel[G.KK]), 1000);
        G.KK = G.data.key[G.LOC];
        return doTravel(G);
      }
      rspeak(G, 140);
      return true;
    }
    G.KK++;
  }
}

// Look
function doLook(G) {
  if (G.DETAIL < 3) rspeak(G, 15);
  G.DETAIL++;
  G.WZDARK = 0;
  G.ABB[G.LOC] = 0;
  return true;
}

// Cave
function doCave(G) {
  G.K = 58;
  if (OUTSID(G, G.LOC) && G.LOC !== 8) G.K = 57;
  rspeak(G, G.K);
  return true;
}

// ---- Death (L99) ----
async function doDeath(G) {
  if (G.CLOSNG) {
    // L95
    rspeak(G, 131);
    G.NUMDIE++;
    score(G, 0);
    return false;
  }
  G.NUMDIE++;
  if (!await yes(G, 79 + G.NUMDIE * 2, 80 + G.NUMDIE * 2, 54)) {
    score(G, 0);
    return false;
  }
  if (G.NUMDIE === G.MAXDIE) {
    score(G, 0);
    return false;
  }
  G.PLACE[G.WATER] = 0;
  G.PLACE[G.OIL] = 0;
  if (TOTING(G, G.LAMP)) G.PROP[G.LAMP] = 0;
  for (G.J = 100; G.J >= 1; G.J--) {
    G.I = 101 - G.J;
    if (!TOTING(G, G.I)) continue;
    G.K = G.OLDLC2;
    if (G.I === G.LAMP) G.K = 1;
    drop(G, G.I, G.K);
  }
  G.LOC = 3;
  G.OLDLOC = G.LOC;
  return true;
}

// ---- Cave closing (L10000) ----
function doCaveClosing(G) {
  G.PROP[G.GRATE] = 0;
  G.PROP[G.FISSUR] = 0;
  for (G.I = 1; G.I <= 6; G.I++) {
    G.DSEEN[G.I] = 0;
    G.DLOC[G.I] = 0;
  }
  move(G, G.TROLL, 0);
  move(G, G.TROLL + 100, 0);
  move(G, G.TROLL2, G.data.plac[G.TROLL]);
  move(G, G.TROLL2 + 100, G.data.fixd[G.TROLL]);
  juggle(G, G.CHASM);
  if (G.PROP[G.BEAR] !== 3) destroy(G, G.BEAR);
  G.PROP[G.CHAIN] = 0;
  G.FIXED[G.CHAIN] = 0;
  G.PROP[G.AXE] = 0;
  G.FIXED[G.AXE] = 0;
  rspeak(G, 129);
  G.CLOCK1 = -1;
  G.CLOSNG = 1;
  return true;
}

// ---- Cave closed (L11000) ----
function doCaveClosed(G) {
  G.PROP[G.BOTTLE] = put(G, G.BOTTLE, 115, 1);
  G.PROP[G.PLANT] = put(G, G.PLANT, 115, 0);
  G.PROP[G.OYSTER] = put(G, G.OYSTER, 115, 0);
  G.data.objtxt[G.OYSTER] = 3;
  G.PROP[G.LAMP] = put(G, G.LAMP, 115, 0);
  G.PROP[G.ROD] = put(G, G.ROD, 115, 0);
  G.PROP[G.DWARF] = put(G, G.DWARF, 115, 0);
  G.LOC = 115;
  G.OLDLOC = 115;
  G.NEWLOC = 115;

  put(G, G.GRATE, 116, 0);
  put(G, G.SIGN, 116, 0);
  G.data.objtxt[G.SIGN] = G.data.objtxt[G.SIGN] + 1;
  G.PROP[G.SNAKE] = put(G, G.SNAKE, 116, 1);
  G.PROP[G.BIRD] = put(G, G.BIRD, 116, 1);
  G.PROP[G.CAGE] = put(G, G.CAGE, 116, 0);
  G.PROP[G.ROD2] = put(G, G.ROD2, 116, 0);
  G.PROP[G.PILLOW] = put(G, G.PILLOW, 116, 0);

  G.PROP[G.MIRROR] = put(G, G.MIRROR, 115, 0);
  G.FIXED[G.MIRROR] = 116;

  for (G.I = 1; G.I <= 100; G.I++) {
    if (TOTING(G, G.I)) destroy(G, G.I);
  }

  rspeak(G, 132);
  G.CLOSED = 1;
  return true;
}

// ---- Hint condition checks ----
function checkHint(G) {
  switch (G.HINT) {
    case 1: // Cave
      if (G.PROP[G.GRATE] === 0 && !HERE(G, G.KEYS)) return 'offer';
      return 'clear';
    case 2: // Bird
      if (G.PLACE[G.BIRD] === G.LOC && TOTING(G, G.ROD) && G.OLDOBJ === G.BIRD) return 'offer';
      return 'skip';
    case 3: // Snake
      if (HERE(G, G.SNAKE) && !HERE(G, G.BIRD)) return 'offer';
      return 'clear';
    case 4: // Maze
      if (G.ATLOC[G.LOC] === 0 && G.ATLOC[G.OLDLOC] === 0 && G.ATLOC[G.OLDLC2] === 0 && G.HOLDNG > 1) return 'offer';
      return 'clear';
    case 5: // Dark
      if (G.PROP[G.EMRALD] !== -1 && G.PROP[G.PYRAM] === -1) return 'offer';
      return 'clear';
    case 6: // Witt
      return 'offer';
    case 7: // Urn
      if (G.DFLAG === 0) return 'offer';
      return 'clear';
    case 8: // Woods
      if (G.ATLOC[G.LOC] === 0 && G.ATLOC[G.OLDLOC] === 0 && G.ATLOC[G.OLDLC2] === 0) return 'offer';
      return 'skip';
    case 9: // Ogre
      G.I = atdwrf(G, G.LOC);
      if (G.I < 0) return 'clear';
      if (HERE(G, G.OGRE) && G.I === 0) return 'offer';
      return 'skip';
    case 10: // Jade
      if (G.TALLY === 1 && G.PROP[G.JADE] < 0) return 'offer';
      return 'clear';
    default:
      return 'skip';
  }
}
