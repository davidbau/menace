/**
 * Mon-loca - NetHack special level
 * Converted from: Mon-loca.lua
 */

import * as des from '../sp_lev.js';
import { selection } from '../sp_lev.js';

export async function generate() {
    // NetHack Monk Mon-loca.lua	$NHDT-Date: 1652196007 2022/5/10 15:20:7 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.1 $
    // Copyright (c) 1989 by Jean-Christophe Collet
    // Copyright (c) 1991-2 by M. Stephenson
    // NetHack may be freely redistributed.  See license for details.
    // 
    des.level_init({ style: "solidfill", fg: " " });

    des.level_flags("mazelevel");

    // 1         2         3         4         5         6         7 
    // 123456789012345678901234567890123456789012345678901234567890123456789012345
    await des.map(`\
             ----------------------------------------------------   --------
           ---.................................................-    --.....|
         ---...--------........------........................---     ---...|
       ---.....-      --.......-    ----..................----         --.--
     ---.....----      ---------       --..................--         --..| 
   ---...-----                       ----.----.....----.....---      --..|| 
----..----                       -----..---  |...---  |.......---   --...|  
|...---                       ----....---    |.---    |.........-- --...||  
|...-                      ----.....---     ----      |..........---....|   
|...----                ----......---       |         |...|.......-....||   
|......-----          ---.........-         |     -----...|............|    
|..........-----   ----...........---       -------......||...........||    
|..............-----................---     |............|||..........|     
|-S----...............................---   |...........|| |.........||     
|.....|..............------.............-----..........||  ||........|      
|.....|.............--    ---.........................||    |.......||      
|.....|.............-       ---.....................--|     ||......|       
|---S--------.......----      --.................----        |.....||       
|...........|..........--------..............-----           ||....|        
|...........|............................-----                |....|        
------------------------------------------                    ------        
`);
    // Random Monsters

    // Dungeon Description
    await des.region(selection.area(0,0,75,20), "lit");
    // Stairs
    await des.stair("up");
    await des.stair("down");
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
    // since vegetarian monks shouldn't eat giant corpses, give a chance for
    // Str boost that isn't throttled by exercise restrictions;
    // make a modest effort (Elbereth only) to prevent xorns from eating the tins
    let tinplace = selection.negate().filter_mapchar('.')
    let tinloc = tinplace.rndcoord(0)
    await des.object({ id: "tin", coord: tinloc, quantity: 2, buc: "blessed",
                 montype: "spinach" })
    await des.engraving({ coord: tinloc, type: "burn", text: "Elbereth" });
    // Random traps
    await des.trap();
    await des.trap();
    await des.trap();
    await des.trap();
    await des.trap();
    await des.trap();
    // Random monsters.
    await des.monster("earth elemental");
    await des.monster("earth elemental");
    await des.monster("earth elemental");
    await des.monster("earth elemental");
    await des.monster("earth elemental");
    await des.monster("earth elemental");
    await des.monster("earth elemental");
    await des.monster("earth elemental");
    await des.monster("earth elemental");
    await des.monster("earth elemental");
    await des.monster("earth elemental");
    await des.monster("earth elemental");
    await des.monster("earth elemental");
    await des.monster("earth elemental");
    await des.monster("xorn");
    await des.monster("xorn");
    await des.monster("xorn");
    await des.monster("xorn");
    await des.monster("xorn");
    await des.monster("xorn");
    await des.monster("xorn");
    await des.monster("xorn");
    await des.monster("xorn");


    return await des.finalize_level();
}
