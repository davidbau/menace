/**
 * Rog-loca - NetHack special level
 * Converted from: Rog-loca.lua
 */

import * as des from '../sp_lev.js';
import { selection } from '../sp_lev.js';

export async function generate() {
    // NetHack Rogue Rog-loca.lua	$NHDT-Date: 1652196012 2022/5/10 15:20:12 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.2 $
    // Copyright (c) 1992 by Dean Luick
    // NetHack may be freely redistributed.  See license for details.
    // 
    des.level_init({ style: "solidfill", fg: " " });

    des.level_flags("mazelevel");

    // 1         2         3         4         5         6         7
    // 123456789012345678901234567890123456789012345678901234567890123456789012345
    await des.map(`\
             ----------------------------------------------------   --------
           ---.................................................-    --.....|
         ---...--------........-------.......................---     ---...|
       ---.....-      ---......-     ---..................----         --.--
     ---.....----       --------       --..................--         --..| 
   ---...-----                       ----.----.....----.....---      --..|| 
----..----                       -----..---  |...---  |.......---   --...|  
|...---                       ----....---    |.---    |.........-- --...||  
|...-                      ----.....---     ----      |..........---....|   
|...----                ----......---       |         |...|.......-....||   
|......-----          ---.........-         |     -----...|............|    
|..........-----   ----...........---       -------......||...........||    
|..............-----................---     |............|||..........|     
|------...............................---   |...........|| |.........||     
|.....|..............------.............-----..........||  ||........|      
|.....|.............--    ---.........................||    |.......||      
|.....|.............-       ---.....................--|     ||......|       
|-S----------.......----      --.................----        |.....||       
|...........|..........--------..............-----           ||....|        
|...........|............................-----                |....|        
------------------------------------------                    ------        
`);
    // Dungeon Description
    await des.region(selection.area(0,0,75,20), "lit");
    // Doors
    // DOOR:locked.union(closed)|open,(xx,yy)
    // Stairs
    await des.stair("up");
    await des.stair("down");
    // Non diggable walls
    await des.non_diggable(selection.area(0,0,75,20));
    // Objects
    await des.object({ id: "scroll of teleportation", x: 11, y: 18, buc: "cursed", spe: 0 });
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
    await des.trap();
    await des.trap();
    await des.trap();
    await des.trap();
    await des.trap();
    await des.trap();
    // Random monsters.
    await des.monster({ id: "leprechaun", peaceful: 0 });
    await des.monster({ id: "leprechaun", peaceful: 0 });
    await des.monster({ id: "leprechaun", peaceful: 0 });
    await des.monster({ id: "leprechaun", peaceful: 0 });
    await des.monster({ id: "leprechaun", peaceful: 0 });
    await des.monster({ id: "leprechaun", peaceful: 0 });
    await des.monster({ id: "leprechaun", peaceful: 0 });
    await des.monster({ id: "leprechaun", peaceful: 0 });
    await des.monster({ id: "leprechaun", peaceful: 0 });
    await des.monster({ id: "leprechaun", peaceful: 0 });
    await des.monster({ id: "leprechaun", peaceful: 0 });
    await des.monster({ id: "leprechaun", peaceful: 0 });
    await des.monster({ id: "leprechaun", peaceful: 0 });
    await des.monster({ id: "leprechaun", peaceful: 0 });
    await des.monster({ id: "leprechaun", peaceful: 0 });
    await des.monster({ id: "leprechaun", peaceful: 0 });
    await des.monster({ id: "leprechaun", peaceful: 0 });
    await des.monster({ class: "l", peaceful: 0 });
    await des.monster({ id: "guardian naga", peaceful: 0 });
    await des.monster({ id: "guardian naga", peaceful: 0 });
    await des.monster({ id: "guardian naga", peaceful: 0 });
    await des.monster({ id: "guardian naga", peaceful: 0 });
    await des.monster({ id: "guardian naga", peaceful: 0 });
    await des.monster({ id: "guardian naga", peaceful: 0 });
    await des.monster({ id: "guardian naga", peaceful: 0 });
    await des.monster({ class: "N", peaceful: 0 });
    await des.monster({ class: "N", peaceful: 0 });
    await des.monster({ class: "N", peaceful: 0 });
    await des.monster({ id: "chameleon", peaceful: 0 });
    await des.monster({ id: "chameleon", peaceful: 0 });
    await des.monster({ id: "chameleon", peaceful: 0 });
    await des.monster({ id: "chameleon", peaceful: 0 });
    await des.monster({ id: "chameleon", peaceful: 0 });


    return await des.finalize_level();
}
