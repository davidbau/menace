/**
 * Sam-strt - NetHack special level
 * Converted from: Sam-strt.lua
 */

import * as des from '../sp_lev.js';
import { selection } from '../sp_lev.js';

export async function generate() {
    // NetHack Samurai Sam-strt.lua	$NHDT-Date: 1695932714 2023/9/28 20:25:14 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.4 $
    // Copyright (c) 1989 by Jean-Christophe Collet
    // Copyright (c) 1991-92 by M. Stephenson, P. Winner
    // NetHack may be freely redistributed.  See license for details.
    // 
    // 
    // The "start" level for the quest.
    // 
    // Here you meet your (besieged) class leader, Lord Sato
    // && receive your quest assignment.
    // 
    // The throne room designation produces random atmospheric
    // messages (until the room is entered) but this one doesn't
    // actually contain any throne.
    // 
    des.level_init({ style: "solidfill", fg: " " });

    des.level_flags("mazelevel", "noteleport", "hardfloor");

    await des.map(`\
..............................................................PP............
...............................................................PP...........
..........---------------------------------------------------...PPP.........
..........|......|.........|...|..............|...|.........|....PPPPP......
......... |......|.........S...|..............|...S.........|.....PPPP......
..........|......|.........|---|..............|---|.........|.....PPP.......
..........+......|.........+...-------++-------...+.........|......PP.......
..........+......|.........|......................|.........|......PP.......
......... |......---------------------++--------------------|........PP.....
..........|.................................................|.........PP....
..........|.................................................|...........PP..
..........----------------------------------------...-------|............PP.
..........................................|.................|.............PP
.............. ................. .........|.................|..............P
............. } ............... } ........|.................|...............
.............. ........PP....... .........|.................|...............
.....................PPP..................|.................|...............
......................PP..................-------------------...............
............................................................................
............................................................................
`);
    // Dungeon Description
    await des.region(selection.area(0,0,75,19), "lit");
    await des.region({ region: [18,3, 26,7], lit: 1, type: "throne", filled: 2 });
    // Portal arrival zone
    await des.levregion({ region: [62,12,70,17], type: "branch" });
    // Stairs
    await des.stair("down", 29,4);
    // Doors
    await des.door("locked",10,6);
    await des.door("locked",10,7);
    await des.door("closed",27,4);
    await des.door("closed",27,6);
    await des.door("closed",38,6);
    await des.door("locked",38,8);
    await des.door("closed",39,6);
    await des.door("locked",39,8);
    await des.door("closed",50,4);
    await des.door("closed",50,6);
    // Lord Sato
    await des.monster({ id: "Lord Sato", coord: [20, 4], inventory: async function() {
       await des.object({ id: "splint mail", spe: 5, eroded: -1, buc: "!-cursed" });
       await des.object({ id: "katana", spe: 4, eroded: -1, buc: "!-cursed" });
    } })
    // The treasure of Lord Sato
    await des.object("chest", 20, 4);
    // roshi guards for the audience chamber
    await des.monster("roshi", 18, 4);
    await des.monster("roshi", 18, 5);
    await des.monster("roshi", 18, 6);
    await des.monster("roshi", 18, 7);
    await des.monster("roshi", 26, 4);
    await des.monster("roshi", 26, 5);
    await des.monster("roshi", 26, 6);
    await des.monster("roshi", 26, 7);
    // Non diggable walls
    await des.non_diggable(selection.area(0,0,75,19));
    // Random traps
    await des.trap();
    await des.trap();
    await des.trap();
    await des.trap();
    await des.trap();
    await des.trap();
    // Monsters on siege duty.
    await des.monster({ id: "ninja", x: 64, y: 0, peaceful: 0 });
    await des.monster("wolf", 65, 1);
    await des.monster({ id: "ninja", x: 67, y: 2, peaceful: 0 });
    await des.monster({ id: "ninja", x: 69, y: 5, peaceful: 0 });
    await des.monster({ id: "ninja", x: 69, y: 6, peaceful: 0 });
    await des.monster("wolf", 69, 7);
    await des.monster({ id: "ninja", x: 70, y: 6, peaceful: 0 });
    await des.monster({ id: "ninja", x: 70, y: 7, peaceful: 0 });
    await des.monster({ id: "ninja", x: 72, y: 1, peaceful: 0 });
    await des.monster("wolf", 75, 9);
    await des.monster({ id: "ninja", x: 73, y: 5, peaceful: 0 });
    await des.monster({ id: "ninja", x: 68, y: 2, peaceful: 0 });
    await des.monster("stalker");


    return await des.finalize_level();
}
