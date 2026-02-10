/**
 * Spider Nest Level (web-filled lair)
 * Original design for NetHack JavaScript port
 */

import { des, selection, finalize_level } from '../sp_lev.js';

export function generate() {
    des.level_init({ style: 'solidfill', fg: '.' });

    des.level_flags('mazelevel');

    // Webbed cavern
    des.map({
        map: `
---------------------------------------------------------------------------
|.........................................................................|\
|....w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.....|\
|...w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w....|\
|..w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w...|\
|.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w..|\
|.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w..|\
|.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w..|\
|.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w..|\
|.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w..|\
|.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w..|\
|.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w..|\
|.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w..|\
|..w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w...|\
|...w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w....|\
|....w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.....|\
|.........................................................................|\
---------------------------------------------------------------------------
`
    });

    // Dimly lit nest
    des.region(selection.area(1, 1, 73, 15), 'unlit');

    // Stairs
    des.stair('up', 10, 8);
    des.stair('down', 65, 8);

    // Objects
    for (let i = 0; i < 12; i++) {
        des.object();
    }

    // Traps
    for (let i = 0; i < 10; i++) {
        des.trap();
    }

    // Spiders everywhere!
    des.monster({ id: 'giant spider' });
    des.monster({ id: 'giant spider' });
    des.monster({ id: 'giant spider' });
    des.monster({ id: 'giant spider' });
    des.monster({ id: 'giant spider' });
    des.monster({ id: 'giant spider' });
    des.monster({ id: 'giant spider' });
    des.monster({ id: 'giant spider' });
    des.monster({ id: 'cave spider' });
    des.monster({ id: 'cave spider' });
    des.monster({ id: 'cave spider' });
    des.monster({ id: 'cave spider' });
    des.monster({ id: 'cave spider' });
    des.monster({ id: 'scorpion' });
    des.monster({ id: 'scorpion' });

    // Random monsters
    for (let i = 0; i < 13; i++) {
        des.monster();
    }

    return finalize_level();
}
