/**
 * oracle - NetHack special level
 * Converted from: oracle.lua
 */

import * as des from '../sp_lev.js';

export async function generate() {
    // NetHack oracle oracle.lua	$NHDT-Date: 1652196033 2022/5/10 15:20:33 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.1 $
    // Copyright (c) 2015 by Pasi Kallinen
    // NetHack may be freely redistributed.  See license for details.
    // 
    // Oracle level
    des.level_flags("noflip");

    await des.room({ type: "ordinary", lit: 1, x: 3,y: 3, xalign: "center",yalign: "center", w: 11,h: 9, contents: async function() {
                  await des.object({ id: "statue", x: 0, y: 0, montype: "C", historic: true });
                  await des.object({ id: "statue", x: 0, y: 8, montype: "C", historic: true });
                  await des.object({ id: "statue", x: 10, y: 0, montype: "C", historic: true });
                  await des.object({ id: "statue", x: 10, y: 8, montype: "C", historic: true });
                  await des.object({ id: "statue", x: 5, y: 1, montype: "C", historic: true });
                  await des.object({ id: "statue", x: 5, y: 7, montype: "C", historic: true });
                  await des.object({ id: "statue", x: 2, y: 4, montype: "C", historic: true });
                  await des.object({ id: "statue", x: 8, y: 4, montype: "C", historic: true });

                  await des.room({ type: "delphi", lit: 1, x: 4,y: 3, w: 3,h: 3, contents: async function() {
                                await des.feature("fountain", 0, 1);
                                await des.feature("fountain", 1, 0);
                                await des.feature("fountain", 1, 2);
                                await des.feature("fountain", 2, 1);
                                await des.monster("Oracle", 1, 1);
                                await des.door({ state: "nodoor", wall: "all" });
                             }
                  });

                  await des.monster();
                  await des.monster();
               }
    });

    await des.room({ contents: async function() {
                     await des.stair("up");
                     await des.object();
                  }
    });

    await des.room({ contents: async function() {
                     await des.stair("down");
                     await des.object();
                     await des.trap();
                     await des.monster();
                     await des.monster();
                  }
    });

    await des.room({ contents: async function() {
                     await des.object();
                     await des.object();
                     await des.monster();
                  }
    });

    await des.room({ contents: async function() {
                     await des.object();
                     await des.trap();
                     await des.monster();
                  }
    });

    await des.room({ contents: async function() {
                     await des.object();
                     await des.trap();
                     await des.monster();
                  }
    });

    await des.random_corridors();


    return await des.finalize_level();
}
