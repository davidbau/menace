import test from 'node:test';
import assert from 'node:assert/strict';

import { wipe_engr_at } from '../../js/engrave.js';
import { enableRngLog, getRngLog, disableRngLog, initRng } from '../../js/rng.js';
import { ROOM } from '../../js/const.js';

test('wipe_engr_at emits ^wipe event even when no engraving exists', async () => {
    initRng(1234);
    enableRngLog();
    try {
        const map = {
            engravings: [],
            at() { return { typ: ROOM }; },
        };
        await wipe_engr_at(map, 29, 12, 1, false);
        const log = getRngLog() || [];
        assert.ok(log.includes('^wipe[29,12]'), 'expected ^wipe event for wipe call entry');
    } finally {
        disableRngLog();
    }
});
