/**
 * earth - NetHack special level
 * Converted from: earth.lua
 */

import * as des from '../sp_lev.js';

export async function generate() {
    // NetHack endgame earth.lua	$NHDT-Date: 1652196025 2022/5/10 15:20:25 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.1 $
    // Copyright (c) 1989 by Jean-Christophe Collet
    // Copyright (c) 1992,1993 by Izchak Miller, David Cohrs,
    // && Timo Hakulinen
    // NetHack may be freely redistributed.  See license for details.
    // 
    // 
    // These are the ENDGAME levels: earth, air, fire, water, && astral.
    // The top-most level, the Astral Level, has 3 temples && shrines.
    // Players are supposed to sacrifice the Amulet of Yendor on the appropriate
    // shrine.

    des.level_init({ style: "solidfill", fg: " " });

    des.level_flags("mazelevel", "noteleport", "hardfloor", "shortsighted");

    await des.message("Well done, mortal!");
    await des.message("But now thou must face the final Test...args");
    await des.message("Prove thyself worthy || perish!");

    // The player lands, upon arrival, in the
    // lower-right cavern.  The location of the
    // portal to the next level is randomly chosen.
    // This map has no visible outer boundary, &&
    // is mostly diggable "rock".
    await des.map(`\
                                                                            
  ...                                                                       
 ....                ..                                                     
 .....             ...                                      ..              
  ....              ....                                     ...            
   ....              ...                ....                 ...      .     
    ..                ..              .......                 .      ..     
                                      ..  ...                        .      
              .                      ..    .                         ...    
             ..  ..                  .     ..                         .     
            ..   ...                        .                               
            ...   ...                                                       
              .. ...                                 ..                     
               ....                                 ..                      
                          ..                                       ...      
                         ..                                       .....     
  ...                                                              ...      
 ....                                                                       
   ..                                                                       
                                                                            
`);

    await des.replace_terrain({ region: [0,0, 75,19], fromterrain: " ", toterrain: ".", lit: 0, chance: 5 });

    // Since there are no stairs, this forces the hero's initial placement
    await des.teleport_region({region: [69,16,69,16] });
    await des.levregion({ region: [0,0,75,19], exclude: [65,13,75,19], type: "portal", name: "air" });
    // Some helpful monsters.  Making sure a
    // pick axe && at least one wand of digging
    // are available.
    await des.monster("Elvenking", 67,16);
    await des.monster("minotaur", 67,14);
    // An assortment of earth-appropriate nasties
    // in each cavern.
    await des.monster({ id: "earth elemental", x: 52, y: 13, peaceful: 0 });
    await des.monster({ id: "earth elemental", x: 53, y: 13, peaceful: 0 });
    await des.monster("rock troll", 53,12);
    await des.monster("stone giant", 54,12);
    // 
    await des.monster("pit viper", 70,5);
    await des.monster("barbed devil", 69,6);
    await des.monster("stone giant", 69,8);
    await des.monster("stone golem", 71,8);
    await des.monster("pit fiend", 70,9);
    await des.monster({ id: "earth elemental", x: 70, y: 8, peaceful: 0 });
    // 
    await des.monster({ id: "earth elemental", x: 60, y: 3, peaceful: 0 });
    await des.monster("stone giant", 61,4);
    await des.monster({ id: "earth elemental", x: 62, y: 4, peaceful: 0 });
    await des.monster({ id: "earth elemental", x: 61, y: 5, peaceful: 0 });
    await des.monster("scorpion", 62,5);
    await des.monster("rock piercer", 63,5);
    // 
    await des.monster("umber hulk", 40,5);
    await des.monster("dust vortex", 42,5);
    await des.monster("rock troll", 38,6);
    await des.monster({ id: "earth elemental", x: 39, y: 6, peaceful: 0 });
    await des.monster({ id: "earth elemental", x: 41, y: 6, peaceful: 0 });
    await des.monster({ id: "earth elemental", x: 38, y: 7, peaceful: 0 });
    await des.monster("stone giant", 39,7);
    await des.monster({ id: "earth elemental", x: 43, y: 7, peaceful: 0 });
    await des.monster("stone golem", 37,8);
    await des.monster("pit viper", 43,8);
    await des.monster("pit viper", 43,9);
    await des.monster("rock troll", 44,10);
    // 
    await des.monster({ id: "earth elemental", x: 2, y: 1, peaceful: 0 });
    await des.monster({ id: "earth elemental", x: 3, y: 1, peaceful: 0 });
    await des.monster("stone golem", 1,2);
    await des.monster({ id: "earth elemental", x: 2, y: 2, peaceful: 0 });
    await des.monster("rock troll", 4,3);
    await des.monster("rock troll", 3,3);
    await des.monster("pit fiend", 3,4);
    await des.monster({ id: "earth elemental", x: 4, y: 5, peaceful: 0 });
    await des.monster("pit viper", 5,6);
    // 
    await des.monster({ id: "earth elemental", x: 21, y: 2, peaceful: 0 });
    await des.monster({ id: "earth elemental", x: 21, y: 3, peaceful: 0 });
    await des.monster("minotaur", 21,4);
    await des.monster({ id: "earth elemental", x: 21, y: 5, peaceful: 0 });
    await des.monster("rock troll", 22,5);
    await des.monster({ id: "earth elemental", x: 22, y: 6, peaceful: 0 });
    await des.monster({ id: "earth elemental", x: 23, y: 6, peaceful: 0 });
    // 
    await des.monster("pit viper", 14,8);
    await des.monster("barbed devil", 14,9);
    await des.monster({ id: "earth elemental", x: 13, y: 10, peaceful: 0 });
    await des.monster("rock troll", 12,11);
    await des.monster({ id: "earth elemental", x: 14, y: 12, peaceful: 0 });
    await des.monster({ id: "earth elemental", x: 15, y: 13, peaceful: 0 });
    await des.monster("stone giant", 17,13);
    await des.monster("stone golem", 18,13);
    await des.monster("pit fiend", 18,12);
    await des.monster({ id: "earth elemental", x: 18, y: 11, peaceful: 0 });
    await des.monster({ id: "earth elemental", x: 18, y: 10, peaceful: 0 });
    // 
    await des.monster("barbed devil", 2,16);
    await des.monster({ id: "earth elemental", x: 3, y: 16, peaceful: 0 });
    await des.monster("rock troll", 2,17);
    await des.monster({ id: "earth elemental", x: 4, y: 17, peaceful: 0 });
    await des.monster({ id: "earth elemental", x: 4, y: 18, peaceful: 0 });

    await des.object("boulder");



    return await des.finalize_level();
}
