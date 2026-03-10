import test from 'node:test';
import assert from 'node:assert/strict';

import { gettrack, hastrack, initrack, rest_track, save_track, settrack } from '../../js/track.js';

test('track hastrack reports recorded positions', () => {
    initrack();
    settrack({ x: 10, y: 10 });
    settrack({ x: 11, y: 10 });
    assert.equal(hastrack(10, 10), true);
    assert.equal(hastrack(99, 99), false);
});

test('track save/rest round-trip state', () => {
    initrack();
    settrack({ x: 2, y: 3 });
    settrack({ x: 3, y: 3 });
    const nhfp = {};
    save_track(nhfp);

    initrack();
    assert.equal(hastrack(2, 3), false);
    rest_track(nhfp);
    assert.equal(hastrack(2, 3), true);
    assert.equal(typeof gettrack(4, 3), 'object');
});

test('track save with releaseData resets in-memory tracking', () => {
    initrack();
    settrack({ x: 7, y: 8 });
    const nhfp = { releaseData: true };
    save_track(nhfp);
    assert.equal(hastrack(7, 8), false);
    rest_track(nhfp);
    assert.equal(hastrack(7, 8), true);
});
