/**
 * tower2 - NetHack special level
 * Converted from: tower2.lua
 */

import * as des from '../sp_lev.js';
import { selection, shuffle } from '../sp_lev.js';

export async function generate() {
    // NetHack tower tower2.lua	$NHDT-Date: 1652196037 2022/5/10 15:20:37 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.2 $
    // Copyright (c) 1989 by Jean-Christophe Collet
    // NetHack may be freely redistributed.  See license for details.
    // 
    des.level_init({ style: "solidfill", fg: " " });

    des.level_flags("mazelevel", "noteleport", "hardfloor", "solidify");
    await des.map({ halign: "half-left", valign: "center", map: `\
  --- --- ---  
  |.| |.| |.|  
---S---S---S---
|.S.........S.|
---.------+----
  |......|..|  
--------.------
|.S......+..S.|
---S---S---S---
  |.| |.| |.|  
  --- --- ---  
` });
    // Random places are the 10 niches
    let place = [ [3,1],[7,1],[11,1],[1,3],[13,3],
    	   [1,7],[13,7],[3,9],[7,9],[11,9] ]
    shuffle(place)

    await des.ladder("up", 11,5);
    await des.ladder("down", 3,7);
    await des.door("locked",10,4);
    await des.door("locked",9,7);
    await des.monster("&",place[9]);
    await des.monster("&",place[0]);
    await des.monster("hell hound pup",place[1]);
    await des.monster("hell hound pup",place[2]);
    await des.monster("winter wolf",place[3]);
    await des.object({ id: "chest", coord: place[4],
                 contents: async function() {
                    await des.object("amulet of life saving");
                 }
    });
    await des.object({ id: "chest", coord: place[5],
                 contents: async function() {
                    await des.object("amulet of strangulation");
                 }
    });
    await des.object("water walking boots",place[6]);
    await des.object("crystal plate mail",place[7]);

    let spbooks = [
       "spellbook of invisibility",
       "spellbook of cone of cold",
       "spellbook of create familiar",
       "spellbook of clairvoyance",
       "spellbook of charm monster",
       "spellbook of stone to flesh",
       "spellbook of polymorph"
    ]
    shuffle(spbooks);
    await des.object(spbooks[0],place[8]);

    // Walls in the tower are non diggable
    await des.non_diggable(selection.area(0,0,14,10));



    return await des.finalize_level();
}
