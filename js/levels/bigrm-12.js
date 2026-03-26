/**
 * bigrm-12 - NetHack special level
 * Converted from: bigrm-12.lua
 */

import * as des from '../sp_lev.js';
import { selection, percent } from '../sp_lev.js';

export async function generate() {
    // NetHack bigroom bigrm-12.lua	$NHDT-Date: $  $NHDT-Branch: NetHack-3.7 $
    // Copyright (c) 2024 by Pasi Kallinen
    // NetHack may be freely redistributed.  See license for details.
    // 
    // Two hexagons

    des.level_flags("mazelevel", "noflipy");
    des.level_init({ style: "solidfill", fg: " " });

    await des.map(`\
                                                                           
         .......................           .......................         
        .........................         .........................        
       ...........................       ...........................       
      .............................     .............................      
     ........PPPPPPPPPPPPPPP........   ........LLLLLLLLLLLLLLL........     
    ........PPPPPPPPPPPPPPPPP........ ........LLLLLLLLLLLLLLLLL........    
   ........PPPWWWWWWWWWWWWWPPP...............LLLZZZZZZZZZZZZZLLL........   
  ........PPPWWWWWWWWWWWWWWWPPP.............LLLZZZZZZZZZZZZZZZLLL........  
 ........PPPWWWWWWWWWWWWWWWWWPPP...........LLLZZZZZZZZZZZZZZZZZLLL........ 
  ........PPPWWWWWWWWWWWWWWWPPP.............LLLZZZZZZZZZZZZZZZLLL........  
   ........PPPWWWWWWWWWWWWWPPP...............LLLZZZZZZZZZZZZZLLL........   
    ........PPPPPPPPPPPPPPPPP........ ........LLLLLLLLLLLLLLLLL........    
     ........PPPPPPPPPPPPPPP........   ........LLLLLLLLLLLLLLL........     
      .............................     .............................      
       ...........................       ...........................       
        .........................         .........................        
         .......................           .......................         
                                                                           
`);

    // maybe replace lavawalls/waterwalls with stone walls
    if (percent(20)) {
       if (percent(50)) {
          await des.replace_terrain({ fromterrain: "W", toterrain: "-" });
       }
       if (percent(50)) {
          await des.replace_terrain({ fromterrain: "Z", toterrain: "-" });
       }
    }

    // maybe replace pools with floor && then possibly walls with pools
    if (percent(25)) {
       await des.replace_terrain({ fromterrain: "P", toterrain: "." });
       if (percent(75)) {
          await des.replace_terrain({ fromterrain: "W", toterrain: "P" });
       }
    }
    if (percent(25)) {
       await des.replace_terrain({ fromterrain: "L", toterrain: "." });
       if (percent(75)) {
          await des.replace_terrain({ fromterrain: "Z", toterrain: "L" });
       }
    }

    // maybe make both sides have the same terrain
    if (percent(20)) {
       if (percent(50)) {
          // both are lava
          await des.replace_terrain({ fromterrain: "P", toterrain: "L" });
          await des.replace_terrain({ fromterrain: "W", toterrain: "Z" });
       } else {
          // both are water
          await des.replace_terrain({ fromterrain: "L", toterrain: "P" });
          await des.replace_terrain({ fromterrain: "Z", toterrain: "W" });
       }
    }

    await des.region(selection.area(0,0,75,19), "lit");
    await des.non_diggable();

    await des.wallify();

    await des.stair("up");
    await des.stair("down");

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
