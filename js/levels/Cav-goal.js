/**
 * Cav-goal - NetHack special level
 * Converted from: Cav-goal.lua
 */

import * as des from '../sp_lev.js';
import { selection } from '../sp_lev.js';

export async function generate() {
    // NetHack Caveman Cav-goal.lua	$NHDT-Date: 1652196002 2022/5/10 15:20:2 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.1 $
    // Copyright (c) 1989 by Jean-Christophe Collet
    // Copyright (c) 1991 by M. Stephenson
    // NetHack may be freely redistributed.  See license for details.
    // 
    des.level_init({ style: "solidfill", fg: " " });

    des.level_flags("mazelevel");

    await des.map(`\
                                                                            
                          .....................                             
                         .......................                            
                        .........................                           
                       ...........................                          
                      .............................                         
                     ...............................                        
                    .................................                       
                   ...................................                      
                  .....................................                     
                 .......................................                    
                  .....................................                     
                   ...................................                      
                    .................................                       
                     ...............................                        
                      .............................                         
                       ...........................                          
                        .........................                           
                         .......................                            
                                                                            
`);
    // Dungeon Description
    await des.region(selection.area(0,0,75,19), "lit");
    // Stairs
    await des.stair("up");
    // Non diggable walls
    await des.non_diggable(selection.area(0,0,75,19));
    // Objects
    await des.object({ id: "mace", x: 23, y: 10, buc: "blessed", spe: 0, name: "The Sceptre of Might" });
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
    await des.object();
    await des.object();
    await des.object();
    // monsters.
    await des.monster({ id: "Chromatic Dragon", x: 23, y: 10, asleep: 1 });
    await des.monster("shrieker", 26, 13);
    await des.monster("shrieker", 25, 8);
    await des.monster("shrieker", 45, 11);
    await des.wallify();


    return await des.finalize_level();
}
