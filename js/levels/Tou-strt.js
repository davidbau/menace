/**
 * Tou-strt - NetHack special level
 * Converted from: Tou-strt.lua
 */

import * as des from '../sp_lev.js';
import { selection } from '../sp_lev.js';

export async function generate() {
    // NetHack Tourist Tou-strt.lua	$NHDT-Date: 1652196016 2022/5/10 15:20:16 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.3 $
    // Copyright (c) 1989 by Jean-Christophe Collet
    // Copyright (c) 1991,92 by M. Stephenson, P. Winner
    // NetHack may be freely redistributed.  See license for details.
    // 
    // 
    // The "start" level for the quest.
    // 
    // Here you meet your (besieged) class leader, Twoflower
    // && receive your quest assignment.
    // 
    des.level_init({ style: "solidfill", fg: " " });

    des.level_flags("mazelevel", "noteleport", "hardfloor");
    await des.map(`\
.......}}....---------..-------------------------------------------------...
........}}...|.......|..|.-------------------------------------------...|...
.........}}..|.......|..|.|......|......|.............|......|......|...|...
..........}}.|.......|..|.|......+......+.............+......+..\\...|...|...
...........}}}..........|.|......|......|.............|......|......|...|...
.............}}.........|.|----S-|--S---|S----------S-|---S--|------|...|...
..............}}}.......|...............................................|...
................}}}.....----S------++--S----------S----------S-----------...
..................}}...........    ..    ...................................
......-------......}}}}........}}}}..}}}}..}}}}..}}}}.......................
......|.....|.......}}}}}}..}}}}   ..   }}}}..}}}}..}}}.....................
......|.....+...........}}}}}}........................}}}..}}}}..}}}..}}}...
......|.....|...........................................}}}}..}}}..}}}}.}}}}
......-------...............................................................
............................................................................
...-------......-------.....................................................
...|.....|......|.....|.....................................................
...|.....+......+.....|.....................................................
...|.....|......|.....|.....................................................
...-------......-------.....................................................
`);
    // Dungeon Description
    await des.region(selection.area(0,0,75,19), "lit");
    await des.region({ region: [14,1, 20,3], lit: 0, type: "morgue", filled: 1 });
    await des.region(selection.area(7,10,11,12), "unlit");
    await des.region(selection.area(4,16,8,18), "unlit");
    await des.region(selection.area(17,16,21,18), "unlit");
    await des.region(selection.area(27,2,32,4), "unlit");
    await des.region(selection.area(34,2,39,4), "unlit");
    await des.region(selection.area(41,2,53,4), "unlit");
    await des.region(selection.area(55,2,60,4), "unlit");
    await des.region(selection.area(62,2,67,4), "lit");
    // Stairs
    await des.stair("down", 66,3);
    // Portal arrival point
    await des.levregion({ region: [68,14,68,14], type: "branch" });
    // Non diggable walls
    await des.non_diggable(selection.area(0,0,75,19));
    // Doors
    await des.door("locked",31,5);
    await des.door("locked",36,5);
    await des.door("locked",41,5);
    await des.door("locked",52,5);
    await des.door("locked",58,5);
    await des.door("locked",28,7);
    await des.door("locked",39,7);
    await des.door("locked",50,7);
    await des.door("locked",61,7);
    await des.door("closed",33,3);
    await des.door("closed",40,3);
    await des.door("closed",54,3);
    await des.door("closed",61,3);
    await des.door("open",12,11);
    await des.door("open",9,17);
    await des.door("open",16,17);
    await des.door("locked",35,7);
    await des.door("locked",36,7);
    // Monsters on siege duty.
    await des.monster("giant spider");
    await des.monster("giant spider");
    await des.monster("giant spider");
    await des.monster("giant spider");
    await des.monster("giant spider");
    await des.monster("giant spider");
    await des.monster("giant spider");
    await des.monster("giant spider");
    await des.monster("giant spider");
    await des.monster("giant spider");
    await des.monster("giant spider");
    await des.monster("giant spider");
    await des.monster("s");
    await des.monster("s");
    await des.monster("forest centaur");
    await des.monster("forest centaur");
    await des.monster("forest centaur");
    await des.monster("forest centaur");
    await des.monster("forest centaur");
    await des.monster("forest centaur");
    await des.monster("forest centaur");
    await des.monster("forest centaur");
    await des.monster("C");
    // Twoflower
    await des.monster({ id: "Twoflower", coord: [64, 3], inventory: async function() {
       await des.object({ id: "walking shoes", spe: 3 });
       await des.object({ id: "hawaiian shirt", spe: 3 });
    } })
    // The treasure of Twoflower
    await des.object("chest", 64, 3);
    // guides for the audience chamber
    await des.monster("guide", 29, 3);
    await des.monster("guide", 32, 4);
    await des.monster("guide", 35, 2);
    await des.monster("guide", 38, 3);
    await des.monster("guide", 45, 3);
    await des.monster("guide", 48, 2);
    await des.monster("guide", 49, 4);
    await des.monster("guide", 51, 3);
    await des.monster("guide", 57, 3);
    await des.monster("guide", 62, 4);
    await des.monster("guide", 66, 4);
    // path guards
    await des.monster("watchman", 35, 8);
    await des.monster("watchman", 36, 8);
    // river monsters
    await des.monster("giant eel", 62, 12);
    await des.monster("piranha", 47, 10);
    await des.monster("piranha", 29, 11);
    await des.monster("kraken", 34, 9);
    await des.monster("kraken", 37, 9);
    // Random traps
    await des.trap();
    await des.trap();
    await des.trap();
    await des.trap();
    await des.trap();
    await des.trap();
    await des.trap();
    await des.trap();
    await des.trap();


    return await des.finalize_level();
}
