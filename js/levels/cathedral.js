/**
 * Cathedral Level (grand church)
 * Original design for NetHack JavaScript port
 */

import { des, selection, finalize_level } from '../sp_lev.js';

export function generate() {
    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel');

    // Grand cathedral with nave and transept
    des.map({
        map: `
---------------------------------------------------------------------------
|.........................................................................|\
|......................--------+--------..................................|\
|.....................-|.......|.......|-.................................|\
|....................-|..........|.....|.|-................................|\
|...................|-|...........|....|..|-..............................|\
|..................|--|............|...|...|-.............................|\
|..................|..|.............|..|....|-............................|\
|..................|-.|..............|.|.....|............................|\
|..................|--|..............|.|.....|............................|\
|..................|..|..............|.|.....|............................|\
|..................|..---TTTTTTTTTT--+.|.....|............................|\
|..................|.................|.|.....|............................|\
|..................|.................|.|.....|............................|\
|..................|.................|.|.....|............................|\
|..................|------+---+------|-+.....|............................|\
|.........................................................................|\
---------------------------------------------------------------------------
`
    });

    // Brightly lit
    des.region(selection.area(1, 1, 73, 16), 'lit');

    // Stairs
    des.stair('up', 5, 8);
    des.stair('down', 68, 8);

    // Doors
    des.door('closed', 29, 2);
    des.door('closed', 35, 11);
    des.door('closed', 27, 15);
    des.door('closed', 32, 15);

    // Non-diggable (consecrated walls)
    des.non_diggable();

    // Altars
    des.feature({ type: 'altar', x: 25, y: 11, alignment: 'law' });

    // Sacred treasures
    for (let i = 0; i < 8; i++) {
        des.object({ class: '*' });
    }
    for (let i = 0; i < 10; i++) {
        des.object({ class: '?' }); // Scrolls
    }
    for (let i = 0; i < 8; i++) {
        des.object({ id: 'spellbook' });
    }
    for (let i = 0; i < 10; i++) {
        des.object();
    }

    // Traps
    for (let i = 0; i < 6; i++) {
        des.trap();
    }

    // Clergy and guardians
    des.monster({ id: 'high priest' });
    des.monster({ id: 'priest' });
    des.monster({ id: 'priest' });
    des.monster({ id: 'priest' });
    des.monster({ id: 'priestess' });
    des.monster({ id: 'priestess' });
    des.monster({ id: 'Angel' });
    des.monster({ id: 'Angel' });
    des.monster({ id: 'Archon' });
    des.monster({ id: 'soldier' });
    des.monster({ id: 'soldier' });
    des.monster({ id: 'soldier' });
    des.monster({ id: 'sergeant' });
    des.monster({ id: 'lieutenant' });

    // Random monsters
    for (let i = 0; i < 14; i++) {
        des.monster();
    }

    return finalize_level();
}
