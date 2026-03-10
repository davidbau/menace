import test from 'node:test';
import assert from 'node:assert/strict';

import { setGame } from '../../js/gstate.js';
import { Player } from '../../js/player.js';
import { OBJ_INVENT, OBJ_FLOOR, SLIMED } from '../../js/const.js';
import {
    burn_away_slime,
    slimed_to_death,
    see_lamp_flicker,
    lantern_message,
} from '../../js/timeout.js';

test('timeout burn_away_slime clears slimed timer', async () => {
    const player = new Player();
    setGame({ player, map: null, display: null });
    const entry = player.ensureUProp(SLIMED);
    entry.intrinsic = 7;
    assert.equal(player.getPropTimeout(SLIMED), 7);

    await burn_away_slime(player);

    assert.equal(player.getPropTimeout(SLIMED), 0);
});

test('timeout slimed_to_death marks player dead', async () => {
    const player = new Player();
    setGame({ player, map: null, display: null });

    await slimed_to_death(null, player);

    assert.equal(player.dead, true);
    assert.equal(player.deathCause, 'slimed');
});

test('timeout lamp helpers execute for inventory and floor objects', async () => {
    const invLamp = { where: OBJ_INVENT, oname: 'lantern' };
    const floorLamp = { where: OBJ_FLOOR, oname: 'lantern' };

    await see_lamp_flicker(invLamp, ' ominously');
    await see_lamp_flicker(floorLamp, '');
    await lantern_message(invLamp);
    await lantern_message(floorLamp);

    assert.ok(true);
});

