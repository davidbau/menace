/**
 * Cav-fila - NetHack special level
 * Converted from: Cav-fila.lua
 */

import * as des from '../sp_lev.js';

export async function generate() {
    // NetHack Caveman Cav-fila.lua	$NHDT-Date: 1652196001 2022/5/10 15:20:1 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.2 $
    // Copyright (c) 1989 by Jean-Christophe Collet
    // Copyright (c) 1991 by M. Stephenson
    // NetHack may be freely redistributed.  See license for details.
    // 
    des.level_init({ style: "solidfill", fg: " " });

    des.level_flags("mazelevel", "noflip");

    des.level_init({ style: "mines", fg: ".", bg: " ", smoothed: true, joined: true, walled: true });

    // 
    await des.stair("up");
    await des.stair("down");
    // 
    await des.object();
    await des.object();
    await des.object();
    await des.object();
    await des.object();
    await des.object();
    await des.object();
    // 
    await des.trap();
    await des.trap();
    await des.trap();
    await des.trap();
    // 
    await des.monster({ id: "bugbear", peaceful: 0 });
    await des.monster({ id: "bugbear", peaceful: 0 });
    await des.monster({ id: "bugbear", peaceful: 0 });
    await des.monster({ id: "bugbear", peaceful: 0 });
    await des.monster({ id: "bugbear", peaceful: 0 });
    await des.monster({ class: "h", peaceful: 0 });
    await des.monster({ id: "hill giant", peaceful: 0 });


    return await des.finalize_level();
}
