/**
 * Wizard's Tower - Level 1 (Top/Real level)
 * Ported from nethack-c/dat/wizard1.lua
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
|.......|..|.........|.....|
|.......S..|.}}}}}}}.|.....|
|..--S--|..|.}}---}}.|---S-|
|..|....|..|.}--.--}.|..|..|
|..|....|..|.}|...|}.|..|..|
|..--------|.}--.--}.|..|..|
|..|.......|.}}---}}.|..|..|
|..S.......|.}}}}}}}.|..|..|
|..|.......|.........|..|..|
|..|.......|-----------S-S-|
|..|.......S...............|
----------------------------
`
    });

    // Stairs and branch (placed in maze area outside the main structure)
    des.levregion({ type: 'stair-up', region: { x1: 1, y1: 0, x2: 79, y2: 20 }, exclude: { x1: 0, y1: 0, x2: 28, y2: 12 } });
    des.levregion({ type: 'stair-down', region: { x1: 1, y1: 0, x2: 79, y2: 20 }, exclude: { x1: 0, y1: 0, x2: 28, y2: 12 } });
    des.levregion({ type: 'branch', region: { x1: 1, y1: 0, x2: 79, y2: 20 }, exclude: { x1: 0, y1: 0, x2: 28, y2: 12 } });
    des.teleport_region({ region: { x1: 1, y1: 0, x2: 79, y2: 20 }, exclude: { x1: 0, y1: 0, x2: 27, y2: 12 } });

    // Morgue region
    des.region({ region: { x1: 12, y1: 1, x2: 20, y2: 9 }, lit: 0, type: 'morgue', filled: 2 });

    // Arrival room
    des.region({ region: { x1: 1, y1: 1, x2: 10, y2: 11 }, lit: 0, type: 'ordinary', arrival_room: true });

    // Ladder down
    des.ladder('down', 6, 5);

    // Non-diggable walls
    des.non_diggable(selection.area(0, 0, 11, 12));
    des.non_diggable(selection.area(11, 0, 21, 0));
    des.non_diggable(selection.area(11, 10, 27, 12));
    des.non_diggable(selection.area(21, 0, 27, 10));

    // Non-passwall walls
    des.non_passwall(selection.area(0, 0, 11, 12));
    des.non_passwall(selection.area(11, 0, 21, 0));
    des.non_passwall(selection.area(11, 10, 27, 12));
    des.non_passwall(selection.area(21, 0, 27, 10));

    // The wizard and his guards
    des.monster({ id: 'Wizard of Yendor', x: 16, y: 5, asleep: 1 });
    des.monster({ id: 'hell hound', x: 15, y: 5 });
    des.monster({ id: 'vampire lord', x: 17, y: 5 });

    // The local treasure
    des.object({ id: 'Book of the Dead', x: 16, y: 5 });

    // Surrounding terror (in the moat)
    des.monster({ id: 'kraken', x: 14, y: 2 });
    des.monster({ id: 'giant eel', x: 17, y: 2 });
    des.monster({ id: 'kraken', x: 13, y: 4 });
    des.monster({ id: 'giant eel', x: 13, y: 6 });
    des.monster({ id: 'kraken', x: 19, y: 4 });
    des.monster({ id: 'giant eel', x: 19, y: 6 });
    des.monster({ id: 'kraken', x: 15, y: 8 });
    des.monster({ id: 'giant eel', x: 17, y: 8 });
    des.monster({ id: 'piranha', x: 15, y: 2 });
    des.monster({ id: 'piranha', x: 19, y: 8 });

    // Random monsters
    des.monster({ id: 'D' }); // Dragons
    des.monster({ id: 'H' }); // Giants
    des.monster({ id: '&' }); // Major demons
    des.monster({ id: '&' });
    des.monster({ id: '&' });
    des.monster({ id: '&' });

    // Traps around the wizard
    des.trap('board', 16, 4);
    des.trap('board', 16, 6);
    des.trap('board', 15, 5);
    des.trap('board', 17, 5);

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
    des.object({ class: '+' });

    return finalize_level();
}
