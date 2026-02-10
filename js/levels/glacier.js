/**
 * Glacier Level (frozen wasteland)
 * Original design for NetHack JavaScript port
 */

import { des, selection, finalize_level } from '../sp_lev.js';

export function generate() {
    des.level_init({ style: 'solidfill', fg: 'I' });

    des.level_flags('mazelevel');

    // Icy wasteland with ice formations
    des.map({
        map: `
IIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII
IIIIIIIII-----------------IIIIIIIIIIIIIIIIII-----------------IIIIIIIIIIIII
IIIIIII--|...............|--IIIIIIIIIIIII--|...............|--IIIIIIIIIIII
IIIIII-|...................|-IIIIIIIIIIII-|...................|-IIIIIIIIIII
IIIII-|.....................|-IIIIIIIIII-|.....................|-IIIIIIIIII
IIII-|.......................|-IIIIIIII-|.......................|-IIIIIIIII
III-|.........................|-IIIIII-|.........................|-IIIIIIII
III-|.........................|-IIIIII-|.........................|-IIIIIIII
IIII-|.......................|-IIIIIIII-|.......................|-IIIIIIIII
IIIII-|.....................|-IIIIIIIIII-|.....................|-IIIIIIIIII
IIIIII-|...................|-IIIIIIIIIIII-|...................|-IIIIIIIIIII
IIIIIII--|...............|--IIIIIIIIIIIII--|...............|--IIIIIIIIIIII
IIIIIIIII-----------------IIIIIIIIIIIIIIIIII-----------------IIIIIIIIIIIII
IIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII
`
    });

    // Brightly lit (ice reflects light)
    des.region(selection.area(0, 0, 77, 14), 'lit');

    // Stairs
    des.stair('up', 25, 7);
    des.stair('down', 52, 7);

    // Non-diggable ice
    des.non_diggable();

    // Objects
    for (let i = 0; i < 12; i++) {
        des.object();
    }

    // Traps
    for (let i = 0; i < 10; i++) {
        des.trap();
    }

    // Ice creatures
    des.monster({ id: 'white dragon' });
    des.monster({ id: 'white dragon' });
    des.monster({ id: 'baby white dragon' });
    des.monster({ id: 'frost giant' });
    des.monster({ id: 'frost giant' });
    des.monster({ id: 'ice vortex' });
    des.monster({ id: 'ice vortex' });
    des.monster({ id: 'winter wolf cub' });
    des.monster({ id: 'winter wolf' });
    des.monster({ id: 'winter wolf' });
    des.monster({ id: 'yeti' });
    des.monster({ id: 'yeti' });
    des.monster({ id: 'freezing sphere' });

    // Random monsters
    for (let i = 0; i < 15; i++) {
        des.monster();
    }

    return finalize_level();
}
