/**
 * minetn-7 - NetHack special level
 * Converted from: minetn-7.lua
 */

import * as des from '../sp_lev.js';
import { percent, u, get_nhlib_align } from '../sp_lev.js';

// Helper function: returns shop type based on role.
function monkfoodshop() {
    return u.role === 'Monk' ? "health food shop" : "food shop";
}


export async function generate() {
    // C ref: nhlib.lua pre-shuffles a global `align` array; level scripts just read it.
    const align = get_nhlib_align();

    // NetHack mines minetn-7.lua	$NHDT-Date: 1652196032 2022/5/10 15:20:32 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.3 $
    // Copyright (c) 1989-95 by Jean-Christophe Collet
    // Copyright (c) 1991-95 by M. Stephenson
    // NetHack may be freely redistributed.  See license for details.
    // 
    // "Bazaar Town" by Kelly Bailey

    await des.room({ type: "ordinary", lit: 1, x: 3,y: 3,
               xalign: "center",yalign: "center", w: 30,h: 15,
               contents: async function() {
                  des.feature("fountain", 12, 7);
                  des.feature("fountain", 11, 13);

                  if (percent(75)) {
                     await des.room({ type: "ordinary", x: 2,y: 2, w: 4,h: 2,
                                contents: async function() {
                                   des.door({ state: "closed", wall: "south" });
                                }
                     })
                  }

                  if (percent(75)) {
                     await des.room({ type: "ordinary", x: 7,y: 2, w: 2,h: 2,
                                contents: async function() {
                                   des.door({ state: "closed", wall: "north" });
                                }
                     })
                  }

                  if (percent(75)) {
                     await des.room({ type: "ordinary", x: 7,y: 5, w: 2,h: 2,
                                contents: async function() {
                                   des.door({ state: "closed", wall: "south" });
                                }
                     })
                  }

                  if (percent(75)) {
                     await des.room({ type: "ordinary", lit: 1, x: 10,y: 2, w: 3,h: 4,
                                contents: async function() {
                                   await des.monster("gnome");
                                   await des.monster("monkey");
                                   await des.monster("monkey");
                                   await des.monster("monkey");
                                   des.door({ state: "closed", wall: "south" });
                                }
                     })
                  }

                  if (percent(75)) {
                     await des.room({ type: "ordinary", x: 14,y: 2, w: 4,h: 2,
                                contents: async function() {
                                   des.door({ state: "closed", wall: "south", pos: 0 });
                                   await des.monster("n");
                                }
                     })
                  }

                  if (percent(75)) {
                     await des.room({ type: "ordinary", x: 16,y: 5, w: 2,h: 2,
                                contents: async function() {
                                   des.door({ state: "closed", wall: "south" });
                                }
                     })
                  }

                  if (percent(75)) {
                     await des.room({ type: "ordinary", lit: 0, x: 19,y: 2, w: 2,h: 2,
                                contents: async function() {
                                   des.door({ state: "locked", wall: "east" });
                                   await des.monster("gnome king");
                                }
                     })
                  }

                  await des.room({ type: monkfoodshop(), chance: 50, lit: 1, x: 19,y: 5, w: 2,h: 3,
                             contents: async function() {
                                des.door({ state: "closed", wall: "south" });
                             }
                  })

                  if (percent(75)) {
                     await des.room({ type: "ordinary", x: 2,y: 7, w: 2,h: 2,
                                contents: async function() {
                                   des.door({ state: "closed", wall: "east" });
                                }
                     })
                  }

                  await des.room({ type: "tool shop", chance: 50, lit: 1, x: 2,y: 10, w: 2,h: 3,
                             contents: async function() {
                                des.door({ state: "closed", wall: "south" });
                             }
                  })

                  await des.room({ type: "candle shop", lit: 1, x: 5,y: 10, w: 3,h: 3,
                             contents: async function() {
                                des.door({ state: "closed", wall: "north" });
                             }
                  })

                  if (percent(75)) {
                     await des.room({ type: "ordinary", x: 11,y: 10, w: 2,h: 2,
                                contents: async function() {
                                   des.door({ state: "locked", wall: "west" });
                                   await des.monster("G");
                                }
                     })
                  }

                  await des.room({ type: "shop", chance: 60, lit: 1, x: 14,y: 10, w: 2,h: 3,
                             contents: async function() {
                                des.door({ state: "closed", wall: "north" });
                             }
                  })

                  if (percent(75)) {
                     await des.room({ type: "ordinary", x: 17,y: 11, w: 4,h: 2,
                                contents: async function() {
                                   des.door({ state: "closed", wall: "north" });
                                }
                     })
                  }

                  if (percent(75)) {
                     await des.room({ type: "ordinary", x: 22,y: 11, w: 2,h: 2,
                                contents: async function() {
                                   des.door({ state: "closed", wall: "south" });
                                   des.feature("sink", 0,0);
                                }
                     })
                  }

                  await des.room({ type: monkfoodshop(), chance: 50, lit: 1, x: 25,y: 11, w: 3,h: 2,
                             contents: async function() {
                                des.door({ state: "closed", wall: "east" });
                             }
                  })

                  await des.room({ type: "tool shop", chance: 30, lit: 1, x: 25,y: 2, w: 3,h: 3,
                             contents: async function() {
                                des.door({ state: "closed", wall: "west" });
                             }
                  })

                  await des.room({ type: "temple", lit: 1, x: 24,y: 6, w: 4,h: 4,
                             contents: async function() {
                                des.door({ state: "closed", wall: "west" });
                                des.altar({ x: 2, y: 1, align: align[0], type: "shrine" });
                                await des.monster("gnomish wizard");
                                await des.monster("gnomish wizard");
                             }
                  })

                  await des.monster({ id: "watchman", peaceful: 1 });
                  await des.monster({ id: "watchman", peaceful: 1 });
                  await des.monster({ id: "watchman", peaceful: 1 });
                  await des.monster({ id: "watchman", peaceful: 1 });
                  await des.monster({ id: "watch captain", peaceful: 1 });
                  await des.monster("gnome");
                  await des.monster("gnome");
                  await des.monster("gnome");
                  await des.monster("gnome lord");
                  await des.monster("monkey");
                  await des.monster("monkey");

               }
    })

    await des.room({ type: "ordinary",
               contents: async function() {
                  des.stair("up");
               }
    })

    await des.room({ type: "ordinary",
               contents: async function() {
                  des.stair("down");
                  await des.trap();
                  await des.monster("gnome");
                  await des.monster("gnome");
               }
    })

    await des.room({ type: "ordinary",
               contents: async function() {
                  await des.monster("dwarf");
               }
    })

    await des.room({ type: "ordinary",
               contents: async function() {
                  await des.trap();
                  await des.monster("gnome");
               }
    })

    des.random_corridors();


    return await des.finalize_level();
}
