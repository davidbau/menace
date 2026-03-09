import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
  initRng,
  rn2,
  rn2_on_display_rng,
  whichrng,
  init_isaac64,
  set_random,
  rng_log_init,
  rng_log_set_caller,
  rng_log_get_call_count,
  rng_log_write,
  getRngLog,
  disableRngLog,
} from '../../js/rng.js';

describe('rng.c-surface wrappers', () => {
  it('whichrng maps rn2/rn2_on_display_rng to core/display indices', () => {
    assert.strictEqual(whichrng(rn2), 0);
    assert.strictEqual(whichrng(rn2_on_display_rng), 1);
    assert.strictEqual(whichrng(() => 0), -1);
  });

  it('init_isaac64 and set_random reseed selected stream deterministically', () => {
    initRng(1);
    init_isaac64(42, rn2);
    const a = rn2(1000);
    init_isaac64(42, rn2);
    const b = rn2(1000);
    assert.strictEqual(a, b);

    set_random(99, rn2_on_display_rng);
    const d1 = rn2_on_display_rng(1000);
    set_random(99, rn2_on_display_rng);
    const d2 = rn2_on_display_rng(1000);
    assert.strictEqual(d1, d2);
  });

  it('rng_log_* wrappers map to logging subsystem', () => {
    rng_log_init(true);
    rng_log_set_caller('unit.test');
    const before = rng_log_get_call_count();
    rn2(10);
    const after = rng_log_get_call_count();
    assert.strictEqual(after, before + 1);
    rng_log_write('^custom[event]');
    const log = getRngLog();
    assert.ok(Array.isArray(log) && log.some((l) => l.includes('^custom[event]')));
    disableRngLog();
  });
});

