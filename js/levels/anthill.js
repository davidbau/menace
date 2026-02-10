/**
 * Anthill Level (giant ant colony)
 * Original design for NetHack JavaScript port
 */

import { des, selection, finalize_level } from '../sp_lev.js';

export function generate() {
    des.level_init({ style: 'solidfill', fg: '.' });

    des.level_flags('mazelevel');

    // Tunneled ant colony with chambers
    des.map({
        map: `
.............................................................................
..........---...........---...........---...........---...........---........
........--|..|----------|..|----------|..|----------|..|----------|..|------
........|...........................................  ....................|---
........|...................................................................|..
........|...................................................................|..
........|...................................................................|..
........--|..|----------|..|----------|..|----------|..|----------|..|------
..........---...........---...........---...........---...........---........
.............................................................................
..........---...........---...........---...........---...........---........
........--|..|----------|..|----------|..|----------|..|----------|..|------
........|...................................................................|..
........|...................................................................|..
........|...................................................................|..
........|...........................................  ....................|---
........--|..|----------|..|----------|..|----------|..|----------|..|------
..........---...........---...........---...........---...........---........
.............................................................................
`
    });

    // Dimly lit tunnels
    des.region(selection.area(0, 0, 77, 19), 'unlit');

    // Stairs
    des.stair('up', 10, 9);
    des.stair('down', 65, 9);

    // Objects (food stores)
    for (let i = 0; i < 20; i++) {
        des.object({ class: '%' }); // Food
    }
    for (let i = 0; i < 10; i++) {
        des.object();
    }

    // Traps
    for (let i = 0; i < 8; i++) {
        des.trap();
    }

    // Ant colony
    des.monster({ id: 'giant ant' });
    des.monster({ id: 'giant ant' });
    des.monster({ id: 'giant ant' });
    des.monster({ id: 'giant ant' });
    des.monster({ id: 'giant ant' });
    des.monster({ id: 'giant ant' });
    des.monster({ id: 'giant ant' });
    des.monster({ id: 'giant ant' });
    des.monster({ id: 'soldier ant' });
    des.monster({ id: 'soldier ant' });
    des.monster({ id: 'soldier ant' });
    des.monster({ id: 'soldier ant' });
    des.monster({ id: 'soldier ant' });
    des.monster({ id: 'soldier ant' });
    des.monster({ id: 'fire ant' });
    des.monster({ id: 'fire ant' });
    des.monster({ id: 'fire ant' });
    des.monster({ id: 'fire ant' });
    des.monster({ id: 'queen bee' }); // Queen ant (using queen bee)

    // Random monsters
    for (let i = 0; i < 9; i++) {
        des.monster();
    }

    return finalize_level();
}
