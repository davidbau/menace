/**
 * orcus - NetHack special level
 * Converted from: orcus.lua
 */

import * as des from '../sp_lev.js';
import { selection } from '../sp_lev.js';
import { rn2 } from '../rng.js';
import { hell_tweaks } from './hellfill.js';

export async function generate() {
    // NetHack gehennom orcus.lua	$NHDT-Date: 1652196033 2022/5/10 15:20:33 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.3 $
    // Copyright (c) 1989 by Jean-Christophe Collet
    // Copyright (c) 1992 by M. Stephenson && Izchak Miller
    // NetHack may be freely redistributed.  See license for details.
    // 
    des.level_init({ style: "mazegrid", bg: "-" });

    des.level_flags("mazelevel", "shortsighted");

    let tmpbounds = selection.match("-");
    let bnds = tmpbounds.bounds();
    let bounds2 = selection.fillrect(bnds.lx, bnds.ly + 1, bnds.hx - 2, bnds.hy - 1);

    // A ghost town
    let orcus1 = await des.map({ halign: "right", valign: "center", map: `\
.|....|....|....|..............|....|........
.|....|....|....|..............|....|........
.|....|....|....|--...-+-------|.............
.|....|....|....|..............+.............
.|.........|....|..............|....|........
.--+-...-+----+--....-------...--------.-+---
.....................|.....|.................
.....................|.....|.................
.--+----....-+---....|.....|...----------+---
.|....|....|....|....---+---...|......|......
.|.........|....|..............|......|......
.----...---------.....-----....+......|......
.|........................|....|......|......
.----------+-...--+--|....|....----------+---
.|....|..............|....+....|.............
.|....+.......|......|....|....|.............
.|....|.......|......|....|....|.............
`, contents: async function(rm) {
       await des.mazewalk(0,6,"west");
       // Entire main area
       await des.region(selection.area(1,0,44,16),"unlit");
       await des.stair("down", 33,15);
       // Wall "ruins"
       await des.object("boulder",19,2);
       await des.object("boulder",20,2);
       await des.object("boulder",21,2);
       await des.object("boulder",36,2);
       await des.object("boulder",36,3);
       await des.object("boulder",6,4);
       await des.object("boulder",5,5);
       await des.object("boulder",6,5);
       await des.object("boulder",7,5);
       await des.object("boulder",39,5);
       await des.object("boulder",8,8);
       await des.object("boulder",9,8);
       await des.object("boulder",10,8);
       await des.object("boulder",11,8);
       await des.object("boulder",6,10);
       await des.object("boulder",5,11);
       await des.object("boulder",6,11);
       await des.object("boulder",7,11);
       await des.object("boulder",21,11);
       await des.object("boulder",21,12);
       await des.object("boulder",13,13);
       await des.object("boulder",14,13);
       await des.object("boulder",15,13);
       await des.object("boulder",14,14);
       // Doors
       await des.door("closed",23,2);
       await des.door("open",31,3);
       await des.door("nodoor",3,5);
       await des.door("closed",9,5);
       await des.door("closed",14,5);
       await des.door("closed",41,5);
       await des.door("open",3,8);
       await des.door("nodoor",13,8);
       await des.door("open",41,8);
       await des.door("closed",24,9);
       await des.door("closed",31,11);
       await des.door("open",11,13);
       await des.door("closed",18,13);
       await des.door("closed",41,13);
       await des.door("open",26,14);
       await des.door("closed",6,15);
       // Special rooms
       await des.altar({ x: 24,y: 7,align: "noalign",type: "sanctum" });
       await des.region({ region: [22,12,25,16],lit: 0,type: "morgue",filled: 1 });
       await des.region({ region: [32,9,37,12],lit: 1,type: "shop",filled: 1 });
       await des.region({ region: [12,0,15,4],lit: 1,type: "shop",filled: 1 });
       // Some traps.
       await des.trap("spiked pit");
       await des.trap("sleep gas");
       await des.trap("anti magic");
       await des.trap("fire");
       await des.trap("fire");
       await des.trap("fire");
       await des.trap("magic");
       await des.trap("magic");
       // Some random objects
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
       // An object that's worth most of a wish
       // (this is part of the compensation for the reduced wishes at the Castle)
       if ((rn2((1) - (0) + 1) + (0)) == 1) {
          await des.object("magic marker");
       } else {
          await des.object("magic lamp");
       }
       // The resident nasty
       await des.monster("Orcus",33,15);
       // And its preferred companions
       await des.monster("human zombie",32,15);
       await des.monster("shade",32,14);
       await des.monster("shade",32,16);
       await des.monster("vampire",35,16);
       await des.monster("vampire",35,14);
       await des.monster("vampire lord",36,14);
       await des.monster("vampire lord",36,15);
       // Randomly placed companions
       await des.monster("skeleton");
       await des.monster("skeleton");
       await des.monster("skeleton");
       await des.monster("skeleton");
       await des.monster("skeleton");
       await des.monster("shade");
       await des.monster("shade");
       await des.monster("shade");
       await des.monster("shade");
       await des.monster("giant zombie");
       await des.monster("giant zombie");
       await des.monster("giant zombie");
       await des.monster("ettin zombie");
       await des.monster("ettin zombie");
       await des.monster("ettin zombie");
       await des.monster("human zombie");
       await des.monster("human zombie");
       await des.monster("human zombie");
       await des.monster("vampire");
       await des.monster("vampire");
       await des.monster("vampire");
       await des.monster("vampire lord");
       await des.monster("vampire lord");
       // A few more for the party
       await des.monster();
       await des.monster();
       await des.monster();
       await des.monster();
       await des.monster();
    } });

    await des.levregion({ region: [1,0,12,20], region_islev: 1, exclude: [20,1,70,20], exclude_islev: 1, type: "stair-up" });
    await des.levregion({ region: [1,0,12,20], region_islev: 1, exclude: [20,1,70,20], exclude_islev: 1, type: "branch" });
    await des.teleport_region({ region: [1,0,12,20], region_islev: 1, exclude: [20,1,70,20], exclude_islev: 1 });

    let protected_region = bounds2.negate().union(orcus1);
    hell_tweaks(protected_region);
    return await des.finalize_level();
}
