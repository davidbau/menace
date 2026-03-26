/**
 * bigrm-5 - NetHack special level
 * Converted from: bigrm-5.lua
 */

import * as des from '../sp_lev.js';
import { selection, percent } from '../sp_lev.js';

export async function generate() {
    // NetHack bigroom bigrm-5.lua	$NHDT-Date: 1652196022 2022/5/10 15:20:22 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.1 $
    // Copyright (c) 1989 by Jean-Christophe Collet
    // Copyright (c) 1990 by M. Stephenson
    // NetHack may be freely redistributed.  See license for details.
    // 
    des.level_init({ style: "solidfill", fg: " " });
    des.level_flags("mazelevel", "noflip");

    await des.map(`\
                            ------------------                            
                    ---------................---------                    
              -------................................-------              
         ------............................................------         
      ----......................................................----      
    ---............................................................---    
  ---................................................................---  
---....................................................................---
|........................................................................|
|........................................................................|
|........................................................................|
---....................................................................---
  ---................................................................---  
    ---............................................................---    
      ----......................................................----      
         ------............................................------         
              -------................................-------              
                    ---------................---------                    
                            ------------------                            
`);


    if (percent(25)) {
       let sel = selection.match(".").percentage(2).grow();
       await des.replace_terrain({ selection: sel, fromterrain: ".", toterrain: percent(50) && "I" || "C" });
    }

    await des.region(selection.area(0,0,72,18), "lit");

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
