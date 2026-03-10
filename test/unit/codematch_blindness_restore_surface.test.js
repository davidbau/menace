import test from 'node:test';
import assert from 'node:assert/strict';

import { Player } from '../../js/player.js';
import { BLINDED, W_TOOL } from '../../js/const.js';
import { BLINDFOLD, LENSES, POT_RESTORE_ABILITY } from '../../js/objects.js';
import { Blindf_on, Blindf_off } from '../../js/do_wear.js';
import { peffects } from '../../js/potion.js';

function makeDisplay() {
    return { putstr_message: async () => {} };
}

test('Blindf_on/Blindf_off updates blinded extrinsic state like C eyewear boundary', async () => {
    const player = new Player();
    const blindEntry = player.ensureUProp(BLINDED);
    assert.equal(!!player.blind, false);

    const blindfold = { otyp: BLINDFOLD };
    await Blindf_on(player, blindfold);
    assert.equal(!!player.blind, true);
    assert.equal((blindEntry.extrinsic & W_TOOL) !== 0, true);
    assert.equal((blindEntry.blocked & W_TOOL) !== 0, false);

    await Blindf_off(player, blindfold);
    assert.equal(!!player.blind, false);
    assert.equal((blindEntry.extrinsic & W_TOOL) !== 0, false);
});

test('Blindf_on with lenses blocks blindness instead of setting blind extrinsic', async () => {
    const player = new Player();
    const blindEntry = player.ensureUProp(BLINDED);
    player.blind = 5; // intrinsic timed blindness
    assert.equal(!!player.blind, true);

    const lenses = { otyp: LENSES };
    await Blindf_on(player, lenses);
    assert.equal((blindEntry.blocked & W_TOOL) !== 0, true);
    assert.equal((blindEntry.extrinsic & W_TOOL) !== 0, false);
    assert.equal(!!player.blind, false);

    await Blindf_off(player, lenses);
    assert.equal((blindEntry.blocked & W_TOOL) !== 0, false);
    assert.equal(!!player.blind, true);
});

test('peffects POT_RESTORE_ABILITY restores attributes and lost levels when blessed', async () => {
    const player = new Player();
    player.attributes = [8, 9, 10, 7, 10, 10];
    player.attrMax = [10, 10, 10, 10, 10, 10];
    player.ulevel = 2;
    player.ulevelmax = 4;
    player.uexp = 10;
    player.exp = 10;

    const potion = { otyp: POT_RESTORE_ABILITY, blessed: true, cursed: false };
    const rc = await peffects(player, potion, makeDisplay(), null);

    assert.equal(rc, -1);
    assert.deepEqual(player.attributes, [10, 10, 10, 10, 10, 10]);
    assert.equal(player.ulevel, 4);
});

