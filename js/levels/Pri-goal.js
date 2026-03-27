/**
 * Pri-goal - NetHack special level
 * Converted from: Pri-goal.lua
 */

import * as des from '../sp_lev.js';
import { selection } from '../sp_lev.js';
import { rn2 } from '../rng.js';

export async function generate() {
    // NetHack Priest Pri-goal.lua	$NHDT-Date: 1687033651 2023/6/17 20:27:31 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.2 $
    // Copyright (c) 1989 by Jean-Christophe Collet
    // Copyright (c) 1991-2 by M. Stephenson
    // NetHack may be freely redistributed.  See license for details.
    // 
    des.level_init({ style: "solidfill", fg: " " });

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
    let place = [ [14,4], [13,7] ]
    let placeidx = (rn2((place.length) - (1) + 1) + (1));

    await des.region(selection.area(0,0,25,10), "unlit");
    // Stairs
    await des.stair("up", 20,5);
    // Objects [note: eroded=-1 => obj->oerodeproof=1]
    await des.object({ id: "helm of brilliance", coord: place[placeidx],
                 buc: "blessed", spe: 0, eroded: -1, name: "The Mitre of Holiness" })
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
    await des.monster("Nalzok",place[placeidx]);
    await des.monster("human zombie");
    await des.monster("human zombie");
    await des.monster("human zombie");
    await des.monster("human zombie");
    await des.monster("human zombie");
    await des.monster("human zombie");
    await des.monster("human zombie");
    await des.monster("human zombie");
    await des.monster("human zombie");
    await des.monster("human zombie");
    await des.monster("human zombie");
    await des.monster("human zombie");
    await des.monster("human zombie");
    await des.monster("human zombie");
    await des.monster("human zombie");
    await des.monster("human zombie");
    await des.monster("Z");
    await des.monster("Z");
    await des.monster("wraith");
    await des.monster("wraith");
    await des.monster("wraith");
    await des.monster("wraith");
    await des.monster("wraith");
    await des.monster("wraith");
    await des.monster("wraith");
    await des.monster("wraith");
    await des.monster("W");


    return await des.finalize_level();
}
