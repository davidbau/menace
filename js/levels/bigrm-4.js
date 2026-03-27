/**
 * bigrm-4 - NetHack special level
 * Converted from: bigrm-4.lua
 */

import * as des from '../sp_lev.js';
import { selection } from '../sp_lev.js';
import { rn2 } from '../rng.js';

export async function generate() {
    // NetHack bigroom bigrm-4.lua	$NHDT-Date: 1652196022 2022/5/10 15:20:22 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.1 $
    // Copyright (c) 1989 by Jean-Christophe Collet
    // Copyright (c) 1990 by M. Stephenson
    // NetHack may be freely redistributed.  See license for details.
    // 
    des.level_init({ style: "solidfill", fg: " " });
    des.level_flags("mazelevel", "noflip");

    await des.map(`\
-----------                                                     -----------
|.........|                                                     |.........|
|.........-------------                             -------------.........|
---...................------------       ------------...................---
  --.............................---------.............................--  
   --.................................................................--   
    --...............................................................--    
     --......LLLLL.......................................LLLLL......--     
      --.....LLLLL.......................................LLLLL.....--      
      --.....LLLLL.......................................LLLLL.....--      
     --......LLLLL.......................................LLLLL......--     
    --...............................................................--    
   --.................................................................--   
  --.............................---------.............................--  
---...................------------       ------------...................---
|.........-------------                             -------------.........|
|.........|                                                     |.........|
-----------                                                     -----------
`);

    let terrains = [ ".", ".", ".", ".", "P", "L", "-", "T", "W", "Z" ];
    let tidx = (rn2((terrains.length) - (1) + 1) + (1));
    let toterr = terrains[tidx];
    if ((toterr !== "L")) {
       await des.replace_terrain({ fromterrain: "L", toterrain: toterr });
    }

    await des.feature("fountain", 5,2);
    await des.feature("fountain", 5,15);
    await des.feature("fountain", 69,2);
    await des.feature("fountain", 69,15);

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
