/**
 * Wizard's Laboratory Level (experimental chambers)
 * Original design for NetHack JavaScript port
 */

import { des, selection, finalize_level } from '../sp_lev.js';

export function generate() {
    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel');

    // Laboratory with multiple chambers
    des.map({
        map: `
---------------------------------------------------------------------------
|.........................................................................|\
|..-----------.....-----------.....-----------.....-----------.....------|\
|..|.........|.....|.........|.....|.........|.....|.........|.....|.....|\
|..|.........|.....|.........|.....|.........|.....|.........|.....|.....|\
|..|.........|.....|.........|.....|.........|.....|.........|.....|.....|\
|..|.........+.....+.........|.....|.........+.....+.........|.....|.....|\
|..------+----.....-----------.....-----------.....-----------.....|.....|\
|.........................................................................|\
|.........................................................................|\
|..------+----.....-----------.....-----------.....--------+----...|.....|\
|..|.........+.....+.........|.....|.........+.....+.........|.....|.....|\
|..|.........|.....|.........|.....|.........|.....|.........|.....|.....|\
|..|.........|.....|.........|.....|.........|.....|.........|.....|.....|\
|..|.........|.....|.........|.....|.........|.....|.........|.....|.....|\
|..-----------.....-----------.....-----------.....-----------.....------|\
|.........................................................................|\
---------------------------------------------------------------------------
`
    });

    // Well-lit laboratory
    des.region(selection.area(1, 1, 73, 15), 'lit');

    // Stairs
    des.stair('up', 4, 4);
    des.stair('down', 68, 13);

    // Doors
    des.door('closed', 11, 6);
    des.door('closed', 18, 5);
    des.door('closed', 30, 5);
    des.door('closed', 41, 5);
    des.door('closed', 53, 5);
    des.door('closed', 11, 10);
    des.door('closed', 18, 10);
    des.door('closed', 41, 10);
    des.door('closed', 52, 10);

    // Non-diggable (reinforced walls)
    des.non_diggable();

    // Many potions (experiments)
    for (let i = 0; i < 20; i++) {
        des.object({ class: '!' });
    }

    // Wands and tools
    for (let i = 0; i < 10; i++) {
        des.object({ class: '/' });
    }
    for (let i = 0; i < 8; i++) {
        des.object({ class: '(' });
    }

    // Spellbooks
    for (let i = 0; i < 8; i++) {
        des.object({ id: 'spellbook' });
    }

    // Other objects
    for (let i = 0; i < 10; i++) {
        des.object();
    }

    // Magical traps
    for (let i = 0; i < 10; i++) {
        des.trap();
    }

    // Laboratory inhabitants (wizards and creations)
    des.monster({ id: 'wizard' });
    des.monster({ id: 'wizard' });
    des.monster({ id: 'wizard' });
    des.monster({ id: 'Neferet the Green' });
    des.monster({ id: 'homunculus' });
    des.monster({ id: 'homunculus' });
    des.monster({ id: 'flesh golem' });
    des.monster({ id: 'flesh golem' });
    des.monster({ id: 'clay golem' });
    des.monster({ id: 'acid blob' });
    des.monster({ id: 'gelatinous cube' });
    des.monster({ id: 'black light' });
    des.monster({ id: 'yellow light' });

    // Random monsters
    for (let i = 0; i < 15; i++) {
        des.monster();
    }

    return finalize_level();
}
