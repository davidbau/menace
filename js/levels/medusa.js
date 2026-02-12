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

export function generate() {
    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport');

    des.map(`\
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
    des.region(selection.area(0, 0, 74, 19), 'lit');
    des.region(selection.area(31, 7, 45, 7), 'unlit');

    // Make the downstairs room a real room to control arriving monsters,
    // and also as a fixup_special hack; the first room defined on Medusa's level
    // receives some statues
    des.region({ region: [35, 9, 41, 10], lit: false, type: 'ordinary', arrival_room: true });

    des.region(selection.area(31, 12, 45, 12), 'unlit');

    // Teleport: down to up stairs island, up to Medusa's island
    des.teleport_region({ region: [1, 1, 5, 17], dir: 'down' });
    des.teleport_region({ region: [26, 4, 50, 15], dir: 'up' });

    // Stairs
    des.stair('up', 5, 14);
    des.stair('down', 36, 10);

    // Doors
    des.door('closed', 46, 7);
    des.door('locked', 38, 8);
    des.door('locked', 38, 11);
    des.door('closed', 30, 12);

    // Branch, not allowed inside Medusa's building
    des.levregion({ region: [1, 0, 79, 20], exclude: [30, 6, 46, 13], type: 'branch' });

    // Non diggable walls
    des.non_diggable(selection.area(30, 6, 46, 13));

    // Objects
    // Perseus statue with potential artifacts - simplified, ignoring contents function
    des.object({ id: 'statue', x: 36, y: 10, buc: 'uncursed', montype: 'knight',
                 historic: 1, male: 1, name: 'Perseus' });

    // Additional empty statues
    for (let i = 0; i < 7; i++) {
        des.object({ id: 'statue' });
    }

    // Random objects
    for (let i = 0; i < 8; i++) {
        des.object();
    }

    // Random traps
    for (let i = 0; i < 5; i++) {
        des.trap();
    }
    des.trap('board', 38, 7);
    des.trap('board', 38, 12);

    // Random monsters
    des.monster({ id: 'Medusa', x: 36, y: 10, asleep: 1 });
    des.monster('giant eel', 11, 6);
    des.monster('giant eel', 23, 13);
    des.monster('giant eel', 29, 2);
    des.monster('jellyfish', 2, 2);
    des.monster('jellyfish', 0, 8);
    des.monster('jellyfish', 4, 18);
    des.monster('water troll', 51, 3);
    des.monster('water troll', 64, 11);
    des.monster({ class: 'S', x: 38, y: 7 });
    des.monster({ class: 'S', x: 38, y: 12 });

    // Random monsters
    for (let i = 0; i < 10; i++) {
        des.monster();
    }

    return des.finalize_level();
}
