/**
 * Barracks Level (military fortress)
 * Original design for NetHack JavaScript port
 */

import { des, selection, finalize_level } from '../sp_lev.js';

export function generate() {
    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel');

    // Military compound with barracks rooms
    des.map({
        map: `
---------------------------------------------------------------------------
|.........................................................................|\
|...----------.----------.----------.----------.----------.----------....|\
|...|........|.|........|.|........|.|........|.|........|.|........|....|\
|...|........|.|........|.|........|.|........|.|........|.|........|....|\
|...|........+.+........|.|........+.+........|.|........+.+........|....|\
|...|........|.|........|.|........|.|........|.|........|.|........|....|\
|...|........|.|........|.|........|.|........|.|........|.|........|....|\
|...----+-----.----+-----.----+-----.----+-----.----+-----.----+-----....|\
|.........................................................................|\
|.........................................................................|\
|...----------.----------.----------.----------.----------.----------....|\
|...|........|.|........|.|........|.|........|.|........|.|........|....|\
|...|........|.|........|.|........|.|........|.|........|.|........|....|\
|...|........+.+........|.|........+.+........|.|........+.+........|....|\
|...|........|.|........|.|........|.|........|.|........|.|........|....|\
|...|........|.|........|.|........|.|........|.|........|.|........|....|\
|...----+-----.----+-----.----+-----.----+-----.----+-----.----+-----....|\
|.........................................................................|\
---------------------------------------------------------------------------
`
    });

    // Well-lit military facility
    des.region(selection.area(1, 1, 73, 17), 'lit');

    // Stairs
    des.stair('up', 5, 9);
    des.stair('down', 68, 9);

    // Doors
    for (let y of [4, 7, 13, 16]) {
        for (let x of [11, 21, 31, 41, 51, 61]) {
            des.door('closed', x, y);
        }
    }

    // Non-diggable (fortified)
    des.non_diggable();

    // Military equipment
    for (let i = 0; i < 20; i++) {
        des.object({ class: '[' }); // Armor
    }
    for (let i = 0; i < 20; i++) {
        des.object({ class: ')' }); // Weapons
    }
    for (let i = 0; i < 10; i++) {
        des.object();
    }

    // Traps
    for (let i = 0; i < 8; i++) {
        des.trap();
    }

    // Military forces
    des.monster({ id: 'captain' });
    des.monster({ id: 'captain' });
    des.monster({ id: 'captain' });
    des.monster({ id: 'lieutenant' });
    des.monster({ id: 'lieutenant' });
    des.monster({ id: 'lieutenant' });
    des.monster({ id: 'lieutenant' });
    des.monster({ id: 'sergeant' });
    des.monster({ id: 'sergeant' });
    des.monster({ id: 'sergeant' });
    des.monster({ id: 'sergeant' });
    des.monster({ id: 'sergeant' });
    des.monster({ id: 'sergeant' });
    for (let i = 0; i < 15; i++) {
        des.monster({ id: 'soldier' });
    }

    // Random monsters
    for (let i = 0; i < 0; i++) {
        des.monster();
    }

    return finalize_level();
}
