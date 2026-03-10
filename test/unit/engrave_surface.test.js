import test from 'node:test';
import assert from 'node:assert/strict';

import { engrave, make_engr_at, save_engravings, rest_engravings } from '../../js/engrave.js';

test('engrave occupation surface returns completion code', () => {
    assert.equal(engrave(), 0);
});

test('save_engravings/rest_engravings round-trip engraving list', () => {
    const src = { engravings: [] };
    make_engr_at(src, 10, 5, 'Elbereth', 'dust');
    const saved = save_engravings(src);
    assert.equal(Array.isArray(saved), true);
    assert.equal(saved.length, 1);
    assert.equal(saved[0].text, 'Elbereth');

    const dst = { engravings: [] };
    rest_engravings(dst, saved);
    assert.equal(dst.engravings.length, 1);
    assert.equal(dst.engravings[0].x, 10);
    assert.equal(dst.engravings[0].y, 5);
    assert.equal(dst.engravings[0].text, 'Elbereth');
});
