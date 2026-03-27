/**
 * Sam-loca - NetHack special level
 * Converted from: Sam-loca.lua
 */

import * as des from '../sp_lev.js';
import { selection } from '../sp_lev.js';

export async function generate() {
    // NetHack Samurai Sam-loca.lua	$NHDT-Date: 1652196014 2022/5/10 15:20:14 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.1 $
    // Copyright (c) 1989 by Jean-Christophe Collet
    // Copyright (c) 1991-92 by M. Stephenson, P. Winner
    // NetHack may be freely redistributed.  See license for details.
    // 
    des.level_init({ style: "solidfill", fg: " " });

    des.level_flags("mazelevel", "hardfloor");

    await des.map(`\
............................................................................
............................................................................
........-----..................................................-----........
........|...|..................................................|...|........
........|...---..}..--+------------------------------+--..}..---...|........
........|-|...|.....|...|....|....|....|....|....|.|...|.....|...|-|........
..........|...-------...|....|....|....|....|....S.|...-------...|..........
..........|-|.........------+----+-+-------+-+--------.........|-|..........
............|..--------.|}........................}|.--------..|............
............|..+........+..........................+........+..|............
............|..+........+..........................+........+..|............
............|..--------.|}........................}|.--------..|............
..........|-|.........--------+-+-------+-+----+------.........|-|..........
..........|...-------...|.S....|....|....|....|....|...-------...|..........
........|-|...|.....|...|.|....|....|....|....|....|...|.....|...|-|........
........|...---..}..--+------------------------------+--..}..---...|........
........|...|..................................................|...|........
........-----..................................................-----........
............................................................................
............................................................................
`);
    // Dungeon Description
    await des.region(selection.area(0,0,75,19), "lit");
    // Doors
    await des.door("locked",22,4);
    await des.door("locked",22,15);
    await des.door("locked",53,4);
    await des.door("locked",53,15);
    await des.door("locked",49,6);
    await des.door("locked",26,13);
    await des.door("locked",28,7);
    await des.door("locked",30,12);
    await des.door("locked",33,7);
    await des.door("locked",32,12);
    await des.door("locked",35,7);
    await des.door("locked",40,12);
    await des.door("locked",43,7);
    await des.door("locked",42,12);
    await des.door("locked",45,7);
    await des.door("locked",47,12);
    await des.door("closed",15,9);
    await des.door("closed",15,10);
    await des.door("closed",24,9);
    await des.door("closed",24,10);
    await des.door("closed",51,9);
    await des.door("closed",51,10);
    await des.door("closed",60,9);
    await des.door("closed",60,10);
    // Stairs
    await des.stair("up", 10,10);
    await des.stair("down", 25,14);
    // Non diggable walls
    await des.non_diggable(selection.area(0,0,75,19));
    // Objects
    await des.object("*", 25, 5);
    await des.object("*", 26, 5);
    await des.object("*", 27, 5);
    await des.object("*", 28, 5);
    await des.object("*", 25, 6);
    await des.object("*", 26, 6);
    await des.object("*", 27, 6);
    await des.object("*", 28, 6);
    // 
    await des.object("[", 40, 5);
    await des.object("[", 41, 5);
    await des.object("[", 42, 5);
    await des.object("[", 43, 5);
    await des.object("[", 40, 6);
    await des.object("[", 41, 6);
    await des.object("[", 42, 6);
    await des.object("[", 43, 6);
    // 
    await des.object(")", 27, 13);
    await des.object(")", 28, 13);
    await des.object(")", 29, 13);
    await des.object(")", 30, 13);
    await des.object(")", 27, 14);
    await des.object(")", 28, 14);
    await des.object(")", 29, 14);
    await des.object(")", 30, 14);
    // 
    await des.object("(", 37, 13);
    await des.object("(", 38, 13);
    await des.object("(", 39, 13);
    await des.object("(", 40, 13);
    await des.object("(", 37, 14);
    await des.object("(", 38, 14);
    await des.object("(", 39, 14);
    await des.object("(", 40, 14);
    // Random traps
    await des.trap();
    await des.trap();
    await des.trap();
    await des.trap();
    await des.trap();
    await des.trap();
    // Random monsters.
    await des.monster({ id: "ninja", x: 15, y: 5, peaceful: 0 });
    await des.monster({ id: "ninja", x: 16, y: 5, peaceful: 0 });
    await des.monster("wolf", 17, 5);
    await des.monster("wolf", 18, 5);
    await des.monster({ id: "ninja", x: 19, y: 5, peaceful: 0 });
    await des.monster("wolf", 15, 14);
    await des.monster("wolf", 16, 14);
    await des.monster({ id: "ninja", x: 17, y: 14, peaceful: 0 });
    await des.monster({ id: "ninja", x: 18, y: 14, peaceful: 0 });
    await des.monster("wolf", 56, 5);
    await des.monster({ id: "ninja", x: 57, y: 5, peaceful: 0 });
    await des.monster("wolf", 58, 5);
    await des.monster("wolf", 59, 5);
    await des.monster({ id: "ninja", x: 56, y: 14, peaceful: 0 });
    await des.monster("wolf", 57, 14);
    await des.monster({ id: "ninja", x: 58, y: 14, peaceful: 0 });
    await des.monster("d", 59, 14);
    await des.monster("wolf", 60, 14);
    await des.monster("stalker");
    await des.monster("stalker");
    await des.monster("stalker");
    await des.monster("stalker");
    await des.monster("stalker");
    await des.monster("stalker");
    await des.monster("stalker");
    await des.monster("stalker");
    await des.monster("stalker");
    // "guards" for the central courtyard.
    await des.monster({ id: "samurai", x: 30, y: 5, peaceful: 0 });
    await des.monster({ id: "samurai", x: 31, y: 5, peaceful: 0 });
    await des.monster({ id: "samurai", x: 32, y: 5, peaceful: 0 });
    await des.monster({ id: "samurai", x: 32, y: 14, peaceful: 0 });
    await des.monster({ id: "samurai", x: 33, y: 14, peaceful: 0 });
    await des.monster({ id: "samurai", x: 34, y: 14, peaceful: 0 });


    return await des.finalize_level();
}
