/**
 * Dragon Lair Level (draconic den)
 * Original design for NetHack JavaScript port
 */

import { des, selection, finalize_level } from '../sp_lev.js';

export function generate() {
    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel');

    // Large cavern lair
    des.map({
        map: `
---------------------------------------------------------------------------
--.......................................................................--
|.........................................................................|\
|.........................................................................|\
|.........................................................................|\
|.........................................................................|\
|.........................................................................|\
|.........................................................................|\
|.........................................................................|\
|.........................................................................|\
|.........................................................................|\
|.........................................................................|\
|.........................................................................|\
|.........................................................................|\
|.........................................................................|\
|.........................................................................|\
|.........................................................................|\
--.......................................................................--
---------------------------------------------------------------------------
`
    });

    // Dimly lit lair
    des.region(selection.area(1, 1, 73, 17), 'unlit');

    // Stairs
    des.stair('up', 10, 9);
    des.stair('down', 65, 9);

    // Dragon hoard (lots of treasure!)
    for (let i = 0; i < 30; i++) {
        des.object({ class: '*' }); // Gems
    }
    for (let i = 0; i < 20; i++) {
        des.object({ class: '$' }); // Gold
    }
    for (let i = 0; i < 15; i++) {
        des.object();
    }

    // Traps
    for (let i = 0; i < 10; i++) {
        des.trap();
    }

    // Dragons of all colors
    des.monster({ id: 'red dragon' });
    des.monster({ id: 'red dragon' });
    des.monster({ id: 'blue dragon' });
    des.monster({ id: 'blue dragon' });
    des.monster({ id: 'green dragon' });
    des.monster({ id: 'green dragon' });
    des.monster({ id: 'white dragon' });
    des.monster({ id: 'white dragon' });
    des.monster({ id: 'black dragon' });
    des.monster({ id: 'black dragon' });
    des.monster({ id: 'silver dragon' });
    des.monster({ id: 'orange dragon' });
    des.monster({ id: 'yellow dragon' });
    des.monster({ id: 'baby red dragon' });
    des.monster({ id: 'baby blue dragon' });
    des.monster({ id: 'baby green dragon' });
    des.monster({ id: 'baby white dragon' });
    des.monster({ id: 'baby black dragon' });

    // Random monsters
    for (let i = 0; i < 10; i++) {
        des.monster();
    }

    return finalize_level();
}
