import test from 'node:test';
import assert from 'node:assert/strict';

import { ROOM } from '../../js/const.js';
import {
    control_mon_tele,
    goodpos_onscary,
    tele_to_rnd_pet,
} from '../../js/teleport.js';

function makeMap() {
    return {
        flags: {},
        monsters: [],
        objects: [],
        at() {
            return { typ: ROOM, flags: 0 };
        },
        monsterAt(x, y) {
            return this.monsters.find((m) => m.mx === x && m.my === y && !m.dead) || null;
        },
        trapAt() {
            return null;
        },
    };
}

test('teleport goodpos_onscary returns false for invalid probes', () => {
    const map = makeMap();
    assert.equal(goodpos_onscary(1, 1, null, map), false);
    assert.equal(goodpos_onscary(-1, 1, { mlet: 53 }, map), false);
});

test('teleport control_mon_tele requires explicit monTelecontrol opt-in', () => {
    const map = makeMap();
    const player = { x: 10, y: 10 };
    const mon = { mx: 3, my: 3, data: {} };
    const cc = { x: 4, y: 4 };
    assert.equal(control_mon_tele(mon, cc, 0, false, map, player), false);
    assert.equal(control_mon_tele(mon, cc, 0, false, map, player, { monTelecontrol: true, force: true }), true);
});

test('teleport tele_to_rnd_pet no-ops when no eligible pet exists', async () => {
    const map = makeMap();
    const player = { x: 10, y: 10 };
    const game = { map, player };
    assert.equal(await tele_to_rnd_pet(game), false);
});
