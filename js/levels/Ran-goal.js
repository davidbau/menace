/**
 * Ran-goal - NetHack special level
 * Converted from: Ran-goal.lua
 */

import * as des from '../sp_lev.js';
import { selection } from '../sp_lev.js';

export async function generate() {
    // NetHack Ranger Ran-goal.lua	$NHDT-Date: 1652196010 2022/5/10 15:20:10 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.1 $
    // Copyright (c) 1989 by Jean-Christophe Collet
    // Copyright (c) 1991 by M. Stephenson
    // NetHack may be freely redistributed.  See license for details.
    // 
    des.level_init({ style: "solidfill", fg: " " });

    des.level_flags("mazelevel");

    await des.map(`\
                                                                            
  ...                                                                  ...  
 .......................................................................... 
  ...                                +                                 ...  
   .     ............     .......    .                   .......        .   
   .  .............................  .       ........   .........S..    .   
   .   ............    .  ......     .       .      .    .......   ..   .   
   .     .........     .   ....      +       . ...  .               ..  .   
   .        S          .         .........   .S.    .S...............   .   
   .  ...   .     ...  .         .........          .                   .   
   . ........    .....S.+.......+....\\....+........+.                   .   
   .  ...         ...    S       .........           ..      .....      .   
   .                    ..       .........            ..      ......    .   
   .      .......     ...            +       ....    ....    .......... .   
   . ..............  ..              .      ......  ..  .............   .   
   .     .............               .     ..........          ......   .   
  ...                                +                                 ...  
 .......................................................................... 
  ...                                                                  ...  
                                                                            
`);
    // Dungeon Description
    await des.region(selection.area(0,0,75,19), "lit");
    // Stairs
    await des.stair("up", 19,10);
    // Non diggable walls
    await des.non_diggable(selection.area(0,0,75,19));
    // Objects
    await des.object({ id: "bow", x: 37, y: 10, buc: "blessed", spe: 0, name: "The Longbow of Diana" });
    await des.object("chest", 37, 10);
    await des.object({ coord: [ 36, 9 ] });
    await des.object({ coord: [ 36, 10 ] });
    await des.object({ coord: [ 36, 11 ] });
    await des.object({ coord: [ 37, 9 ] });
    await des.object({ coord: [ 37, 11 ] });
    await des.object({ coord: [ 38, 9 ] });
    await des.object({ coord: [ 38, 10 ] });
    await des.object({ coord: [ 38, 11 ] });
    await des.object();
    await des.object();
    await des.object();
    await des.object();
    await des.object();
    // Random traps
    await des.trap();
    await des.trap();
    await des.trap();
    await des.trap();
    await des.trap();
    await des.trap();
    // doors
    await des.door("locked",12,8);
    await des.door("closed",22,10);
    await des.door("locked",24,10);
    await des.door("closed",25,11);
    await des.door("closed",32,10);
    await des.door("closed",37,3);
    await des.door("closed",37,7);
    await des.door("closed",37,13);
    await des.door("closed",37,16);
    await des.door("closed",42,10);
    await des.door("locked",46,8);
    await des.door("closed",51,10);
    await des.door("locked",53,8);
    await des.door("closed",65,5);
    // Random monsters.
    await des.monster({ id: "Scorpius", x: 37, y: 10, peaceful: 0 });
    await des.monster({ id: "forest centaur", x: 36, y: 9, peaceful: 0 });
    await des.monster({ id: "forest centaur", x: 36, y: 10, peaceful: 0 });
    await des.monster({ id: "forest centaur", x: 36, y: 11, peaceful: 0 });
    await des.monster({ id: "forest centaur", x: 37, y: 9, peaceful: 0 });
    await des.monster({ id: "forest centaur", x: 37, y: 11, peaceful: 0 });
    await des.monster({ id: "forest centaur", x: 38, y: 9, peaceful: 0 });
    await des.monster({ id: "mountain centaur", x: 38, y: 10, peaceful: 0 });
    await des.monster({ id: "mountain centaur", x: 38, y: 11, peaceful: 0 });
    await des.monster({ id: "mountain centaur", x: 2, y: 2, peaceful: 0 });
    await des.monster({ id: "mountain centaur", x: 71, y: 2, peaceful: 0 });
    await des.monster({ id: "mountain centaur", x: 2, y: 16, peaceful: 0 });
    await des.monster({ id: "mountain centaur", x: 71, y: 16, peaceful: 0 });
    await des.monster({ id: "forest centaur", peaceful: 0 });
    await des.monster({ id: "forest centaur", peaceful: 0 });
    await des.monster({ id: "mountain centaur", peaceful: 0 });
    await des.monster({ id: "mountain centaur", peaceful: 0 });
    await des.monster({ class: "C", peaceful: 0 });
    await des.monster({ class: "C", peaceful: 0 });
    await des.monster({ id: "scorpion", x: 3, y: 2, peaceful: 0 });
    await des.monster({ id: "scorpion", x: 72, y: 2, peaceful: 0 });
    await des.monster({ id: "scorpion", x: 3, y: 17, peaceful: 0 });
    await des.monster({ id: "scorpion", x: 72, y: 17, peaceful: 0 });
    await des.monster({ id: "scorpion", x: 41, y: 10, peaceful: 0 });
    await des.monster({ id: "scorpion", x: 33, y: 9, peaceful: 0 });
    await des.monster({ id: "scorpion", peaceful: 0 });
    await des.monster({ id: "scorpion", peaceful: 0 });
    await des.monster({ class: "s", peaceful: 0 });

    await des.wallify();


    return await des.finalize_level();
}
