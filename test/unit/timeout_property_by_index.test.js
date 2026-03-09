import { describe, it } from 'node:test';
import assert from 'node:assert';

import { property_by_index } from '../../js/timeout.js';
import { STONED, PROT_FROM_SHAPE_CHANGERS } from '../../js/const.js';

describe('timeout.property_by_index', () => {
  it('returns C-ordered property names and numbers', () => {
    const out = { value: -1 };
    const name = property_by_index(1, out);
    assert.strictEqual(name, 'petrifying');
    assert.strictEqual(out.value, STONED);
  });

  it('returns later table entries with mapped property ids', () => {
    const out = { value: -1 };
    const name = property_by_index(61, out);
    assert.strictEqual(name, 'protection from shape changers');
    assert.strictEqual(out.value, PROT_FROM_SHAPE_CHANGERS);
  });

  it('clamps out-of-range indexes to terminal sentinel', () => {
    const out = { value: 123 };
    const name = property_by_index(9999, out);
    assert.strictEqual(name, null);
    assert.strictEqual(out.value, 0);
  });
});

