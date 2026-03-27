/**
 * minend-1 - NetHack special level
 * Converted from: minend-1.lua
 */

import * as des from '../sp_lev.js';
import { selection, shuffle } from '../sp_lev.js';

export async function generate() {
    // NetHack mines minend-1.lua	$NHDT-Date: 1652196029 2022/5/10 15:20:29 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.3 $
    // Copyright (c) 1989-95 by Jean-Christophe Collet
    // Copyright (c) 1991-95 by M. Stephenson
    // NetHack may be freely redistributed.  See license for details.
    // 
    // Mine } level variant 1
    // "Mimic of the Mines"

    des.level_init({ style: "solidfill", fg: " " });

    des.level_flags("mazelevel");

    await des.map(`\
------------------------------------------------------------------   ------
|                        |.......|     |.......-...|       |.....|.       |
|    ---------        ----.......-------...........|       ---...-S-      |
|    |.......|        |..........................-S-      --.......|      |
|    |......-------   ---........................|.       |.......--      |
|    |..--........-----..........................|.       -.-..----       |
|    --..--.-----........-.....................---        --..--          |
|     --..--..| -----------..................---.----------..--           |
|      |...--.|    |..S...S..............---................--            |
|     ----..-----  ------------........--- ------------...---             |
|     |.........--            ----------              ---...-- -----      |
|    --.....---..--                           --------  --...---...--     |
| ----..-..-- --..---------------------      --......--  ---........|     |
|--....-----   --..-..................---    |........|    |.......--     |
|.......|       --......................S..  --......--    ---..----      |
|--.--.--        ----.................---     ------..------...--         |
| |....S..          |...............-..|         ..S...........|          |
--------            --------------------           ------------------------
`);

    // Dungeon Description
    let place = [ [8,16],[13,7],[21,8],[41,14],[50,4],[50,16],[66,1] ]
    shuffle(place)

    // make the entry chamber a real room; it affects monster arrival
    await des.region({ region: [26,1,32,1], lit: 0, type: "ordinary", irregular: 1, arrival_room: true });
    await des.region(selection.area(20,8,21,8),"unlit");
    await des.region(selection.area(23,8,25,8),"unlit");
    // Secret doors
    await des.door("locked",7,16);
    await des.door("locked",22,8);
    await des.door("locked",26,8);
    await des.door("locked",40,14);
    await des.door("locked",50,3);
    await des.door("locked",51,16);
    await des.door("locked",66,2);
    // Stairs
    await des.stair("up", 36,4);
    // Non diggable walls
    await des.non_diggable(selection.area(0,0,74,17));
    // Niches
    // Note: place[5] empty
    await des.object("diamond",place[6]);
    await des.object("emerald",place[6]);
    await des.object("worthless piece of violet glass",place[6]);
    await des.monster({ class: "m", coord: place[6], appear_as: "obj:luckstone" });
    await des.object("worthless piece of white glass",place[0]);
    await des.object("emerald",place[0]);
    await des.object("amethyst",place[0]);
    await des.monster({ class: "m", coord: place[0], appear_as: "obj:loadstone" });
    await des.object("diamond",place[1]);
    await des.object("worthless piece of green glass",place[1]);
    await des.object("amethyst",place[1]);
    await des.monster({ class: "m", coord: place[1], appear_as: "obj:flint" });
    await des.object("worthless piece of white glass",place[2]);
    await des.object("emerald",place[2]);
    await des.object("worthless piece of violet glass",place[2]);
    await des.monster({ class: "m", coord: place[2], appear_as: "obj:touchstone" });
    await des.object("worthless piece of red glass",place[3]);
    await des.object("ruby",place[3]);
    await des.object("loadstone",place[3]);
    await des.object("ruby",place[4]);
    await des.object("worthless piece of red glass",place[4]);
    await des.object({ id: "luckstone", coord: place[4], buc: "!-cursed", achievement: 1 });
    // Random objects
    await des.object("*");
    await des.object("*");
    await des.object("*");
    await des.object("*");
    await des.object("*");
    await des.object("*");
    await des.object("*");
    await des.object("(");
    await des.object("(");
    await des.object();
    await des.object();
    await des.object();
    // Random traps
    await des.trap();
    await des.trap();
    await des.trap();
    await des.trap();
    await des.trap();
    await des.trap();
    // Random monsters
    await des.monster("gnome king");
    await des.monster("gnome lord");
    await des.monster("gnome lord");
    await des.monster("gnome lord");
    await des.monster("gnomish wizard");
    await des.monster("gnomish wizard");
    await des.monster("gnome");
    await des.monster("gnome");
    await des.monster("gnome");
    await des.monster("gnome");
    await des.monster("gnome");
    await des.monster("gnome");
    await des.monster("gnome");
    await des.monster("gnome");
    await des.monster("gnome");
    await des.monster("hobbit");
    await des.monster("hobbit");
    await des.monster("dwarf");
    await des.monster("dwarf");
    await des.monster("dwarf");
    await des.monster("h");


    return await des.finalize_level();
}
