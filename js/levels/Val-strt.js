/**
 * Val-strt - NetHack special level
 * Converted from: Val-strt.lua
 */

import * as des from '../sp_lev.js';
import { selection } from '../sp_lev.js';

export async function generate() {
    // NetHack Valkyrie Val-strt.lua	$NHDT-Date: 1652196017 2022/5/10 15:20:17 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.2 $
    // Copyright (c) 1989 by Jean-Christophe Collet
    // Copyright (c) 1991-2 by M. Stephenson
    // NetHack may be freely redistributed.  See license for details.
    // 
    // 
    // The "start" level for the quest.
    // 
    // Here you meet your (besieged) class leader, the Norn,
    // && receive your quest assignment.
    // 

    des.level_flags("mazelevel", "noteleport", "hardfloor", "icedpools");
    des.level_init({ style: "solidfill", fg: "I" });

    let pools = selection.new();
    const allTiles = selection.area(0,0,75,19);
    const randomSeedSelection = () => {
        const seed = selection.new();
        const coord = allTiles.rndcoord(1);
        if (coord) seed.set(coord.x, coord.y);
        return seed;
    };
    // random locations
    for (let i = 1; i <= 13; i++) {
       const coord = allTiles.rndcoord(1);
       if (coord) pools.set(coord.x, coord.y);
    }
    // some bigger ones
    pools = pools.union(selection.grow(randomSeedSelection(), 1));
    pools = pools.union(selection.grow(randomSeedSelection(), 1));
    pools = pools.union(selection.grow(randomSeedSelection(), 1));

    // Lava pools surrounded by water
    await des.terrain(selection.grow(pools, 1), "P");
    await des.terrain(pools, "L");

    await des.map(`\
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxx..xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...xxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxx..xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx..{..xxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxx..xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.....xxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxx..xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxx..xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxx..xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx..xxxxxxxxxxxxxxxxxxx
xxxxxxxx.....xxxxxxxxxxxxx|----------------|xxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxx
xxxxxxx..xxx...xxxxxxxxxxx|................|xxxxxxxxxx..xxxxxxxxxxxxxxxxxxxx
xxxxxx..xxxxxx......xxxxx.|................|.xxxxxxxxx.xxxxxxxxxxxxxxxxxxxxx
xxxxx..xxxxxxxxxxxx.......+................+...xxxxxxx.xxxxxxxxxxxxxxxxxxxxx
xxxx..xxxxxxxxx.....xxxxx.|................|.x...xxxxx.xxxxxxxxxxxxxxxxxxxxx
xxx..xxxxxxxxx..xxxxxxxxxx|................|xxxx.......xxxxxxxxxxxxxxxxxxxxx
xxxx..xxxxxxx..xxxxxxxxxxx|----------------|xxxxxxxxxx...xxxxxxxxxxxxxxxxxxx
xxxxxx..xxxx..xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...xxxxxxxxxxxxxxxxx
xxxxxxx......xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...xxxxxxxxxxxxxxx
xxxxxxxxx...xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...x......xxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.........xxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.......xxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
`);
    // Dungeon Description
    await des.region(selection.area(0,0,75,19), "lit");
    // Portal arrival point
    await des.levregion({ region: [66,17,66,17], type: "branch" });
    // Stairs
    await des.stair("down", 18,1);
    await des.feature("fountain", 53,2);
    // Doors
    await des.door("locked",26,10);
    await des.door("locked",43,10);
    // Norn
    await des.monster({ id: "Norn", coord: [35, 10], inventory: async function() {
       await des.object({ id: "banded mail", spe: 5 });
       await des.object({ id: "long sword", spe: 4 });
    } })
    // The treasure of the Norn
    await des.object("chest", 36, 10);
    // valkyrie guards for the audience chamber
    await des.monster("warrior", 27, 8);
    await des.monster("warrior", 27, 9);
    await des.monster("warrior", 27, 11);
    await des.monster("warrior", 27, 12);
    await des.monster("warrior", 42, 8);
    await des.monster("warrior", 42, 9);
    await des.monster("warrior", 42, 11);
    await des.monster("warrior", 42, 12);
    // Non diggable walls
    await des.non_diggable(selection.area(26,7,43,13));
    // Random traps
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    await des.trap("fire");
    // Monsters on siege duty.
    await des.monster("fire ant", 4, 12);
    await des.monster("fire ant", 8, 8);
    await des.monster("fire ant", 14, 4);
    await des.monster("fire ant", 17, 11);
    await des.monster("fire ant", 24, 10);
    await des.monster("fire ant", 45, 10);
    await des.monster("fire ant", 54, 2);
    await des.monster("fire ant", 55, 7);
    await des.monster("fire ant", 58, 14);
    await des.monster("fire ant", 63, 17);
    await des.monster({ id: "fire giant", x: 18, y: 1, peaceful: 0 });
    await des.monster({ id: "fire giant", x: 10, y: 16, peaceful: 0 });
    return await des.finalize_level();
}
