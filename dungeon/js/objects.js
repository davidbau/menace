// objects.js - Object action handlers for DUNGEON
//
// Combines sobjs (simple objects 1-31), nobjs (new objects 32-77),
// complex objects (100-131), and external handlers (troll, cyclops,
// thief, balloon) into a single dispatch module.
//
// Ported from objects.f (Fortran) / objcts.c, sobjs.c, nobjs.c (C)
// COPYRIGHT 1980, 1990, INFOCOM COMPUTERS AND COMMUNICATIONS, CAMBRIDGE MA.

import { sobjs } from './objects_sobjs.js';
import { nobjs, oappli_complex, trollp, cyclop, thiefp, ballop } from './objects_nobjs.js';
import { OMAX, FLAMBT, LITEBT, ONBT, PLAYER } from './constants.js';
import { lit, rspeak } from './support.js';

// OAPPLI - Main object action dispatch
// ri = action index from oactio array
// arg = context argument (1=readin, 2=readout, 0=normal)
export function oappli(G, ri, arg) {
    if (ri === 0) return false;

    // Simple objects: ri 1-99
    if (ri <= 99) {
        if (ri < 32) return sobjs(G, ri, arg);
        return nobjs(G, ri, arg);
    }

    // Complex objects: ri > 99
    // Set up common variables
    let odo2 = 0, odi2 = 0;
    if (G.prso !== 0 && G.prso <= OMAX) odo2 = G.odesc2[G.prso - 1];
    if (G.prsi !== 0) odi2 = G.odesc2[G.prsi - 1];
    const av = G.avehic[G.winner - 1];
    const flobts = FLAMBT + LITEBT + ONBT;
    const waslit = lit(G, G.here);

    const result = oappli_complex(G, ri, arg);

    // After complex handler: check for light source change
    if (result && waslit && !lit(G, G.here)) {
        rspeak(G, 406);
    }

    return result;
}

// OBJACT - Top-level object action processor
// C ref: subr.f OBJACT — checks indirect object FIRST, then direct object.
// No prso/prsi swapping — the handlers check both as needed.
export function objact(G) {
    // Check indirect object action first (Fortran: IF(PRSI.EQ.0) GO TO 100)
    if (G.prsi !== 0 && G.prsi > 0 && G.prsi <= OMAX) {
        if (oappli(G, G.oactio[G.prsi - 1], 0)) return true;
    }

    // Check direct object action (Fortran: IF(PRSO.EQ.0) GO TO 200)
    if (G.prso !== 0 && G.prso > 0 && G.prso <= OMAX) {
        if (oappli(G, G.oactio[G.prso - 1], 0)) return true;
    }

    return false;
}

// Re-export external handlers for use by other modules
export { trollp, cyclop, thiefp, ballop };
