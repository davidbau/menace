import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { initRng } from '../../js/rng.js';
import { initLevelGeneration, makelevel, mktrap } from '../../js/dungeon.js';
import { PIT, POOL } from '../../js/config.js';
import { BOULDER } from '../../js/objects.js';

function firstRoomCenter(map) {
    const room = map.rooms[0];
    return {
        x: Math.floor((room.lx + room.hx) / 2),
        y: Math.floor((room.ly + room.hy) / 2)
    };
}

describe('mktrap C parity', () => {
    it('places a pit in a single-cell room candidate when unoccupied', () => {
        initRng(101);
        initLevelGeneration();
        const map = makelevel(3);
        const { x, y } = firstRoomCenter(map);
        const croom = { lx: x, hx: x, ly: y, hy: y };
        const before = map.traps.length;

        mktrap(map, PIT, 0, croom, null, 3);

        assert.equal(map.traps.length, before + 1);
        const t = map.trapAt(x, y);
        assert.ok(t && t.ttyp === PIT, 'pit should be placed at forced single candidate square');
    });

    it('does not place pit/hole traps onto boulder squares', () => {
        initRng(202);
        initLevelGeneration();
        const map = makelevel(3);
        const { x, y } = firstRoomCenter(map);
        const croom = { lx: x, hx: x, ly: y, hy: y };
        const before = map.traps.length;

        map.objects.push({ otyp: BOULDER, ox: x, oy: y });
        mktrap(map, PIT, 0, croom, null, 3);

        assert.equal(
            map.traps.length,
            before,
            'C mktrap avoids pit/hole placement on boulder locations'
        );
    });

    it('does not place trap at explicit pool/lava target coordinates', () => {
        initRng(303);
        initLevelGeneration();
        const map = makelevel(3);
        const { x, y } = firstRoomCenter(map);
        const before = map.traps.length;

        map.at(x, y).typ = POOL;
        mktrap(map, PIT, 0, null, { x, y }, 3);

        assert.equal(
            map.traps.length,
            before,
            'C mktrap rejects explicit trap placement in pools/lava'
        );
    });
});
