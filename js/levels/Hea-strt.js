/**
 * Hea-strt - NetHack special level
 * Converted from: Hea-strt.lua
 */

import * as des from '../sp_lev.js';
import { selection } from '../sp_lev.js';

export async function generate() {
    // NetHack Healer Hea-strt.lua	$NHDT-Date: 1652196004 2022/5/10 15:20:4 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.2 $
    // Copyright (c) 1989 by Jean-Christophe Collet
    // Copyright (c) 1991, 1993 by M. Stephenson, P. Winner
    // NetHack may be freely redistributed.  See license for details.
    // 
    // 
    // The "start" level for the quest.
    // 
    // Here you meet your (besieged) class leader, Hippocrates
    // && receive your quest assignment.
    // 
    des.level_init({ style: "solidfill", fg: " " });

    des.level_flags("mazelevel", "noteleport", "hardfloor");

    await des.map(`\
PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP
PPPP........PPPP.....PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP.P..PPPPP......PPPPPPPP
PPP..........PPPP...PPPPP.........................PPPP..PPPPP........PPPPPPP
PP............PPPPPPPP..............................PPP...PPPP......PPPPPPPP
P.....PPPPPPPPPPPPPPP................................PPPPPPPPPPPPPPPPPPPPPPP
PPPP....PPPPPPPPPPPP...................................PPPPP.PPPPPPPPPPPPPPP
PPPP........PPPPP.........-----------------------........PP...PPPPPPP.....PP
PPP............PPPPP....--|.|......S..........S.|--.....PPPP.PPPPPPP.......P
PPPP..........PPPPP.....|.S.|......-----------|S|.|......PPPPPP.PPP.......PP
PPPPPP......PPPPPP......|.|.|......|...|......|.|.|.....PPPPPP...PP.......PP
PPPPPPPPPPPPPPPPPPP.....+.|.|......S.\\.S......|.|.+......PPPPPP.PPPP.......P
PPP...PPPPP...PPPP......|.|.|......|...|......|.|.|.......PPPPPPPPPPP.....PP
PP.....PPP.....PPP......|.|S|-----------......|.S.|......PPPPPPPPPPPPPPPPPPP
PPP..PPPPP...PPPP.......--|.S..........S......|.|--.....PPPPPPPPP....PPPPPPP
PPPPPPPPPPPPPPPP..........-----------------------..........PPPPP..........PP
PPPPPPPPPPPPPPPPP........................................PPPPPP............P
PPP.............PPPP...................................PPP..PPPP..........PP
PP...............PPPPP................................PPPP...PPPP........PPP
PPP.............PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP....PPPPPP
PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP
`);

    await des.replace_terrain({ region: [1,1, 74,18], fromterrain: "P", toterrain: ".", chance: 10 });

    // Dungeon Description
    await des.region(selection.area(0,0,75,19), "lit");
    // Stairs
    await des.stair("down", 37,9);
    // Portal arrival point
    await des.levregion({ region: [4,12,4,12], type: "branch" });
    // altar for the Temple
    await des.altar({ x: 32,y: 9,align: "neutral",type: "altar" });
    // Doors
    await des.door("locked",24,10);
    await des.door("closed",26,8);
    await des.door("closed",27,12);
    await des.door("locked",28,13);
    await des.door("closed",35,7);
    await des.door("locked",35,10);
    await des.door("locked",39,10);
    await des.door("closed",39,13);
    await des.door("locked",46,7);
    await des.door("closed",47,8);
    await des.door("closed",48,12);
    await des.door("locked",50,10);
    // Hippocrates
    await des.monster({ id: "Hippocrates", coord: [37, 10], inventory: async function() {
       await des.object({ id: "silver dagger", spe: 5 });
    } })
    // The treasure of Hippocrates
    await des.object("chest", 37, 10);
    // intern guards for the audience chamber
    await des.monster("attendant", 29, 8);
    await des.monster("attendant", 29, 9);
    await des.monster("attendant", 29, 10);
    await des.monster("attendant", 29, 11);
    await des.monster("attendant", 40, 9);
    await des.monster("attendant", 40, 10);
    await des.monster("attendant", 40, 11);
    await des.monster("attendant", 40, 13);
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
    await des.monster("rabid rat");
    await des.monster("rabid rat");
    await des.monster("rabid rat");
    await des.monster("rabid rat");
    await des.monster("rabid rat");
    await des.monster("rabid rat");
    await des.monster("rabid rat");
    await des.monster("rabid rat");
    await des.monster("rabid rat");
    await des.monster("rabid rat");
    await des.monster("giant eel");
    await des.monster("shark");
    await des.monster(";");
    await des.monster({ class: "D", peaceful: 0 });
    await des.monster({ class: "D", peaceful: 0 });
    await des.monster({ class: "D", peaceful: 0 });
    await des.monster({ class: "D", peaceful: 0 });
    await des.monster({ class: "D", peaceful: 0 });
    await des.monster({ class: "S", peaceful: 0 });
    await des.monster({ class: "S", peaceful: 0 });
    await des.monster({ class: "S", peaceful: 0 });
    await des.monster({ class: "S", peaceful: 0 });
    await des.monster({ class: "S", peaceful: 0 });


    return await des.finalize_level();
}
