import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { initRng, enableRngLog, getRngLog, disableRngLog } from '../../js/rng.js';
import { mksobj } from '../../js/mkobj.js';
import { DAGGER } from '../../js/objects.js';
import { setGame } from '../../js/gstate.js';

describe('mkobj erosion gate', () => {

function runCreateDagger({ moves, inMklev }) {
    initRng(123);
    enableRngLog();
    setGame({ moves, _inMklev: inMklev });
    try {
        mksobj(DAGGER, true, false);
        return getRngLog().map((entry) => String(entry));
    } finally {
        disableRngLog();
        setGame(null);
    }
}

function hasErosionRng(log) {
    return log.some((entry) => entry.includes('rn2(100)='))
        && log.some((entry) => entry.includes('rn2(1000)='));
}

test('mkobj erosion RNG is suppressed when moves <= 1 outside mklev', () => {
    const log = runCreateDagger({ moves: 1, inMklev: false });
    assert.equal(hasErosionRng(log), false);
});

test('mkobj erosion RNG runs after moves > 1 outside mklev', () => {
    const log = runCreateDagger({ moves: 2, inMklev: false });
    assert.equal(hasErosionRng(log), true);
});

test('mkobj erosion RNG runs in mklev context even when moves <= 1', () => {
    const log = runCreateDagger({ moves: 1, inMklev: true });
    assert.equal(hasErosionRng(log), true);
});

}); // describe
