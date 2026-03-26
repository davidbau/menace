/**
 * valley - NetHack special level
 * Converted from: valley.lua
 */

import * as des from '../sp_lev.js';
import { selection, percent } from '../sp_lev.js';

export async function generate() {
    // NetHack gehennom valley.lua	$NHDT-Date: 1652196038 2022/5/10 15:20:38 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.4 $
    // Copyright (c) 1989 by Jean-Christophe Collet
    // Copyright (c) 1992 by M. Stephenson && Izchak Miller
    // NetHack may be freely redistributed.  See license for details.
    // 
    // 

    des.level_init({ style: "solidfill", fg: " " });

    des.level_flags("mazelevel", "noteleport", "hardfloor", "nommap", "temperate");

    await des.map(`\
----------------------------------------------------------------------------
|...S.|..|.....|  |.....-|      |................|   |...............| |...|
|---|.|.--.---.|  |......--- ----..........-----.-----....---........---.-.|
|   |.|.|..| |.| --........| |.............|   |.......---| |-...........--|
|   |...S..| |.| |.......-----.......------|   |--------..---......------- |
|----------- |.| |-......| |....|...-- |...-----................----       |
|.....S....---.| |.......| |....|...|  |..............-----------          |
|.....|.|......| |.....--- |......---  |....---.......|                    |
|.....|.|------| |....--   --....-- |-------- ----....---------------      |
|.....|--......---BBB-|     |...--  |.......|    |..................|      |
|..........||........-|    --...|   |.......|    |...||.............|      |
|.....|...-||-........------....|   |.......---- |...||.............--     |
|.....|--......---...........--------..........| |.......---------...--    |
|.....| |------| |--.......--|   |..B......----- -----....| |.|  |....---  |
|.....| |......--| ------..| |----..B......|       |.--------.-- |-.....---|
|------ |........|  |.|....| |.....----BBBB---------...........---.........|
|       |........|  |...|..| |.....|  |-.............--------...........---|
|       --.....-----------.| |....-----.....----------     |.........----  |
|        |..|..B...........| |.|..........|.|              |.|........|    |
----------------------------------------------------------------------------
`);

    // Make the path somewhat unpredictable
    // If you get "lucky", you may have to go through all three graveyards.
    if (percent(50)) {
       await des.terrain(selection.line(50,8, 53,8), '-');
       await des.terrain(selection.line(40,8, 43,8), 'B');
    }
    if (percent(50)) {
       await des.terrain({ x: 27, y: 12, typ: '|' });
       await des.terrain(selection.line(27,3, 29,3), 'B');
       await des.terrain({ x: 28, y: 2, typ: '-' });
    }
    if (percent(50)) {
       await des.terrain(selection.line(16,10, 16,11), '|');
       await des.terrain(selection.line(9,13, 14,13), 'B');
    }


    // Dungeon Description
    // The shrine to Moloch.
    await des.region({ region: [1,6, 5,14],lit: 1,type: "temple",filled: 2 });
    // The Morgues
    await des.region({ region: [19,1, 24,8],lit: 0,type: "morgue",filled: 1,irregular: 1 });
    await des.region({ region: [9,14, 16,18],lit: 0,type: "morgue",filled: 1,irregular: 1 });
    await des.region({ region: [37,9, 43,14],lit: 0,type: "morgue",filled: 1,irregular: 1 });
    // Stairs
    await des.stair("down", 1,1);
    // Branch location
    await des.levregion({ type: "branch", region: [66,17,66,17] });
    await des.teleport_region({ region: [58,9,72,18], dir: "down" });

    // Secret Doors
    await des.door("locked",4,1);
    await des.door("locked",8,4);
    await des.door("locked",6,6);

    // The altar of Moloch.
    await des.altar({ x: 3,y: 10,align: "noalign", type: "shrine" });

    // Non diggable walls - everywhere!
    await des.non_diggable(selection.area(0,0,75,19));

    // Objects
    // **LOTS** of dead bodies (all human).
    // note: no priest(esse)s || monks - maybe Moloch has a *special*
    // fate reserved for members of *those* classes.
    // 
    await des.object({ id: "corpse",montype: "archeologist" });
    await des.object({ id: "corpse",montype: "archeologist" });
    await des.object({ id: "corpse",montype: "barbarian" });
    await des.object({ id: "corpse",montype: "barbarian" });
    await des.object({ id: "corpse",montype: "caveman" });
    await des.object({ id: "corpse",montype: "cavewoman" });
    await des.object({ id: "corpse",montype: "healer" });
    await des.object({ id: "corpse",montype: "healer" });
    await des.object({ id: "corpse",montype: "knight" });
    await des.object({ id: "corpse",montype: "knight" });
    await des.object({ id: "corpse",montype: "ranger" });
    await des.object({ id: "corpse",montype: "ranger" });
    await des.object({ id: "corpse",montype: "rogue" });
    await des.object({ id: "corpse",montype: "rogue" });
    await des.object({ id: "corpse",montype: "samurai" });
    await des.object({ id: "corpse",montype: "samurai" });
    await des.object({ id: "corpse",montype: "tourist" });
    await des.object({ id: "corpse",montype: "tourist" });
    await des.object({ id: "corpse",montype: "valkyrie" });
    await des.object({ id: "corpse",montype: "valkyrie" });
    await des.object({ id: "corpse",montype: "wizard" });
    await des.object({ id: "corpse",montype: "wizard" });
    // 
    // Some random weapons && armor.
    // 
    await des.object("[");
    await des.object("[");
    await des.object("[");
    await des.object("[");
    await des.object(")");
    await des.object(")");
    await des.object(")");
    await des.object(")");
    // 
    // Some random loot.
    // 
    await des.object("ruby");
    await des.object("*");
    await des.object("*");
    await des.object("!");
    await des.object("!");
    await des.object("!");
    await des.object("?");
    await des.object("?");
    await des.object("?");
    await des.object("/");
    await des.object("/");
    await des.object("=");
    await des.object("=");
    await des.object("+");
    await des.object("+");
    await des.object("(");
    await des.object("(");
    await des.object("(");

    // (Not so) Random traps.
    await des.trap("spiked pit", 5,2);
    await des.trap("spiked pit", 14,5);
    await des.trap("sleep gas", 3,1);
    await des.trap("board", 21,12);
    await des.trap("board");
    await des.trap("dart", 60,1);
    await des.trap("dart", 26,17);
    await des.trap("anti magic");
    await des.trap("anti magic");
    await des.trap("magic");
    await des.trap("magic");

    // Random monsters.
    // The ghosts.
    await des.monster("ghost");
    await des.monster("ghost");
    await des.monster("ghost");
    await des.monster("ghost");
    await des.monster("ghost");
    await des.monster("ghost");
    // Add a few bats for atmosphere.
    await des.monster("vampire bat");
    await des.monster("vampire bat");
    await des.monster("vampire bat");
    // And a lich for good measure.
    await des.monster("L");
    // Some undead nasties for good measure
    await des.monster("V");
    await des.monster("V");
    await des.monster("V");
    await des.monster("Z");
    await des.monster("Z");
    await des.monster("Z");
    await des.monster("Z");
    await des.monster("M");
    await des.monster("M");
    await des.monster("M");
    await des.monster("M");


    return await des.finalize_level();
}
