/**
 * Crystal Cavern Level (crystalline formations)
 * Original design for NetHack JavaScript port
 */

import { des, selection, finalize_level } from '../sp_lev.js';

export function generate() {
    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel');

    // Crystalline cavern with geometric patterns
    des.map({
        map: `
---------------------------------------------------------------------------
|.........................................................................|\
|...------...........------...........------...........------...........|\
|...|....|...........|....|...........|....|...........|....|...........|\
|...|....|...........|....|...........|....|...........|....|...........|\
|...------...........------...........------...........------...........|\
|.........................................................................|\
|.........................................................................|\
|...------...........------...........------...........------...........|\
|...|....|...........|....|...........|....|...........|....|...........|\
|...|....|...........|....|...........|....|...........|....|...........|\
|...------...........------...........------...........------...........|\
|.........................................................................|\
|.........................................................................|\
|...------...........------...........------...........------...........|\
|...|....|...........|....|...........|....|...........|....|...........|\
|...|....|...........|....|...........|....|...........|....|...........|\
|...------...........------...........------...........------...........|\
|.........................................................................|\
---------------------------------------------------------------------------
`
    });

    // Brightly lit with crystal reflections
    des.region(selection.area(1, 1, 73, 17), 'lit');

    // Stairs
    des.stair('up', 10, 9);
    des.stair('down', 65, 9);

    // Non-diggable crystal
    des.non_diggable();

    // Many gems (crystalline formations)
    for (let i = 0; i < 25; i++) {
        des.object({ class: '*' });
    }

    // Other valuable objects
    for (let i = 0; i < 8; i++) {
        des.object({ class: '!' }); // Potions
    }
    for (let i = 0; i < 8; i++) {
        des.object({ class: '=' }); // Rings
    }

    // General objects
    for (let i = 0; i < 10; i++) {
        des.object();
    }

    // Traps
    for (let i = 0; i < 7; i++) {
        des.trap();
    }

    // Crystal guardians and constructs
    des.monster({ id: 'glass golem' });
    des.monster({ id: 'glass golem' });
    des.monster({ id: 'clay golem' });
    des.monster({ id: 'stone golem' });
    des.monster({ id: 'iron golem' });
    des.monster({ id: 'xorn' });
    des.monster({ id: 'xorn' });
    des.monster({ id: 'earth elemental' });
    des.monster({ id: 'air elemental' });
    des.monster({ id: 'glass piercer' });
    des.monster({ id: 'flaming sphere' });
    des.monster({ id: 'freezing sphere' });
    des.monster({ id: 'shocking sphere' });

    // Random monsters
    for (let i = 0; i < 15; i++) {
        des.monster();
    }

    return finalize_level();
}
