/**
 * Beehive Level (giant bee colony)
 * Original design for NetHack JavaScript port
 */

import { des, selection, finalize_level } from '../sp_lev.js';

export function generate() {
    des.level_init({ style: 'solidfill', fg: '.' });

    des.level_flags('mazelevel');

    // Hexagonal honeycomb structure
    des.map({
        map: `
.............................................................................
........./\\_/\\_/\\.../\\_/\\_/\\.../\\_/\\_/\\.../\\_/\\_/\\.../\\_/\\_/\\..........
......./\\_/\\_/\\_/..\\_/\\_/\\_/..\\_/\\_/\\_/..\\_/\\_/\\_/..\\_/\\_/\\_/..........
......\\_/\\_/\\_/\\_..\\_/\\_/\\_/..\\_/\\_/\\_/..\\_/\\_/\\_/..\\_/\\_/\\_/.........
......./\\_/\\_/\\_/..\\_/\\_/\\_/..\\_/\\_/\\_/..\\_/\\_/\\_/..\\_/\\_/\\_/..........
......\\_/\\_/\\_/\\_..\\_/\\_/\\_/..\\_/\\_/\\_/..\\_/\\_/\\_/..\\_/\\_/\\_/.........
......./\\_/\\_/\\_/..\\_/\\_/\\_/..\\_/\\_/\\_/..\\_/\\_/\\_/..\\_/\\_/\\_/..........
......\\_/\\_/\\_/\\_..\\_/\\_/\\_/..\\_/\\_/\\_/..\\_/\\_/\\_/..\\_/\\_/\\_/.........
......./\\_/\\_/\\_/..\\_/\\_/\\_/..\\_/\\_/\\_/..\\_/\\_/\\_/..\\_/\\_/\\_/..........
......\\_/\\_/\\_/\\_..\\_/\\_/\\_/..\\_/\\_/\\_/..\\_/\\_/\\_/..\\_/\\_/\\_/.........
......./\\_/\\_/\\_/..\\_/\\_/\\_/..\\_/\\_/\\_/..\\_/\\_/\\_/..\\_/\\_/\\_/..........
......\\_/\\_/\\_/\\_..\\_/\\_/\\_/..\\_/\\_/\\_/..\\_/\\_/\\_/..\\_/\\_/\\_/.........
......../\\_/\\_/\\....\\_/\\_/\\....\\_/\\_/\\....\\_/\\_/\\....\\_/\\_/\\...........
.............................................................................
`
    });

    // Dim lighting
    des.region(selection.area(0, 0, 77, 14), 'unlit');

    // Stairs
    des.stair('up', 10, 7);
    des.stair('down', 65, 7);

    // Honey and wax
    for (let i = 0; i < 15; i++) {
        des.object({ class: '%' }); // Food (honey)
    }
    for (let i = 0; i < 10; i++) {
        des.object();
    }

    // Traps
    for (let i = 0; i < 8; i++) {
        des.trap();
    }

    // Bee colony
    des.monster({ id: 'queen bee' });
    des.monster({ id: 'killer bee' });
    des.monster({ id: 'killer bee' });
    des.monster({ id: 'killer bee' });
    des.monster({ id: 'killer bee' });
    des.monster({ id: 'killer bee' });
    des.monster({ id: 'killer bee' });
    des.monster({ id: 'killer bee' });
    des.monster({ id: 'killer bee' });
    des.monster({ id: 'killer bee' });
    des.monster({ id: 'killer bee' });
    des.monster({ id: 'killer bee' });
    des.monster({ id: 'killer bee' });
    des.monster({ id: 'killer bee' });
    des.monster({ id: 'killer bee' });
    des.monster({ id: 'killer bee' });

    // Random monsters
    for (let i = 0; i < 12; i++) {
        des.monster();
    }

    return finalize_level();
}
