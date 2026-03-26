/**
 * asmodeus - NetHack special level
 * Converted from: asmodeus.lua
 */

import * as des from '../sp_lev.js';
import { selection } from '../sp_lev.js';
import { hell_tweaks } from './hellfill.js';

export async function generate() {
    // NetHack gehennom asmodeus.lua	$NHDT-Date: 1652196020 2022/5/10 15:20:20 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.2 $
    // Copyright (c) 1989 by Jean-Christophe Collet
    // Copyright (c) 1992 by M. Stephenson && Izchak Miller
    // NetHack may be freely redistributed.  See license for details.
    // 
    des.level_init({ style: "mazegrid", bg: "-" });

    des.level_flags("mazelevel");

    let tmpbounds = selection.match("-");
    let bnds = tmpbounds.bounds();
    let bounds2 = selection.fillrect(bnds.lx, bnds.ly + 1, bnds.hx - 2, bnds.hy - 1);

    // First part
    let asmo1 = await des.map({ halign: "half-left", valign: "center", map: `\
---------------------
|.............|.....|
|.............S.....|
|---+------------...|
|.....|.........|-+--
|..---|.........|....
|..|..S.........|....
|..|..|.........|....
|..|..|.........|-+--
|..|..-----------...|
|..S..........|.....|
---------------------
`, contents: async function(rm) {
       // Doors
       await des.door("closed",4,3);
       await des.door("locked",18,4);
       await des.door("closed",18,8);
       // 
       await des.stair("down", 13,7);
       // Non diggable walls
       await des.non_diggable(selection.area(0,0,20,11));
       // Entire main area
       await des.region(selection.area(1,1,20,10),"unlit");
       // The fellow in residence
       await des.monster("Asmodeus",12,7);
       // Some random weapons && armor.
       await des.object("[");
       await des.object("[");
       await des.object(")");
       await des.object(")");
       await des.object("*");
       await des.object("!");
       await des.object("!");
       await des.object("?");
       await des.object("?");
       await des.object("?");
       // Some traps.
       await des.trap("spiked pit", 5,2);
       await des.trap("fire", 8,6);
       await des.trap("sleep gas");
       await des.trap("anti magic");
       await des.trap("fire");
       await des.trap("magic");
       await des.trap("magic");
       // Random monsters.
       await des.monster("ghost",11,7);
       await des.monster("horned devil",10,5);
       await des.monster("L");
       // Some Vampires for good measure
       await des.monster("V");
       await des.monster("V");
       await des.monster("V");
    } });

    await des.levregion({ region: [1,0,6,20], region_islev: 1, exclude: [6,1,70,16], exclude_islev: 1, type: "stair-up" });

    await des.levregion({ region: [1,0,6,20], region_islev: 1, exclude: [6,1,70,16], exclude_islev: 1, type: "branch" });
    await des.teleport_region({ region: [1,0,6,20], region_islev: 1, exclude: [6,1,70,16], exclude_islev: 1 });

    // Second part
    let asmo2 = await des.map({ halign: "half-right", valign: "center", map: `\
---------------------------------
................................|
................................+
................................|
---------------------------------
`, contents: async function(rm) {
       await des.mazewalk(32,2,"east");
       // Non diggable walls
       await des.non_diggable(selection.area(0,0,32,4));
       await des.door("closed",32,2);
       await des.monster("&");
       await des.monster("&");
       await des.monster("&");
       await des.trap("anti magic");
       await des.trap("fire");
       await des.trap("magic");
    } });

    let protected_region = bounds2.negate().union(asmo1).union(asmo2);
    hell_tweaks(protected_region);


    return await des.finalize_level();
}
