/**
 * Mon-filb - NetHack special level
 * Converted from: Mon-filb.lua
 */

import * as des from '../sp_lev.js';

export async function generate() {
    // NetHack Monk Mon-filb.lua	$NHDT-Date: 1652196006 2022/5/10 15:20:6 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.1 $
    // Copyright (c) 1989 by Jean-Christophe Collet
    // Copyright (c) 1991-2 by M. Stephenson
    // NetHack may be freely redistributed.  See license for details.
    // 

    // 
    await des.room({ type: "ordinary",
               contents: async function() {
                  await des.stair("up");
                  await des.object();
                  await des.monster({ class: "X", peaceful: 0 });
               }
    })

    await des.room({ type: "ordinary",
               contents: async function() {
                  await des.object();
                  await des.object();
                  await des.monster({ class: "X", peaceful: 0 });
               }
    })

    await des.room({ type: "ordinary",
               contents: async function() {
                  await des.object();
                  await des.trap();
                  await des.object();
                  await des.monster({ class: "E", peaceful: 0 });
               }
    })

    await des.room({ type: "ordinary",
               contents: async function() {
                  await des.stair("down");
                  await des.object();
                  await des.trap();
                  await des.monster({ class: "E", peaceful: 0 });
                  await des.monster("earth elemental");
               }
    })

    await des.room({ type: "ordinary",
               contents: async function() {
                  await des.object();
                  await des.object();
                  await des.trap();
                  await des.monster({ class: "X", peaceful: 0 });
               }
    })

    await des.room({ type: "ordinary",
               contents: async function() {
                  await des.object();
                  await des.trap();
                  await des.monster("earth elemental");
               }
    })

    await des.random_corridors();


    return await des.finalize_level();
}
