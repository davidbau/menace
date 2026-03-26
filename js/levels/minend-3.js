/**
 * minend-3 - NetHack special level
 * Converted from: minend-3.lua
 */

import * as des from '../sp_lev.js';
import { selection, shuffle } from '../sp_lev.js';

export async function generate() {
    // NetHack mines minend-3.lua	$NHDT-Date: 1652196029 2022/5/10 15:20:29 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.2 $
    // Copyright (c) 1989-95 by Jean-Christophe Collet
    // Copyright (c) 1991-95 by M. Stephenson
    // NetHack may be freely redistributed.  See license for details.
    // 
    // "Catacombs" by Kelly Bailey
    // Relies on some very specific behavior of MAZEWALK.

    des.level_init({ style: "solidfill", fg: "-" });

    des.level_flags("mazelevel", "nommap");

    await des.map({ halign: "center", valign: "bottom", map: `\
 - - - - - - - - - - -- -- - - . - - - - - - - - - -- - - -- - - - - . - - |
------...---------.-----------...-----.-------.-------     ----------------|
 - - - - - - - - - - - . - - - . - - - - - - - - - - -- - -- - . - - - - - |
------------.---------...-------------------------.---   ------------------|
 - - - - - - - - - - . . - - --- - . - - - - - - - - -- -- - - - - |.....| |
--.---------------.......------------------------------- ----------|.....S-|
 - - - - |.. ..| - ....... . - - - - |.........| - - - --- - - - - |.....| |
----.----|.....|------.......--------|.........|--------------.------------|
 - - - - |..{..| - - -.... . --- - -.S.........S - - - - - - - - - - - - - |
---------|.....|--.---...------------|.........|---------------------------|
 - - - - |.. ..| - - - . - - - - - - |.........| - --- . - - - - - - - - - |
----------------------...-------.---------------------...------------------|
---..| - - - - - - - - . --- - - - - - - - - - - - - - . - - --- - - --- - |
-.S..|----.-------.------- ---------.-----------------...----- -----.-------
---..| - - - - - - - -- - - -- . - - - - - . - - - . - . - - -- -- - - - -- 
-.S..|--------.---.---       -...---------------...{.---------   ---------  
--|. - - - - - - - -- - - - -- . - - - --- - - - . . - - - - -- - - - - - - 
` });

    let place = [ [1,15],[68,6],[1,13] ]
    shuffle(place)

    await des.non_diggable(selection.area(67,3,73,7));
    await des.non_diggable(selection.area(0,12,2,16));
    await des.feature("fountain", [12,8]);
    await des.feature("fountain", [51,15]);
    await des.region(selection.area(0,0,75,16),"unlit");
    await des.region(selection.area(38,6,46,10),"lit");
    await des.door("closed",37,8);
    await des.door("closed",47,8);
    await des.door("closed",73,5);
    await des.door("closed",2,15);
    await des.mazewalk({ x: 36, y: 8, dir: "west", stocked: false });
    await des.stair("up", 42,8);
    await des.wallify();

    // Objects
    await des.object("diamond");
    await des.object("*");
    await des.object("diamond");
    await des.object("*");
    await des.object("emerald");
    await des.object("*");
    await des.object("emerald");
    await des.object("*");
    await des.object("emerald");
    await des.object("*");
    await des.object("ruby");
    await des.object("*");
    await des.object("ruby");
    await des.object("amethyst");
    await des.object("*");
    await des.object("amethyst");
    await des.object({ id: "luckstone", coord: place[1], buc: "!-cursed", achievement: 1 });
    await des.object("flint",place[0]);
    await des.object("?");
    await des.object("?");
    await des.object("?");
    await des.object("?");
    await des.object("?");
    await des.object("+");
    await des.object("+");
    await des.object("+");
    await des.object("+");
    await des.object();
    await des.object();
    await des.object();
    await des.trap();
    await des.trap();
    await des.trap();
    await des.trap();
    await des.trap();
    await des.trap();
    await des.trap();
    // One-time annoyance factor
    await des.trap("level teleport",place[1]);
    await des.trap("level teleport",place[0]);
    await des.monster("M");
    await des.monster("M");
    await des.monster("M");
    await des.monster("M");
    await des.monster("M");
    await des.monster("ettin mummy");
    await des.monster("V");
    await des.monster("Z");
    await des.monster("Z");
    await des.monster("Z");
    await des.monster("Z");
    await des.monster("Z");
    await des.monster("V");
    await des.monster("e");
    await des.monster("e");
    await des.monster("e");
    await des.monster("e");


    return await des.finalize_level();
}
