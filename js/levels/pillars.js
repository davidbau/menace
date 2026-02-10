/**
 * Hall of Pillars Level (columned chamber)
 * Original design for NetHack JavaScript port
 */

import { des, selection, finalize_level } from '../sp_lev.js';

export function generate() {
    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel');

    // Grand hall with rows of pillars
    des.map({
        map: `
---------------------------------------------------------------------------
|.........................................................................|\
|.........................................................................|\
|....T.....T.....T.....T.....T.....T.....T.....T.....T.....T.....T.......|\
|.........................................................................|\
|.........................................................................|\
|....T.....T.....T.....T.....T.....T.....T.....T.....T.....T.....T.......|\
|.........................................................................|\
|.........................................................................|\
|....T.....T.....T.....T.....T.....T.....T.....T.....T.....T.....T.......|\
|.........................................................................|\
|.........................................................................|\
|....T.....T.....T.....T.....T.....T.....T.....T.....T.....T.....T.......|\
|.........................................................................|\
|.........................................................................|\
|....T.....T.....T.....T.....T.....T.....T.....T.....T.....T.....T.......|\
|.........................................................................|\
|.........................................................................|\
---------------------------------------------------------------------------
`
    });

    // Well-lit hall
    des.region(selection.area(1, 1, 73, 16), 'lit');

    // Stairs
    des.stair('up', 10, 8);
    des.stair('down', 65, 8);

    // Non-diggable (ancient architecture)
    des.non_diggable();

    // Objects scattered among pillars
    for (let i = 0; i < 15; i++) {
        des.object();
    }

    // Traps
    for (let i = 0; i < 10; i++) {
        des.trap();
    }

    // Guardians
    des.monster({ id: 'stone golem' });
    des.monster({ id: 'stone golem' });
    des.monster({ id: 'stone golem' });
    des.monster({ id: 'stone golem' });
    des.monster({ id: 'clay golem' });
    des.monster({ id: 'clay golem' });
    des.monster({ id: 'xorn' });
    des.monster({ id: 'xorn' });
    des.monster({ id: 'earth elemental' });
    des.monster({ id: 'earth elemental' });
    des.monster({ id: 'gargoyle' });
    des.monster({ id: 'gargoyle' });
    des.monster({ id: 'winged gargoyle' });
    des.monster({ id: 'soldier' });
    des.monster({ id: 'soldier' });
    des.monster({ id: 'sergeant' });
    des.monster({ id: 'lieutenant' });

    // Random monsters
    for (let i = 0; i < 11; i++) {
        des.monster();
    }

    return finalize_level();
}
