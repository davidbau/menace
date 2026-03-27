/**
 * Mon-goal - NetHack special level
 * Converted from: Mon-goal.lua
 */

import * as des from '../sp_lev.js';
import { selection } from '../sp_lev.js';
import { rn2 } from '../rng.js';

export async function generate() {
    // NetHack Monk Mon-goal.lua	$NHDT-Date: 1652196007 2022/5/10 15:20:7 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.1 $
    // Copyright (c) 1989 by Jean-Christophe Collet
    // Copyright (c) 1991-2 by M. Stephenson
    // NetHack may be freely redistributed.  See license for details.
    // 
    // des.level_init({ style: "solidfill", fg: " " });

    des.level_flags("mazelevel");

    des.level_init({ style: "mines", fg: "L", bg: ".", smoothed: false, joined: false, lit: 0, walled: false });

    await des.map(`\
xxxxxx..xxxxxx...xxxxxxxxx
xxxx......xx......xxxxxxxx
xx.xx.............xxxxxxxx
x....................xxxxx
......................xxxx
......................xxxx
xx........................
xxx......................x
xxx................xxxxxxx
xxxx.....x.xx.......xxxxxx
xxxxx...xxxxxx....xxxxxxxx
`);
    // Dungeon Description
    let place = [ [14,4],[13,7] ]
    let placeidx = (rn2((place.length) - (1) + 1) + (1));

    await des.region(selection.area(0,0,25,10), "unlit");
    // Stairs
    await des.stair("up", 20,5);
    // Objects
    await des.object({ id: "lenses", coord: place[placeidx], buc: "blessed", spe: 0, name: "The Eyes of the Overworld" });
    await des.object();
    await des.object();
    await des.object();
    await des.object();
    await des.object();
    await des.object();
    await des.object();
    await des.object();
    await des.object();
    await des.object();
    await des.object();
    await des.object();
    await des.object();
    await des.object();
    // Random traps
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap();
    await des.trap();
    // Random monsters.
    await des.monster("Master Kaen",place[placeidx]);
    await des.altar({ coord: place[placeidx], align: "noalign", type: "altar" });
    await des.monster("earth elemental");
    await des.monster("earth elemental");
    await des.monster("earth elemental");
    await des.monster("earth elemental");
    await des.monster("earth elemental");
    await des.monster("earth elemental");
    await des.monster("earth elemental");
    await des.monster("earth elemental");
    await des.monster("earth elemental");
    await des.monster("xorn");
    await des.monster("xorn");
    await des.monster("xorn");
    await des.monster("xorn");
    await des.monster("xorn");
    await des.monster("xorn");
    await des.monster("xorn");
    await des.monster("xorn");
    await des.monster("xorn");


    return await des.finalize_level();
}
