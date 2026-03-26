/**
 * medusa-2 - NetHack special level
 * Converted from: medusa-2.lua
 */

import * as des from '../sp_lev.js';
import { selection, percent } from '../sp_lev.js';

export async function generate() {
    // NetHack medusa medusa-2.lua	$NHDT-Date: 1652196027 2022/5/10 15:20:27 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.4 $
    // Copyright (c) 1989 by Jean-Christophe Collet
    // Copyright (c) 1990, 1991 by M. Stephenson
    // NetHack may be freely redistributed.  See license for details.
    // 
    des.level_init({ style: "solidfill", fg: " " });

    des.level_flags("mazelevel", "noteleport");

    await des.map(`\
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
}------}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}-------}}}}}}}}--------------}
}|....|}}}}}}}}}..}.}}..}}}}}}}}}}}}}..}}}}}}-.....--}}}}}}}|............|}
}|....|.}}}}}}}}}}}.}...}}..}}}}}}}}}}}}}}}}}---......}}}}}.|............|}
}S....|.}}}}}}---}}}}}}}}}}}}}}}}}}}}}}}}}}---...|..-}}}}}}.S..----------|}
}|....|.}}}}}}-...}}}}}}}}}.}}...}.}}}}.}}}......----}}}}}}.|............|}
}|....|.}}}}}}-....--}}}}}}}}}}}}}}}}}}}}}}----...--}}}}}}}.|..--------+-|}
}|....|.}}}}}}}......}}}}...}}}}}}.}}}}}}}}}}}---..---}}}}}.|..|..S...|..|}
}|....|.}}}}}}-....-}}}}}}}------}}}}}}}}}}}}}}-...|.-}}}}}.|..|..|...|..|}
}|....|.}}}}}}}}}---}}}}}}}........}}}}}}}}}}---.|....}}}}}.|..|..|...|..|}
}|....|.}}}}}}}}}}}}}}}}}}-....|...-}}}}}}}}--...----.}}}}}.|..|..|...|..|}
}|....|.}}}}}}..}}}}}}}}}}---..--------}}}}}-..---}}}}}}}}}.|..|..-------|}
}|...}|...}}}.}}}}}}...}}}}}--..........}}}}..--}}}}}}}}}}}.|..|.........|}
}|...}S...}}.}}}}}}}}}}}}}}}-..--------}}}}}}}}}}}}}}...}}}.|..--------..S}
}|...}|...}}}}}}}..}}}}}}----..|....-}}}}}}}}}}}}}}}}}..}}}.|............|}
}|....|}}}}}....}}}}..}}.-.......----}}......}}}}}}.......}}|............|}
}------}}}}}}}}}}}}}}}}}}---------}}}}}}}}}}}}}}}}}}}}}}}}}}--------------}
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
`);
    // Dungeon Description
    await des.region(selection.area(0,0,74,19),"lit");
    await des.region(selection.area(2,3,5,16),"unlit");
    // fixup_special hack: the first room defined on a Medusa level gets some
    // leaderboard statues; setting the region as irregular makes it a room
    await des.region({ region: [61,3, 72,16], lit: 0, type: "ordinary",irregular: 1 });
    await des.region(selection.area(71,8,72,11),"unlit");
    // make the downstairs area a real room to control arriving monsters
    await des.region({ region: [67,8,69,11], lit: 1, type: "ordinary", arrival_room: true });
    // Teleport: down to up stairs island, up to Medusa's island
    await des.teleport_region({ region: [2,3,5,16], dir: "down" });
    await des.teleport_region({ region: [61,3,72,16], dir: "up" });
    // Stairs
    await des.stair("up", 4,9);
    await des.stair("down", 68,10);
    // Doors
    await des.door("locked", 71,7);
    // Branch, ! allowed on Medusa's island.
    await des.levregion({ type: "branch", region: [1,0,79,20], exclude: [59,1,73,17] });
    // Non diggable walls
    await des.non_diggable(selection.area(1,2,6,17));
    await des.non_diggable(selection.area(60,2,73,17));
    // Objects
    await des.object({ id: "statue", x: 68,y: 10,buc: "uncursed",
                          montype: "knight", historic: 1, male: 1,name: "Perseus",
                          contents: async function() {
                             if (percent(25)) {
                                await des.object({ id: "shield of reflection", buc: "cursed", spe: 0 });
                             }
                             if (percent(75)) {
                                await des.object({ id: "levitation boots", spe: 0 });
                             }
                             if (percent(50)) {
                                await des.object({ id: "scimitar", buc: "blessed", spe: 2 });
                             }
                             if (percent(50)) {
                                await des.object("sack");
                             }
                          }
    });
    await des.object({ id: "statue", x: 64, y: 8, contents: 0 });
    await des.object({ id: "statue", x: 65, y: 8, contents: 0 });
    await des.object({ id: "statue", x: 64, y: 9, contents: 0 });
    await des.object({ id: "statue", x: 65, y: 9, contents: 0 });
    await des.object({ id: "statue", x: 64, y: 10, contents: 0 });
    await des.object({ id: "statue", x: 65, y: 10, contents: 0 });
    await des.object({ id: "statue", x: 64, y: 11, contents: 0 });
    await des.object({ id: "statue", x: 65, y: 11, contents: 0 });
    await des.object("boulder",4,4);
    await des.object("/",52,9);
    await des.object("boulder",52,9);
    await des.object();
    await des.object();
    await des.object();
    await des.object();
    await des.object();
    await des.object();
    // Traps
    await des.trap("magic",3,12);
    await des.trap();
    await des.trap();
    await des.trap();
    await des.trap();
    // Monsters.
    await des.monster({ id: "Medusa",x: 68,y: 10,asleep: 1 });
    await des.monster("gremlin",2,14);
    await des.monster("titan",2,5);
    await des.monster("electric eel",10,13);
    await des.monster("electric eel",11,13);
    await des.monster("electric eel",10,14);
    await des.monster("electric eel",11,14);
    await des.monster("electric eel",10,15);
    await des.monster("electric eel",11,15);
    await des.monster("jellyfish",1,1);
    await des.monster("jellyfish",0,8);
    await des.monster("jellyfish",4,19);
    await des.monster({ id: "stone golem",x: 64,y: 8,asleep: 1 });
    await des.monster({ id: "stone golem",x: 65,y: 8,asleep: 1 });
    await des.monster({ id: "stone golem",x: 64,y: 9,asleep: 1 });
    await des.monster({ id: "stone golem",x: 65,y: 9,asleep: 1 });
    await des.monster({ id: "cobra",x: 64,y: 10,asleep: 1 });
    await des.monster({ id: "cobra",x: 65,y: 10,asleep: 1 });
    await des.monster("A",72,8);
    await des.monster({ id: "yellow light",x: 72,y: 11,asleep: 1 });
    await des.monster({ x: 17, y: 7 });
    await des.monster({ x: 28, y: 11 });
    await des.monster({ x: 32, y: 13 });
    await des.monster({ x: 49, y: 9 });
    await des.monster({ x: 48, y: 7 });
    await des.monster({ x: 65, y: 3 });
    await des.monster({ x: 70, y: 4 });
    await des.monster({ x: 70, y: 15 });
    await des.monster({ x: 65, y: 16 });
    await des.monster();
    await des.monster();
    await des.monster();
    await des.monster();



    return await des.finalize_level();
}
