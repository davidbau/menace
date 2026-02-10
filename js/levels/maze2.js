/**
 * Twisted Maze Level (complex labyrinth)
 * Original design for NetHack JavaScript port
 */

import { des, selection, finalize_level } from '../sp_lev.js';

export function generate() {
    des.level_init({ style: 'maze' });

    des.level_flags('mazelevel');

    // Complex maze with dead ends
    // Using maze style, it will auto-generate

    // Stairs
    des.stair('up');
    des.stair('down');

    // Objects
    for (let i = 0; i < 15; i++) {
        des.object();
    }

    // Traps
    for (let i = 0; i < 12; i++) {
        des.trap();
    }

    // Maze creatures
    des.monster({ id: 'minotaur' });
    des.monster({ id: 'minotaur' });
    des.monster({ id: 'owlbear' });
    des.monster({ id: 'owlbear' });
    des.monster({ id: 'umber hulk' });
    des.monster({ id: 'xorn' });

    // Random monsters
    for (let i = 0; i < 22; i++) {
        des.monster();
    }

    return finalize_level();
}
