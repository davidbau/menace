/**
 * fakewiz2 - NetHack special level
 * Converted from: fakewiz2.lua
 */

import * as des from '../sp_lev.js';
import { selection } from '../sp_lev.js';
import { hell_tweaks } from './hellfill.js';

export async function generate() {
    // NetHack yendor fakewiz2.lua	$NHDT-Date: 1652196026 2022/5/10 15:20:26 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.2 $
    // Copyright (c) 1989 by Jean-Christophe Collet
    // Copyright (c) 1992 by M. Stephenson && Izchak Miller
    // NetHack may be freely redistributed.  See license for details.
    // 
    des.level_init({ style: "mazegrid", bg: "-" });

    des.level_flags("mazelevel");

    let tmpbounds = selection.match("-");
    let bnds = tmpbounds.bounds();
    let bounds2 = selection.fillrect(bnds.lx, bnds.ly + 1, bnds.hx - 2, bnds.hy - 1);

    let fakewiz2 = await des.map({ halign: "center", valign: "center", map: `\
.........
.}}}}}}}.
.}}---}}.
.}--.--}.
.}|...|}.
.}--.--}.
.}}---}}.
.}}}}}}}.
.........
`, contents: async function(rm) {
       await des.levregion({ region: [1,0,79,20], region_islev: 1, exclude: [0,0,8,8], type: "stair-up" });
       await des.levregion({ region: [1,0,79,20], region_islev: 1, exclude: [0,0,8,8], type: "stair-down" });
       await des.levregion({ region: [1,0,79,20], region_islev: 1, exclude: [0,0,8,8], type: "branch" });
       await des.teleport_region({ region: [1,0,79,20], region_islev: 1,exclude: [2,2,6,6] });
       await des.mazewalk(8,5,"east");
       await des.monster("L",4,4);
       await des.monster("vampire lord",3,4);
       await des.monster("kraken",6,6);
       // And to make things a little harder.
       await des.trap("board",4,3);
       await des.trap("board",4,5);
       await des.trap("board",3,4);
       await des.trap("board",5,4);
       // treasures
       await des.object("\"",4,4);
    }
    });

    let protected_region = bounds2.negate().union(fakewiz2);
    hell_tweaks(protected_region);


    return await des.finalize_level();
}
