/**
 * medusa-1 - NetHack special level
 * Converted from: medusa-1.lua
 */

import * as des from '../sp_lev.js';
import { selection, percent } from '../sp_lev.js';

export async function generate() {
    // NetHack medusa medusa-1.lua	$NHDT-Date: 1652196027 2022/5/10 15:20:27 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.4 $
    // Copyright (c) 1989 by Jean-Christophe Collet
    // Copyright (c) 1990, 1991 by M. Stephenson
    // NetHack may be freely redistributed.  See license for details.
    // 
    // 
    // These are the Medusa's levels :
    // 

    des.level_init({ style: "solidfill", fg: " " });

    des.level_flags("mazelevel", "noteleport");

    await des.map(`\
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
}}.}}}}}..}}}}}......}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}....}}}...}}}}}
}...}}.....}}}}}....}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}...............}
}....}}}}}}}}}}....}}}..}}}}}}}}}}}.......}}}}}}}}}}}}}}}}..}}.....}}}...}}
}....}}}}}}}}.....}}}}..}}}}}}.................}}}}}}}}}}}.}}}}.....}}...}}
}....}}}}}}}}}}}}.}}}}.}}}}}}.-----------------.}}}}}}}}}}}}}}}}}.........}
}....}}}}}}}}}}}}}}}}}}.}}}...|...............S...}}}}}}}}}}}}}}}}}}}....}}
}.....}.}}....}}}}}}}}}.}}....--------+--------....}}}}}}..}}}}}}}}}}}...}}
}......}}}}..}}}}}}}}}}}}}........|.......|........}}}}}....}}}}}}}}}}}}}}}
}.....}}}}}}}}}}}}}}}}}}}}........|.......|........}}}}}...}}}}}}}}}.}}}}}}
}.....}}}}}}}}}}}}}}}}}}}}....--------+--------....}}}}}}.}.}}}}}}}}}}}}}}}
}......}}}}}}}}}}}}}}}}}}}}...S...............|...}}}}}}}}}}}}}}}}}.}}}}}}}
}.......}}}}}}}..}}}}}}}}}}}}.-----------------.}}}}}}}}}}}}}}}}}....}}}}}}
}........}}.}}....}}}}}}}}}}}}.................}}}}}..}}}}}}}}}.......}}}}}
}.......}}}}}}}......}}}}}}}}}}}}}}.......}}}}}}}}}.....}}}}}}...}}..}}}}}}
}.....}}}}}}}}}}}.....}}}}}}}}}}}}}}}}}}}}}}.}}}}}}}..}}}}}}}}}}....}}}}}}}
}}..}}}}}}}}}}}}}....}}}}}}}}}}}}}}}}}}}}}}...}}..}}}}}}}.}}.}}}}..}}}}}}}}
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
`);
    // Dungeon Description
    await des.region(selection.area(0,0,74,19),"lit");
    await des.region(selection.area(31,7,45,7),"unlit");
    // make the downstairs room a real room to control arriving monsters, 
    // && also as a fixup_special hack; the first room defined on Medusa's level
    // receives some statues
    await des.region({ region: [35,9, 41,10], lit: 0, type: "ordinary", arrival_room: true });
    await des.region(selection.area(31,12,45,12),"unlit");
    // Teleport: down to up stairs island, up to Medusa's island
    await des.teleport_region({ region: [1,1,5,17], dir: "down" });
    await des.teleport_region({ region: [26,4,50,15], dir: "up" });
    // Stairs
    await des.stair("up", 5,14);
    await des.stair("down", 36,10);
    // Doors
    await des.door("closed",46,7);
    await des.door("locked",38,8);
    await des.door("locked",38,11);
    await des.door("closed",30,12);
    // Branch, ! allowed inside Medusa's building.
    await des.levregion({ region: [1,0,79,20], exclude: [30,6,46,13], type: "branch" });
    // Non diggable walls
    await des.non_diggable(selection.area(30,6,46,13));
    // Objects
    await des.object({ id: "statue", x: 36,y: 10, buc: "uncursed",
                 montype: "knight", historic: 1, male: 1, name: "Perseus",
                 contents: async function() {
                    if (percent(75)) {
                       await des.object({ id: "shield of reflection", buc: "cursed", spe: 0 });
                    }
                    if (percent(25)) {
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

    // Specifying explicit contents forces them to be empty.
    await des.object({ id: "statue", contents: 0 });
    await des.object({ id: "statue", contents: 0 });
    await des.object({ id: "statue", contents: 0 });
    await des.object({ id: "statue", contents: 0 });
    await des.object({ id: "statue", contents: 0 });
    await des.object({ id: "statue", contents: 0 });
    await des.object({ id: "statue", contents: 0 });
    await des.object();
    await des.object();
    await des.object();
    await des.object();
    await des.object();
    await des.object();
    await des.object();
    await des.object();
    // Random traps
    await des.trap();
    await des.trap();
    await des.trap();
    await des.trap();
    await des.trap();
    await des.trap("board",38,7);
    await des.trap("board",38,12);
    // Random monsters
    await des.monster({ id: "Medusa", x: 36,y: 10, asleep: 1 });
    await des.monster("giant eel",11,6);
    await des.monster("giant eel",23,13);
    await des.monster("giant eel",29,2);
    await des.monster("jellyfish",2,2);
    await des.monster("jellyfish",0,8);
    await des.monster("jellyfish",4,18);
    await des.monster("water troll",51,3);
    await des.monster("water troll",64,11);
    await des.monster({ class: 'S', x: 38, y: 7 });
    await des.monster({ class: 'S', x: 38, y: 12 });
    await des.monster();
    await des.monster();
    await des.monster();
    await des.monster();
    await des.monster();
    await des.monster();
    await des.monster();
    await des.monster();
    await des.monster();
    await des.monster();


    return await des.finalize_level();
}
