/**
 * Mon-strt - NetHack special level
 * Converted from: Mon-strt.lua
 */

import * as des from '../sp_lev.js';
import { selection } from '../sp_lev.js';

export async function generate() {
    // NetHack Monk Mon-strt.lua	$NHDT-Date: 1652196007 2022/5/10 15:20:7 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.4 $
    // Copyright (c) 1989 by Jean-Christophe Collet
    // Copyright (c) 1991-2 by M. Stephenson
    // NetHack may be freely redistributed.  See license for details.
    // 
    // 
    // The "start" level for the quest.
    // 
    // Here you meet your (besieged) class leader, the Grand Master
    // && receive your quest assignment.
    // 
    des.level_init({ style: "solidfill", fg: " " });

    des.level_flags("mazelevel", "noteleport", "hardfloor");

    await des.map(`\
............................................................................
............................................................................
............................................................................
....................------------------------------------....................
....................|................|.....|.....|.....|....................
....................|..------------..|--+-----+-----+--|....................
....................|..|..........|..|.................|....................
....................|..|..........|..|+---+---+-----+--|....................
..................---..|..........|......|...|...|.....|....................
..................+....|..........+......|...|...|.....|....................
..................+....|..........+......|...|...|.....|....................
..................---..|..........|......|...|...|.....|....................
....................|..|..........|..|+-----+---+---+--|....................
....................|..|..........|..|.................|....................
....................|..------------..|--+-----+-----+--|....................
....................|................|.....|.....|.....|....................
....................------------------------------------....................
............................................................................
............................................................................
............................................................................
`);
    // Dungeon Description
    await des.region(selection.area(0,0,75,19), "lit");
    await des.region({ region: [24,6, 33,13], lit: 1, type: "temple" });

    await des.replace_terrain({ region: [0,0, 10,19], fromterrain: ".", toterrain: "T", chance: 10 });
    await des.replace_terrain({ region: [65,0, 75,19], fromterrain: ".", toterrain: "T", chance: 10 });

    let spacelocs = selection.floodfill(5,4);

    // Portal arrival point
    await des.terrain([5,4], ".");
    await des.levregion({ region: [5,4,5,4], type: "branch" });
    // Stairs
    await des.stair("down", 52,9);
    // Doors
    await des.door("locked",18,9);
    await des.door("locked",18,10);
    await des.door("closed",34,9);
    await des.door("closed",34,10);
    await des.door("closed",40,5);
    await des.door("closed",46,5);
    await des.door("closed",52,5);
    await des.door("locked",38,7);
    await des.door("closed",42,7);
    await des.door("closed",46,7);
    await des.door("closed",52,7);
    await des.door("locked",38,12);
    await des.door("closed",44,12);
    await des.door("closed",48,12);
    await des.door("closed",52,12);
    await des.door("closed",40,14);
    await des.door("closed",46,14);
    await des.door("closed",52,14);
    // Unattended Altar - unaligned due to conflict - player must align it.
    await des.altar({ x: 28,y: 9, align: "noalign", type: "altar" });
    // The Grand Master
    await des.monster({ id: "Grand Master", coord: [28, 10], inventory: async function() {
       await des.object({ id: "robe", spe: 6 });
    } })
    // No treasure chest!
    // guards for the audience chamber
    await des.monster("abbot", 32, 7);
    await des.monster("abbot", 32, 8);
    await des.monster("abbot", 32, 11);
    await des.monster("abbot", 32, 12);
    await des.monster("abbot", 33, 7);
    await des.monster("abbot", 33, 8);
    await des.monster("abbot", 33, 11);
    await des.monster("abbot", 33, 12);
    // Non diggable walls
    await des.non_diggable(selection.area(18,3,55,16));
    // Random traps
    for (let i = 1; i <= 2; i++) {
       await des.trap("dart", spacelocs.rndcoord(1));
    }
    await des.trap();
    await des.trap();
    await des.trap();
    await des.trap();
    // Monsters on siege duty.
    for (let i = 1; i <= 8; i++) {
       await des.monster("earth elemental", spacelocs.rndcoord(1));
    }
    for (let i = 1; i <= 4; i++) {
       await des.monster("xorn", spacelocs.rndcoord(1));
    }
    // next to leader, so possibly tricky to pick up if ! ready for quest yet;
    // there's no protection against a xorn eating these tins; BUC state is random
    await des.object({ id: "tin", coord: [29, 9], quantity: 2, montype: "spinach" });
    // ensure enough vegetarian food generates for vegetarian games
    await des.object({ id: "food ration", coord: [46, 4], quantity: 4});


    return await des.finalize_level();
}
