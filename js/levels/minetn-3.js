/**
 * minetn-3 - NetHack special level
 * Converted from: minetn-3.lua
 */

import * as des from '../sp_lev.js';
import { shuffle, u } from '../sp_lev.js';
import { A_CHAOTIC, A_NEUTRAL, A_LAWFUL } from '../const.js';

// Helper function: returns shop type based on role.
function monkfoodshop() {
    return u.role === 'Monk' ? "health food shop" : "food shop";
}


export async function generate() {
    const align = [A_CHAOTIC, A_NEUTRAL, A_LAWFUL];
    shuffle(align);

    // NetHack mines minetn-3.lua	$NHDT-Date: 1652196030 2022/5/10 15:20:30 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.2 $
    // Copyright (c) 1989-95 by Jean-Christophe Collet
    // Copyright (c) 1991-95 by M. Stephenson
    // NetHack may be freely redistributed.  See license for details.
    // 
    // Minetown variant 3 by Kelly Bailey
    // "Alley Town"

    await des.room({ type: "ordinary",lit: 1,x: 3,y: 3,
               xalign: "center",yalign: "center",w: 31,h: 15,
               contents: async function() {
                  des.feature("fountain", 1,6);
                  des.feature("fountain", 29,13);

      await des.room({ type: "ordinary",x: 2,y: 2,w: 2,h: 2,
                 contents: async function() {
                    des.door({ state: "closed", wall: "south" });
                 }
      });

      await des.room({ type: "tool shop", chance: 30, lit: 1,x: 5,y: 3,w: 2,h: 3,
                 contents: async function() {
                    des.door({ state: "closed", wall: "south" });
                 }
      })

      await des.room({ type: "ordinary",x: 2,y: 10,w: 2,h: 3,
                 contents: async function() {
                    des.door({ state: "locked", wall: "north" });
                    await des.monster("G");
                 }
      })

      await des.room({ type: "ordinary", x: 5,y: 9,w: 2,h: 2,
                 contents: async function() {
                    des.door({ state: "closed", wall: "north" });
                 }
      })

      await des.room({ type: "temple",lit: 1,x: 10,y: 2,w: 3,h: 4,
                 contents: async function() {
                    des.door({ state: "closed", wall: "east" });
                    des.altar({ x: 1, y: 1, align: align[0], type: "shrine" });
                    await des.monster("gnomish wizard");
                    await des.monster("gnomish wizard");
                 }
      })

      await des.room({ type: "ordinary",x: 11,y: 7,w: 2,h: 2,
                 contents: async function() {
                    des.door({ state: "closed", wall: "west" });
                 }
      })

      await des.room({ type: "shop",lit: 1,x: 10,y: 10,w: 3,h: 3,
                 contents: async function() {
                    des.door({ state: "closed", wall: "west" });
                 }
      })

      await des.room({ type: "ordinary", random: 1, x: 14,y: 8,w: 2,h: 2,
                 contents: async function() {
                    des.door({ state: "locked", wall: "north" });
                    await des.monster("G");
                 }
      })

      await des.room({ type: "ordinary", random: 1, x: 14,y: 11,w: 2,h: 2,
                 contents: async function() {
                    des.door({ state: "closed", wall: "south" });
                 }
      })

      await des.room({ type: "tool shop", chance: 40,lit: 1,x: 17,y: 10,w: 3,h: 3,
                 contents: async function() {
                    des.door({ state: "closed", wall: "north" });
                 }
      })

      await des.room({ type: "ordinary",x: 21,y: 11,w: 2,h: 2,
                 contents: async function() {
                    des.door({ state: "locked", wall: "east" });
                    await des.monster("G");
                 }
      })

      await des.room({ type: monkfoodshop(), chance: 90,lit: 1,x: 26,y: 8,w: 3,h: 2,
                 contents: async function() {
                    des.door({ state: "closed", wall: "west" });
                 }
      })

      await des.room({ type: "ordinary", random: 1, x: 16,y: 2,w: 2,h: 2,
                 contents: async function() {
                    des.door({ state: "closed", wall: "west" });
                 }
      })

      await des.room({ type: "ordinary", random: 1, x: 19,y: 2,w: 2,h: 2,
                 contents: async function() {
                    des.door({ state: "closed", wall: "north" });
                 }
      })

      await des.room({ type: "wand shop", chance: 30,lit: 1,x: 19,y: 5,w: 3,h: 2,
                 contents: async function() {
                    des.door({ state: "closed", wall: "west" });
                 }
      })

      await des.room({ type: "candle shop",lit: 1,x: 25,y: 2,w: 3,h: 3,
                 contents: async function() {
                    des.door({ state: "closed", wall: "south" });
                 }
      })

      await des.monster({ id: "watchman", peaceful: 1 });
      await des.monster({ id: "watchman", peaceful: 1 });
      await des.monster({ id: "watchman", peaceful: 1 });
      await des.monster({ id: "watchman", peaceful: 1 });
      await des.monster({ id: "watch captain", peaceful: 1 });

               }
    })

    await des.room({ type: "ordinary", contents: async function() {
                  des.stair("up");
                                             }
    })

    await des.room({ type: "ordinary", contents: async function() {
                  des.stair("down");
                  await des.trap();
                  await des.monster("gnome");
                  await des.monster("gnome");
                                             }
    })

    await des.room({ type: "ordinary", contents: async function() {
                  await des.monster("dwarf");
                                              }
    })

    await des.room({ type: "ordinary", contents: async function() {
                  await des.trap();
                  await des.monster("gnome");
                                             }
    })

    des.random_corridors();


    return await des.finalize_level();
}
