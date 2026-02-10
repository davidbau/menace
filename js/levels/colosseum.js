/**
 * Colosseum Level (grand amphitheater)
 * Original design for NetHack JavaScript port
 */

import { des, selection, finalize_level } from '../sp_lev.js';

export function generate() {
    des.level_init({ style: 'solidfill', fg: '.' });

    des.level_flags('mazelevel');

    // Massive oval colosseum
    des.map({
        map: `
---------------------------------------------------------------------------
|.........................................................................|\
|.............-----------.......-----------..........................|\
|..........--|...........|-----|...........|--........................|\
|..........|.................|.................|.......................|\
|.........|.....................|..................|....................|\
|........|.......................|...................|...................|\
|........|........................|...................|..................|\
|........|.........................|..................|..................|\
|........|..........................|.................|..................|\
|........|..........................|.................|..................|\
|........|.........................|..................|..................|\
|........|........................|...................|...................|\
|.........|.......................|..................|....................|\
|..........|.................|.................|.......................|\
|..........--|...........|-----|...........|--........................|\
|.............-----------.......-----------..........................|\
|.........................................................................|\
---------------------------------------------------------------------------
`
    });

    // Well-lit arena
    des.region(selection.area(1, 1, 73, 16), 'lit');

    // Stairs outside arena
    des.stair('up', 5, 8);
    des.stair('down', 68, 8);

    // Non-diggable
    des.non_diggable();

    // Objects
    for (let i = 0; i < 15; i++) {
        des.object();
    }

    // Traps
    for (let i = 0; i < 10; i++) {
        des.trap();
    }

    // Gladiators and beasts
    des.monster({ id: 'soldier' });
    des.monster({ id: 'soldier' });
    des.monster({ id: 'soldier' });
    des.monster({ id: 'soldier' });
    des.monster({ id: 'sergeant' });
    des.monster({ id: 'sergeant' });
    des.monster({ id: 'lieutenant' });
    des.monster({ id: 'captain' });
    des.monster({ id: 'valkyrie' });
    des.monster({ id: 'barbarian' });
    des.monster({ id: 'samurai' });
    des.monster({ id: 'tiger' });
    des.monster({ id: 'tiger' });
    des.monster({ id: 'lion' });
    des.monster({ id: 'panther' });
    des.monster({ id: 'owlbear' });
    des.monster({ id: 'minotaur' });

    // Random monsters
    for (let i = 0; i < 11; i++) {
        des.monster();
    }

    return finalize_level();
}
