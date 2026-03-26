/**
 * bigrm-8 - NetHack special level
 * Converted from: bigrm-8.lua
 */

import * as des from '../sp_lev.js';
import { selection, percent } from '../sp_lev.js';
import { rn2 } from '../rng.js';

export async function generate() {
    // NetHack bigroom bigrm-8.lua	$NHDT-Date: 1652196023 2022/5/10 15:20:23 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.1 $
    // Copyright (c) 1989 by Jean-Christophe Collet
    // Copyright (c) 1990 by M. Stephenson
    // NetHack may be freely redistributed.  See license for details.
    // 
    des.level_init({ style: "solidfill", fg: " " });
    des.level_flags("mazelevel");

    await des.map(`\
----------------------------------------------                             
|............................................---                           
--.............................................---                         
 ---......................................FF.....---                       
   ---...................................FF........---                     
     ---................................FF...........---                   
       ---.............................FF..............---                 
         ---..........................FF.................---               
           ---.......................FF....................---             
             ---....................FF.......................---           
               ---.................FF..........................---         
                 ---..............FF.............................---       
                   ---...........FF................................----    
                     ---........FF...................................---   
                       ---.....FF......................................--- 
                         ---.............................................--
                           ---............................................|
                             ----------------------------------------------
`);

    if (percent(40)) {
       let terrain = [ "L", "}", "T", ".", "-", "C" ];
       let tidx = (rn2((terrain.length) - (1) + 1) + (1));
       await des.replace_terrain({ region: [0,0, 74,17], fromterrain: "F", toterrain: terrain[tidx] });
    };

    await des.region(selection.area(1,1,73,16), "lit");

    await des.stair("up");
    await des.stair("down");

    await des.non_diggable();

    for (let i = 1; i <= 15; i++) {
       await des.object();
    }

    for (let i = 1; i <= 6; i++) {
       await des.trap();
    }

    for (let i = 1; i <= 28; i++) {
      await des.monster();
    }

    return await des.finalize_level();
}
