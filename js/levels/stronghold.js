/**
 * Stronghold Level (fortified keep)
 * Original design for NetHack JavaScript port
 */

import { des, selection, finalize_level } from '../sp_lev.js';

export function generate() {
    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel');

    // Fortified stronghold
    des.map({
        map: `
---------------------------------------------------------------------------
|.........................................................................|\
|..------------------------.....------------------------.................|\
|..|......................|.....|......................|.................|\
|..|......................|.....|......................|.................|\
|..|......................|.....|......................|.................|\
|..|......................|.....|......................|.................|\
|..----+-----.-----+------.....---------+--------+------.................|\
|.........................................................................|\
|.........................................................................|\
|..----+-----.-----+------.....---------+--------+------.................|\
|..|......................|.....|......................|.................|\
|..|......................|.....|......................|.................|\
|..|......................|.....|......................|.................|\
|..|......................|.....|......................|.................|\
|..------------------------.....------------------------.................|\
|.........................................................................|\
---------------------------------------------------------------------------
`
    });

    // Well-lit fortress
    des.region(selection.area(1, 1, 73, 16), 'lit');

    // Stairs
    des.stair('up', 5, 8);
    des.stair('down', 68, 8);

    // Doors
    des.door('closed', 6, 7);
    des.door('closed', 6, 10);
    des.door('closed', 17, 7);
    des.door('closed', 17, 10);
    des.door('closed', 33, 7);
    des.door('closed', 33, 10);
    des.door('closed', 41, 7);
    des.door('closed', 41, 10);

    // Non-diggable (strong walls)
    des.non_diggable();

    // Military equipment
    for (let i = 0; i < 15; i++) {
        des.object({ class: ')' }); // Weapons
    }
    for (let i = 0; i < 15; i++) {
        des.object({ class: '[' }); // Armor
    }
    for (let i = 0; i < 10; i++) {
        des.object();
    }

    // Traps
    for (let i = 0; i < 10; i++) {
        des.trap();
    }

    // Garrison
    des.monster({ id: 'captain' });
    des.monster({ id: 'captain' });
    des.monster({ id: 'lieutenant' });
    des.monster({ id: 'lieutenant' });
    des.monster({ id: 'lieutenant' });
    des.monster({ id: 'sergeant' });
    des.monster({ id: 'sergeant' });
    des.monster({ id: 'sergeant' });
    des.monster({ id: 'sergeant' });
    for (let i = 0; i < 19; i++) {
        des.monster({ id: 'soldier' });
    }

    // Random monsters
    for (let i = 0; i < 0; i++) {
        des.monster();
    }

    return finalize_level();
}
