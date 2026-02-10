/**
 * Menagerie Level (exotic zoo)
 * Original design for NetHack JavaScript port
 */

import { des, selection, finalize_level } from '../sp_lev.js';

export function generate() {
    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel');

    // Zoo with cages and enclosures
    des.map({
        map: `
---------------------------------------------------------------------------
|.........................................................................|\
|..---+---.---+---.---+---.---+---.---+---.---+---.---+---.---+---......|\
|..|.....|.|.....|.|.....|.|.....|.|.....|.|.....|.|.....|.|.....|......|\
|..|.....|.|.....|.|.....|.|.....|.|.....|.|.....|.|.....|.|.....|......|\
|..|.....|.|.....|.|.....|.|.....|.|.....|.|.....|.|.....|.|.....|......|\
|..|.....|.|.....|.|.....|.|.....|.|.....|.|.....|.|.....|.|.....|......|\
|..-------.---------+----------+----------+----------+---------......|\
|.........................................................................|\
|.........................................................................|\
|..---+---.---+---.---+---.---+---.---+---.---+---.---+---.---+---......|\
|..|.....|.|.....|.|.....|.|.....|.|.....|.|.....|.|.....|.|.....|......|\
|..|.....|.|.....|.|.....|.|.....|.|.....|.|.....|.|.....|.|.....|......|\
|..|.....|.|.....|.|.....|.|.....|.|.....|.|.....|.|.....|.|.....|......|\
|..|.....|.|.....|.|.....|.|.....|.|.....|.|.....|.|.....|.|.....|......|\
|..-------.---------+----------+----------+----------+---------......|\
|.........................................................................|\
|.........................................................................|\
---------------------------------------------------------------------------
`
    });

    // Well-lit zoo
    des.region(selection.area(1, 1, 73, 16), 'lit');

    // Stairs
    des.stair('up', 5, 8);
    des.stair('down', 68, 8);

    // Cage doors
    for (let y of [2, 10]) {
        for (let x of [5, 13, 21, 29, 37, 45, 53, 61]) {
            des.door('closed', x, y);
        }
    }
    des.door('closed', 17, 7);
    des.door('closed', 25, 7);
    des.door('closed', 33, 7);
    des.door('closed', 41, 7);
    des.door('closed', 49, 7);
    des.door('closed', 17, 15);
    des.door('closed', 25, 15);
    des.door('closed', 33, 15);
    des.door('closed', 41, 15);
    des.door('closed', 49, 15);

    // Non-diggable (sturdy cages)
    des.non_diggable();

    // Objects
    for (let i = 0; i < 15; i++) {
        des.object();
    }

    // Traps
    for (let i = 0; i < 8; i++) {
        des.trap();
    }

    // Diverse exotic creatures (one of each)
    des.monster({ id: 'owlbear' });
    des.monster({ id: 'cockatrice' });
    des.monster({ id: 'chickatrice' });
    des.monster({ id: 'wyvern' });
    des.monster({ id: 'manticore' });
    des.monster({ id: 'leucrotta' });
    des.monster({ id: 'basilisk' });
    des.monster({ id: 'carnivorous ape' });
    des.monster({ id: 'yeti' });
    des.monster({ id: 'sasquatch' });
    des.monster({ id: 'leocrotta' });
    des.monster({ id: 'wumpus' });
    des.monster({ id: 'purple worm' });
    des.monster({ id: 'minotaur' });
    des.monster({ id: 'owlbear' });
    des.monster({ id: 'tiger' });
    des.monster({ id: 'panther' });
    des.monster({ id: 'jaguar' });
    des.monster({ id: 'lynx' });
    des.monster({ id: 'mountain centaur' });

    // Random monsters
    for (let i = 0; i < 8; i++) {
        des.monster();
    }

    return finalize_level();
}
