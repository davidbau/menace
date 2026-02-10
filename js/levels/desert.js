/**
 * Desert Level (sandy wasteland)
 * Original design for NetHack JavaScript port
 */

import { des, selection, finalize_level } from '../sp_lev.js';

export function generate() {
    des.level_init({ style: 'solidfill', fg: '.' });

    des.level_flags('mazelevel');

    // Sandy desert with scattered rock formations
    des.map({
        map: `
---------------------------------------------------------------------------
|.........................................................................|\
|.........................................................................|\
|....-----......................------.......................-----........|\
|..--|...|--..................--|.....|--.................----|....|--....|\
|..|........|..................|.........|..................|.........|...|\
|..|........|..................|.........|..................|.........|...|\
|..--|...|--..................--|.....|--.................----|....|--....|\
|....-----......................------......................-----........|\
|.........................................................................|\
|.........................................................................|\
|.........................................................................|\
|...................-------.................................-------......|\
|................--|.......|--............................--|.....|--....|\
|.................|...........|............................|.........|...|\
|.................|...........|............................|.........|...|\
|................--|.......|--............................--|.....|--....|\
|...................-------..................................-------.....|\
|.........................................................................|\
---------------------------------------------------------------------------
`
    });

    // Hot and unlit
    des.region(selection.area(1, 1, 73, 17), 'lit');

    // Stairs
    des.stair('up', 8, 5);
    des.stair('down', 65, 12);

    // Non-diggable
    des.non_diggable();

    // Desert treasures (often buried)
    for (let i = 0; i < 8; i++) {
        des.object({ class: '*' }); // Gems in the sand
    }
    for (let i = 0; i < 12; i++) {
        des.object();
    }

    // Traps (especially pits)
    for (let i = 0; i < 10; i++) {
        des.trap();
    }

    // Desert creatures
    des.monster({ id: 'sand vortex' });
    des.monster({ id: 'dust vortex' });
    des.monster({ id: 'fire ant' });
    des.monster({ id: 'fire ant' });
    des.monster({ id: 'fire ant' });
    des.monster({ id: 'soldier ant' });
    des.monster({ id: 'soldier ant' });
    des.monster({ id: 'scorpion' });
    des.monster({ id: 'scorpion' });
    des.monster({ id: 'giant scorpion' });
    des.monster({ id: 'rattlesnake' });
    des.monster({ id: 'python' });
    des.monster({ id: 'cobra' });
    des.monster({ id: 'giant beetle' });
    des.monster({ id: 'mummy' });
    des.monster({ id: 'sphinx' });

    // Random monsters
    for (let i = 0; i < 12; i++) {
        des.monster();
    }

    return finalize_level();
}
