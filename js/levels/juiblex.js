/**
 * juiblex - NetHack special level
 * Converted from: juiblex.lua
 */

import * as des from '../sp_lev.js';
import { selection, shuffle } from '../sp_lev.js';

export async function generate() {
    // NetHack gehennom juiblex.lua	$NHDT-Date: 1652196026 2022/5/10 15:20:26 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.5 $
    // Copyright (c) 1989 by Jean-Christophe Collet
    // Copyright (c) 1992 by M. Stephenson && Izchak Miller
    // NetHack may be freely redistributed.  See license for details.
    // 

    des.level_flags("mazelevel", "shortsighted", "noflip", "temperate");
    // des.level_init(mines,'.','}',true,true,unlit,false)
    des.level_init({ style: "swamp", lit: 0 });
    // guarantee at least one open spot to ensure successful stair placement
    await des.map({ halign: "left", valign: "bottom", map: `\
xxxxxxxx
xx...xxx
xxx...xx
xxxx.xxx
xxxxxxxx
` });
    await des.object("boulder");
    await des.map({ halign: "right", valign: "top", map: `\
xxxxxxxx
xxxx.xxx
xxx...xx
xx...xxx
xxxxxxxx
` });
    await des.object("boulder");
    // lair
    await des.map(`\
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxx
xxx...xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...xxx
xxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxx
xxxxxxxxxxxxxxxxxxxxxxxx}}}xxxxxxxxxxxxxxx}}}}}xxxx
xxxxxxxxxxxxxxxxxxxxxxx}}}}}xxxxxxxxxxxxx}.....}xxx
xxxxxxxxxxxxxxxxxxxxxx}}...}}xxxxxxxxxxx}..P.P..}xx
xxxxxxxxxxxxxxxxxxxxx}}..P..}}xxxxxxxxxxx}.....}xxx
xxxxxxxxxxxxxxxxxxxxx}}.P.P.}}xxxxxxxxxxxx}...}xxxx
xxxxxxxxxxxxxxxxxxxxx}}..P..}}xxxxxxxxxxxx}...}xxxx
xxxxxxxxxxxxxxxxxxxxxx}}...}}xxxxxxxxxxxxxx}}}xxxxx
xxxxxxxxxxxxxxxxxxxxxxx}}}}}xxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxx}}}xxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxx
xxx...xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...xxx
xxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
`);
    // Random registers
    let monster = [ "j","b","P","F" ]
    shuffle(monster)

    let place = selection.new();
    place.set(4,2);
    place.set(46,2);
    place.set(4,15);
    place.set(46,15);

    // Dungeon description
    await des.region({ region: [0,0,50,17], lit: 0, type: "swamp", filled: 2 });
    await des.levregion({ region: [1,0,11,20], region_islev: 1, exclude: [0,0,50,17], type: "stair-down" });
    await des.levregion({ region: [69,0,79,20], region_islev: 1, exclude: [0,0,50,17], type: "stair-up" });
    await des.levregion({ region: [1,0,11,20], region_islev: 1, exclude: [0,0,50,17], type: "branch" });
    await des.teleport_region({ region: [1,0,11,20], region_islev: 1, exclude: [0,0,50,17],dir: "up" });
    await des.teleport_region({ region: [69,0,79,20], region_islev: 1, exclude: [0,0,50,17],dir: "down" });
    await des.feature("fountain", place.rndcoord(1));
    await des.monster({ id: "giant mimic", coord: place.rndcoord(1), appear_as: "ter:fountain" });
    await des.monster({ id: "giant mimic", coord: place.rndcoord(1), appear_as: "ter:fountain" });
    await des.monster({ id: "giant mimic", coord: place.rndcoord(1), appear_as: "ter:fountain" });
    // The demon of the swamp
    await des.monster("Juiblex",25,8);
    // And a couple demons
    await des.monster("lemure",43,8);
    await des.monster("lemure",44,8);
    await des.monster("lemure",45,8);
    // Some liquids && gems
    await des.object("*",43,6);
    await des.object("*",45,6);
    await des.object("!",43,9);
    await des.object("!",44,9);
    await des.object("!",45,9);
    // And lots of blobby monsters
    await des.monster(monster[3],25,6);
    await des.monster(monster[0],24,7);
    await des.monster(monster[1],26,7);
    await des.monster(monster[2],23,8);
    await des.monster(monster[2],27,8);
    await des.monster(monster[1],24,9);
    await des.monster(monster[0],26,9);
    await des.monster(monster[3],25,10);
    await des.monster("j");
    await des.monster("j");
    await des.monster("j");
    await des.monster("j");
    await des.monster("P");
    await des.monster("P");
    await des.monster("P");
    await des.monster("P");
    await des.monster("b");
    await des.monster("b");
    await des.monster("b");
    await des.monster("F");
    await des.monster("F");
    await des.monster("F");
    await des.monster("m");
    await des.monster("m");
    await des.monster("jellyfish");
    await des.monster("jellyfish");
    // Some random objects
    await des.object("!");
    await des.object("!");
    await des.object("!");
    await des.object("%");
    await des.object("%");
    await des.object("%");
    await des.object("boulder");
    // Some traps
    await des.trap("sleep gas");
    await des.trap("sleep gas");
    await des.trap("anti magic");
    await des.trap("anti magic");
    await des.trap("magic");
    await des.trap("magic");


    return await des.finalize_level();
}
