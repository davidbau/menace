import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    stairway_add,
    stairway_at,
    stairway_find,
    stairway_find_from,
    stairway_find_dir,
    stairway_find_type_dir,
    On_stairs,
    On_ladder,
    On_stairs_up,
    On_stairs_dn,
    setCurrentLevelStairs,
    stairway_free_all,
} from '../../js/stairs.js';

describe('stairs global gs.stairs state', () => {
    beforeEach(() => {
        stairway_free_all();
    });

    it('stairway_add populates global linked-list and map endpoints', async () => {
        const map = {};
        stairway_add(map, 10, 5, true, false, { dnum: 0, dlevel: 1 });
        stairway_add(map, 12, 7, false, true, { dnum: 2, dlevel: 3 });

        assert.ok(globalThis.gs);
        assert.ok(globalThis.gs.stairs);
        assert.equal(globalThis.gs.stairs.sx, 12);
        assert.equal(globalThis.gs.stairs.sy, 7);
        assert.equal(globalThis.gs.stairs.next.sx, 10);
        assert.equal(globalThis.gs.stairs.next.sy, 5);

        assert.equal(map.upstair.x, 10);
        assert.equal(map.dnstair.x, 12);

        const up = await stairway_at(10, 5, map);
        const dn = await stairway_at(12, 7, map);
        assert.ok(up && dn);
        assert.equal(up.up, true);
        assert.equal(dn.up, false);
        assert.equal(dn.isladder, true);

        const byDest = await stairway_find({ dnum: 2, dlevel: 3 }, map);
        assert.ok(byDest);
        assert.equal(byDest.sx, 12);

        const byDestType = await stairway_find_from({ dnum: 2, dlevel: 3 }, true, map);
        assert.ok(byDestType);
        assert.equal(byDestType.sx, 12);

        assert.equal((await stairway_find_dir(true, map)).sx, 10);
        assert.equal((await stairway_find_dir(false, map)).sx, 12);
        assert.equal((await stairway_find_type_dir(true, false, map)).sx, 12);

        assert.equal(await On_stairs(10, 5, map), true);
        assert.equal(await On_ladder(12, 7, map), true);
        assert.equal(await On_stairs_up(10, 5, map), true);
        assert.equal(await On_stairs_dn(12, 7, map), true);
    });

    it('setCurrentLevelStairs rebuilds global list from map stair fields', async () => {
        const map = {
            uz: { dnum: 0, dlevel: 1 },
            upstair: {
                x: 3,
                y: 4,
                isladder: false,
                u_traversed: false,
                tolev: { dnum: 0, dlevel: 0 },
            },
            dnstair: {
                x: 7,
                y: 8,
                isladder: false,
                u_traversed: true,
                tolev: { dnum: 0, dlevel: 2 },
            },
        };

        setCurrentLevelStairs(map);
        assert.ok(await stairway_at(3, 4, map));
        assert.ok(await stairway_at(7, 8, map));
        assert.equal((await stairway_find_dir(true, map)).sx, 3);
        assert.equal((await stairway_find_dir(false, map)).sx, 7);
    });

    it('stairway_free_all clears global linked-list', async () => {
        const map = {};
        stairway_add(map, 1, 1, true, false, { dnum: 0, dlevel: 1 });
        assert.ok(globalThis.gs.stairs);
        stairway_free_all();
        assert.equal(globalThis.gs.stairs, null);
        assert.equal(await stairway_at(1, 1), null);
        // map-aware lookup lazily rehydrates gs.stairs from the map.
        assert.ok(await stairway_at(1, 1, map));
    });
});
