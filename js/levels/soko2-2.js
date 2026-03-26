/**
 * soko2-2 - NetHack special level
 * Converted from: soko2-2.lua
 */

import * as des from '../sp_lev.js';
import { selection } from '../sp_lev.js';

export async function generate() {
    // NetHack sokoban soko2-2.lua	$NHDT-Date: 1652196035 2022/5/10 15:20:35 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.1 $
    // Copyright (c) 1998-1999 by Kevin Hugo
    // NetHack may be freely redistributed.  See license for details.
    // 
    des.level_init({ style: "solidfill", fg: " " });

    des.level_flags("mazelevel", "noteleport", "premapped", "sokoban", "solidify");

    await des.map(`\
  --------          
--|.|....|          
|........|----------
|.-...-..|.|.......|
|...-......|.......|
|.-....|...|.......|
|....-.--.-|.......|
|..........|.......|
|.--...|...|.......|
|....-.|---|.......|
--|....|----------+|
  |................|
  ------------------
`);
    await des.stair("down", 6,11);
    await des.stair("up", 15,6);
    await des.door("locked",18,10);
    await des.region(selection.area(0,0,19,12), "lit");
    await des.non_diggable(selection.area(0,0,19,12));
    await des.non_passwall(selection.area(0,0,19,12));

    // Boulders
    await des.object("boulder",4,2);
    await des.object("boulder",4,3);
    await des.object("boulder",5,3);
    await des.object("boulder",7,3);
    await des.object("boulder",8,3);
    await des.object("boulder",2,4);
    await des.object("boulder",3,4);
    await des.object("boulder",5,5);
    await des.object("boulder",6,6);
    await des.object("boulder",9,6);
    await des.object("boulder",3,7);
    await des.object("boulder",4,7);
    await des.object("boulder",7,7);
    await des.object("boulder",6,9);
    await des.object("boulder",5,10);
    await des.object("boulder",5,11);

    // prevent monster generation over the (filled) holes
    await des.exclusion({ type: "monster-generation", region: [ 6,11, 18,11 ] });
    // Traps
    await des.trap("hole",7,11);
    await des.trap("hole",8,11);
    await des.trap("hole",9,11);
    await des.trap("hole",10,11);
    await des.trap("hole",11,11);
    await des.trap("hole",12,11);
    await des.trap("hole",13,11);
    await des.trap("hole",14,11);
    await des.trap("hole",15,11);
    await des.trap("hole",16,11);
    await des.trap("hole",17,11);

    // Random objects
    await des.object({ class: "%" });
    await des.object({ class: "%" });
    await des.object({ class: "%" });
    await des.object({ class: "%" });
    await des.object({ class: "=" });
    await des.object({ class: "/" });


    return await des.finalize_level();
}
