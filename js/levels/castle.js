/**
 * castle - NetHack special level
 * Converted from: castle.lua
 */

import * as des from '../sp_lev.js';
import { selection, shuffle } from '../sp_lev.js';

export async function generate() {
    // NetHack castle castle.lua	$NHDT-Date: 1652196024 2022/5/10 15:20:24 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.7 $
    // Copyright (c) 1989 by Jean-Christophe Collet
    // NetHack may be freely redistributed.  See license for details.
    // 
    // 
    // This is the stronghold level :
    // there are several ways to enter it :
    // - opening the drawbridge (wand of opening, knock spell, playing
    // the appropriate tune)
    // 
    // - enter via the back entry (this suppose a ring of levitation, boots
    // of water walking, etc.)
    // 
    // Note : If you don't play the right tune, you get indications like in the
    // MasterMind game...args
    // 
    // To motivate the player : there are 4 storerooms (armors, weapons, food &&
    // gems) && a wand of wishing in one of the 4 towers...args

    des.level_init({ style: "mazegrid", bg: "-" });

    des.level_flags("mazelevel", "noteleport", "noflipy");

    await des.map(`\
}}}}}}}}}.............................................}}}}}}}}}
}-------}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}-------}
}|.....|-----------------------------------------------|.....|}
}|.....+...............................................+.....|}
}-------------------------------+-----------------------------}
}}}}}}|........|..........+...........|.......S.S.......|}}}}}}
.....}|........|..........|...........|.......|.|.......|}.....
.....}|........------------...........---------S---------}.....
.....}|...{....+..........+.........\\.S.................+......
.....}|........------------...........---------S---------}.....
.....}|........|..........|...........|.......|.|.......|}.....
}}}}}}|........|..........+...........|.......S.S.......|}}}}}}
}-------------------------------+-----------------------------}
}|.....+...............................................+.....|}
}|.....|-----------------------------------------------|.....|}
}-------}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}-------}
}}}}}}}}}.............................................}}}}}}}}}
`);

    // Random registers initialisation
    let object = [ "[", ")", "*", "%" ];
    shuffle(object)

    let place = selection.new();
    place.set(4,2);
    place.set(58,2);
    place.set(4,14);
    place.set(58,14);

    let monster = [ "L", "N", "E", "H", "M", "O", "R", "T", "X", "Z" ]
    shuffle(monster)

    await des.teleport_region({ region: [1,0,10,20], region_islev: 1, exclude: [1,1,61,15], dir: "down" });
    await des.teleport_region({ region: [69,0,79,20], region_islev: 1, exclude: [1,1,61,15], dir: "up" });
    await des.levregion({ region: [1,0,10,20], region_islev: 1, exclude: [0,0,62,16], type: "stair-up" });
    await des.feature("fountain", 10,8);
    // Doors
    await des.door("closed",7,3);
    await des.door("closed",55,3);
    await des.door("locked",32,4);
    await des.door("locked",26,5);
    await des.door("locked",46,5);
    await des.door("locked",48,5);
    await des.door("locked",47,7);
    await des.door("closed",15,8);
    await des.door("closed",26,8);
    await des.door("locked",38,8);
    await des.door("locked",56,8);
    await des.door("locked",47,9);
    await des.door("locked",26,11);
    await des.door("locked",46,11);
    await des.door("locked",48,11);
    await des.door("locked",32,12);
    await des.door("closed",7,13);
    await des.door("closed",55,13);
    // The drawbridge
    await des.drawbridge({ dir: "east", state: "closed", x: 5,y: 8});
    // Storeroom number 1
    await des.object(object[0],39,5);
    await des.object(object[0],40,5);
    await des.object(object[0],41,5);
    await des.object(object[0],42,5);
    await des.object(object[0],43,5);
    await des.object(object[0],44,5);
    await des.object(object[0],45,5);
    await des.object(object[0],39,6);
    await des.object(object[0],40,6);
    await des.object(object[0],41,6);
    await des.object(object[0],42,6);
    await des.object(object[0],43,6);
    await des.object(object[0],44,6);
    await des.object(object[0],45,6);
    // Storeroom number 2
    await des.object(object[1],49,5);
    await des.object(object[1],50,5);
    await des.object(object[1],51,5);
    await des.object(object[1],52,5);
    await des.object(object[1],53,5);
    await des.object(object[1],54,5);
    await des.object(object[1],55,5);
    await des.object(object[1],49,6);
    await des.object(object[1],50,6);
    await des.object(object[1],51,6);
    await des.object(object[1],52,6);
    await des.object(object[1],53,6);
    await des.object(object[1],54,6);
    await des.object(object[1],55,6);
    // Storeroom number 3
    await des.object(object[2],39,10);
    await des.object(object[2],40,10);
    await des.object(object[2],41,10);
    await des.object(object[2],42,10);
    await des.object(object[2],43,10);
    await des.object(object[2],44,10);
    await des.object(object[2],45,10);
    await des.object(object[2],39,11);
    await des.object(object[2],40,11);
    await des.object(object[2],41,11);
    await des.object(object[2],42,11);
    await des.object(object[2],43,11);
    await des.object(object[2],44,11);
    await des.object(object[2],45,11);
    // Storeroom number 4
    await des.object(object[3],49,10);
    await des.object(object[3],50,10);
    await des.object(object[3],51,10);
    await des.object(object[3],52,10);
    await des.object(object[3],53,10);
    await des.object(object[3],54,10);
    await des.object(object[3],55,10);
    await des.object(object[3],49,11);
    await des.object(object[3],50,11);
    await des.object(object[3],51,11);
    await des.object(object[3],52,11);
    await des.object(object[3],53,11);
    await des.object(object[3],54,11);
    await des.object(object[3],55,11);
    // THE WAND OF WISHING in 1 of the 4 towers
    let loc = place.rndcoord(1);
    await des.object({ id: "chest", trapped: 0, locked: 1, coord: loc ,
                 contents: async function() {
                    await des.object("wishing");
                    await des.object("potion of gain level");
                 }
    });
    // Prevent monsters from eating it.  (@'s never eat objects)
    await des.engraving({ coord: loc, type: "burn", text: "Elbereth" });
    await des.object({ id: "scroll of scare monster", coord: loc, buc: "cursed" });
    // The treasure of the lord
    await des.object("chest",37,8);
    // Traps
    await des.trap("trap door",40,8);
    await des.trap("trap door",44,8);
    await des.trap("trap door",48,8);
    await des.trap("trap door",52,8);
    await des.trap("trap door",55,8);
    // Soldiers guarding the entry hall
    await des.monster("soldier",8,6);
    await des.monster("soldier",9,5);
    await des.monster("soldier",11,5);
    await des.monster("soldier",12,6);
    await des.monster("soldier",8,10);
    await des.monster("soldier",9,11);
    await des.monster("soldier",11,11);
    await des.monster("soldier",12,10);
    await des.monster("lieutenant",9,8);
    // Soldiers guarding the towers
    await des.monster("soldier",3,2);
    await des.monster("soldier",5,2);
    await des.monster("soldier",57,2);
    await des.monster("soldier",59,2);
    await des.monster("soldier",3,14);
    await des.monster("soldier",5,14);
    await des.monster("soldier",57,14);
    await des.monster("soldier",59,14);
    // The four dragons that are guarding the storerooms
    await des.monster("D",47,5);
    await des.monster("D",47,6);
    await des.monster("D",47,10);
    await des.monster("D",47,11);
    // Sea monsters in the moat
    await des.monster("giant eel",5,7);
    await des.monster("giant eel",5,9);
    await des.monster("giant eel",57,7);
    await des.monster("giant eel",57,9);
    await des.monster("shark",5,0);
    await des.monster("shark",5,16);
    await des.monster("shark",57,0);
    await des.monster("shark",57,16);
    // The throne room && the court monsters
    await des.monster(monster[9],27,5);
    await des.monster(monster[0],30,5);
    await des.monster(monster[1],33,5);
    await des.monster(monster[2],36,5);
    await des.monster(monster[3],28,6);
    await des.monster(monster[4],31,6);
    await des.monster(monster[5],34,6);
    await des.monster(monster[6],37,6);
    await des.monster(monster[7],27,7);
    await des.monster(monster[8],30,7);
    await des.monster(monster[9],33,7);
    await des.monster(monster[0],36,7);
    await des.monster(monster[1],28,8);
    await des.monster(monster[2],31,8);
    await des.monster(monster[3],34,8);
    await des.monster(monster[4],27,9);
    await des.monster(monster[5],30,9);
    await des.monster(monster[6],33,9);
    await des.monster(monster[7],36,9);
    await des.monster(monster[8],28,10);
    await des.monster(monster[9],31,10);
    await des.monster(monster[0],34,10);
    await des.monster(monster[1],37,10);
    await des.monster(monster[2],27,11);
    await des.monster(monster[3],30,11);
    await des.monster(monster[4],33,11);
    await des.monster(monster[5],36,11);
    // MazeWalks
    await des.mazewalk(0,10,"west");
    await des.mazewalk(62,6,"east");
    // Non diggable walls
    await des.non_diggable(selection.area(0,0,62,16));
    // Subrooms:
    // Entire castle area
    await des.region(selection.area(0,0,62,16),"unlit");
    // Courtyards
    await des.region(selection.area(0,5,5,11),"lit");
    await des.region(selection.area(57,5,62,11),"lit");
    // Throne room
    await des.region({ region: [27,5, 37,11],lit: 1,type: "throne", filled: 2 });
    // Antechamber
    await des.region(selection.area(7,5,14,11),"lit");
    // Storerooms
    await des.region(selection.area(39,5,45,6),"lit");
    await des.region(selection.area(39,10,45,11),"lit");
    await des.region(selection.area(49,5,55,6),"lit");
    await des.region(selection.area(49,10,55,11),"lit");
    // Corners
    await des.region(selection.area(2,2,6,3),"lit");
    await des.region(selection.area(56,2,60,3),"lit");
    await des.region(selection.area(2,13,6,14),"lit");
    await des.region(selection.area(56,13,60,14),"lit");
    // Barracks
    await des.region({ region: [16,5, 25,6],lit: 1,type: "barracks", filled: 1 });
    await des.region({ region: [16,10, 25,11],lit: 1,type: "barracks", filled: 1 });
    // Hallways
    await des.region(selection.area(8,3,54,3),"unlit");
    await des.region(selection.area(8,13,54,13),"unlit");
    await des.region(selection.area(16,8,25,8),"unlit");
    await des.region(selection.area(39,8,55,8),"unlit");
    // Storeroom alcoves
    await des.region(selection.area(47,5,47,6),"unlit");
    await des.region(selection.area(47,10,47,11),"unlit");


    return await des.finalize_level();
}
