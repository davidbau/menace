/**
 * Sam-filb - NetHack special level
 * Converted from: Sam-filb.lua
 */

import * as des from '../sp_lev.js';
import { selection } from '../sp_lev.js';

export async function generate() {
    // NetHack Samurai Sam-filb.lua	$NHDT-Date: 1652196013 2022/5/10 15:20:13 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.1 $
    // Copyright (c) 1989 by Jean-Christophe Collet
    // Copyright (c) 1991-92 by M. Stephenson, P. Winner
    // NetHack may be freely redistributed.  See license for details.
    // 
    des.level_init({ style: "solidfill", fg: " " });

    des.level_flags("mazelevel");

    await des.map(`\
-------------                                  -------------
|...........|                                  |...........|
|...-----...|----------------------------------|...-----...|
|...|   |...|..................................|...|   |...|
|...-----..........................................-----...|
|...........|--S----------------------------S--|...........|
----...--------.|..........................|.--------...----
   |...|........+..........................+........|...|   
   |...|........+..........................+........|...|   
----...--------.|..........................|.--------...----
|...........|--S----------------------------S--|...........|
|...-----..........................................-----...|
|...|   |...|..................................|...|   |...|
|...-----...|----------------------------------|...-----...|
|...........|                                  |...........|
-------------                                  -------------
`);
    await des.region(selection.area(0,0,59,15), "unlit");
    // Doors
    await des.door("closed",16,7);
    await des.door("closed",16,8);
    await des.door("closed",43,7);
    await des.door("closed",43,8);
    // 
    await des.stair("up");
    await des.stair("down");
    // 
    await des.object();
    await des.object();
    await des.object();
    await des.object();
    await des.object();
    await des.object();
    await des.object();
    await des.object();
    await des.object();
    // 
    await des.monster("d");
    await des.monster("wolf");
    await des.monster("wolf");
    await des.monster("wolf");
    await des.monster("wolf");
    await des.monster("stalker");
    await des.monster("stalker");
    await des.monster("stalker");
    // 
    await des.trap();
    await des.trap();
    await des.trap();
    await des.trap();


    return await des.finalize_level();
}
