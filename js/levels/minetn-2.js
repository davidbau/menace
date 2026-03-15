/**
 * minetn-2 - NetHack special level
 * Converted from: minetn-2.lua
 */

import * as des from '../sp_lev.js';
import { percent, shuffle, u } from '../sp_lev.js';
import { A_CHAOTIC, A_NEUTRAL, A_LAWFUL } from '../const.js';

// Helper function: returns shop type based on role.
function monkfoodshop() {
    return u.role === 'Monk' ? "health food shop" : "food shop";
}


export async function generate() {
    const align = [A_CHAOTIC, A_NEUTRAL, A_LAWFUL];
    shuffle(align);

    // NetHack mines minetn-2.lua	$NHDT-Date: 1652196030 2022/5/10 15:20:30 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.3 $
    // Copyright (c) 1989-95 by Jean-Christophe Collet
    // Copyright (c) 1991-95 by M. Stephenson
    // NetHack may be freely redistributed.  See license for details.
    // 
    // Minetown variant 2
    // "Town Square"

    await des.room({ type: "ordinary", lit: 1, x: 3, y: 3,
               xalign: "center", yalign: "center", w: 31, h: 15,
               contents: async function() {
                  des.feature("fountain", 17, 5);
                  des.feature("fountain", 13, 8);

                  if (percent(75)) {
                     await des.room({ type: "ordinary", x: 2,y: 0, w: 2,h: 2,
                                contents: async function() {
                                   des.door({ state: "closed", wall: "west" });
                                }
                     })
                  }

                  if (percent(75)) {
                     await des.room({ type: "ordinary", lit: 0, x: 5,y: 0, w: 2,h: 2,
                                contents: async function() {
                                   des.door({ state: "closed", wall: "south" });
                                }
                     })
                  }

                  if (percent(75)) {
                     await des.room({ type: "ordinary", x: 8,y: 0, w: 2,h: 2,
                                contents: async function() {
                                   des.door({ state: "closed", wall: "east" });
                                }
                     })
                  }

                  if (percent(75)) {
                     await des.room({ type: "ordinary", lit: 1, x: 16,y: 0, w: 2,h: 2,
                                contents: async function() {
                                   des.door({ state: "closed", wall: "west" });
                                }
                     })
                  }

                  if (percent(75)) {
                     await des.room({ type: "ordinary", lit: 0, x: 19,y: 0, w: 2,h: 2,
                                contents: async function() {
                                   des.door({ state: "closed", wall: "south" });
                                }
                     })
                  }

                  if (percent(75)) {
                     await des.room({ type: "ordinary", x: 22,y: 0, w: 2,h: 2,
                                contents: async function() {
                                   des.door({ state: "closed", wall: "south" });
                                   await des.monster("gnome");
                                }
                     })
                  }

                  if (percent(75)) {
                     await des.room({ type: "ordinary", lit: 0, x: 25,y: 0, w: 2,h: 2,
                                contents: async function() {
                                   des.door({ state: "closed", wall: "east" });
                                }
                     })
                  }

                  if (percent(75)) {
                     await des.room({ type: "ordinary", lit: 1, x: 2,y: 5, w: 2,h: 2,
                                contents: async function() {
                                   des.door({ state: "closed", wall: "north" });
                                }
                     })
                  }

                  if (percent(75)) {
                     await des.room({ type: "ordinary", lit: 1, x: 5,y: 5, w: 2,h: 2,
                                contents: async function() {
                                   des.door({ state: "closed", wall: "south" });
                                }
                     })
                  }

                  if (percent(75)) {
                     await des.room({ type: "ordinary", x: 8,y: 5, w: 2,h: 2,
                                contents: async function() {
                                   des.door({ state: "locked", wall: "north" });
                                   await des.monster("gnome");
                                }
                     })
                  }

                  await des.room({ type: "shop", chance: 90, lit: 1, x: 2,y: 10, w: 4,h: 3,
                             contents: async function() {
                                des.door({ state: "closed", wall: "west" });
                             }
                  });

                  await des.room({ type: "tool shop", chance: 90, lit: 1, x: 23,y: 10, w: 4,h: 3,
                             contents: async function() {
                                des.door({ state: "closed", wall: "east" });
                             }
                  });

                  await des.room({ type: monkfoodshop(), chance: 90, lit: 1, x: 24,y: 5, w: 3,h: 4,
                             contents: async function() {
                                des.door({ state: "closed", wall: "north" });
                             }
                  });

                  await des.room({ type: "candle shop", lit: 1, x: 11,y: 10, w: 4,h: 3,
                             contents: async function() {
                                des.door({ state: "closed", wall: "east" });
                             }
                  });

                  if (percent(75)) {
                     await des.room({ type: "ordinary", lit: 0, x: 7,y: 10, w: 3,h: 3,
                                contents: async function() {
                                   des.door({ state: "locked", wall: "north" });
                                   await des.monster("gnome");
                                }
                     });
                  }

                  await des.room({ type: "temple", lit: 1, x: 19,y: 5, w: 4,h: 4,
                             contents: async function() {
                                des.door({ state: "closed", wall: "north" });
                                des.altar({ x: 2, y: 2, align: align[0],type: "shrine" });
                                await des.monster("gnomish wizard");
                                await des.monster("gnomish wizard");
                             }
                  });

                  if (percent(75)) {
                     await des.room({ type: "ordinary", lit: 1, x: 18,y: 10, w: 4,h: 3,
                                contents: async function() {
                                   des.door({ state: "locked", wall: "west" });
                                   await des.monster("gnome lord");
                                }
                     });
                  }

                  // The Town Watch
                  await des.monster({ id: "watchman", peaceful: 1 });
                  await des.monster({ id: "watchman", peaceful: 1 });
                  await des.monster({ id: "watchman", peaceful: 1 });
                  await des.monster({ id: "watchman", peaceful: 1 });
                  await des.monster({ id: "watch captain", peaceful: 1 });
               }
    });

    await des.room({ contents: async function() {
                  des.stair("up");
                          }
    });

    await des.room({ contents: async function() {
                  des.stair("down");
                  await des.trap();
                  await des.monster("gnome");
                  await des.monster("gnome");
                          }
    });

    await des.room({ contents: async function() {
                  await des.monster("dwarf");
                          }
    });

    await des.room({ contents: async function() {
                  await des.trap();
                  await des.monster("gnome");
                          }
    });

    des.random_corridors();



    return await des.finalize_level();
}
