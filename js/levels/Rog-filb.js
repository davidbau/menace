/**
 * Rog-filb - NetHack special level
 * Converted from: Rog-filb.lua
 */

import * as des from '../sp_lev.js';

export async function generate() {
    // NetHack Rogue Rog-filb.lua	$NHDT-Date: 1652196011 2022/5/10 15:20:11 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.1 $
    // Copyright (c) 1992 by Dean Luick
    // NetHack may be freely redistributed.  See license for details.
    // 
    // 
    await des.room({ type: "ordinary",
               contents: async function() {
                  await des.stair("up");
                  await des.object();
                  await des.monster({ id: "leprechaun", peaceful: 0 });
               }
    })

    await des.room({ type: "ordinary",
               contents: async function() {
                  await des.object();
                  await des.object();
                  await des.monster({ id: "leprechaun", peaceful: 0 });
                  await des.monster({ id: "guardian naga", peaceful: 0 });
               }
    })

    await des.room({ type: "ordinary",
               contents: async function() {
                  await des.object();
                  await des.trap();
                  await des.trap();
                  await des.object();
                  await des.monster({ id: "water nymph", peaceful: 0 });
               }
    })

    await des.room({ type: "ordinary",
               contents: async function() {
                  await des.stair("down");
                  await des.object();
                  await des.trap();
                  await des.trap();
                  await des.monster({ class: "l", peaceful: 0 });
                  await des.monster({ id: "guardian naga", peaceful: 0 });
               }
    })

    await des.room({ type: "ordinary",
               contents: async function() {
                  await des.object();
                  await des.object();
                  await des.trap();
                  await des.trap();
                  await des.monster({ id: "leprechaun", peaceful: 0 });
               }
    })

    await des.room({ type: "ordinary",
               contents: async function() {
                  await des.object();
                  await des.trap();
                  await des.trap();
                  await des.monster({ id: "leprechaun", peaceful: 0 });
                  await des.monster({ id: "water nymph", peaceful: 0 });
               }
    })

    await des.random_corridors();


    return await des.finalize_level();
}
