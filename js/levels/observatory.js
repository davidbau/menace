/**
 * Observatory Level (stargazing tower)
 * Original design for NetHack JavaScript port
 */

import { des, selection, finalize_level } from '../sp_lev.js';

export function generate() {
    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel');

    // Circular observatory dome
    des.map({
        map: `
---------------------------------------------------------------------------
|.........................................................................|\
|............................-----------------............................|\
|.........................--|................|--..........................|\
|.........................|....................|.........................|\
|........................|......................|........................|\
|.......................|........................|.......................|\
|.......................|........................|.......................|\
|.......................|........................|.......................|\
|.......................|........................|.......................|\
|.......................|........................|.......................|\
|.......................|........................|.......................|\
|........................|......................|........................|\
|.........................|....................|.........................|\
|.........................--|................|--..........................|\
|............................-----------------............................|\
|.........................................................................|\
---------------------------------------------------------------------------
`
    });

    // Brightly lit (starlight)
    des.region(selection.area(1, 1, 73, 15), 'lit');

    // Stairs
    des.stair('up', 10, 8);
    des.stair('down', 40, 8);

    // Non-diggable (tower walls)
    des.non_diggable();

    // Scientific instruments and tools
    for (let i = 0; i < 15; i++) {
        des.object({ class: '(' }); // Tools
    }
    for (let i = 0; i < 10; i++) {
        des.object({ id: 'spellbook' });
    }
    for (let i = 0; i < 10; i++) {
        des.object({ class: '*' }); // Gems (crystals)
    }
    for (let i = 0; i < 10; i++) {
        des.object();
    }

    // Traps
    for (let i = 0; i < 6; i++) {
        des.trap();
    }

    // Astronomers and guardians
    des.monster({ id: 'wizard' });
    des.monster({ id: 'wizard' });
    des.monster({ id: 'wizard' });
    des.monster({ id: 'Elvenking' });
    des.monster({ id: 'elven wizard' });
    des.monster({ id: 'elven wizard' });

    // Celestial creatures
    des.monster({ id: 'yellow light' });
    des.monster({ id: 'black light' });
    des.monster({ id: 'flaming sphere' });
    des.monster({ id: 'freezing sphere' });
    des.monster({ id: 'shocking sphere' });

    // Random monsters
    for (let i = 0; i < 17; i++) {
        des.monster();
    }

    return finalize_level();
}
