/**
 * Wiz-fila - NetHack special level
 * Converted from: Wiz-fila.lua
 */

import * as des from '../sp_lev.js';

export async function generate() {
    // NetHack Wizard Wiz-fila.lua	$NHDT-Date: 1652196018 2022/5/10 15:20:18 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.1 $
    // Copyright (c) 1992 by David Cohrs
    // NetHack may be freely redistributed.  See license for details.
    // 
    // 
    await des.room({ type: "ordinary",
               contents: async function() {
                  await des.stair("up");
                  await des.object();
                  await des.monster({ class: "i", peaceful: 0 });
               }
    })

    await des.room({ type: "ordinary",
               contents: async function() {
                  await des.object();
                  await des.object();
                  await des.monster({ class: "i", peaceful: 0 });
               }
    })

    await des.room({ type: "ordinary",
               contents: async function() {
                  await des.object();
                  await des.trap();
                  await des.object();
                  await des.monster("vampire bat");
                  await des.monster("vampire bat");
               }
    })

    await des.room({ type: "ordinary",
               contents: async function() {
                  await des.stair("down");
                  await des.object();
                  await des.trap();
                  await des.monster({ class: "i", peaceful: 0 });
                  await des.monster("vampire bat");
               }
    })

    await des.room({ type: "ordinary",
               contents: async function() {
                  await des.object();
                  await des.object();
                  await des.trap();
                  await des.monster({ class: "i", peaceful: 0 });
               }
    })

    await des.room({ type: "ordinary",
               contents: async function() {
                  await des.object();
                  await des.trap();
                  await des.monster("vampire bat");
               }
    })

    await des.random_corridors();


    return await des.finalize_level();
}
