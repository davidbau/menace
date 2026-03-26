/**
 * Wiz-loca - NetHack special level
 * Converted from: Wiz-loca.lua
 */

import * as des from '../sp_lev.js';
import { selection } from '../sp_lev.js';
import { rn2 } from '../rng.js';

export async function generate() {
    // NetHack Wizard Wiz-loca.lua	$NHDT-Date: 1652196019 2022/5/10 15:20:19 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.2 $
    // Copyright (c) 1992 by David Cohrs
    // NetHack may be freely redistributed.  See license for details.
    // 
    des.level_init({ style: "solidfill", fg: " " });

    des.level_flags("mazelevel", "hardfloor");

    await des.map(`\
.............        .......................................................
..............       .............}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}.......
..............      ..............}.................................}.......
..............      ..............}.-------------------------------.}.......
...............     .........C....}.|.............................|.}.......
...............    ..........C....}.|.---------------------------.|.}.......
...............    .........CCC...}.|.|.........................|.|.}.......
................   ....C....CCC...}.|.|.-----------------------.|.|.}.......
.......C..C.....  .....C....CCC...}.|.|.|......+.......+......|.|.|.}.......
.............C..CC.....C....CCC...}.|.|.|......|-------|......|.|.|.}.......
................   ....C....CCC...}.|.|.|......|.......|......|.|.|.}.......
......C..C.....    ....C....CCC...}.|.|.|......|-------|......|.|.|.}.......
............C..     ...C....CCC...}.|.|.|......+.......+......|.|.|.}.......
........C......    ....C....CCC...}.|.|.-----------------------.|.|.}.......
....C......C...     ........CCC...}.|.|.........................|.|.}.......
......C..C....      .........C....}.|.---------------------------.|.}.......
..............      .........C....}.|.............................|.}.......
.............       ..............}.-------------------------------.}.......
.............        .............}.................................}.......
.............        .............}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}.......
.............        .......................................................
`);

    await des.replace_terrain({ region: [ 0, 0,30,20], fromterrain: ".", toterrain: "C", chance: 15 });
    await des.replace_terrain({ region: [68, 0,75,20], fromterrain: ".", toterrain: "}", chance: 25 });
    await des.replace_terrain({ region: [34, 1,68,19], fromterrain: "}", toterrain: ".", chance: 2 });

    // Dungeon Description
    await des.region(selection.area(0,0,75,20), "lit");
    await des.region({ region: [37,4,65,16], lit: 0, type: "ordinary", irregular: 1,
                 contents: async function() {
                    await des.door({ state: "secret", wall: "random" });
                    }
    })
    await des.region({ region: [39,6,63,14], lit: 0, type: "ordinary", irregular: 1,
                 contents: async function() {
                    await des.door({ state: "secret", wall: "random" });
                 }
    })

    await des.region({ region: [41,8,46,12], lit: 1, type: "ordinary", irregular: 1,
                 contents: async function() {
                    const walls = [ "north", "south", "west" ];
                    const widx = rn2(walls.length);
                    await des.door({ state: "secret", wall: walls[widx] });
                 }
    })

    await des.region({ region: [56,8,61,12], lit: 1, type: "ordinary", irregular: 1,
                 contents: async function() {
                    const walls = [ "north", "south", "east" ];
                    const widx = rn2(walls.length);
                    await des.door({ state: "secret", wall: walls[widx] });
                 }
    })

    await des.region(selection.area(48,8,54,8), "unlit");
    await des.region(selection.area(48,12,54,12), "unlit");

    await des.region({ region: [48,10,54,10], lit: 0, type: "ordinary", irregular: 1,
                 contents: async function() {
                    await des.door({ state: "secret", wall: "random" });
                 }
    })

    // Doors
    await des.door("locked",55,8);
    await des.door("locked",55,12);
    await des.door("locked",47,8);
    await des.door("locked",47,12);
    // Stairs
    await des.terrain([3,17], ".");
    await des.stair("up", 3,17);
    await des.stair("down", 48,10);
    // Non diggable walls
    await des.non_diggable(selection.area(0,0,75,20));
    // Objects
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
    await des.object();
    // Random traps
    await des.trap("spiked pit",24,2);
    await des.trap("spiked pit",7,10);
    await des.trap("spiked pit",23,5);
    await des.trap("spiked pit",26,19);
    await des.trap("spiked pit",72,2);
    await des.trap("spiked pit",72,12);
    await des.trap("falling rock",45,16);
    await des.trap("falling rock",65,13);
    await des.trap("falling rock",55,6);
    await des.trap("falling rock",39,11);
    await des.trap("falling rock",57,9);
    await des.trap("magic");
    await des.trap("statue");
    await des.trap("statue");
    await des.trap("polymorph");
    await des.trap("anti magic",53,10);
    await des.trap("sleep gas");
    await des.trap("sleep gas");
    await des.trap("dart");
    await des.trap("dart");
    await des.trap("dart");
    // Random monsters.
    await des.monster({ class: "B", peaceful: 0 });
    await des.monster({ class: "B", peaceful: 0 });
    await des.monster({ class: "B", peaceful: 0 });
    await des.monster({ class: "B", peaceful: 0 });
    await des.monster({ class: "B", peaceful: 0 });
    await des.monster({ class: "B", peaceful: 0 });
    await des.monster({ class: "B", peaceful: 0 });
    await des.monster({ class: "B", peaceful: 0 });
    await des.monster({ class: "B", peaceful: 0 });
    await des.monster({ class: "B", peaceful: 0 });
    await des.monster({ class: "B", peaceful: 0 });
    await des.monster({ class: "B", peaceful: 0 });
    await des.monster({ class: "i", peaceful: 0 });
    await des.monster({ class: "i", peaceful: 0 });
    await des.monster({ class: "i", peaceful: 0 });
    await des.monster({ class: "i", peaceful: 0 });
    await des.monster({ class: "i", peaceful: 0 });
    await des.monster({ class: "i", peaceful: 0 });
    await des.monster({ class: "i", peaceful: 0 });
    await des.monster("vampire bat");
    await des.monster("vampire bat");
    await des.monster("vampire bat");
    await des.monster("vampire bat");
    await des.monster("vampire bat");
    await des.monster("vampire bat");
    await des.monster("vampire bat");
    await des.monster({ class: "i", peaceful: 0 });


    return await des.finalize_level();
}
