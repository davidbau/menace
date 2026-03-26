/**
 * Pri-filb - NetHack special level
 * Converted from: Pri-filb.lua
 */

import * as des from '../sp_lev.js';

export async function generate() {
    // NetHack Priest Pri-filb.lua	$NHDT-Date: 1652196008 2022/5/10 15:20:8 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.1 $
    // Copyright (c) 1989 by Jean-Christophe Collet
    // Copyright (c) 1991-2 by M. Stephenson
    // NetHack may be freely redistributed.  See license for details.
    // 
    // 

    await des.room({ type: "ordinary",
               contents: async function() {
                  await des.stair("up");
                  await des.object();
                  await des.monster("human zombie");
                  await des.monster("wraith");
               }
    })

    await des.room({ type: "morgue",
               contents: async function() {
                  await des.object();
                  await des.object();
                  await des.object();
               }
    })

    await des.room({ type: "ordinary",
               contents: async function() {
                  await des.object();
                  await des.trap();
                  await des.object();
                  await des.monster("human zombie");
                  await des.monster("wraith");
               }
    })

    await des.room({ type: "morgue",
               contents: async function() {
                  await des.stair("down");
                  await des.object();
                  await des.object();
                  await des.trap();
               }
    })

    await des.room({ type: "ordinary",
               contents: async function() {
                  await des.object();
                  await des.object();
                  await des.trap();
                  await des.monster("human zombie");
                  await des.monster("wraith");
               }
    })


    await des.room({ type: "morgue",
               contents: async function() {
                  await des.object();
                  await des.trap();
               }
    })

    await des.random_corridors();


    return await des.finalize_level();
}
