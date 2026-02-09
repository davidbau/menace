/**
 * Wizard's Tower - Level 3 (Bottom/Fake level)
 * Ported from nethack-c/dat/wizard3.lua
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
|..|............S..........|
|..|..------------------S--|
|..|..|.........|..........|
|..S..|.}}}}}}}.|..........|
|..|..|.}}---}}.|-S--------|
|..|..|.}--.--}.|..|.......|
|..|..|.}|...|}.|..|.......|
|..---|.}--.--}.|..|.......|
|.....|.}}---}}.|..|.......|
|.....S.}}}}}}}.|..|.......|
|.....|.........|..|.......|
----------------------------
`
    });

    // Stairs and branch
    des.levregion({ type: 'stair-up', region: { x1: 1, y1: 0, x2: 79, y2: 20 }, exclude: { x1: 0, y1: 0, x2: 28, y2: 12 } });
    des.levregion({ type: 'stair-down', region: { x1: 1, y1: 0, x2: 79, y2: 20 }, exclude: { x1: 0, y1: 0, x2: 28, y2: 12 } });
    des.levregion({ type: 'branch', region: { x1: 1, y1: 0, x2: 79, y2: 20 }, exclude: { x1: 0, y1: 0, x2: 28, y2: 12 } });
    des.teleport_region({ region: { x1: 1, y1: 0, x2: 79, y2: 20 }, exclude: { x1: 0, y1: 0, x2: 27, y2: 12 } });

    // Portal to fakewiz1 (simplified - not implementing portal for now)
    // des.levregion({ region: { x1: 25, y1: 11, x2: 25, y2: 11 }, type: 'portal', name: 'fakewiz1' });

    // Morgue region
    des.region({ region: { x1: 7, y1: 3, x2: 15, y2: 11 }, lit: 0, type: 'morgue', filled: 2 });

    // Beehive region
    des.region({ region: { x1: 17, y1: 6, x2: 18, y2: 11 }, lit: 0, type: 'beehive', filled: 1 });

    // Entry chamber
    des.region({ region: { x1: 20, y1: 6, x2: 26, y2: 11 }, lit: 0, type: 'ordinary', arrival_room: true });

    des.door('closed', 18, 5);

    des.ladder('up', 11, 7);

    // Non-diggable walls
    des.non_diggable(selection.area(0, 0, 6, 12));
    des.non_diggable(selection.area(6, 0, 27, 2));
    des.non_diggable(selection.area(16, 2, 27, 12));
    des.non_diggable(selection.area(6, 12, 16, 12));

    // Non-passwall
    des.non_passwall(selection.area(0, 0, 6, 12));
    des.non_passwall(selection.area(6, 0, 27, 2));
    des.non_passwall(selection.area(16, 2, 27, 12));
    des.non_passwall(selection.area(6, 12, 16, 12));

    // Monsters
    des.monster({ id: 'L', x: 10, y: 7 }); // Lich
    des.monster({ id: 'vampire lord', x: 12, y: 7 });
    des.monster({ id: 'D' }); // Dragon
    des.monster({ id: 'H' }); // Giant
    des.monster({ id: '&' }); // Major demon
    des.monster({ id: '&' });
    des.monster({ id: '&' });

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
