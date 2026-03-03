/**
 * Kni-loca - NetHack special level
 * Converted from: Kni-loca.lua
 */

import * as des from '../sp_lev.js';
import { selection } from '../sp_lev.js';

export async function generate() {
    // NetHack Knight Kni-loca.lua	$NHDT-Date: 1652196005 2022/5/10 15:20:5 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.2 $
    // Copyright (c) 1989 by Jean-Christophe Collet
    // Copyright (c) 1991,92 by M. Stephenson
    // NetHack may be freely redistributed.  See license for details.
    // 
    des.level_init({ style: "solidfill", fg: " " });

    des.level_flags("mazelevel", "hardfloor");

    des.level_init({ style: "mines", fg: ".", bg: "P", smoothed: false, joined: true, lit: 1, walled: false });

    des.map(`\
xxxxxxxxx......xxxx...........xxxxxxxxxx
xxxxxxx.........xxx.............xxxxxxxx
xxxx..............................xxxxxx
xx.................................xxxxx
....................................xxxx
.......................................x
........................................
xx...................................xxx
xxxx..............................xxxxxx
xxxxxx..........................xxxxxxxx
xxxxxxxx.........xx..........xxxxxxxxxxx
xxxxxxxxx.......xxxxxx.....xxxxxxxxxxxxx
`);
    // Dungeon Description
    // The Isle of Glass is a Tor rising out of the swamps surrounding it.
    des.region(selection.area(0,0,39,11), "lit");
    // The top area of the Tor is a holy site.
    des.region({ region: [9,2, 27,9], lit: 1, type: "temple", filled: 2 });
    // Stairs
    des.stair("up", 38,0);
    des.stair("down", 18,5);
    // The altar atop the Tor && its attendant (creating altar makes the priest).
    des.altar({ x: 17, y: 5, align: "neutral", type: "shrine" });
    // Objects
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    // Random traps
    // All of the avenues are guarded by magic except for the East.
    // South
    await des.trap("magic",8,11);
    await des.trap("magic",9,11);
    await des.trap("magic",10,11);
    await des.trap("magic",11,11);
    await des.trap("magic",12,11);
    await des.trap("magic",13,11);
    await des.trap("magic",14,11);
    await des.trap("magic",15,11);
    await des.trap("magic",16,11);
    await des.trap("magic",20,11);
    await des.trap("magic",21,11);
    await des.trap("magic",22,11);
    await des.trap("magic",23,11);
    await des.trap("magic",24,11);
    await des.trap("magic",25,11);
    await des.trap("magic",26,11);
    await des.trap("magic",27,11);
    await des.trap("magic",28,11);
    // West
    await des.trap("magic",0,3);
    await des.trap("magic",0,4);
    await des.trap("magic",0,5);
    await des.trap("magic",0,6);
    // North
    await des.trap("magic",6,0);
    await des.trap("magic",7,0);
    await des.trap("magic",8,0);
    await des.trap("magic",9,0);
    await des.trap("magic",10,0);
    await des.trap("magic",11,0);
    await des.trap("magic",12,0);
    await des.trap("magic",13,0);
    await des.trap("magic",14,0);
    await des.trap("magic",19,0);
    await des.trap("magic",20,0);
    await des.trap("magic",21,0);
    await des.trap("magic",22,0);
    await des.trap("magic",23,0);
    await des.trap("magic",24,0);
    await des.trap("magic",25,0);
    await des.trap("magic",26,0);
    await des.trap("magic",27,0);
    await des.trap("magic",28,0);
    await des.trap("magic",29,0);
    await des.trap("magic",30,0);
    await des.trap("magic",31,0);
    await des.trap("magic",32,0);
    // Even so, there are magic "sinkholes" around.
    await des.trap("anti magic");
    await des.trap("anti magic");
    await des.trap("anti magic");
    await des.trap("anti magic");
    await des.trap("anti magic");
    await des.trap("anti magic");
    await des.trap("anti magic");
    // Random monsters.
    des.monster({ id: "quasit", peaceful: 0 });
    des.monster({ id: "quasit", peaceful: 0 });
    des.monster({ id: "quasit", peaceful: 0 });
    des.monster({ id: "quasit", peaceful: 0 });
    des.monster({ id: "quasit", peaceful: 0 });
    des.monster({ id: "quasit", peaceful: 0 });
    des.monster({ id: "quasit", peaceful: 0 });
    des.monster({ id: "quasit", peaceful: 0 });
    des.monster({ id: "quasit", peaceful: 0 });
    des.monster({ id: "quasit", peaceful: 0 });
    des.monster({ id: "quasit", peaceful: 0 });
    des.monster({ id: "quasit", peaceful: 0 });
    des.monster({ id: "quasit", peaceful: 0 });
    des.monster({ id: "quasit", peaceful: 0 });
    des.monster({ id: "quasit", peaceful: 0 });
    des.monster({ id: "quasit", peaceful: 0 });
    des.monster({ id: "quasit", peaceful: 0 });
    des.monster({ class: "i", peaceful: 0 });
    des.monster({ class: "j", peaceful: 0 });
    des.monster({ id: "ochre jelly", peaceful: 0 });
    des.monster({ id: "ochre jelly", peaceful: 0 });
    des.monster({ id: "ochre jelly", peaceful: 0 });
    des.monster({ id: "ochre jelly", peaceful: 0 });
    des.monster({ id: "ochre jelly", peaceful: 0 });
    des.monster({ id: "ochre jelly", peaceful: 0 });
    des.monster({ id: "ochre jelly", peaceful: 0 });
    des.monster({ class: "j", peaceful: 0 });


    return await des.finalize_level();
}
