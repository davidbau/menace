/**
 * Kni-goal - NetHack special level
 * Converted from: Kni-goal.lua
 */

import * as des from '../sp_lev.js';
import { selection } from '../sp_lev.js';

export async function generate() {
    // NetHack Knight Kni-goal.lua	$NHDT-Date: 1652196005 2022/5/10 15:20:5 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.1 $
    // Copyright (c) 1989 by Jean-Christophe Collet
    // Copyright (c) 1991,92 by M. Stephenson
    // NetHack may be freely redistributed.  See license for details.
    // 
    des.level_init({ style: "solidfill", fg: " " });

    des.level_flags("mazelevel");

    await des.map(`\
....PPPP..PPP..                                                             
.PPPPP...PP..     ..........     .................................          
..PPPPP...P..    ...........    ...................................         
..PPP.......   ...........    ......................................        
...PPP.......    .........     ...............   .....................      
...........    ............    ............     ......................      
............   .............      .......     .....................         
..............................            .........................         
...............................   ..................................        
.............................    ....................................       
.........    ......................................................         
.....PP...    .....................................................         
.....PPP....    ....................................................        
......PPP....   ..............   ....................................       
.......PPP....  .............    .....................................      
........PP...    ............    ......................................     
...PPP........     ..........     ..................................        
..PPPPP........     ..........     ..............................           
....PPPPP......       .........     ..........................              
.......PPPP...                                                              
`);
    // Dungeon Description
    await des.region(selection.area(0,0,14,19), "lit");
    await des.region(selection.area(15,0,75,19), "unlit");
    // Stairs
    await des.stair("up", 3,8);
    // Non diggable walls
    await des.non_diggable(selection.area(0,0,75,19));
    // Objects
    await des.object({ id: "mirror", x: 50,y: 6, buc: "blessed", spe: 0, name: "The Magic Mirror of Merlin" });
    await des.object({ coord: [ 33, 1 ] });
    await des.object({ coord: [ 33, 2 ] });
    await des.object({ coord: [ 33, 3 ] });
    await des.object({ coord: [ 33, 4 ] });
    await des.object({ coord: [ 33, 5 ] });
    await des.object({ coord: [ 34, 1 ] });
    await des.object({ coord: [ 34, 2 ] });
    await des.object({ coord: [ 34, 3 ] });
    await des.object({ coord: [ 34, 4 ] });
    await des.object({ coord: [ 34, 5 ] });
    await des.object({ coord: [ 35, 1 ] });
    await des.object({ coord: [ 35, 2 ] });
    await des.object({ coord: [ 35, 3 ] });
    await des.object({ coord: [ 35, 4 ] });
    await des.object({ coord: [ 35, 5 ] });
    await des.object();
    await des.object();
    await des.object();
    await des.object();
    await des.object();
    await des.object();
    // Random traps
    await des.trap("spiked pit",13,7);
    await des.trap("spiked pit",12,8);
    await des.trap("spiked pit",12,9);
    await des.trap();
    await des.trap();
    await des.trap();
    await des.trap();
    await des.trap();
    // Random monsters.
    await des.monster({ id: "Ixoth", x: 50, y: 6, peaceful: 0 });
    await des.monster({ id: "quasit", peaceful: 0 });
    await des.monster({ id: "quasit", peaceful: 0 });
    await des.monster({ id: "quasit", peaceful: 0 });
    await des.monster({ id: "quasit", peaceful: 0 });
    await des.monster({ id: "quasit", peaceful: 0 });
    await des.monster({ id: "quasit", peaceful: 0 });
    await des.monster({ id: "quasit", peaceful: 0 });
    await des.monster({ id: "quasit", peaceful: 0 });
    await des.monster({ id: "quasit", peaceful: 0 });
    await des.monster({ id: "quasit", peaceful: 0 });
    await des.monster({ id: "quasit", peaceful: 0 });
    await des.monster({ id: "quasit", peaceful: 0 });
    await des.monster({ id: "quasit", peaceful: 0 });
    await des.monster({ id: "quasit", peaceful: 0 });
    await des.monster({ id: "quasit", peaceful: 0 });
    await des.monster({ id: "quasit", peaceful: 0 });
    await des.monster({ class: "i", peaceful: 0 });
    await des.monster({ class: "i", peaceful: 0 });
    await des.monster({ id: "ochre jelly", peaceful: 0 });
    await des.monster({ id: "ochre jelly", peaceful: 0 });
    await des.monster({ id: "ochre jelly", peaceful: 0 });
    await des.monster({ id: "ochre jelly", peaceful: 0 });
    await des.monster({ id: "ochre jelly", peaceful: 0 });
    await des.monster({ id: "ochre jelly", peaceful: 0 });
    await des.monster({ id: "ochre jelly", peaceful: 0 });
    await des.monster({ id: "ochre jelly", peaceful: 0 });
    await des.monster({ class: "j", peaceful: 0 });


    return await des.finalize_level();
}
