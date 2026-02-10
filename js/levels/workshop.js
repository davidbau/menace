/**
 * Workshop Level (artisan's forge)
 * Original design for NetHack JavaScript port
 */

import { des, selection, finalize_level } from '../sp_lev.js';

export function generate() {
    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel');

    // Workshop with forges and workbenches
    des.map({
        map: `
---------------------------------------------------------------------------
|.........................................................................|\
|...----------.----------.----------.----------.----------.----------....|\
|...|........|.|........|.|........|.|........|.|........|.|........|....|\
|...|........|.|........|.|........|.|........|.|........|.|........|....|\
|...|..LLLL..|.|..LLLL..|.|..LLLL..|.|..LLLL..|.|..LLLL..|.|..LLLL..|....|\
|...|..LLLL..|.|..LLLL..|.|..LLLL..|.|..LLLL..|.|..LLLL..|.|..LLLL..|....|\
|...|........|.|........|.|........|.|........|.|........|.|........|....|\
|...----+-----.----+-----.----+-----.----+-----.----+-----.----+-----....|\
|.........................................................................|\
|.........................................................................|\
|...----------.----------.----------.----------.----------.----------....|\
|...|........|.|........|.|........|.|........|.|........|.|........|....|\
|...|........|.|........|.|........|.|........|.|........|.|........|....|\
|...|..LLLL..|.|..LLLL..|.|..LLLL..|.|..LLLL..|.|..LLLL..|.|..LLLL..|....|\
|...|..LLLL..|.|..LLLL..|.|..LLLL..|.|..LLLL..|.|..LLLL..|.|..LLLL..|....|\
|...|........|.|........|.|........|.|........|.|........|.|........|....|\
|...----+-----.----+-----.----+-----.----+-----.----+-----.----+-----....|\
|.........................................................................|\
---------------------------------------------------------------------------
`
    });

    // Well-lit workshop
    des.region(selection.area(1, 1, 73, 17), 'lit');

    // Stairs
    des.stair('up', 5, 9);
    des.stair('down', 68, 9);

    // Doors
    for (let y of [7, 16]) {
        for (let x of [11, 21, 31, 41, 51, 61]) {
            des.door('closed', x, y);
        }
    }

    // Non-diggable (workshop walls)
    des.non_diggable();

    // Crafted items (weapons, armor, tools)
    for (let i = 0; i < 15; i++) {
        des.object({ class: ')' }); // Weapons
    }
    for (let i = 0; i < 15; i++) {
        des.object({ class: '[' }); // Armor
    }
    for (let i = 0; i < 15; i++) {
        des.object({ class: '(' }); // Tools
    }
    for (let i = 0; i < 10; i++) {
        des.object({ class: '*' }); // Gems
    }
    for (let i = 0; i < 10; i++) {
        des.object();
    }

    // Traps
    for (let i = 0; i < 8; i++) {
        des.trap();
    }

    // Artisans
    des.monster({ id: 'dwarf' });
    des.monster({ id: 'dwarf' });
    des.monster({ id: 'dwarf' });
    des.monster({ id: 'dwarf lord' });
    des.monster({ id: 'dwarf king' });
    des.monster({ id: 'gnome' });
    des.monster({ id: 'gnome' });
    des.monster({ id: 'gnome lord' });

    // Constructs and golems
    des.monster({ id: 'iron golem' });
    des.monster({ id: 'iron golem' });
    des.monster({ id: 'steel golem' });
    des.monster({ id: 'clay golem' });
    des.monster({ id: 'stone golem' });
    des.monster({ id: 'flesh golem' });

    // Random monsters
    for (let i = 0; i < 14; i++) {
        des.monster();
    }

    return finalize_level();
}
