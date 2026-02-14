import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { initRng, enableRngLog, disableRngLog, getRngLog } from '../../js/rng.js';
import { mksobj } from '../../js/mkobj.js';
import { SPE_NOVEL } from '../../js/objects.js';

describe('mkobj SPE_NOVEL parity', () => {
    it('consumes noveltitle RNG and assigns novelidx', () => {
        initRng(42);
        enableRngLog();
        try {
            const obj = mksobj(SPE_NOVEL, false, false);
            const log = getRngLog().map(line => line.replace(/^\d+\s+/, ''));
            const hasNovelRoll = log.some(line => /^rn2\(41\)=\d+$/.test(line));
            assert.equal(hasNovelRoll, true, 'SPE_NOVEL should consume rn2(41) for noveltitle');
            assert.equal(Number.isInteger(obj.novelidx), true, 'SPE_NOVEL should set novelidx');
            assert.equal(obj.novelidx >= 0 && obj.novelidx < 41, true, 'novelidx should be in [0, 40]');
        } finally {
            disableRngLog();
        }
    });
});
