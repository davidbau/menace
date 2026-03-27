/**
 * Medusa's Island - The lair of Medusa
 * Ported from nethack-c/dat/medusa-1.lua
 *
 * A maze of water channels surrounding a central island where Medusa guards
 * the downstairs. The Perseus statue contains powerful items, and swimming
 * monsters populate the moat.
 *
 * Features:
 * - Fixed 75×20 map with water moat ('}') and central island
 * - Medusa boss on the island (36, 10)
 * - Perseus statue with potential artifacts (reflection shield, levitation boots, scimitar)
 * - 7+ empty statues scattered around
 * - Water monsters: giant eels, jellyfish, water trolls
 * - Snakes ('S' class) guarding Medusa's building
 * - Central building with locked doors and squeaky board traps
 * - No teleportation allowed
 * - Teleport regions for arrival control
 *
 * @returns {GameMap} The generated Medusa level
 */

import { des, selection } from '../sp_lev.js';

export async function generate() {
    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport');

    await des.map(`\
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
}}.}}}}}..}}}}}......}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}....}}}...}}}}}
}...}}.....}}}}}....}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}...............}
}....}}}}}}}}}}....}}}..}}}}}}}}}}}.......}}}}}}}}}}}}}}}}..}}.....}}}...}}
}....}}}}}}}}.....}}}}..}}}}}}.................}}}}}}}}}}}.}}}}.....}}...}}
}....}}}}}}}}}}}}.}}}}.}}}}}}.-----------------.}}}}}}}}}}}}}}}}}.........}
}....}}}}}}}}}}}}}}}}}}.}}}...|...............S...}}}}}}}}}}}}}}}}}}}....}}
}.....}.}}....}}}}}}}}}.}}....--------+--------....}}}}}}..}}}}}}}}}}}...}}
}......}}}}..}}}}}}}}}}}}}........|.......|........}}}}}....}}}}}}}}}}}}}}}
}.....}}}}}}}}}}}}}}}}}}}}........|.......|........}}}}}...}}}}}}}}}.}}}}}}
}.....}}}}}}}}}}}}}}}}}}}}....--------+--------....}}}}}}.}.}}}}}}}}}}}}}}}
}......}}}}}}}}}}}}}}}}}}}}...S...............|...}}}}}}}}}}}}}}}}}.}}}}}}}
}.......}}}}}}}..}}}}}}}}}}}}.-----------------.}}}}}}}}}}}}}}}}}....}}}}}}
}........}}.}}....}}}}}}}}}}}}.................}}}}}..}}}}}}}}}.......}}}}}
}.......}}}}}}}......}}}}}}}}}}}}}}.......}}}}}}}}}.....}}}}}}...}}..}}}}}}
}.....}}}}}}}}}}}.....}}}}}}}}}}}}}}}}}}}}}}.}}}}}}}..}}}}}}}}}}....}}}}}}}
}}..}}}}}}}}}}}}}....}}}}}}}}}}}}}}}}}}}}}}...}}..}}}}}}}.}}.}}}}..}}}}}}}}
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
`);

    // Dungeon Description
    await des.region(selection.area(0, 0, 74, 19), 'lit');
    await des.region(selection.area(31, 7, 45, 7), 'unlit');

    // Make the downstairs room a real room to control arriving monsters,
    // and also as a fixup_special hack; the first room defined on Medusa's level
    // receives some statues
    await des.region({ region: [35, 9, 41, 10], lit: false, type: 'ordinary', arrival_room: true });

    await des.region(selection.area(31, 12, 45, 12), 'unlit');

    // Teleport: down to up stairs island, up to Medusa's island
    await des.teleport_region({ region: [1, 1, 5, 17], dir: 'down' });
    await des.teleport_region({ region: [26, 4, 50, 15], dir: 'up' });

    // Stairs
    await des.stair('up', 5, 14);
    await des.stair('down', 36, 10);

    // Doors
    await des.door('closed', 46, 7);
    await des.door('locked', 38, 8);
    await des.door('locked', 38, 11);
    await des.door('closed', 30, 12);

    // Branch, not allowed inside Medusa's building
    await des.levregion({ region: [1, 0, 79, 20], exclude: [30, 6, 46, 13], type: 'branch' });

    // Non diggable walls
    await des.non_diggable(selection.area(30, 6, 46, 13));

    // Objects
    // Perseus statue with potential artifacts - simplified, ignoring contents function
    await des.object({ id: 'statue', x: 36, y: 10, buc: 'uncursed', montype: 'knight',
                 historic: 1, male: 1, name: 'Perseus' });

    // Additional empty statues
    for (let i = 0; i < 7; i++) {
        await des.object({ id: 'statue' });
    }

    // Random objects
    for (let i = 0; i < 8; i++) {
        await des.object();
    }

    // Random traps
    for (let i = 0; i < 5; i++) {
        await des.trap();
    }
    await des.trap('board', 38, 7);
    await des.trap('board', 38, 12);

    // Random monsters
    await des.monster({ id: 'Medusa', x: 36, y: 10, asleep: 1 });
    await des.monster('giant eel', 11, 6);
    await des.monster('giant eel', 23, 13);
    await des.monster('giant eel', 29, 2);
    await des.monster('jellyfish', 2, 2);
    await des.monster('jellyfish', 0, 8);
    await des.monster('jellyfish', 4, 18);
    await des.monster('water troll', 51, 3);
    await des.monster('water troll', 64, 11);
    await des.monster({ class: 'S', x: 38, y: 7 });
    await des.monster({ class: 'S', x: 38, y: 12 });

    // Random monsters
    for (let i = 0; i < 10; i++) {
        await des.monster();
    }

    return await des.finalize_level();
}
