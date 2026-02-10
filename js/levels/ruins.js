/**
 * Ancient Ruins Level (crumbling architecture)
 * Original design for NetHack JavaScript port
 */

import { des, selection, finalize_level } from '../sp_lev.js';

export function generate() {
    des.level_init({ style: 'solidfill', fg: '.' });

    des.level_flags('mazelevel');

    // Ruined temple or palace
    des.map({
        map: `
---------------------------------------------------------------------------
|.........................................................................|\
|..|........|........|.........|.......|.........|........|........|.....|\
|.........................................................................|\
|...----.....----......----......---......----......----......----......|\
|.........................................................................|\
|..|........|........|.........|.......|.........|........|........|.....|\
|.........................................................................|\
|...--------..................----------..................--------......|\
|...|......|..................|........|..................|......|......|\
|...|......--------------------........--------------------......|......|\
|...|.................................................  ...........|......|\
|...|......--------------------........--------------------......|......|\
|...|......|..................|........|..................|......|......|\
|...--------..................----------..................--------......|\
|.........................................................................|\
|..|........|........|.........|.......|.........|........|........|.....|\
|.........................................................................|\
---------------------------------------------------------------------------
`
    });

    // Partially lit (some areas dark with rubble)
    des.region(selection.area(1, 1, 73, 16), 'unlit');
    des.region(selection.area(10, 8, 65, 13), 'lit');

    // Stairs in cleared areas
    des.stair('up', 15, 10);
    des.stair('down', 60, 10);

    // Ancient treasures
    for (let i = 0; i < 8; i++) {
        des.object({ class: '*' });
    }
    for (let i = 0; i < 6; i++) {
        des.object({ class: '$' });
    }

    // Ancient artifacts and items
    for (let i = 0; i < 15; i++) {
        des.object();
    }

    // Many traps (ancient defenses)
    for (let i = 0; i < 12; i++) {
        des.trap();
    }

    // Undead guardians
    des.monster({ id: 'mummy' });
    des.monster({ id: 'mummy' });
    des.monster({ id: 'mummy' });
    des.monster({ id: 'giant mummy' });
    des.monster({ id: 'wraith' });
    des.monster({ id: 'wraith' });
    des.monster({ id: 'spectre' });
    des.monster({ id: 'ghost' });
    des.monster({ id: 'shade' });
    des.monster({ id: 'vampire' });
    des.monster({ id: 'vampire lord' });
    des.monster({ id: 'lich' });
    des.monster({ id: 'demilich' });

    // Ancient constructs
    des.monster({ id: 'stone golem' });
    des.monster({ id: 'clay golem' });

    // Random monsters
    for (let i = 0; i < 13; i++) {
        des.monster();
    }

    return finalize_level();
}
