/**
 * soko2-1 - NetHack special level
 * Converted from: soko2-1.lua
 */

import * as des from '../sp_lev.js';
import { selection } from '../sp_lev.js';

export async function generate() {
    // NetHack sokoban soko2-1.lua	$NHDT-Date: 1652196035 2022/5/10 15:20:35 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.1 $
    // Copyright (c) 1998-1999 by Kevin Hugo
    // NetHack may be freely redistributed.  See license for details.
    // 
    des.level_init({ style: "solidfill", fg: " " });

    des.level_flags("mazelevel", "noteleport", "premapped", "sokoban", "solidify");

    await des.map(`\
--------------------
|........|...|.....|
|.....-..|.-.|.....|
|..|.....|...|.....|
|-.|..-..|.-.|.....|
|...--.......|.....|
|...|...-...-|.....|
|...|..|...--|.....|
|-..|..|----------+|
|..................|
|...|..|------------
--------            
`);
    await des.stair("down", 6,10);
    await des.stair("up", 16,4);
    await des.door("locked", 18,8);
    await des.region(selection.area(0,0, 19,11), "lit");
    await des.non_diggable(selection.area(0,0,19,11));
    await des.non_passwall(selection.area(0,0,19,11));

    // Boulders
    await des.object("boulder",2,2);
    await des.object("boulder",3,2);
    // 
    await des.object("boulder",5,3);
    await des.object("boulder",7,3);
    await des.object("boulder",7,2);
    await des.object("boulder",8,2);
    // 
    await des.object("boulder",10,3);
    await des.object("boulder",11,3);
    // 
    await des.object("boulder",2,7);
    await des.object("boulder",2,8);
    await des.object("boulder",3,9);
    // 
    await des.object("boulder",5,7);
    await des.object("boulder",6,6);

    // prevent monster generation over the (filled) holes
    await des.exclusion({ type: "monster-generation", region: [ 7,9, 18,9 ] });
    // Traps
    await des.trap("hole",8,9);
    await des.trap("hole",9,9);
    await des.trap("hole",10,9);
    await des.trap("hole",11,9);
    await des.trap("hole",12,9);
    await des.trap("hole",13,9);
    await des.trap("hole",14,9);
    await des.trap("hole",15,9);
    await des.trap("hole",16,9);
    await des.trap("hole",17,9);

    // Random objects
    await des.object({ class: "%" });
    await des.object({ class: "%" });
    await des.object({ class: "%" });
    await des.object({ class: "%" });
    await des.object({ class: "=" });
    await des.object({ class: "/" });


    return await des.finalize_level();
}
