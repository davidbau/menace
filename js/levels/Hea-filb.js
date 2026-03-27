/**
 * Hea-filb - NetHack special level
 * Converted from: Hea-filb.lua
 */

import * as des from '../sp_lev.js';

export async function generate() {
    // NetHack Healer Hea-filb.lua	$NHDT-Date: 1652196003 2022/5/10 15:20:3 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.2 $
    // Copyright (c) 1989 by Jean-Christophe Collet
    // Copyright (c) 1991, 1993 by M. Stephenson, P. Winner
    // NetHack may be freely redistributed.  See license for details.
    // 
    des.level_init({ style: "solidfill", fg: "P" });

    des.level_flags("mazelevel", "noflip");

    des.level_init({ style: "mines", fg: ".", bg: "P", smoothed: false, joined: true, lit: 1, walled: false });

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
    await des.object();
    await des.object();
    await des.object();
    await des.object();
    // 
    await des.monster("rabid rat");
    await des.monster("rabid rat");
    await des.monster({ class: "r", peaceful: 0 });
    await des.monster({ class: "r", peaceful: 0 });
    await des.monster("giant eel");
    await des.monster("giant eel");
    await des.monster("giant eel");
    await des.monster("giant eel");
    await des.monster("giant eel");
    await des.monster("electric eel");
    await des.monster("electric eel");
    await des.monster({ class: "D", peaceful: 0 });
    await des.monster({ class: "D", peaceful: 0 });
    await des.monster({ class: "D", peaceful: 0 });
    await des.monster({ class: "D", peaceful: 0 });
    await des.monster({ class: "S", peaceful: 0 });
    await des.monster({ class: "S", peaceful: 0 });
    await des.monster({ class: "S", peaceful: 0 });
    // 
    await des.trap();
    await des.trap();
    await des.trap();
    await des.trap();


    return await des.finalize_level();
}
