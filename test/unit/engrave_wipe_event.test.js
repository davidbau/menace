import test from 'node:test';
import assert from 'node:assert/strict';

import { wipe_engr_at, make_engr_at } from '../../js/engrave.js';
import { enableRngLog, getRngLog, disableRngLog, initRng } from '../../js/rng.js';
import { ROOM } from '../../js/const.js';

test('wipe_engr_at does not emit ^wipe when no wipeable engraving exists', async () => {
    initRng(1234);
    enableRngLog();
    try {
        const map = {
            engravings: [],
            at() { return { typ: ROOM }; },
        };
        await wipe_engr_at(map, 29, 12, 1, false);
        const log = getRngLog() || [];
        assert.ok(!log.includes('^wipe[29,12]'), 'did not expect ^wipe event without engraving');
    } finally {
        disableRngLog();
    }
});

test('wipe_engr_at emits ^wipe for wipeable engravings', async () => {
    initRng(1234);
    enableRngLog();
    try {
        const map = {
            engravings: [],
            at() { return { typ: ROOM }; },
        };
        make_engr_at(map, 29, 12, 'Elbereth', 'dust');
        await wipe_engr_at(map, 29, 12, 1, false);
        const log = getRngLog() || [];
        assert.ok(log.includes('^wipe[29,12]'), 'expected ^wipe event for wipeable engraving');
    } finally {
        disableRngLog();
    }
});
