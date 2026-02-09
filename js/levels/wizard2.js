/**
 * Wizard's Tower - Level 2
 * Ported from nethack-c/dat/wizard2.lua
 */

import { des, selection, finalize_level } from '../sp_lev.js';

export function generate() {
    des.level_init({ style: 'mazegrid', bg: '-' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor');

    des.map({
        halign: 'center',
        valign: 'center',
        map: `
----------------------------
|.....|.S....|.............|
|.....|.-------S--------S--|
|.....|.|.........|........|
|..-S--S|.........|........|
|..|....|.........|------S-|
|..|....|.........|.....|..|
|-S-----|.........|.....|..|
|.......|.........|S--S--..|
|.......|.........|.|......|
|-----S----S-------.|......|
|............|....S.|......|
----------------------------
`
    });

    // Stairs and branch
    des.levregion({ type: 'stair-up', region: { x1: 1, y1: 0, x2: 79, y2: 20 }, exclude: { x1: 0, y1: 0, x2: 28, y2: 12 } });
    des.levregion({ type: 'stair-down', region: { x1: 1, y1: 0, x2: 79, y2: 20 }, exclude: { x1: 0, y1: 0, x2: 28, y2: 12 } });
    des.levregion({ type: 'branch', region: { x1: 1, y1: 0, x2: 79, y2: 20 }, exclude: { x1: 0, y1: 0, x2: 28, y2: 12 } });
    des.teleport_region({ region: { x1: 1, y1: 0, x2: 79, y2: 20 }, exclude: { x1: 0, y1: 0, x2: 27, y2: 12 } });

    // Entire tower in a region
    des.region({ region: { x1: 1, y1: 1, x2: 26, y2: 11 }, lit: 0, type: 'ordinary', arrival_room: true });

    // Zoo in the center
    des.region({ region: { x1: 9, y1: 3, x2: 17, y2: 9 }, lit: 0, type: 'zoo', filled: 1 });

    des.door('closed', 15, 2);
    des.door('closed', 11, 10);

    des.ladder('up', 12, 1);
    des.ladder('down', 14, 11);

    // Non-diggable and non-passwall everywhere
    des.non_diggable(selection.area(0, 0, 27, 12));
    des.non_passwall(selection.area(0, 0, 27, 12));

    // Random traps
    des.trap({ type: 'spiked pit' });
    des.trap({ type: 'sleep gas' });
    des.trap({ type: 'anti magic' });
    des.trap({ type: 'magic' });

    // Some random loot
    des.object({ id: 'ruby' });
    des.object({ class: '!' });
    des.object({ class: '!' });
    des.object({ class: '?' });
    des.object({ class: '?' });
    des.object({ class: '+' });
    des.object({ class: '+' });

    return finalize_level();
}
