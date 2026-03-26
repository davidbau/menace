/**
 * Arc-fila - NetHack special level
 * Converted from: Arc-fila.lua
 */

import * as des from '../sp_lev.js';

export async function generate() {
    // NetHack Archeologist Arc-fila.lua	$NHDT-Date: 1652195998 2022/5/10 15:19:58 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.1 $
    // Copyright (c) 1989 by Jean-Christophe Collet
    // Copyright (c) 1991 by M. Stephenson
    // NetHack may be freely redistributed.  See license for details.
    // 
    // 
    await des.room({ type: "ordinary",
               contents: async function() {
                  await des.stair("up");
                  await des.object();
                  await des.monster("S");
               }
    });

    await des.room({ type: "ordinary",
             contents: async function() {
                await des.object();
                await des.object();
                await des.monster("S");
             }
    })

    await des.room({ type: "ordinary",
               contents: async function() {
                  await des.object();
                  await des.trap();
                  await des.object();
                  await des.monster("S");
               }
    })

    await des.room({ type: "ordinary",
               contents: async function() {
                  await des.stair("down");
                  await des.object();
                  await des.trap();
                  await des.monster("S");
                  await des.monster("human mummy");
               }
    })

    await des.room({ type: "ordinary",
               contents: async function() {
                  await des.object();
                  await des.object();
                  await des.trap();
                  await des.monster("S");
               }
    })

    await des.room({ type: "ordinary",
               contents: async function() {
                  await des.object();
                  await des.trap();
                  await des.monster("S");
               }
    })

    await des.random_corridors();


    return await des.finalize_level();
}
