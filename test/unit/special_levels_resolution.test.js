import { test } from 'node:test';
import assert from 'node:assert/strict';

import { resolveSpecialLevelByName } from '../../js/special_levels.js';

test('resolveSpecialLevelByName returns exact minetown variant generator', () => {
    const a = resolveSpecialLevelByName('minetn-1');
    const b = resolveSpecialLevelByName('minetn-7');

    assert.ok(a);
    assert.ok(b);
    assert.equal(a.name, 'minetn-1');
    assert.equal(b.name, 'minetn-7');
    assert.equal(a.dnum, 1);
    assert.equal(b.dnum, 1);
    assert.equal(a.dlevel, 5);
    assert.equal(b.dlevel, 5);
    assert.equal(typeof a.generator, 'function');
    assert.equal(typeof b.generator, 'function');
    assert.notEqual(a.generator, b.generator);
});
