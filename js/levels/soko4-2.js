/**
 * soko4-2 - NetHack special level
 * Converted from: soko4-2.lua
 */

import * as des from '../sp_lev.js';
import { selection } from '../sp_lev.js';

export async function generate() {
    // NetHack sokoban soko4-2.lua	$NHDT-Date: 1652196036 2022/5/10 15:20:36 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.2 $
    // Copyright (c) 1998-1999 by Kevin Hugo
    // NetHack may be freely redistributed.  See license for details.
    // 
    des.level_init({ style: "solidfill", fg: " " });

    des.level_flags("mazelevel", "noteleport", "hardfloor", "premapped", "sokoban", "solidify");

    await des.map(`\
-------- ------
|.|....|-|....|
|.|-..........|
|.||....|.....|
|.||....|.....|
|.|-----|.-----
|.|    |......|
|.-----|......|
|.............|
|..|---|......|
----   --------
`);
    await des.levregion({ region: [3,1,3,1], type: "branch" });
    await des.stair("up", 1,1);
    await des.region(selection.area(0,0,14,10),"lit");
    await des.non_diggable(selection.area(0,0,14,10));
    await des.non_passwall(selection.area(0,0,14,10));

    // Boulders
    await des.object("boulder",5,2);
    await des.object("boulder",6,2);
    await des.object("boulder",6,3);
    await des.object("boulder",7,3);
    // 
    await des.object("boulder",9,5);
    await des.object("boulder",10,3);
    await des.object("boulder",11,2);
    await des.object("boulder",12,3);
    // 
    await des.object("boulder",7,8);
    await des.object("boulder",8,8);
    await des.object("boulder",9,8);
    await des.object("boulder",10,8);

    // prevent monster generation over the (filled) pits
    await des.exclusion({ type: "monster-generation", region: [ 1,1, 1,9 ] });
    await des.exclusion({ type: "monster-generation", region: [ 1,8, 7,9 ] });
    // Traps
    await des.trap("pit",1,2);
    await des.trap("pit",1,3);
    await des.trap("pit",1,4);
    await des.trap("pit",1,5);
    await des.trap("pit",1,6);
    await des.trap("pit",1,7);
    await des.trap("pit",3,8);
    await des.trap("pit",4,8);
    await des.trap("pit",5,8);
    await des.trap("pit",6,8);

    // A little help
    await des.object("scroll of earth",1,9);
    await des.object("scroll of earth",2,9);

    // Random objects
    await des.object({ class: "%" });
    await des.object({ class: "%" });
    await des.object({ class: "%" });
    await des.object({ class: "%" });
    await des.object({ class: "=" });
    await des.object({ class: "/" });




    return await des.finalize_level();
}
