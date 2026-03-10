import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    Placebc,
    Unplacebc,
    Unplacebc_and_covet_placebc,
    Lift_covet_and_placebc,
    bc_order,
} from '../../js/ball.js';

describe('ball.c compatibility surface', () => {
    it('exports C-name wrapper helpers', () => {
        assert.equal(typeof Placebc, 'function');
        assert.equal(typeof Unplacebc, 'function');
        assert.equal(typeof Unplacebc_and_covet_placebc, 'function');
        assert.equal(typeof Lift_covet_and_placebc, 'function');
        assert.equal(typeof bc_order, 'function');
    });

    it('computes chain/ball stack ordering', () => {
        const uchain = { ox: 10, oy: 10, where: 'OBJ_FLOOR' };
        const uball = { ox: 10, oy: 10, where: 'OBJ_FLOOR' };
        const player = { uchain, uball, uswallow: false };
        const map = {
            objectsAt() {
                return [uchain, uball];
            },
        };
        assert.equal(bc_order(player, map), 1); // BCPOS_CHAIN
        map.objectsAt = () => [uball, uchain];
        assert.equal(bc_order(player, map), 2); // BCPOS_BALL
    });
});
