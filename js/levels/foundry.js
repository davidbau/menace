/**
 * Foundry Level (metal smelting facility)
 * Original design for NetHack JavaScript port
 */

import { des, selection, finalize_level } from '../sp_lev.js';

export function generate() {
    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel');

    // Foundry with smelting furnaces
    des.map({
        map: `
---------------------------------------------------------------------------
|.........................................................................|\
|...----------.----------.----------.----------.----------.----------....|\
|...|........|.|........|.|........|.|........|.|........|.|........|....|\
|...|..LLLL..|.|..LLLL..|.|..LLLL..|.|..LLLL..|.|..LLLL..|.|..LLLL..|....|\
|...|..LLLL..|.|..LLLL..|.|..LLLL..|.|..LLLL..|.|..LLLL..|.|..LLLL..|....|\
|...|..LLLL..|.|..LLLL..|.|..LLLL..|.|..LLLL..|.|..LLLL..|.|..LLLL..|....|\
|...|........|.|........|.|........|.|........|.|........|.|........|....|\
|...----+-----.----+-----.----+-----.----+-----.----+-----.----+-----....|\
|.........................................................................|\
|.........................................................................|\
|...----------.----------.----------.----------.----------.----------....|\
|...|........|.|........|.|........|.|........|.|........|.|........|....|\
|...|..LLLL..|.|..LLLL..|.|..LLLL..|.|..LLLL..|.|..LLLL..|.|..LLLL..|....|\
|...|..LLLL..|.|..LLLL..|.|..LLLL..|.|..LLLL..|.|..LLLL..|.|..LLLL..|....|\
|...|..LLLL..|.|..LLLL..|.|..LLLL..|.|..LLLL..|.|..LLLL..|.|..LLLL..|....|\
|...|........|.|........|.|........|.|........|.|........|.|........|....|\
|...----+-----.----+-----.----+-----.----+-----.----+-----.----+-----....|\
|.........................................................................|\
---------------------------------------------------------------------------
`
    });

    // Very hot and bright (molten metal)
    des.region(selection.area(1, 1, 73, 17), 'lit');

    // Stairs
    des.stair('up', 5, 9);
    des.stair('down', 68, 9);

    // Doors
    for (let y of [8, 17]) {
        for (let x of [11, 21, 31, 41, 51, 61]) {
            des.door('closed', x, y);
        }
    }

    // Non-diggable (reinforced foundry)
    des.non_diggable();

    // Metal products
    for (let i = 0; i < 20; i++) {
        des.object({ class: ')' }); // Weapons
    }
    for (let i = 0; i < 20; i++) {
        des.object({ class: '[' }); // Armor
    }
    for (let i = 0; i < 10; i++) {
        des.object({ class: '(' }); // Tools
    }

    // Traps
    for (let i = 0; i < 10; i++) {
        des.trap();
    }

    // Foundry workers and fire creatures
    des.monster({ id: 'dwarf' });
    des.monster({ id: 'dwarf' });
    des.monster({ id: 'dwarf lord' });
    des.monster({ id: 'fire elemental' });
    des.monster({ id: 'fire elemental' });
    des.monster({ id: 'fire vortex' });
    des.monster({ id: 'salamander' });
    des.monster({ id: 'salamander' });
    des.monster({ id: 'flaming sphere' });
    des.monster({ id: 'iron golem' });
    des.monster({ id: 'iron golem' });

    // Random monsters
    for (let i = 0; i < 17; i++) {
        des.monster();
    }

    return finalize_level();
}
