/**
 * fire - NetHack special level
 * Converted from: fire.lua
 */

import * as des from '../sp_lev.js';

export async function generate() {
    // NetHack endgame fire.lua	$NHDT-Date: 1700398454 2023/11/19 12:54:14 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.4 $
    // Copyright (c) 1989 by Jean-Christophe Collet
    // Copyright (c) 1992,1993 by Izchak Miller, David Cohrs,
    // && Timo Hakulinen
    // NetHack may be freely redistributed.  See license for details.
    // 
    des.level_init({ style: "solidfill", fg: " " });

    des.level_flags("mazelevel", "noteleport", "hardfloor", "shortsighted", "hot", "fumaroles");
    // The player lands, upon arrival, in the
    // lower-right.  The location of the
    // portal to the next level is randomly chosen.
    // This map has no visible outer boundary, &&
    // is mostly open area, with lava lakes && bunches of fire traps.
    // It fills the entire mappable area.
    await des.map(`\
LL.............LL..............L...LL.........LL.................LL...........L
LL....LLLLLLLL............L...L.............LL....LLL.......................LL.
L....LL...................L......................LLLL................LL........
.....L.............LLLL...LL....LL...............LLLLL.............LLL.........
.L.LLLL..............LL....L.....LLL..............LLLL..............LLLL......L
LL..........LLLL...LLLL...LLL....LLL......L........LLLL....LL........LLL......L
LL........LLLLLLL...LL.....L......L......LL.........LL......LL........LL...L...
L.........LL..LLL..LL......LL......LLLL..L.........LL......LLL............LL...
......L..LL....LLLLL.................LLLLLLL.......L......LL............LLLLLL.
......L..L.....LL.LLLL.......L............L........LLLLL.LL......LL.........LL.
......LL........L...LL......LL.............LLL.....L...LLL.......LLL.........L.
.L.....LLLLLL........L.......LLL.............L....LL...L.LLL......LLLLLLL......
LL..........LLLL............LL.L.............L....L...LL.........LLL..LLL......
.L...........................LLLLL...........LL...L...L........LLLL..LLLLLL...L
.L.....LLLL.............LL....LL.......LLL...LL.......L..LLL....LLLLLLL.......L
.........LLL.........LLLLLLLLLLL......LLLLL...L...........LL...LL...LL.........
...........LL.......LL.........LL.......LLL....L..LLL....LL.........LL.........
............LLLLLLLLL...........LL....LLL.......LLLLL.....LL........LL.........
.LL...............L.............LLLLLL............LL...LLLL.........LL.......L.
LL.....L..........................LL....................LL..................LLL
L.....LLL......................LLLLL.........L.........LLLLLLLL..............LL
`);
    await des.teleport_region({ region: [71,16,71,16] });
    await des.levregion({ region: [0,0,78,19], exclude: [67,13,78,19], type: "portal", name: "water" });

    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    // An assortment of fire-appropriate nasties
    await des.monster("red dragon");
    await des.monster("balrog");
    await des.monster({ id: "fire elemental", peaceful: 0 });
    await des.monster({ id: "fire elemental", peaceful: 0 });
    await des.monster("fire vortex");
    await des.monster("hell hound");
    // 
    await des.monster("fire giant");
    await des.monster("barbed devil");
    await des.monster("hell hound");
    await des.monster("stone golem");
    await des.monster("pit fiend");
    await des.monster({ id: "fire elemental", peaceful: 0 });
    // 
    await des.monster({ id: "fire elemental", peaceful: 0 });
    await des.monster("hell hound");
    await des.monster({ id: "fire elemental", peaceful: 0 });
    await des.monster({ id: "fire elemental", peaceful: 0 });
    await des.monster("scorpion");
    await des.monster("fire giant");
    // 
    await des.monster("hell hound");
    await des.monster("dust vortex");
    await des.monster("fire vortex");
    await des.monster({ id: "fire elemental", peaceful: 0 });
    await des.monster({ id: "fire elemental", peaceful: 0 });
    await des.monster({ id: "fire elemental", peaceful: 0 });
    await des.monster("hell hound");
    await des.monster({ id: "fire elemental", peaceful: 0 });
    await des.monster("stone golem");
    await des.monster("pit viper");
    await des.monster("pit viper");
    await des.monster("fire vortex");
    // 
    await des.monster({ id: "fire elemental", peaceful: 0 });
    await des.monster({ id: "fire elemental", peaceful: 0 });
    await des.monster("fire giant");
    await des.monster({ id: "fire elemental", peaceful: 0 });
    await des.monster("fire vortex");
    await des.monster("fire vortex");
    await des.monster("pit fiend");
    await des.monster({ id: "fire elemental", peaceful: 0 });
    await des.monster("pit viper");
    // 
    await des.monster({ id: "salamander", peaceful: 0 });
    await des.monster({ id: "salamander", peaceful: 0 });
    await des.monster("minotaur");
    await des.monster({ id: "salamander", peaceful: 0 });
    await des.monster("steam vortex");
    await des.monster({ id: "salamander", peaceful: 0 });
    await des.monster({ id: "salamander", peaceful: 0 });
    // 
    await des.monster("fire giant");
    await des.monster("barbed devil");
    await des.monster({ id: "fire elemental", peaceful: 0 });
    await des.monster("fire vortex");
    await des.monster({ id: "fire elemental", peaceful: 0 });
    await des.monster({ id: "fire elemental", peaceful: 0 });
    await des.monster("hell hound");
    await des.monster("fire giant");
    await des.monster("pit fiend");
    await des.monster({ id: "fire elemental", peaceful: 0 });
    await des.monster({ id: "fire elemental", peaceful: 0 });
    // 
    await des.monster("barbed devil");
    await des.monster({ id: "salamander", peaceful: 0 });
    await des.monster("steam vortex");
    await des.monster({ id: "salamander", peaceful: 0 });
    await des.monster({ id: "salamander", peaceful: 0 });

    await des.object("boulder");
    await des.object("boulder");
    await des.object("boulder");
    await des.object("boulder");
    await des.object("boulder");



    return await des.finalize_level();
}
