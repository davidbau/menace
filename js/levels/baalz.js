/**
 * baalz - NetHack special level
 * Converted from: baalz.lua
 */

import * as des from '../sp_lev.js';
import { selection } from '../sp_lev.js';

export async function generate() {
    // NetHack gehennom baalz.lua	$NHDT-Date: 1652196020 2022/5/10 15:20:20 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.4 $
    // Copyright (c) 1989 by Jean-Christophe Collet
    // Copyright (c) 1992 by M. Stephenson && Izchak Miller
    // NetHack may be freely redistributed.  See license for details.
    // 
    des.level_init({ style: "solidfill", fg: " ", lit: 0 });

    // TODO FIXME: see baalz_fixup - the legs get removed currently.

    des.level_flags("mazelevel", "corrmaze");
    // the two pools are fakes used to mark spots which need special wall fixups
    // the two iron bars are eyes && spots to their left will be made diggable
    await des.map({ halign: "right", valign: "center", map: `\
-------------------------------------------------
|                   ----               ----      
|          ----     |     -----------  |         
| ------      |  ---------|.........|--P         
| F....|  -------|...........--------------      
---....|--|..................S............|----  
+...--....S..----------------|............S...|  
---....|--|..................|............|----  
| F....|  -------|...........-----S--------      
| ------      |  ---------|.........|--P         
|          ----     |     -----------  |         
|                   ----               ----      
-------------------------------------------------
` });
    await des.levregion({ region: [1,0,15,20], region_islev: 1, exclude: [15,1,70,16], exclude_islev: 1, type: "stair-up" });
    await des.levregion({ region: [1,0,15,20], region_islev: 1, exclude: [15,1,70,16], exclude_islev: 1, type: "branch" });
    await des.teleport_region({region: [1,0,15,20], region_islev: 1, exclude: [15,1,70,16], exclude_islev: 1 });
    // this actually leaves the farthest right column diggable
    await des.non_diggable(selection.area(0,0,47,12));
    await des.mazewalk(0,6,"west");
    await des.stair("down", 44,6);
    await des.door("locked",0,6);
    // The fellow in residence
    await des.monster("Baalzebub",35,6);
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
    await des.trap("spiked pit");
    await des.trap("fire");
    await des.trap("sleep gas");
    await des.trap("anti magic");
    await des.trap("fire");
    await des.trap("magic");
    await des.trap("magic");
    // Random monsters.
    await des.monster("ghost",37,7);
    await des.monster("horned devil",32,5);
    await des.monster("barbed devil",38,7);
    await des.monster("L");
    // Some Vampires for good measure
    await des.monster("V");
    await des.monster("V");
    await des.monster("V");



    return await des.finalize_level();
}
