import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { mattacku } from '../../js/mhitu.js';
import { initRng } from '../../js/rng.js';

describe('monster attack missing AC', () => {

test('mattacku does not crash when replay player AC fields are missing', async () => {
    initRng(206);
    const monster = {
        name: 'goblin',
        mlevel: 1,
        attacks: [{ aatyp: 2, damn: 1, damd: 4 }],
    };
    const player = {
        hp: 10,
        hpmax: 10,
        wizard: false,
        takeDamage() { return false; },
    };
    const display = {
        putstr_message() {},
    };

    await assert.doesNotReject(async () => {
        await mattacku(monster, player, display, null);
    });
});

}); // describe
