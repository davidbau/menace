/**
 * Volcano Level (active volcanic crater)
 * Original design for NetHack JavaScript port
 */

import { des, selection, finalize_level } from '../sp_lev.js';

export function generate() {
    des.level_init({ style: 'solidfill', fg: 'L' });

    des.level_flags('mazelevel');

    // Volcanic crater with lava flows
    des.map({
        map: `
LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL
LLLLLLLLLLLLLLLLLL--------------------------------LLLLLLLLLLLLLLLLLLLLLLLLL
LLLLLLLLLLLLLL----|...............................|----LLLLLLLLLLLLLLLLLLLL
LLLLLLLLLLL---.|....................................|.---LLLLLLLLLLLLLLLLLL
LLLLLLLL---|.............................................---LLLLLLLLLLLLLLLL
LLLLLL---|...............................................|.---LLLLLLLLLLLLL
LLLL---|.................................................|....---LLLLLLLLLL
LLL-|.......................................................|......|-LLLLLLL
LL-|...........................................................|.....-LLLLLL
LL|.............................................................|.....|LLLLL
LL|..............................................................|.....|LLLL
LL|..............................................................|.....|LLLL
LL|.............................................................|.....|LLLLL
LL-|...........................................................|.....-LLLLLL
LLL-|.......................................................|......|-LLLLLLL
LLLL---|.................................................|....---LLLLLLLLLL
LLLLLL---|...............................................|.---LLLLLLLLLLLLL
LLLLLLLL---|.............................................---LLLLLLLLLLLLLLLL
LLLLLLLLLLL---.|....................................|.---LLLLLLLLLLLLLLLLLL
LLLLLLLLLLLLLL----|...............................|----LLLLLLLLLLLLLLLLLLLL
LLLLLLLLLLLLLLLLLL--------------------------------LLLLLLLLLLLLLLLLLLLLLLLLL
LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL
`
    });

    // Very hot and lit by lava
    des.region(selection.area(0, 0, 75, 22), 'lit');

    // Stairs
    des.stair('up', 38, 3);
    des.stair('down', 40, 18);

    // Non-diggable (volcanic rock)
    des.non_diggable();

    // Fire-resistant treasures
    for (let i = 0; i < 10; i++) {
        des.object({ class: '*' }); // Gems survive the heat
    }
    for (let i = 0; i < 8; i++) {
        des.object();
    }

    // Traps
    for (let i = 0; i < 10; i++) {
        des.trap();
    }

    // Fire creatures
    des.monster({ id: 'fire vortex' });
    des.monster({ id: 'fire vortex' });
    des.monster({ id: 'fire elemental' });
    des.monster({ id: 'fire elemental' });
    des.monster({ id: 'fire giant' });
    des.monster({ id: 'fire giant' });
    des.monster({ id: 'red dragon' });
    des.monster({ id: 'red dragon' });
    des.monster({ id: 'salamander' });
    des.monster({ id: 'salamander' });
    des.monster({ id: 'salamander' });
    des.monster({ id: 'pit fiend' });
    des.monster({ id: 'hell hound' });
    des.monster({ id: 'hell hound' });
    des.monster({ id: 'hell hound pup' });
    des.monster({ id: 'steam vortex' });

    // Random monsters
    for (let i = 0; i < 12; i++) {
        des.monster();
    }

    return finalize_level();
}
