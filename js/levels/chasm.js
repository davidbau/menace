/**
 * Chasm Level (bottomless pit)
 * Original design for NetHack JavaScript port
 */

import { des, selection, finalize_level } from '../sp_lev.js';

export function generate() {
    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel');

    // Narrow ledges around a huge chasm
    des.map({
        map: `
---------------------------------------------------------------------------
|.........................................................................|\
|..|.....................................................................||\
|..|.....................................................................||\
|..|.....................................................................||\
|..|.....................................................................||\
|..|.....................................................................||\
|..|.....................................................................||\
|..|.....................................................................||\
|..|.....................................................................||\
|..|.....................................................................||\
|..|.....................................................................||\
|..|.....................................................................||\
|..|.....................................................................||\
|..|.....................................................................||\
|..|.....................................................................||\
|.........................................................................|\
---------------------------------------------------------------------------
`
    });

    // Mostly lit (can see down into the chasm)
    des.region(selection.area(1, 1, 73, 15), 'lit');

    // Stairs on ledges
    des.stair('up', 5, 8);
    des.stair('down', 68, 8);

    // Objects (some might fall into chasm!)
    for (let i = 0; i < 12; i++) {
        des.object();
    }

    // Many traps (especially pits)
    for (let i = 0; i < 15; i++) {
        des.trap();
    }

    // Flying creatures
    des.monster({ id: 'air elemental' });
    des.monster({ id: 'air elemental' });
    des.monster({ id: 'fog cloud' });
    des.monster({ id: 'steam vortex' });
    des.monster({ id: 'energy vortex' });
    des.monster({ id: 'vampire bat' });
    des.monster({ id: 'vampire bat' });
    des.monster({ id: 'giant bat' });
    des.monster({ id: 'giant bat' });
    des.monster({ id: 'raven' });
    des.monster({ id: 'raven' });
    des.monster({ id: 'gargoyle' });
    des.monster({ id: 'gargoyle' });
    des.monster({ id: 'winged gargoyle' });

    // Random monsters
    for (let i = 0; i < 14; i++) {
        des.monster();
    }

    return finalize_level();
}
