/**
 * Fungus Grove Level (mushroom forest)
 * Original design for NetHack JavaScript port
 */

import { des, selection, finalize_level } from '../sp_lev.js';

export function generate() {
    des.level_init({ style: 'solidfill', fg: '.' });

    des.level_flags('mazelevel');

    // Underground fungus grove with mushroom formations
    des.map({
        map: `
---------------------------------------------------------------------------
|.........................................................................|\
|....{....{........{..........{.......{........{.........{.......{........|\
|.........................................................................|\
|..{.........{..........{.........{........{.........{........{...........|\
|.........................................................................|\
|......{.........{..........{........{.........{.........{........{.......|\
|.........................................................................|\
|..{.........{..........{.........{........{.........{........{...........|\
|.........................................................................|\
|....{....{........{..........{.......{........{.........{.......{........|\
|.........................................................................|\
|..{.........{..........{.........{........{.........{........{...........|\
|.........................................................................|\
|......{.........{..........{........{.........{.........{........{.......|\
|.........................................................................|\
|..{.........{..........{.........{........{.........{........{...........|\
|.........................................................................|\
---------------------------------------------------------------------------
`
    });

    // Dimly phosphorescent
    des.region(selection.area(1, 1, 73, 16), 'unlit');

    // Stairs
    des.stair('up', 10, 8);
    des.stair('down', 65, 8);

    // Objects
    for (let i = 0; i < 12; i++) {
        des.object();
    }

    // Traps
    for (let i = 0; i < 8; i++) {
        des.trap();
    }

    // Fungal creatures
    des.monster({ id: 'violet fungus' });
    des.monster({ id: 'violet fungus' });
    des.monster({ id: 'violet fungus' });
    des.monster({ id: 'shrieker' });
    des.monster({ id: 'shrieker' });
    des.monster({ id: 'shrieker' });
    des.monster({ id: 'shrieker' });
    des.monster({ id: 'brown mold' });
    des.monster({ id: 'brown mold' });
    des.monster({ id: 'yellow mold' });
    des.monster({ id: 'yellow mold' });
    des.monster({ id: 'green mold' });
    des.monster({ id: 'red mold' });
    des.monster({ id: 'gas spore' });
    des.monster({ id: 'gas spore' });
    des.monster({ id: 'lichen' });
    des.monster({ id: 'lichen' });

    // Fungus dwellers
    des.monster({ id: 'violet fungi' });
    des.monster({ id: 'spotted jelly' });
    des.monster({ id: 'ochre jelly' });
    des.monster({ id: 'gray ooze' });

    // Random monsters
    for (let i = 0; i < 7; i++) {
        des.monster();
    }

    return finalize_level();
}
