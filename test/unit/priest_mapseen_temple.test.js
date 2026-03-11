import test from 'node:test';
import assert from 'node:assert/strict';

import { GEHENNOM } from '../../js/const.js';
import { mapseen_temple } from '../../js/priest.js';

test('mapseen_temple marks valley flag on valley level mapseen entry', () => {
    const game = {
        mapseenchn: {
            lev: { dnum: GEHENNOM, dlevel: 1 },
            flags: {},
            next: null,
        },
    };
    const map = { uz: { dnum: GEHENNOM, dlevel: 1 }, game };
    mapseen_temple(null, map, game);
    assert.equal(game.mapseenchn.flags.valley, 1);
    assert.equal(game.mapseenchn.flags.msanctum, undefined);
});
