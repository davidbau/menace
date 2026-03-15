/**
 * minetn-5 - NetHack special level
 * Converted from: minetn-5.lua
 */

import * as des from '../sp_lev.js';
import { selection, percent, u, get_nhlib_align } from '../sp_lev.js';

// Helper function: returns shop type based on role.
function monkfoodshop() {
    return u.role === 'Monk' ? "health food shop" : "food shop";
}


export async function generate() {
    // C ref: nhlib.lua pre-shuffles a global `align` array; level scripts just read it.
    const align = get_nhlib_align();

    // NetHack mines minetn-5.lua	$NHDT-Date: 1652196031 2022/5/10 15:20:31 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.5 $
    // Copyright (c) 1989-95 by Jean-Christophe Collet
    // Copyright (c) 1991-95 by M. Stephenson
    // NetHack may be freely redistributed.  See license for details.
    // 
    // "Grotto Town" by Kelly Bailey

    des.level_init({ style: "solidfill", fg: " " });

    des.level_flags("mazelevel");

    await des.map(`\
-----         ---------                                                    
|...---  ------.......--    -------                       ---------------  
|.....----.........--..|    |.....|          -------      |.............|  
--..-....-.----------..|    |.....|          |.....|     --+---+--.----+-  
 --.--.....----     ----    |.....|  ------  --....----  |..-...--.-.+..|  
  ---.........----  -----   ---+---  |..+.|   ---..-..----..---+-..---..|  
    ----.-....|..----...--    |.|    |..|.|    ---+-.....-+--........--+-  
       -----..|....-.....---- |.|    |..|.------......--................|  
    ------ |..|.............---.--   ----.+..|-.......--..--------+--..--  
    |....| --......---...........-----  |.|..|-...{....---|.........|..--  
    |....|  |........-...-...........----.|..|--.......|  |.........|...|  
    ---+--------....-------...---......--.-------....---- -----------...|  
 ------.---...--...--..-..--...-..---...|.--..-...-....------- |.......--  
 |..|-.........-..---..-..---.....--....|........---...-|....| |.-------   
 |..+...............-+---+-----..--..........--....--...+....| |.|...S.    
-----.....{....----...............-...........--...-...-|....| |.|...|     
|..............-- --+--.---------.........--..-........------- |.--+-------
-+-----.........| |...|.|....|  --.......------...|....---------.....|....|
|...| --..------- |...|.+....|   ---...---    --..|...--......-...{..+..-+|
|...|  ----       ------|....|     -----       -----.....----........|..|.|
-----                   ------                     -------  ---------------
`);

    if (percent(75)) {
      if (percent(50)) {
        des.terrain(selection.line(25,8, 25,9), "|");
      } else {
        des.terrain(selection.line(16,13, 17,13), "-");
      }
    }
    if (percent(75)) {
      if (percent(50)) {
        des.terrain(selection.line(36,10, 36,11), "|");
      } else {
        des.terrain(selection.line(32,15, 33,15), "-");
      }
    }
    if (percent(50)) {
      des.terrain(selection.area(21,4, 22,5), ".");
      des.terrain(selection.line(14,9, 14,10), "|");
    }
    if (percent(50)) {
      des.terrain([46,13], "|");
      des.terrain(selection.line(43,5, 47,5), "-");
      des.terrain(selection.line(42,6, 46,6), ".");
      des.terrain(selection.line(46,7, 47,7), ".");
    }
    if (percent(50)) {
      des.terrain(selection.area(69,11, 71,11), "-");
    }

    des.stair("up", 1,1);
    des.stair("down", 46,3);
    des.feature("fountain", 50,9);
    des.feature("fountain", 10,15);
    des.feature("fountain", 66,18);

    await des.region(selection.area(0,0,74,20),"unlit");
    await des.region(selection.area(9,13,11,17),"lit");
    await des.region(selection.area(8,14,12,16),"lit");
    await des.region(selection.area(49,7,51,11),"lit");
    await des.region(selection.area(48,8,52,10),"lit");
    await des.region(selection.area(64,17,68,19),"lit");
    await des.region(selection.area(37,13,39,17),"lit");
    await des.region(selection.area(36,14,40,17),"lit");
    await des.region(selection.area(59,2,72,10),"lit");

    await des.monster({ id: "watchman", peaceful: 1 });
    await des.monster({ id: "watchman", peaceful: 1 });
    await des.monster({ id: "watchman", peaceful: 1 });
    await des.monster({ id: "watchman", peaceful: 1 });
    await des.monster({ id: "watch captain", peaceful: 1 });
    await des.monster("gnome");
    await des.monster("gnome");
    await des.monster("gnome");
    await des.monster("gnome");
    await des.monster("gnome");
    await des.monster("gnome");
    await des.monster("gnome lord");
    await des.monster("gnome lord");
    await des.monster("dwarf");
    await des.monster("dwarf");
    await des.monster("dwarf");

    // The shops
    await des.region({ region: [25,17, 28,19], lit: 1, type: "candle shop", filled: 1 });
    des.door("closed",24,18);
    await des.region({ region: [59, 9, 67,10], lit: 1, type: "shop", filled: 1 });
    des.door("closed",66,8);
    await des.region({ region: [57,13, 60,15], lit: 1, type: "tool shop", filled: 1 });
    des.door("closed",56,14);
    await des.region({ region: [5,9, 8,10], lit: 1, type: monkfoodshop(), filled: 1 });
    des.door("closed",7,11);
    // Gnome homes
    des.door("closed",4,14);
    des.door("locked",1,17);
    await des.monster("gnomish wizard", 2, 19);
    des.door("locked",20,16);
    await des.monster("G", 20, 18);
    des.door("random",21,14);
    des.door("random",25,14);
    des.door("random",42,8);
    des.door("locked",40,5);
    await des.monster("G", 38, 7);
    des.door("random",59,3);
    des.door("random",58,6);
    des.door("random",63,3);
    des.door("random",63,5);
    des.door("locked",71,3);
    des.door("locked",71,6);
    des.door("closed",69,4);
    des.door("closed",67,16);
    await des.monster("gnomish wizard", 67, 14);
    await des.object("=", 70, 14);
    des.door("locked",69,18);
    await des.monster("gnome lord", 71, 19);
    des.door("locked",73,18);
    await des.object("chest", 73, 19);
    des.door("locked",50,6);
    await des.object("(", 50, 3);
    await des.object({ id: "statue", x: 38, y: 15, montype: "gnome king", historic: 1 });
    // Temple
    await des.region({ region: [29,2, 33,4], lit: 1, type: "temple", filled: 1 });
    des.door("closed",31,5);
    des.altar({ x: 31,y: 3, align: align[0], type: "shrine" });


    return await des.finalize_level();
}
