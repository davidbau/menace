/**
 * Mines Level (mining tunnels)
 * Original design for NetHack JavaScript port
 */

import { des, selection, finalize_level } from '../sp_lev.js';

export function generate() {
    des.level_init({ style: 'solidfill', fg: '-' });

    des.level_flags('mazelevel');

    // Mining tunnels with ore veins
    des.map({
        map: `
-----------------------------
|.........|.....|...........|
|.........|.....|...........|
|....|----+-----+------.|...|
|....|..................|...|
--+--|..................|-+--
  |.......................|
  |.......................|
--+--|..................|-+--
|....|..................|...|
|....|----+-----+------.|...|
|.........|.....|...........|
|.........|.....|...........|
-----------------------------
`
    });

    // Mostly dark tunnels with lit mining areas
    des.region(selection.area(0, 0, 30, 14), 'unlit');
    des.region(selection.area(5, 4, 23, 10), 'lit');

    // Stairs
    des.stair('up', 3, 6);
    des.stair('down', 26, 7);

    // Doors
    des.door('closed', 2, 5);
    des.door('closed', 28, 5);
    des.door('closed', 2, 8);
    des.door('closed', 28, 8);
    des.door('closed', 9, 3);
    des.door('closed', 15, 3);
    des.door('closed', 9, 10);
    des.door('closed', 15, 10);

    // Valuable ores and gems
    for (let i = 0; i < 20; i++) {
        des.object({ class: '*' });
    }
    for (let i = 0; i < 15; i++) {
        des.object({ class: '$' });
    }

    // Mining tools
    for (let i = 0; i < 8; i++) {
        des.object({ class: '(' });
    }

    // Other objects
    for (let i = 0; i < 10; i++) {
        des.object();
    }

    // Mining hazards (traps)
    for (let i = 0; i < 12; i++) {
        des.trap();
    }

    // Miners and creatures
    des.monster({ id: 'dwarf' });
    des.monster({ id: 'dwarf' });
    des.monster({ id: 'dwarf' });
    des.monster({ id: 'dwarf' });
    des.monster({ id: 'dwarf lord' });
    des.monster({ id: 'dwarf king' });
    des.monster({ id: 'gnome' });
    des.monster({ id: 'gnome' });
    des.monster({ id: 'gnome' });
    des.monster({ id: 'gnome lord' });
    des.monster({ id: 'gnome king' });
    des.monster({ id: 'rock mole' });
    des.monster({ id: 'rock piercer' });
    des.monster({ id: 'xorn' });

    // Random monsters
    for (let i = 0; i < 14; i++) {
        des.monster();
    }

    return finalize_level();
}
