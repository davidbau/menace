/**
 * Necropolis Level (city of the dead)
 * Original design for NetHack JavaScript port
 */

import { des, selection, finalize_level } from '../sp_lev.js';

export function generate() {
    des.level_init({ style: 'solidfill', fg: '.' });

    des.level_flags('mazelevel');

    // City of tombs and crypts
    des.map({
        map: `
---------------------------------------------------------------------------
|.......|-------|.....|-------|.....|-------|.....|-------|.............|\
|.......|.......|.....|.......|.....|.......|.....|.......|.............|\
|.......|.......|.....|.......|.....|.......|.....|.......|.............|\
|.......|-------+-----|-------+-----|-------+-----|-------|.............|\
|.........................................................................|\
|.........................................................................|\
|.......|-------|.....|-------|.....|-------|.....|-------|.............|\
|.......|.......|.....|.......|.....|.......|.....|.......|.............|\
|.......|.......|.....|.......|.....|.......|.....|.......|.............|\
|.......|-------+-----|-------+-----|-------+-----|-------|.............|\
|.........................................................................|\
|.........................................................................|\
|.......|-------|.....|-------|.....|-------|.....|-------|.............|\
|.......|.......|.....|.......|.....|.......|.....|.......|.............|\
|.......|.......|.....|.......|.....|.......|.....|.......|.............|\
|.......|-------+-----|-------+-----|-------+-----|-------|.............|\
|.........................................................................|\
---------------------------------------------------------------------------
`
    });

    // Dimly lit with patches of darkness
    des.region(selection.area(1, 1, 73, 16), 'unlit');
    des.region(selection.area(8, 1, 14, 3), 'lit');
    des.region(selection.area(8, 7, 14, 9), 'lit');
    des.region(selection.area(8, 13, 14, 15), 'lit');

    // Stairs
    des.stair('up', 5, 8);
    des.stair('down', 68, 8);

    // Doors to crypts
    des.door('closed', 14, 4);
    des.door('closed', 20, 4);
    des.door('closed', 26, 4);
    des.door('closed', 32, 4);
    des.door('closed', 14, 10);
    des.door('closed', 20, 10);
    des.door('closed', 26, 10);
    des.door('closed', 32, 10);
    des.door('closed', 14, 16);
    des.door('closed', 20, 16);
    des.door('closed', 26, 16);
    des.door('closed', 32, 16);

    // Non-diggable
    des.non_diggable();

    // Burial goods
    for (let i = 0; i < 15; i++) {
        des.object();
    }

    // Traps in the tombs
    for (let i = 0; i < 10; i++) {
        des.trap();
    }

    // Hordes of undead
    des.monster({ id: 'vampire lord' });
    des.monster({ id: 'vampire lord' });
    des.monster({ id: 'vampire' });
    des.monster({ id: 'vampire' });
    des.monster({ id: 'master lich' });
    des.monster({ id: 'lich' });
    des.monster({ id: 'lich' });
    des.monster({ id: 'demilich' });
    des.monster({ id: 'wraith' });
    des.monster({ id: 'wraith' });
    des.monster({ id: 'wraith' });
    des.monster({ id: 'spectre' });
    des.monster({ id: 'spectre' });
    des.monster({ id: 'ghost' });
    des.monster({ id: 'ghost' });
    des.monster({ id: 'shade' });
    des.monster({ id: 'shade' });
    des.monster({ id: 'giant mummy' });
    des.monster({ id: 'mummy' });
    des.monster({ id: 'mummy' });
    des.monster({ id: 'mummy' });

    // Random monsters
    for (let i = 0; i < 7; i++) {
        des.monster();
    }

    return finalize_level();
}
