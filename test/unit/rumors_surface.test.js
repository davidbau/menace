import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  unpadline,
  init_rumors,
  others_check,
  rumor_check,
  get_rnd_text,
  get_rnd_line,
  save_oracles,
  restore_oracles,
  outoracle,
  couldnt_open_file,
  init_CapMons,
  CapitalMon,
  free_CapMons,
} from '../../js/rumors.js';

describe('rumors compatibility surface', () => {
  it('unpads trailing underscore padding', () => {
    assert.equal(unpadline('hello___\n'), 'hello');
    assert.equal(unpadline('hello'), 'hello');
  });

  it('returns rumor/epitaph summaries', () => {
    const r = init_rumors();
    assert.equal(typeof r.trueCount, 'number');
    assert.equal(typeof r.falseCount, 'number');
    assert.equal(r.trueCount > 0, true);
    assert.equal(r.falseCount > 0, true);

    const e = others_check('epitaph');
    assert.equal(e.ok, true);
    assert.equal(e.count > 0, true);

    const chk = rumor_check();
    assert.equal(chk.rumors.trueCount > 0, true);
    assert.equal(chk.epitaphs.ok, true);
  });

  it('returns random lines from supported sources', () => {
    const ep = get_rnd_text('epitaph');
    const tr = get_rnd_text('true');
    const fl = get_rnd_text('false');
    assert.equal(typeof ep, 'string');
    assert.equal(typeof tr, 'string');
    assert.equal(typeof fl, 'string');
    assert.equal(ep.length > 0, true);
    assert.equal(tr.length > 0, true);
    assert.equal(fl.length > 0, true);

    const custom = get_rnd_line({
      texts: ['alpha___', 'beta___'],
      lineBytes: [9, 8],
      chunksize: 17,
    }, 8);
    assert.equal(['alpha', 'beta'].includes(custom), true);
  });

  it('supports oracle state save/restore', () => {
    const first = outoracle(true, false);
    assert.equal(typeof first, 'string');
    const saved = save_oracles();
    assert.equal(Array.isArray(saved.pool), true);
    const n = restore_oracles(saved);
    assert.equal(typeof n, 'number');
    assert.equal(n >= 0, true);
  });

  it('handles CapitalMon matching and reset', () => {
    free_CapMons();
    init_CapMons(['Archon', 'Green-elf']);
    assert.equal(CapitalMon('Archon'), true);
    assert.equal(CapitalMon('Archon guard'), true);
    assert.equal(CapitalMon("Archon's minion"), true);
    assert.equal(CapitalMon('ArchonX'), false);
    assert.equal(CapitalMon('archon'), false);
  });

  it('formats file-open error text', () => {
    assert.equal(couldnt_open_file('rumors'), 'Cannot open rumors');
  });
});
